#[cfg(windows)]
use windows::Win32::Graphics::Gdi::{
    BitBlt, CreateCompatibleDC, CreateDIBSection, DeleteDC, DeleteObject,
    GetDC, ReleaseDC, SelectObject, SRCCOPY,
};
#[cfg(windows)]
use windows::Win32::Graphics::Gdi::{BITMAPINFO, BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS};
#[cfg(windows)]
use windows::Win32::UI::WindowsAndMessaging::{
    GetSystemMetrics, SM_CXSCREEN, SM_CYSCREEN,
};

use std::io::Cursor;
use base64::Engine as _;
use base64::engine::general_purpose::STANDARD as BASE64;

#[cfg(windows)]
fn capture_full_screen_impl() -> Result<(Vec<u8>, i32, i32), String> {
    unsafe {
        let screen_width = GetSystemMetrics(SM_CXSCREEN);
        let screen_height = GetSystemMetrics(SM_CYSCREEN);

        if screen_width <= 0 || screen_height <= 0 {
            return Err("Invalid screen dimensions".to_string());
        }

        let screen_hdc = GetDC(None);
        if screen_hdc.is_invalid() {
            return Err("Failed to get screen device context".to_string());
        }

        let mem_dc = CreateCompatibleDC(screen_hdc);
        if mem_dc.is_invalid() {
            ReleaseDC(None, screen_hdc);
            return Err("Failed to create compatible DC".to_string());
        }

        let mut bmi = BITMAPINFO {
            bmiHeader: BITMAPINFOHEADER {
                biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
                biWidth: screen_width,
                biHeight: -screen_height,
                biPlanes: 1,
                biBitCount: 32,
                biCompression: BI_RGB.0 as u32,
                biSizeImage: 0,
                biXPelsPerMeter: 0,
                biYPelsPerMeter: 0,
                biClrUsed: 0,
                biClrImportant: 0,
            },
            bmiColors: [Default::default(); 1],
        };

        let mut bits: *mut std::ffi::c_void = std::ptr::null_mut();
        let bitmap = CreateDIBSection(mem_dc, &mut bmi, DIB_RGB_COLORS, &mut bits, None, 0);
        if bitmap.is_err() {
            let _ = DeleteDC(mem_dc);
            ReleaseDC(None, screen_hdc);
            return Err("Failed to create DIB section".to_string());
        }
        let bitmap = bitmap.unwrap();

        let old_bitmap = SelectObject(mem_dc, bitmap);
        let _ = BitBlt(
            mem_dc,
            0,
            0,
            screen_width,
            screen_height,
            screen_hdc,
            0,
            0,
            SRCCOPY,
        );
        SelectObject(mem_dc, old_bitmap);

        let pixel_count = (screen_width * screen_height) as usize;
        let pixels = if !bits.is_null() {
            std::slice::from_raw_parts::<u32>(bits as *const u32, pixel_count).to_vec()
        } else {
            vec![0u32; pixel_count]
        };

        let _ = DeleteObject(bitmap);
        let _ = DeleteDC(mem_dc);
        ReleaseDC(None, screen_hdc);

        // Convert BGRA to RGBA
        let mut rgba_pixels: Vec<u8> = Vec::with_capacity(pixel_count * 4);
        for pixel in pixels {
            // BGRA to RGBA
            rgba_pixels.push(((pixel >> 16) & 0xFF) as u8); // R
            rgba_pixels.push(((pixel >> 8) & 0xFF) as u8); // G
            rgba_pixels.push((pixel & 0xFF) as u8); // B
            rgba_pixels.push(0xFF); // A
        }

        // Create PNG using image crate
        let img_buffer =
            image::RgbaImage::from_raw(screen_width as u32, screen_height as u32, rgba_pixels)
                .ok_or("Failed to create image buffer")?;

        let mut png_data = Vec::new();
        let mut cursor = Cursor::new(&mut png_data);
        img_buffer
            .write_to(&mut cursor, image::ImageFormat::Png)
            .map_err(|e| format!("Failed to encode PNG: {}", e))?;

        Ok((png_data, screen_width, screen_height))
    }
}

#[cfg(windows)]
#[tauri::command]
pub fn capture_full_screen() -> Result<ScreenCapture, String> {
    let (png_data, width, height) = capture_full_screen_impl()?;
    let base64_image = BASE64.encode(&png_data);

    Ok(ScreenCapture {
        image_data: format!("data:image/png;base64,{}", base64_image),
        width,
        height,
    })
}

#[derive(serde::Serialize)]
pub struct ScreenCapture {
    pub image_data: String,
    pub width: i32,
    pub height: i32,
}

#[cfg(not(windows))]
#[tauri::command]
pub fn capture_full_screen() -> Result<ScreenCapture, String> {
    Err("Screen capture is not supported on this platform".to_string())
}
