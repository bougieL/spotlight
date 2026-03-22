use chrono::Local;
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use tauri::Manager;

#[tauri::command]
pub fn write_log(
    level: String,
    message: String,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    // Determine log directory based on environment
    let log_dir: PathBuf = if cfg!(debug_assertions) {
        // In development, use devLogs folder next to the executable
        if let Ok(exe_path) = std::env::current_exe() {
            exe_path.parent().map(|p| p.to_path_buf()).unwrap_or_default().join("devLogs")
        } else {
            PathBuf::from("devLogs")
        }
    } else {
        // In release, use app_data_dir/logs
        app_handle
            .path()
            .app_data_dir()
            .map_err(|e: tauri::Error| e.to_string())?
            .join("logs")
    };

    fs::create_dir_all(&log_dir).map_err(|e| e.to_string())?;

    let today = Local::now().format("%Y-%m-%d").to_string();
    let log_file: PathBuf = log_dir.join(format!("{}.log", today));

    let timestamp = Local::now().format("%Y-%m-%d %H:%M:%S%.3f").to_string();
    let log_entry = format!("[{}] [{}] {}\n", timestamp, level, message);

    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_file)
        .map_err(|e| e.to_string())?;

    file.write_all(log_entry.as_bytes())
        .map_err(|e| e.to_string())?;

    Ok(())
}