use crate::utils::color::generate_color_from_string;

#[cfg(windows)]
pub fn extract_icon_base64(icon_spec: &str) -> Option<String> {
    use windows::Win32::Graphics::Gdi::{
        CreateCompatibleDC, DeleteDC, DeleteObject, GetDIBits, GetObjectW, SelectObject, BITMAP,
        BITMAPINFO, BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS, HDC,
    };
    use windows::Win32::UI::WindowsAndMessaging::{DestroyIcon, GetIconInfo, HICON, ICONINFO};

    #[link(name = "shell32")]
    extern "system" {
        fn ExtractIconW(
            hInst: *const std::ffi::c_void,
            lpszExeFileName: *const u16,
            nIconIndex: i32,
        ) -> HICON;
    }

    let parts: Vec<&str> = icon_spec.split(',').collect();
    let file_path = parts[0];
    let icon_index: i32 = parts.get(1).and_then(|s| s.parse().ok()).unwrap_or(0);

    unsafe {
        let file_path_wide: Vec<u16> = file_path.encode_utf16().chain(std::iter::once(0)).collect();
        let hicon = ExtractIconW(std::ptr::null(), file_path_wide.as_ptr(), icon_index);

        if hicon.is_invalid() {
            return None;
        }

        let mut icon_info = ICONINFO::default();
        if GetIconInfo(hicon, &mut icon_info).is_err() {
            let _ = DestroyIcon(hicon);
            return None;
        }

        let hbm_color = icon_info.hbmColor;
        let hbm_mask = icon_info.hbmMask;

        let _ = DestroyIcon(hicon);

        if hbm_color.is_invalid() {
            if !hbm_mask.is_invalid() {
                let _ = DeleteObject(hbm_mask);
            }
            return None;
        }

        let mut bm = BITMAP::default();
        if GetObjectW(
            hbm_color,
            std::mem::size_of::<BITMAP>() as i32,
            Some(&mut bm as *mut _ as *mut _),
        ) == 0
        {
            let _ = DeleteObject(hbm_color);
            if !hbm_mask.is_invalid() {
                let _ = DeleteObject(hbm_mask);
            }
            return None;
        }

        let width = bm.bmWidth as u32;
        let bm_height = bm.bmHeight as u32;

        let mut height = bm_height;
        if height > 256 {
            height = height / 2;
        }

        if width == 0 || height == 0 || width > 256 || height > 256 {
            let _ = DeleteObject(hbm_color);
            if !hbm_mask.is_invalid() {
                let _ = DeleteObject(hbm_mask);
            }
            return None;
        }

        let mem_dc = CreateCompatibleDC(HDC::default());

        let _old_bitmap = SelectObject(mem_dc, hbm_color);

        let mut bmi = BITMAPINFO::default();
        bmi.bmiHeader.biSize = std::mem::size_of::<BITMAPINFOHEADER>() as u32;
        bmi.bmiHeader.biWidth = width as i32;
        bmi.bmiHeader.biHeight = height as i32;
        bmi.bmiHeader.biPlanes = 1;
        bmi.bmiHeader.biBitCount = 32;
        bmi.bmiHeader.biCompression = BI_RGB.0 as u32;

        let buffer_size = (width as usize) * (height as usize) * 4;
        let mut pixels: Vec<u8> = vec![0u8; buffer_size];

        let scan_lines = GetDIBits(
            mem_dc,
            hbm_color,
            0,
            height,
            Some(pixels.as_mut_ptr() as *mut _),
            &mut bmi,
            DIB_RGB_COLORS,
        );

        let _ = DeleteDC(mem_dc);
        let _ = DeleteObject(hbm_color);
        if !hbm_mask.is_invalid() {
            let _ = DeleteObject(hbm_mask);
        }

        if scan_lines == 0 {
            return None;
        }

        let actual_height = std::cmp::min(height, scan_lines as u32);
        let actual_width = width;

        let actual_size = (actual_width as usize) * (actual_height as usize) * 4;
        if pixels.len() != actual_size {
            return None;
        }

        let img_width = actual_width as usize;
        let img_height = actual_height as usize;
        let mut flipped_pixels: Vec<u8> = Vec::with_capacity(actual_size);

        for y in (0..img_height).rev() {
            let row_start = y * img_width * 4;
            let row_end = row_start + img_width * 4;
            let row = &pixels[row_start..row_end];

            for chunk in row.chunks(4) {
                flipped_pixels.push(chunk[2]);
                flipped_pixels.push(chunk[1]);
                flipped_pixels.push(chunk[0]);
                flipped_pixels.push(chunk[3]);
            }
        }

        let img_buffer = image::RgbaImage::from_raw(actual_width, actual_height, flipped_pixels)?;

        let mut png_bytes: Vec<u8> = Vec::new();
        let mut cursor = std::io::Cursor::new(&mut png_bytes);

        if img_buffer
            .write_to(&mut cursor, image::ImageFormat::Png)
            .is_ok()
        {
            let base64_data =
                base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &png_bytes);
            Some(format!("data:image/png;base64,{}", base64_data))
        } else {
            None
        }
    }
}

#[cfg(target_os = "macos")]
pub fn extract_icon_base64(icon_spec: &str) -> Option<String> {
    // icon_spec is the .app bundle path on macOS
    let app_path = std::path::Path::new(icon_spec);
    if !app_path.exists() || !icon_spec.ends_with(".app") {
        return None;
    }

    // Read Info.plist to find the icon filename
    let plist_path = app_path.join("Contents").join("Info.plist");
    let plist_data = std::fs::read(&plist_path).ok()?;
    let plist_value: plist::Value = plist::Value::from_reader_xml(&plist_data.as_slice()).ok()?;

    let icon_name = plist_value
        .as_dictionary()
        .and_then(|dict| dict.get("CFBundleIconFile"))
        .and_then(|v| v.as_string())
        .map(|s| s.to_string())?;

    // The icon name in plist may or may not include .icns extension
    let icon_file_name = if icon_name.ends_with(".icns") {
        icon_name
    } else {
        format!("{}.icns", icon_name)
    };

    let resources_dir = app_path.join("Contents").join("Resources");
    let icon_path = resources_dir.join(&icon_file_name);

    // Read the .icns file
    let icns_data = std::fs::read(&icon_path).ok()?;

    // Parse ICNS format and extract embedded PNG data
    // ICNS magic: 0x69636E73 ("icns"), followed by file size (u32 BE)
    if icns_data.len() < 8 {
        return None;
    }
    let magic = u32::from_be_bytes([icns_data[0], icns_data[1], icns_data[2], icns_data[3]]);
    if magic != 0x6963_6E73 {
        return None;
    }

    let mut offset = 8;
    let mut best_png: Option<&[u8]> = None;
    let mut best_size: u32 = 0;

    while offset + 8 <= icns_data.len() {
        let entry_type = u32::from_be_bytes([
            icns_data[offset],
            icns_data[offset + 1],
            icns_data[offset + 2],
            icns_data[offset + 3],
        ]);
        let entry_size = u32::from_be_bytes([
            icns_data[offset + 4],
            icns_data[offset + 5],
            icns_data[offset + 6],
            icns_data[offset + 7],
        ]);

        if entry_size < 8 || offset + entry_size as usize > icns_data.len() {
            break;
        }

        let data_start = offset + 8;
        let data_end = offset + entry_size as usize;
        let entry_data = &icns_data[data_start..data_end];

        // Check if the entry data is PNG (starts with PNG magic bytes)
        if entry_data.len() > 8
            && entry_data[0] == 0x89
            && entry_data[1] == b'P'
            && entry_data[2] == b'N'
            && entry_data[3] == b'G'
        {
            // Determine size from type code
            let size = match entry_type {
                0x6963_3039 => 512, // ic09 = 512x512
                0x6963_3130 => 1024, // ic10 = 1024x1024
                0x6963_3037 => 256, // ic07 = 256x256
                0x6963_3038 => 128, // ic08 = 128x128
                0x6963_3036 => 64,  // ic06 = 64x64
                _ => entry_data.len() as u32, // fallback: use data size
            };
            if size > best_size {
                best_size = size;
                best_png = Some(entry_data);
            }
        }

        offset += entry_size as usize;
    }

    let png_data = best_png?;

    // Resize to 32x32 for consistency with Windows icons
    let dyn_image = image::load_from_memory(png_data).ok()?;
    let rgba_image = dyn_image.to_rgba8();
    let resized = image::imageops::resize(&rgba_image, 32, 32, image::imageops::FilterType::Lanczos3);

    let mut png_bytes: Vec<u8> = Vec::new();
    let mut cursor = std::io::Cursor::new(&mut png_bytes);
    resized
        .write_to(&mut cursor, image::ImageFormat::Png)
        .ok()?;

    let base64_data =
        base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &png_bytes);
    Some(format!("data:image/png;base64,{}", base64_data))
}

#[cfg(not(any(windows, target_os = "macos")))]
pub fn extract_icon_base64(_icon_spec: &str) -> Option<String> {
    None
}

pub fn generate_letter_icon(name: &str) -> Option<String> {
    let width = 32u32;
    let height = 32u32;

    let mut img = image::RgbaImage::new(width, height);

    let color = generate_color_from_string(name);

    for (_, _, pixel) in img.enumerate_pixels_mut() {
        *pixel = image::Rgba([color.0, color.1, color.2, 255]);
    }

    let mut png_bytes: Vec<u8> = Vec::new();
    let mut cursor = std::io::Cursor::new(&mut png_bytes);

    if img.write_to(&mut cursor, image::ImageFormat::Png).is_ok() {
        let base64_data =
            base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &png_bytes);
        Some(format!("data:image/png;base64,{}", base64_data))
    } else {
        None
    }
}

pub fn read_icon_file(icon_path: &str) -> Option<String> {
    if !icon_path.contains('/') && !icon_path.contains('\\') && !icon_path.starts_with('.') {
        return None;
    }

    let expanded_path = if icon_path.starts_with('~') {
        if let Ok(home) = std::env::var("HOME") {
            format!("{}{}", home, &icon_path[1..])
        } else {
            icon_path.to_string()
        }
    } else {
        icon_path.to_string()
    };

    if let Ok(file_data) = std::fs::read(&expanded_path) {
        if let Ok(dyn_image) = image::load_from_memory(&file_data) {
            let mut png_bytes: Vec<u8> = Vec::new();
            let mut cursor = std::io::Cursor::new(&mut png_bytes);
            if dyn_image
                .write_to(&mut cursor, image::ImageFormat::Png)
                .is_ok()
            {
                let base64_data =
                    base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &png_bytes);
                return Some(format!("data:image/png;base64,{}", base64_data));
            }
        }
    }

    None
}
