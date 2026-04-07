use std::fs;
use std::path::PathBuf;
use tauri::Manager;

#[tauri::command]
pub fn get_app_data_dir(app_handle: tauri::AppHandle) -> Result<String, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e: tauri::Error| e.to_string())?;

    Ok(app_data_dir.to_string_lossy().to_string())
}

#[tauri::command]
pub fn reveal_in_explorer(path: String) -> Result<(), String> {
    #[cfg(windows)]
    {
        use std::process::Command;
        // Convert forward slashes to backslashes for Windows
        let normalized_path = path.replace('/', "\\");
        Command::new("explorer")
            .args(["/select,", &normalized_path])
            .spawn()
            .map_err(|e| format!("Failed to reveal in explorer: {}", e))?;
        Ok(())
    }

    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        Command::new("open")
            .args(["-R", &path])
            .spawn()
            .map_err(|e| format!("Failed to reveal in finder: {}", e))?;
        Ok(())
    }

    #[cfg(target_os = "linux")]
    {
        use std::process::Command;
        Command::new("xdg-open")
            .arg(std::path::Path::new(&path).parent().unwrap_or(std::path::Path::new(&path)))
            .spawn()
            .map_err(|e| format!("Failed to reveal in file manager: {}", e))?;
        Ok(())
    }

    #[cfg(not(any(windows, target_os = "macos", target_os = "linux")))]
    {
        Err("Unsupported platform".to_string())
    }
}

#[tauri::command]
pub fn get_plugin_storage_dir(
    plugin_name: String,
    app_handle: tauri::AppHandle,
) -> Result<String, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e: tauri::Error| e.to_string())?;

    let storage_dir: PathBuf = app_data_dir.join("plugin_storage").join(&plugin_name);

    fs::create_dir_all(&storage_dir).map_err(|e| e.to_string())?;

    Ok(storage_dir.to_string_lossy().to_string())
}

#[tauri::command]
pub fn read_plugin_settings(
    plugin_name: String,
    app_handle: tauri::AppHandle,
) -> Result<String, String> {
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
pub fn write_plugin_settings(
    plugin_name: String,
    settings: String,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e: tauri::Error| e.to_string())?;

    let storage_dir: PathBuf = app_data_dir.join("plugin_storage").join(&plugin_name);

    fs::create_dir_all(&storage_dir).map_err(|e| e.to_string())?;

    let settings_file: PathBuf = storage_dir.join("settings.json");
    fs::write(&settings_file, settings).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn copy_directory(src: String, dst: String) -> Result<(), String> {
    if !PathBuf::from(&src).exists() {
        return Err(format!("Source directory does not exist: {}", src));
    }

    if PathBuf::from(&dst).exists() {
        fs::remove_dir_all(&dst).map_err(|e| format!("Failed to remove existing destination: {}", e))?;
    }

    copy_dir_all(&src, &dst).map_err(|e| format!("Failed to copy directory: {}", e))
}

fn copy_dir_all(src: &str, dst: &str) -> Result<(), String> {
    use std::process::Command;

    #[cfg(windows)]
    {
        Command::new("xcopy")
            .args([src, dst, "/E", "/I", "/Y", "/Q"])
            .output()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("cp")
            .args(["-R", src, dst])
            .output()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("cp")
            .args(["-R", src, dst])
            .output()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(not(any(windows, target_os = "macos", target_os = "linux")))]
    {
        return Err("Unsupported platform".to_string());
    }

    Ok(())
}
