#[tauri::command]
pub fn execute_shell_command(command: String) -> Result<(), String> {
    #[cfg(windows)]
    {
        use windows::Win32::Foundation::HWND;
        use windows::Win32::System::Com::{CoInitializeEx, COINIT_MULTITHREADED};
        use windows::Win32::UI::Shell::ShellExecuteW;
        use windows::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;

        unsafe {
            let _ = CoInitializeEx(None, COINIT_MULTITHREADED);

            let command_wide: Vec<u16> = command.encode_utf16().chain(std::iter::once(0)).collect();

            let result = ShellExecuteW(
                HWND::default(),
                windows::core::PCWSTR::null(),
                windows::core::PCWSTR(command_wide.as_ptr()),
                windows::core::PCWSTR::null(),
                windows::core::PCWSTR::null(),
                SW_SHOWNORMAL,
            );

            if result.is_invalid() {
                return Err(format!("Failed to execute command: ShellExecuteW failed"));
            }

            Ok(())
        }
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
