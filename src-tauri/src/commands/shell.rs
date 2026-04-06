#[tauri::command]
pub fn execute_shell_command(command: String) -> Result<(), String> {
    #[cfg(windows)]
    {
        use std::process::Command;
        Command::new("cmd")
            .args(["/C", &command])
            .spawn()
            .map_err(|e| format!("Failed to execute command: {}", e))?;
        Ok(())
    }

    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        Command::new("sh")
            .arg("-c")
            .arg(&command)
            .spawn()
            .map_err(|e| format!("Failed to execute command: {}", e))?;
        Ok(())
    }

    #[cfg(target_os = "linux")]
    {
        use std::process::Command;
        Command::new("sh")
            .arg("-c")
            .arg(&command)
            .spawn()
            .map_err(|e| format!("Failed to execute command: {}", e))?;
        Ok(())
    }

    #[cfg(not(any(windows, target_os = "macos", target_os = "linux")))]
    {
        Err("Unsupported platform".to_string())
    }
}
