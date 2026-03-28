use chrono::Local;
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;

/// Get the log directory based on the environment
pub fn get_log_dir() -> PathBuf {
    if cfg!(debug_assertions) {
        // In development, use devLogs folder next to the executable
        if let Ok(exe_path) = std::env::current_exe() {
            exe_path
                .parent()
                .map(|p| p.to_path_buf())
                .unwrap_or_default()
                .join("devLogs")
        } else {
            PathBuf::from("devLogs")
        }
    } else {
        // In release, this will be set via init()
        PathBuf::from("logs")
    }
}

/// Initialize the log directory (for release mode with app_data_dir)
pub fn init_log_dir(app_data_dir: &PathBuf) -> PathBuf {
    app_data_dir.join("logs")
}

/// Write a log entry to file
pub fn write_log_entry(log_dir: &PathBuf, level: &str, message: &str) -> Result<(), String> {
    fs::create_dir_all(log_dir).map_err(|e| e.to_string())?;

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
