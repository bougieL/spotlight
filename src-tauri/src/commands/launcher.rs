#[cfg(windows)]
fn resolve_shortcut(path: &str) -> Result<String, String> {
    use windows::core::Interface;
    use windows::Win32::System::Com::IPersistFile;
    use windows::Win32::System::Com::{
        CoCreateInstance, CoInitializeEx, CLSCTX_ALL, COINIT_MULTITHREADED, STGM,
    };
    use windows::Win32::UI::Shell::IShellLinkW;

    let path_wide: Vec<u16> = path.encode_utf16().chain(std::iter::once(0)).collect();

    unsafe {
        // Initialize COM
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

        if target.is_empty() {
            Err("Shortcut target is empty".to_string())
        } else {
            Ok(target.to_string())
        }
    }
}

#[tauri::command]
pub fn launch_app(path: String) -> Result<(), String> {
    println!("Rust: Received path: {}", path);

    #[cfg(windows)]
    {
        use windows::Win32::Foundation::HWND;
        use windows::Win32::UI::Shell::ShellExecuteW;
        use windows::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;

        // If it's a shortcut, resolve it first
        let target_path = if path.to_lowercase().ends_with(".lnk") {
            println!("Rust: Resolving shortcut: {}", path);
            match resolve_shortcut(&path) {
                Ok(target) => {
                    println!("Rust: Shortcut resolves to: {}", target);
                    target
                }
                Err(e) => {
                    println!(
                        "Rust: Failed to resolve shortcut: {}, using original path",
                        e
                    );
                    path
                }
            }
        } else {
            path
        };

        let path_wide: Vec<u16> = target_path
            .encode_utf16()
            .chain(std::iter::once(0))
            .collect();

        println!("Rust: Wide path length: {}", path_wide.len());

        unsafe {
            let result = ShellExecuteW(
                HWND::default(),
                windows::core::PCWSTR::null(),
                windows::core::PCWSTR(path_wide.as_ptr()),
                windows::core::PCWSTR::null(),
                windows::core::PCWSTR::null(),
                SW_SHOWNORMAL,
            );

            if result.is_invalid() {
                return Err(format!("Failed to launch app: ShellExecuteW failed"));
            }

            println!("Rust: ShellExecuteW success");
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
