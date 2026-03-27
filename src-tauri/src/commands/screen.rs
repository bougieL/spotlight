use std::path::PathBuf;
use windows_capture::dxgi_duplication_api::DxgiDuplicationApi;
use windows_capture::encoder::ImageFormat;
use windows_capture::monitor::Monitor;

#[cfg(windows)]
#[tauri::command]
pub fn capture_full_screen() -> Result<ScreenCapture, String> {
    let monitor = Monitor::primary().map_err(|e| format!("Failed to get primary monitor: {}", e))?;

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
    let image_data = std::fs::read(&file_path)
        .map_err(|e| format!("Failed to read image: {}", e))?;
    let base64_data = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &image_data);

    // Clean up temp file
    let _ = std::fs::remove_file(&file_path);

    let data_url = format!("data:image/png;base64,{}", base64_data);

    Ok(ScreenCapture {
        data_url,
        width,
        height,
    })
}

#[derive(serde::Serialize)]
pub struct ScreenCapture {
    #[serde(rename = "dataUrl")]
    pub data_url: String,
    pub width: i32,
    pub height: i32,
}

#[cfg(not(windows))]
#[tauri::command]
pub fn capture_full_screen() -> Result<ScreenCapture, String> {
    Err("Screen capture is not supported on this platform".to_string())
}
