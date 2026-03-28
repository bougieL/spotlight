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

#[cfg(windows)]
fn find_running_app(exe_path: &str, _arguments: &str) -> Option<u32> {
    use windows::Win32::System::Diagnostics::ToolHelp::{
        CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W,
        TH32CS_SNAPPROCESS,
    };
    use windows::Win32::System::Threading::{
        OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32, PROCESS_QUERY_INFORMATION,
    };

    unsafe {
        let snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0).ok()?;

        let mut entry = PROCESSENTRY32W {
            dwSize: std::mem::size_of::<PROCESSENTRY32W>() as u32,
            ..std::mem::zeroed()
        };

        if Process32FirstW(snapshot, &mut entry).is_ok() {
            loop {
                if let Ok(handle) =
                    OpenProcess(PROCESS_QUERY_INFORMATION, false, entry.th32ProcessID)
                {
                    let mut path_buf = [0u16; 260];
                    let mut buf_len = path_buf.len() as u32;
                    if QueryFullProcessImageNameW(
                        handle,
                        PROCESS_NAME_WIN32,
                        windows::core::PWSTR(path_buf.as_mut_ptr()),
                        &mut buf_len,
                    )
                    .is_ok()
                    {
                        let process_path = String::from_utf16_lossy(&path_buf[..buf_len as usize]);
                        let process_exe = process_path
                            .rsplit('\\')
                            .next()
                            .unwrap_or_default()
                            .to_lowercase();
                        let target_exe = exe_path
                            .rsplit('\\')
                            .next()
                            .unwrap_or_default()
                            .to_lowercase();

                        if process_exe == target_exe {
                            let _ = windows::Win32::Foundation::CloseHandle(handle);
                            let _ = windows::Win32::Foundation::CloseHandle(snapshot);
                            return Some(entry.th32ProcessID);
                        }
                    }
                    let _ = windows::Win32::Foundation::CloseHandle(handle);
                }

                if Process32NextW(snapshot, &mut entry).is_err() {
                    break;
                }
            }
        }

        let _ = windows::Win32::Foundation::CloseHandle(snapshot);
        None
    }
}

#[cfg(windows)]
fn find_window_by_pid(pid: u32) -> Option<windows::Win32::Foundation::HWND> {
    use windows::Win32::Foundation::{BOOL, HWND, LPARAM};
    use windows::Win32::UI::WindowsAndMessaging::{
        EnumWindows, GetWindowThreadProcessId, IsWindowVisible,
    };

    struct EnumData {
        pid: u32,
        hwnd: Option<HWND>,
    }

    unsafe extern "system" fn enum_windows_proc(hwnd: HWND, lparam: LPARAM) -> BOOL {
        let data = &mut *(lparam.0 as *mut EnumData);

        if !IsWindowVisible(hwnd).as_bool() {
            return BOOL(1);
        }

        let mut window_pid: u32 = 0;
        GetWindowThreadProcessId(hwnd, Some(&mut window_pid));

        if window_pid == data.pid {
            data.hwnd = Some(hwnd);
            return BOOL(0);
        }

        BOOL(1)
    }

    let mut data = EnumData { pid, hwnd: None };

    unsafe {
        let _ = EnumWindows(
            Some(enum_windows_proc),
            LPARAM(&mut data as *mut _ as isize),
        );
        data.hwnd
    }
}

#[cfg(windows)]
fn find_running_app_by_title(keyword: &str) -> Option<windows::Win32::Foundation::HWND> {
    use windows::Win32::Foundation::{BOOL, HWND, LPARAM};
    use windows::Win32::UI::WindowsAndMessaging::{
        EnumWindows, GetWindowTextLengthW, GetWindowTextW, IsWindowVisible,
    };

    struct EnumData {
        keyword: String,
        hwnd: Option<HWND>,
    }

    unsafe extern "system" fn enum_windows_proc(hwnd: HWND, lparam: LPARAM) -> BOOL {
        let data = &mut *(lparam.0 as *mut EnumData);

        if !IsWindowVisible(hwnd).as_bool() {
            return BOOL(1);
        }

        let len = GetWindowTextLengthW(hwnd);
        if len > 0 {
            let mut title = vec![0u16; (len + 1) as usize];
            GetWindowTextW(hwnd, &mut title);
            let title_str = String::from_utf16_lossy(&title[..len as usize]);
            if title_str
                .to_lowercase()
                .contains(&data.keyword.to_lowercase())
            {
                data.hwnd = Some(hwnd);
                return BOOL(0);
            }
        }

        BOOL(1)
    }

    let mut data = EnumData {
        keyword: keyword.to_string(),
        hwnd: None,
    };

    unsafe {
        let _ = EnumWindows(
            Some(enum_windows_proc),
            LPARAM(&mut data as *mut _ as isize),
        );
        data.hwnd
    }
}

#[tauri::command]
pub fn launch_app(path: String) -> Result<(), String> {
    #[cfg(windows)]
    {
        use windows::Win32::Foundation::HWND;
        use windows::Win32::UI::Shell::ShellExecuteW;
        use windows::Win32::UI::WindowsAndMessaging::{
            SetForegroundWindow, ShowWindow, SW_RESTORE, SW_SHOWNORMAL,
        };

        let title_keyword = std::path::Path::new(&path)
            .file_stem()
            .and_then(|n| n.to_str())
            .unwrap_or_default();

        let (target_path, arguments) = if path.to_lowercase().ends_with(".lnk") {
            match resolve_shortcut(&path) {
                Ok(info) => (info.target_path, info.arguments),
                Err(_) => (path.clone(), String::new()),
            }
        } else {
            (path.clone(), String::new())
        };

        // Try to find existing window by title (works for Chrome PWAs and most apps)
        if let Some(hwnd) = find_running_app_by_title(title_keyword) {
            unsafe {
                let _ = ShowWindow(hwnd, SW_RESTORE);
                let _ = SetForegroundWindow(hwnd);
            }
            return Ok(());
        }

        // Fallback: check by process path and bring window to front
        if let Some(pid) = find_running_app(&target_path, &arguments) {
            if let Some(hwnd) = find_window_by_pid(pid) {
                unsafe {
                    let _ = ShowWindow(hwnd, SW_RESTORE);
                    let _ = SetForegroundWindow(hwnd);
                }
            }
            return Ok(());
        }

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
