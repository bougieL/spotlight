#[derive(serde::Serialize)]
pub struct WindowInfo {
    pub hwnd: isize,
    pub title: String,
    pub process_name: String,
    pub is_visible: bool,
    pub is_minimized: bool,
    pub is_maximized: bool,
    pub is_always_on_top: bool,
}

pub mod child_webview;

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

#[cfg(target_os = "macos")]
mod platform {
    use super::WindowInfo;
    use cocoa::base::{id, nil, BOOL, NO, YES};
    use cocoa::foundation::{NSArray, NSDictionary, NSString, NSURL};
    use libc;
    use objc::runtime::Object;
    use objc::{class, msg_send, sel, sel_impl};
    use std::ffi::CStr;

    // Get AXUIElement for a window given its CGWindowID
    fn get_ax_window_for_cg_window(cg_window_id: u32) -> Option<id> {
        unsafe {
            // AXUIElementCreateSystemWide is a C function from ApplicationServices, not an Obj-C method
            extern "C" {
                fn AXUIElementCreateSystemWide() -> id;
            }

            let system_wide: id = AXUIElementCreateSystemWide();
            let windows: id = msg_send![system_wide, attributeValue: sel!(kAXWindowsAttribute)];
            if windows == nil {
                return None;
            }

            let count: usize = msg_send![windows, count];
            for i in 0..count {
                let window: id = msg_send![windows, objectAtIndex: i];
                let window_id: i32 = msg_send![window, attributeValue: sel!(kAXWindowNumberAttribute)];
                if window_id as u32 == cg_window_id {
                    return Some(window);
                }
            }
            None
        }
    }

    // Get process name from PID
    fn get_process_name_from_pid(pid: u32) -> String {
        unsafe {
            let app: id = msg_send![class!(NSRunningApplication), applicationWithProcessIdentifier: pid];
            if app == nil {
                return format!("PID:{}", pid);
            }
            let name: id = msg_send![app, localizedName];
            if name == nil {
                return format!("PID:{}", pid);
            }
            let c_str: *const libc::c_char = msg_send![name, UTF8String];
            if c_str.is_null() {
                return format!("PID:{}", pid);
            }
            std::ffi::CStr::from_ptr(c_str)
                .to_string_lossy()
                .into_owned()
        }
    }

    pub fn list_windows_impl() -> Vec<WindowInfo> {
        unsafe {
            // CGWindowListCopyWindowInfo returns CFArrayRef (Core Foundation).
            // On macOS, CFArrayRef is toll-free bridged to NSArray*.
            // We declare it here with id return type so msg_send! works.
            extern "C" {
                fn CGWindowListCopyWindowInfo(
                    options: u32,
                    windowID: u32,
                ) -> *mut objc::runtime::Object;
            }

            let option = core_graphics::window::kCGNullWindowListOption;
            let window_list: id = msg_send![class!(NSArray), array]; // empty array as fallback
            let cg_result = CGWindowListCopyWindowInfo(option, 0);

            if cg_result.is_null() {
                return Vec::new();
            }

            // Toll-free bridge: CFArrayRef -> NSArray*
            let window_list: id = std::mem::transmute(cg_result);

            let count: usize = msg_send![window_list, count];
            let mut windows = Vec::new();

            for i in 0..count {
                let dict: id = msg_send![window_list, objectAtIndex: i];
                if dict == nil {
                    continue;
                }

                let window_id: u32 = msg_send![dict, valueForKey: @"kCGWindowNumber"];
                if window_id == 0 {
                    continue;
                }

                let owner_pid: i32 = msg_send![dict, valueForKey: @"kCGWindowOwnerPID"];
                let owner_name: id = msg_send![dict, valueForKey: @"kCGWindowOwnerName"];
                let window_name: id = msg_send![dict, valueForKey: @"kCGWindowName"];
                let window_layer: i32 = msg_send![dict, valueForKey: @"kCGWindowLayer"];
                let is_onscreen: BOOL = msg_send![dict, valueForKey: @"kCGWindowIsOnscreen"];

                let title = if window_name != nil {
                    let c_str: *const libc::c_char = msg_send![window_name, UTF8String];
                    if !c_str.is_null() {
                        std::ffi::CStr::from_ptr(c_str)
                            .to_string_lossy()
                            .into_owned()
                    } else {
                        String::new()
                    }
                } else {
                    String::new()
                };

                let process_name = if owner_name != nil {
                    let c_str: *const libc::c_char = msg_send![owner_name, UTF8String];
                    if !c_str.is_null() {
                        std::ffi::CStr::from_ptr(c_str)
                            .to_string_lossy()
                            .into_owned()
                    } else {
                        get_process_name_from_pid(owner_pid as u32)
                    }
                } else {
                    get_process_name_from_pid(owner_pid as u32)
                };

                let is_visible = is_onscreen == YES;
                let is_always_on_top = window_layer > 0;

                // Try to get minimized state via AXUIElement
                let mut is_minimized = false;
                let mut is_maximized = false;

                if let Some(ax_window) = get_ax_window_for_cg_window(window_id) {
                    let minimized: id = msg_send![ax_window, valueOfAttribute: sel!(kAXMinimizedAttribute)];
                    if !minimized.is_null() {
                        is_minimized = msg_send![minimized, boolValue];
                    }
                }

                let window_info = WindowInfo {
                    hwnd: window_id as isize,
                    title,
                    process_name,
                    is_visible,
                    is_minimized,
                    is_maximized,
                    is_always_on_top,
                };

                // Filter out Spotlight windows
                if !window_info.process_name.contains("Spotlight") && !window_info.title.is_empty() {
                    windows.push(window_info);
                }
            }

            windows
        }
    }

    fn get_ax_window(hwnd: isize) -> Option<id> {
        get_ax_window_for_cg_window(hwnd as u32)
    }

    pub fn minimize_window_impl(hwnd: isize) -> Result<(), String> {
        unsafe {
            let ax_window = get_ax_window(hwnd)
                .ok_or_else(|| "Window not found".to_string())?;
            let value: id = msg_send![class!(NSNumber), numberWithBool: YES];
            let result: id = msg_send![ax_window, setValue: value forAttribute: sel!(kAXMinimizedAttribute)];
            if result == nil {
                Ok(())
            } else {
                Err("Failed to minimize window".to_string())
            }
        }
    }

    pub fn maximize_window_impl(hwnd: isize) -> Result<(), String> {
        unsafe {
            let ax_window = get_ax_window(hwnd)
                .ok_or_else(|| "Window not found".to_string())?;
            let value: id = msg_send![class!(NSNumber), numberWithBool: YES];
            let result: id = msg_send![ax_window, setValue: value forAttribute: sel!(kAXFullscreenAttribute)];
            if result == nil {
                Ok(())
            } else {
                Err("Failed to maximize window".to_string())
            }
        }
    }

    pub fn restore_window_impl(hwnd: isize) -> Result<(), String> {
        unsafe {
            let ax_window = get_ax_window(hwnd)
                .ok_or_else(|| "Window not found".to_string())?;
            let value: id = msg_send![class!(NSNumber), numberWithBool: NO];
            let result: id = msg_send![ax_window, setValue: value forAttribute: sel!(kAXMinimizedAttribute)];
            if result == nil {
                Ok(())
            } else {
                Err("Failed to restore window".to_string())
            }
        }
    }

    pub fn close_window_impl(hwnd: isize) -> Result<(), String> {
        unsafe {
            let ax_window = get_ax_window(hwnd)
                .ok_or_else(|| "Window not found".to_string())?;
            let close_button: id = msg_send![ax_window, valueOfAttribute: sel!(kAXCloseButtonAttribute)];
            if close_button == nil {
                return Err("Close button not found".to_string());
            }
            let result: id = msg_send![close_button, performSelector: sel!(click)];
            if result == nil {
                Ok(())
            } else {
                Err("Failed to close window".to_string())
            }
        }
    }

    pub fn focus_window_impl(hwnd: isize) -> Result<(), String> {
        unsafe {
            let ax_window = get_ax_window(hwnd)
                .ok_or_else(|| "Window not found".to_string())?;

            // Get PID using AXUIElementCopyAttributeValue C function
            extern "C" {
                fn AXUIElementCopyAttributeValue(
                    element: id,
                    attribute: *const libc::c_void,
                    value: *mut id,
                ) -> i32;
            }

            let k_ax_pid: id = msg_send![class!(NSString), stringWithUTF8String: "AXPID"];
            let mut pid_value: id = nil;
            let result = AXUIElementCopyAttributeValue(ax_window, std::mem::transmute(k_ax_pid), &mut pid_value);

            if result != 0 || pid_value == nil {
                return Err("Failed to get window PID".to_string());
            }

            let pid: i32 = msg_send![pid_value, intValue];
            if pid == 0 {
                return Err("Invalid process ID".to_string());
            }

            // Raise the window to front using kAXFrontAttribute via AXUIElementSetAttributeValue
            extern "C" {
                fn AXUIElementSetAttributeValue(
                    element: id,
                    attribute: *const libc::c_void,
                    value: id,
                ) -> i32;
            }

            let k_ax_front: id = msg_send![class!(NSString), stringWithUTF8String: "AXFront"];
            let front_value: id = msg_send![class!(NSNumber), numberWithBool: YES];
            let _ = AXUIElementSetAttributeValue(ax_window, std::mem::transmute(k_ax_front), front_value);

            // Then activate the application
            let app: id = msg_send![class!(NSRunningApplication), applicationWithProcessIdentifier: pid];
            if app == nil {
                return Err("Application not found".to_string());
            }
            let activate_result: BOOL = msg_send![app, activateWithOptions: 1]; // NSApplicationActivateIgnoringOtherApps
            if activate_result == YES {
                Ok(())
            } else {
                Err("Failed to focus window".to_string())
            }
        }
    }

    pub fn set_window_always_on_top_impl(hwnd: isize, on_top: bool) -> Result<(), String> {
        // Use AXUIElement's kAXWindowLevelAttribute to set window level
        // kCGNormalWindowLevel = 0, kCGFloatingWindowLevel = 3
        unsafe {
            let ax_window = get_ax_window(hwnd)
                .ok_or_else(|| "Window not found".to_string())?;

            let level_value: id = if on_top {
                // kCGFloatingWindowLevel = 3
                msg_send![class!(NSNumber), numberWithInteger: 3]
            } else {
                // kCGNormalWindowLevel = 0
                msg_send![class!(NSNumber), numberWithInteger: 0]
            };

            let result: id = msg_send![ax_window, setValue: level_value forAttribute: sel!(kAXWindowLevelAttribute)];
            if result == nil {
                Ok(())
            } else {
                Err("Failed to set window always on top".to_string())
            }
        }
    }
}

#[cfg(target_os = "linux")]
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
