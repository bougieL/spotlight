use std::fs;
use std::path::PathBuf;
use tauri::Manager;

#[tauri::command]
pub fn get_plugin_storage_dir(plugin_name: String, app_handle: tauri::AppHandle) -> Result<String, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e: tauri::Error| e.to_string())?;

    let storage_dir: PathBuf = app_data_dir.join("plugin_storage").join(&plugin_name);

    fs::create_dir_all(&storage_dir).map_err(|e| e.to_string())?;

    Ok(storage_dir.to_string_lossy().to_string())
}

#[tauri::command]
pub fn read_plugin_settings(plugin_name: String, app_handle: tauri::AppHandle) -> Result<String, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e: tauri::Error| e.to_string())?;

    let settings_file: PathBuf = app_data_dir
        .join("plugin_storage")
        .join(&plugin_name)
        .join("settings.json");

    if !settings_file.exists() {
        return Ok(String::new());
    }

    fs::read_to_string(&settings_file).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn write_plugin_settings(plugin_name: String, settings: String, app_handle: tauri::AppHandle) -> Result<(), String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e: tauri::Error| e.to_string())?;

    let storage_dir: PathBuf = app_data_dir
        .join("plugin_storage")
        .join(&plugin_name);

    fs::create_dir_all(&storage_dir).map_err(|e| e.to_string())?;

    let settings_file: PathBuf = storage_dir.join("settings.json");
    fs::write(&settings_file, settings).map_err(|e| e.to_string())
}
