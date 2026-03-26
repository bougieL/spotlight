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

    // First frame might be empty, try to get a valid one
    let mut frame = dup
        .acquire_next_frame(1000)
        .map_err(|e| format!("Failed to acquire frame: {}", e))?;

    // If first frame is empty (no content yet), get another
    if frame.frame_info().LastPresentTime == 0 {
        frame = dup
            .acquire_next_frame(100)
            .map_err(|e| format!("Failed to acquire second frame: {}", e))?;
    }

    let width = frame.width() as i32;
    let height = frame.height() as i32;

    let temp_dir = std::env::temp_dir();
    let file_name = format!("spotlight_screenshot_{}.png", uuid::Uuid::new_v4());
    let file_path: PathBuf = temp_dir.join(&file_name);

    frame
        .save_as_image(&file_path, ImageFormat::Png)
        .map_err(|e| format!("Failed to save: {}", e))?;

    let file_path_str = file_path.to_string_lossy().replace('\\', "/");

    Ok(ScreenCapture {
        file_path: file_path_str,
        width,
        height,
    })
}

#[derive(serde::Serialize)]
pub struct ScreenCapture {
    #[serde(rename = "filePath")]
    pub file_path: String,
    pub width: i32,
    pub height: i32,
}

#[cfg(not(windows))]
#[tauri::command]
pub fn capture_full_screen() -> Result<ScreenCapture, String> {
    Err("Screen capture is not supported on this platform".to_string())
}
