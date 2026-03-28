use crate::utils::logger::{get_log_dir, init_log_dir, write_log_entry};
use tauri::Manager;

#[tauri::command]
pub fn write_log(
    level: String,
    message: String,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let log_dir = if cfg!(debug_assertions) {
        get_log_dir()
    } else {
        init_log_dir(
            &app_handle
                .path()
                .app_data_dir()
                .map_err(|e: tauri::Error| e.to_string())?,
        )
    };

    write_log_entry(&log_dir, &level, &message)
}
