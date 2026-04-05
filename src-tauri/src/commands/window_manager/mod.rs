use super::WindowInfo;

#[cfg(windows)]
mod platform {
    use super::WindowInfo;
    use std::ffi::OsString;
    use std::os::windows::ffi::OsStringExt;
    use std::sync::Mutex;
    use windows::Win32::Foundation::{BOOL, HWND, LPARAM};
    use windows::Win32::UI::WindowsAndMessaging::{
        EnumWindows, GetWindowLongW, GetWindowTextW, GetWindowThreadProcessId, IsWindowVisible,
        IsZoomed, PostMessageW, SetForegroundWindow, SetWindowPos, ShowWindow, GWL_EXSTYLE,
        GWL_STYLE, HWND_NOTOPMOST, HWND_TOPMOST, SWP_NOMOVE, SWP_NOSIZE, SW_MAXIMIZE, SW_MINIMIZE,
        SW_RESTORE, WM_CLOSE, WS_EX_TOPMOST, WS_MINIMIZE,
    };

    struct EnumData {
        windows: Mutex<Vec<WindowInfo>>,
    }

    unsafe extern "system" fn enum_windows_callback(hwnd: HWND, lparam: LPARAM) -> BOOL {
        let data = &*(lparam.0 as *const EnumData);

        if !IsWindowVisible(hwnd).as_bool() {
            return BOOL(1);
        }

        let mut title_buf = [0u16; 512];
        let title_len = GetWindowTextW(hwnd, &mut title_buf);
        if title_len == 0 {
            return BOOL(1);
        }
        let title = OsString::from_wide(&title_buf[..title_len as usize])
            .to_string_lossy()
            .into_owned();

        if title.is_empty() || title.contains("Spotlight") {
            return BOOL(1);
        }

        let mut process_id: u32 = 0;
        GetWindowThreadProcessId(hwnd, Some(&mut process_id));
        let process_name = get_process_name(process_id);

        let is_minimized = (GetWindowLongW(hwnd, GWL_STYLE) as u32 & WS_MINIMIZE.0) != 0;
        let is_maximized = IsZoomed(hwnd).as_bool();
        let ex_style = GetWindowLongW(hwnd, GWL_EXSTYLE) as u32;
        let is_always_on_top = (ex_style & WS_EX_TOPMOST.0) != 0;

        let window_info = WindowInfo {
            hwnd: hwnd.0 as isize,
            title,
            process_name,
            is_visible: true,
            is_minimized,
            is_maximized,
            is_always_on_top,
        };

        data.windows.lock().unwrap().push(window_info);
        BOOL(1)
    }

    fn get_process_name(process_id: u32) -> String {
        unsafe {
            if let Ok(handle) = windows::Win32::System::Threading::OpenProcess(
                windows::Win32::System::Threading::PROCESS_QUERY_LIMITED_INFORMATION,
                false,
                process_id,
            ) {
                let mut name_buf = [0u16; 512];
                let mut size = 512u32;
                if windows::Win32::System::Threading::QueryFullProcessImageNameW(
                    handle,
                    windows::Win32::System::Threading::PROCESS_NAME_FORMAT(0),
                    windows::core::PWSTR(name_buf.as_mut_ptr()),
                    &mut size,
                )
                .is_ok()
                {
                    let path = OsString::from_wide(&name_buf[..size as usize])
                        .to_string_lossy()
                        .into_owned();
                    if let Some(name) = path.rsplit('\\').next() {
                        return name.to_string();
                    }
                    return path;
                }
            }
        }
        format!("PID:{}", process_id)
    }

    pub fn list_windows_impl() -> Vec<WindowInfo> {
        let data = EnumData {
            windows: Mutex::new(Vec::new()),
        };
        unsafe {
            let _ = EnumWindows(
                Some(enum_windows_callback),
                LPARAM(&data as *const EnumData as isize),
            );
        }
        data.windows.into_inner().unwrap()
    }

    pub fn minimize_window_impl(hwnd: isize) -> Result<(), String> {
        unsafe {
            let _ = ShowWindow(HWND(hwnd as *mut std::ffi::c_void), SW_MINIMIZE);
            Ok(())
        }
    }

    pub fn maximize_window_impl(hwnd: isize) -> Result<(), String> {
        unsafe {
            let _ = ShowWindow(HWND(hwnd as *mut std::ffi::c_void), SW_MAXIMIZE);
            Ok(())
        }
    }

    pub fn restore_window_impl(hwnd: isize) -> Result<(), String> {
        unsafe {
            let _ = ShowWindow(HWND(hwnd as *mut std::ffi::c_void), SW_RESTORE);
            Ok(())
        }
    }

    pub fn close_window_impl(hwnd: isize) -> Result<(), String> {
        unsafe {
            PostMessageW(HWND(hwnd as *mut std::ffi::c_void), WM_CLOSE, None, None)
                .map_err(|e| e.to_string())
        }
    }

    pub fn set_window_always_on_top_impl(hwnd: isize, on_top: bool) -> Result<(), String> {
        unsafe {
            let insert_after = if on_top { HWND_TOPMOST } else { HWND_NOTOPMOST };
            SetWindowPos(
                HWND(hwnd as *mut std::ffi::c_void),
                insert_after,
                0,
                0,
                0,
                0,
                SWP_NOSIZE | SWP_NOMOVE,
            )
            .map_err(|e| e.to_string())
        }
    }

    pub fn focus_window_impl(hwnd: isize) -> Result<(), String> {
        unsafe {
            if SetForegroundWindow(HWND(hwnd as *mut std::ffi::c_void)).as_bool() {
                Ok(())
            } else {
                Err("Failed to bring window to foreground".to_string())
            }
        }
    }
}

#[cfg(not(windows))]
mod platform {
    use super::WindowInfo;

    pub fn list_windows_impl() -> Vec<WindowInfo> {
        Vec::new()
    }

    pub fn minimize_window_impl(_hwnd: isize) -> Result<(), String> {
        Err("Not supported on this platform".to_string())
    }

    pub fn maximize_window_impl(_hwnd: isize) -> Result<(), String> {
        Err("Not supported on this platform".to_string())
    }

    pub fn restore_window_impl(_hwnd: isize) -> Result<(), String> {
        Err("Not supported on this platform".to_string())
    }

    pub fn close_window_impl(_hwnd: isize) -> Result<(), String> {
        Err("Not supported on this platform".to_string())
    }

    pub fn set_window_always_on_top_impl(_hwnd: isize, _on_top: bool) -> Result<(), String> {
        Err("Not supported on this platform".to_string())
    }

    pub fn focus_window_impl(_hwnd: isize) -> Result<(), String> {
        Err("Not supported on this platform".to_string())
    }
}

#[tauri::command]
pub fn list_windows() -> Result<Vec<WindowInfo>, String> {
    Ok(platform::list_windows_impl())
}

#[tauri::command]
pub fn minimize_window(hwnd: isize) -> Result<(), String> {
    platform::minimize_window_impl(hwnd)
}

#[tauri::command]
pub fn maximize_window(hwnd: isize) -> Result<(), String> {
    platform::maximize_window_impl(hwnd)
}

#[tauri::command]
pub fn restore_window(hwnd: isize) -> Result<(), String> {
    platform::restore_window_impl(hwnd)
}

#[tauri::command]
pub fn close_window(hwnd: isize) -> Result<(), String> {
    platform::close_window_impl(hwnd)
}

#[tauri::command]
pub fn set_window_always_on_top(hwnd: isize, on_top: bool) -> Result<(), String> {
    platform::set_window_always_on_top_impl(hwnd, on_top)
}

#[tauri::command]
pub fn focus_window(hwnd: isize) -> Result<(), String> {
    platform::focus_window_impl(hwnd)
}
