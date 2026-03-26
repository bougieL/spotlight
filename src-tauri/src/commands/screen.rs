use std::path::PathBuf;
use xcap::Monitor;

#[cfg(windows)]
#[tauri::command]
pub fn capture_full_screen() -> Result<ScreenCapture, String> {
    let monitors = Monitor::all().map_err(|e| format!("Failed to get monitors: {}", e))?;

    let monitor = monitors.first().ok_or("No monitor found")?;

    let image = monitor
        .capture_image()
        .map_err(|e| format!("Failed to capture: {}", e))?;

    let width = monitor.width() as i32;
    let height = monitor.height() as i32;

    let temp_dir = std::env::temp_dir();
    let file_name = format!("spotlight_screenshot_{}.bmp", uuid::Uuid::new_v4());
    let file_path: PathBuf = temp_dir.join(&file_name);

    image.save(&file_path).map_err(|e| format!("Failed to save: {}", e))?;

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
