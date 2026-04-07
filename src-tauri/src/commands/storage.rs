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
        // Wrap path in quotes for paths with spaces
        let quoted_path = format!("\"{}\"", normalized_path);
        Command::new("explorer")
            .args(["/select,", &quoted_path])
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

#[cfg(windows)]
#[tauri::command]
pub fn read_file_elevated(path: String) -> Result<String, String> {
    // Try to read directly first
    match std::fs::read_to_string(&path) {
        Ok(content) => Ok(content),
        Err(_) => {
            // Direct read failed, try elevated
            run_elevated_read(&path)
        }
    }
}

#[cfg(windows)]
fn run_elevated_read(path: &str) -> Result<String, String> {
    use windows::Win32::UI::Shell::ShellExecuteW;
    use windows::Win32::UI::WindowsAndMessaging::SW_HIDE;
    use windows::core::PCWSTR;
    use std::env;

    let temp_dir = env::temp_dir();
    let script_path = temp_dir.join("read_hosts.ps1");
    let output_path = temp_dir.join("hosts_output.txt");

    // PowerShell script to read file with elevation
    let script = format!(
        r#"$content = Get-Content -Path '{}' -Raw -Encoding UTF8; $content | Out-File -FilePath '{}' -Encoding UTF8 -Force"#,
        path.replace("\\", "\\\\"),
        output_path.to_string_lossy().replace("\\", "\\\\")
    );

    std::fs::write(&script_path, &script).map_err(|e| e.to_string())?;

    let params = format!(
        "-ExecutionPolicy Bypass -File \"{}\"",
        script_path.to_string_lossy()
    );
    let params_wide: Vec<u16> = params.encode_utf16().chain(std::iter::once(0)).collect();

    unsafe {
        let operation: PCWSTR = windows::core::w!("runas");
        let file: PCWSTR = windows::core::w!("powershell.exe");
        let params: PCWSTR = PCWSTR(params_wide.as_ptr());

        ShellExecuteW(None, operation, file, params, None, SW_HIDE);
    }

    // Wait for the elevated process to complete
    std::thread::sleep(std::time::Duration::from_millis(1000));

    let output = if output_path.exists() {
        std::fs::read_to_string(&output_path).unwrap_or_default()
    } else {
        String::new()
    };

    let _ = std::fs::remove_file(&script_path);
    let _ = std::fs::remove_file(&output_path);

    Ok(output)
}

#[cfg(windows)]
#[tauri::command]
pub fn write_file_elevated(path: String, content: String) -> Result<(), String> {
    use std::fs::File;
    use std::io::Write;

    // Try to write directly first
    match File::create(&path) {
        Ok(mut file) => {
            if let Err(_e) = file.write_all(content.as_bytes()) {
                return run_elevated_write(&path, &content);
            }
            Ok(())
        }
        Err(_) => run_elevated_write(&path, &content),
    }
}

#[cfg(windows)]
fn run_elevated_write(path: &str, content: &str) -> Result<(), String> {
    use windows::Win32::UI::Shell::ShellExecuteW;
    use windows::Win32::UI::WindowsAndMessaging::SW_HIDE;
    use windows::core::PCWSTR;
    use std::env;

    let temp_dir = env::temp_dir();
    let script_path = temp_dir.join("write_hosts.ps1");

    // Escape content for PowerShell
    let escaped_content = content
        .replace("\\", "\\\\")
        .replace("\"", "`\"");

    // PowerShell script to write file with elevation
    let script = format!(
        r#"Set-Content -Path '{}' -Value "{}" -Encoding UTF8 -Force"#,
        path.replace("\\", "\\\\"),
        escaped_content
    );

    std::fs::write(&script_path, &script).map_err(|e| e.to_string())?;

    let params = format!(
        "-ExecutionPolicy Bypass -File \"{}\"",
        script_path.to_string_lossy()
    );
    let params_wide: Vec<u16> = params.encode_utf16().chain(std::iter::once(0)).collect();

    unsafe {
        let operation: PCWSTR = windows::core::w!("runas");
        let file: PCWSTR = windows::core::w!("powershell.exe");
        let params: PCWSTR = PCWSTR(params_wide.as_ptr());

        ShellExecuteW(None, operation, file, params, None, SW_HIDE);
    }

    // Wait for the elevated process to complete
    std::thread::sleep(std::time::Duration::from_millis(500));

    let _ = std::fs::remove_file(&script_path);

    Ok(())
}

#[cfg(not(windows))]
#[tauri::command]
pub fn read_file_elevated(path: String) -> Result<String, String> {
    std::fs::read_to_string(path).map_err(|e| e.to_string())
}

#[cfg(not(windows))]
#[tauri::command]
pub fn write_file_elevated(path: String, content: String) -> Result<(), String> {
    std::fs::write(path, content).map_err(|e| e.to_string())
}
