use std::path::PathBuf;

#[derive(serde::Serialize)]
pub struct ScreenCapture {
    #[serde(rename = "dataUrl")]
    pub data_url: String,
    pub width: i32,
    pub height: i32,
}

#[cfg(windows)]
#[tauri::command]
pub fn capture_full_screen() -> Result<ScreenCapture, String> {
    use windows_capture::dxgi_duplication_api::DxgiDuplicationApi;
    use windows_capture::encoder::ImageFormat;
    use windows_capture::monitor::Monitor;

    let monitor =
        Monitor::primary().map_err(|e| format!("Failed to get primary monitor: {}", e))?;

    let mut dup = DxgiDuplicationApi::new(monitor)
        .map_err(|e| format!("Failed to create duplication API: {}", e))?;

    // Try to get a valid frame with retries
    let timeout = 2000;
    let mut frame = dup
        .acquire_next_frame(timeout)
        .map_err(|e| format!("Failed to acquire frame: {}", e))?;

    // If first frame is empty, try a few more times
    let mut attempts = 0;
    while frame.frame_info().LastPresentTime == 0 && attempts < 5 {
        frame = dup
            .acquire_next_frame(500)
            .map_err(|e| format!("Failed to acquire frame: {}", e))?;
        attempts += 1;
    }

    if frame.frame_info().LastPresentTime == 0 {
        return Err("Failed to capture screen: frame is empty".to_string());
    }

    let width = frame.width() as i32;
    let height = frame.height() as i32;

    let temp_dir = std::env::temp_dir();
    let file_name = format!("spotlight_screenshot_{}.png", uuid::Uuid::new_v4());
    let file_path: PathBuf = temp_dir.join(&file_name);

    frame
        .save_as_image(&file_path, ImageFormat::Png)
        .map_err(|e| format!("Failed to save: {}", e))?;

    // Read file and encode as base64
    let image_data =
        std::fs::read(&file_path).map_err(|e| format!("Failed to read image: {}", e))?;
    let base64_data =
        base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &image_data);

    // Clean up temp file
    let _ = std::fs::remove_file(&file_path);

    let data_url = format!("data:image/png;base64,{}", base64_data);

    Ok(ScreenCapture {
        data_url,
        width,
        height,
    })
}

#[cfg(target_os = "macos")]
#[tauri::command]
pub fn capture_full_screen() -> Result<ScreenCapture, String> {
    use std::process::Command;

    let temp_dir = std::env::temp_dir();
    let file_name = format!("spotlight_screenshot_{}.png", uuid::Uuid::new_v4());
    let file_path: PathBuf = temp_dir.join(&file_name);

    // Use macOS built-in screencapture tool
    // -x: no shadow, -t png: PNG format
    let status = Command::new("screencapture")
        .arg("-x")
        .arg("-t")
        .arg("png")
        .arg(file_path.to_str().unwrap_or(""))
        .output()
        .map_err(|e| format!("Failed to run screencapture: {}", e))?;

    if !status.status.success() {
        let stderr = String::from_utf8_lossy(&status.stderr);
        return Err(format!("screencapture failed: {}", stderr));
    }

    // Read the screenshot file
    let image_data =
        std::fs::read(&file_path).map_err(|e| format!("Failed to read screenshot: {}", e))?;

    // Get image dimensions
    let img = image::load_from_memory(&image_data)
        .map_err(|e| format!("Failed to decode image: {}", e))?;
    let width = img.width() as i32;
    let height = img.height() as i32;

    // Clean up temp file
    let _ = std::fs::remove_file(&file_path);

    // Encode as base64 data URL
    let base64_data =
        base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &image_data);
    let data_url = format!("data:image/png;base64,{}", base64_data);

    Ok(ScreenCapture {
        data_url,
        width,
        height,
    })
}

#[cfg(target_os = "linux")]
#[tauri::command]
pub fn capture_full_screen() -> Result<ScreenCapture, String> {
    use std::process::Command;

    let temp_dir = std::env::temp_dir();
    let file_name = format!("spotlight_screenshot_{}.png", uuid::Uuid::new_v4());
    let file_path: PathBuf = temp_dir.join(&file_name);

    // Try gnome-screenshot first, then import (ImageMagick)
    let result = Command::new("gnome-screenshot")
        .arg("-f")
        .arg(file_path.to_str().unwrap_or(""))
        .status();

    let success = match result {
        Ok(status) => status.success(),
        Err(_) => {
            // Fallback to ImageMagick import
            Command::new("import")
                .arg("-window")
                .arg("root")
                .arg(file_path.to_str().unwrap_or(""))
                .status()
                .map_err(|e| format!("No screenshot tool available: {}", e))?
                .success()
        }
    };

    if !success {
        return Err("Screenshot capture failed".to_string());
    }

    let image_data =
        std::fs::read(&file_path).map_err(|e| format!("Failed to read screenshot: {}", e))?;

    let img = image::load_from_memory(&image_data)
        .map_err(|e| format!("Failed to decode image: {}", e))?;
    let width = img.width() as i32;
    let height = img.height() as i32;

    let _ = std::fs::remove_file(&file_path);

    let base64_data =
        base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &image_data);
    let data_url = format!("data:image/png;base64,{}", base64_data);

    Ok(ScreenCapture {
        data_url,
        width,
        height,
    })
}

#[cfg(not(any(windows, target_os = "macos", target_os = "linux")))]
#[tauri::command]
pub fn capture_full_screen() -> Result<ScreenCapture, String> {
    Err("Screen capture is not supported on this platform".to_string())
}
