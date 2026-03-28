#[cfg(windows)]
struct ShortcutInfo {
    target_path: String,
    arguments: String,
}

#[cfg(windows)]
fn resolve_shortcut(path: &str) -> Result<ShortcutInfo, String> {
    use windows::core::Interface;
    use windows::Win32::System::Com::IPersistFile;
    use windows::Win32::System::Com::{
        CoCreateInstance, CoInitializeEx, CLSCTX_ALL, COINIT_MULTITHREADED, STGM,
    };
    use windows::Win32::UI::Shell::IShellLinkW;

    let path_wide: Vec<u16> = path.encode_utf16().chain(std::iter::once(0)).collect();

    unsafe {
        let _ = CoInitializeEx(None, COINIT_MULTITHREADED);

        let shell_link: IShellLinkW =
            CoCreateInstance(&windows::Win32::UI::Shell::ShellLink, None, CLSCTX_ALL)
                .map_err(|e| format!("Failed to create ShellLink: {:?}", e))?;

        let persist_file: IPersistFile = shell_link
            .cast()
            .map_err(|e| format!("Failed to cast to IPersistFile: {:?}", e))?;

        persist_file
            .Load(windows::core::PCWSTR(path_wide.as_ptr()), STGM(0))
            .map_err(|e| format!("Failed to load shortcut: {:?}", e))?;

        let mut target_path = [0u16; 260];
        let mut find_data =
            std::mem::zeroed::<windows::Win32::Storage::FileSystem::WIN32_FIND_DATAW>();

        shell_link
            .GetPath(&mut target_path, &mut find_data, 0)
            .map_err(|e| format!("Failed to get target path: {:?}", e))?;

        let target = String::from_utf16_lossy(&target_path);
        let target = target.trim_end_matches('\0');

        let mut args_buf = [0u16; 1024];
        shell_link
            .GetArguments(&mut args_buf)
            .map_err(|e| format!("Failed to get arguments: {:?}", e))?;
        let args = String::from_utf16_lossy(&args_buf);
        let args = args.trim_end_matches('\0');

        if target.is_empty() {
            Err("Shortcut target is empty".to_string())
        } else {
            Ok(ShortcutInfo {
                target_path: target.to_string(),
                arguments: args.to_string(),
            })
        }
    }
}

#[tauri::command]
pub fn launch_app(path: String) -> Result<(), String> {
    #[cfg(windows)]
    {
        use windows::Win32::Foundation::HWND;
        use windows::Win32::UI::Shell::ShellExecuteW;
        use windows::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;

        let (target_path, arguments) = if path.to_lowercase().ends_with(".lnk") {
            match resolve_shortcut(&path) {
                Ok(info) => (info.target_path, info.arguments),
                Err(_) => (path, String::new()),
            }
        } else {
            (path, String::new())
        };

        let path_wide: Vec<u16> = target_path
            .encode_utf16()
            .chain(std::iter::once(0))
            .collect();
        let args_wide: Vec<u16> = arguments.encode_utf16().chain(std::iter::once(0)).collect();

        unsafe {
            let result = ShellExecuteW(
                HWND::default(),
                windows::core::PCWSTR::null(),
                windows::core::PCWSTR(path_wide.as_ptr()),
                windows::core::PCWSTR(args_wide.as_ptr()),
                windows::core::PCWSTR::null(),
                SW_SHOWNORMAL,
            );

            if result.is_invalid() {
                return Err("Failed to launch app: ShellExecuteW failed".to_string());
            }
        }

        Ok(())
    }

    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to launch app: {}", e))?;
        Ok(())
    }

    #[cfg(target_os = "linux")]
    {
        use std::process::Command;
        Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to launch app: {}", e))?;
        Ok(())
    }

    #[cfg(not(any(windows, target_os = "macos", target_os = "linux")))]
    {
        Err("Unsupported platform".to_string())
    }
}
