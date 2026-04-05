use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};
use raw_window_handle::HasWindowHandle;
use std::sync::Mutex;
use std::collections::HashSet;
use std::sync::LazyLock;

static CHILD_WEBVIEWS: LazyLock<Mutex<HashSet<String>>> = LazyLock::new(|| Mutex::new(HashSet::new()));

#[cfg(windows)]
use windows::Win32::Graphics::Dwm::{DwmSetWindowAttribute, DWMWA_NCRENDERING_POLICY, DWMWA_TRANSITIONS_FORCEDISABLED, DWMNCRP_DISABLED};
#[cfg(windows)]
use windows::Win32::Foundation::HWND;
#[cfg(windows)]
use windows::Win32::UI::WindowsAndMessaging::{GetWindowLongW, GWL_STYLE, WS_BORDER, WS_THICKFRAME, SetWindowLongW, GetSystemMetrics, SM_CXSCREEN, SM_CYSCREEN, SetWindowPos, SWP_NOMOVE, SWP_NOSIZE, SWP_FRAMECHANGED, HWND_TOP};

#[tauri::command]
pub fn hide_window(app: tauri::AppHandle) -> Result<(), String> {
    let window = app.get_webview_window("main").ok_or("Window not found")?;
    window.hide().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn resize_window(app: tauri::AppHandle, height: f64) -> Result<(), String> {
    let window = app.get_webview_window("main").ok_or("Window not found")?;
    window
        .set_size(tauri::Size::Logical(tauri::LogicalSize {
            width: 800.0,
            height,
        }))
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(windows)]
fn disable_window_transitions(hwnd: isize) -> Result<(), String> {
    unsafe {
        let enabled: u32 = 1;
        DwmSetWindowAttribute(
            HWND(hwnd as *mut std::ffi::c_void),
            DWMWA_TRANSITIONS_FORCEDISABLED,
            &enabled as *const u32 as *const std::ffi::c_void,
            std::mem::size_of::<u32>() as u32,
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg(windows)]
fn remove_window_frame(hwnd: isize) -> Result<(), String> {
    unsafe {
        // Disable non-client rendering (removes shadow and border)
        let disabled: u32 = DWMNCRP_DISABLED.0 as u32;
        DwmSetWindowAttribute(
            HWND(hwnd as *mut std::ffi::c_void),
            DWMWA_NCRENDERING_POLICY,
            &disabled as *const u32 as *const std::ffi::c_void,
            std::mem::size_of::<u32>() as u32,
        )
        .map_err(|e| e.to_string())?;

        // Remove WS_BORDER and WS_THICKFRAME from window style
        let style = GetWindowLongW(HWND(hwnd as *mut std::ffi::c_void), GWL_STYLE) as u32;
        let new_style = style & !(WS_BORDER.0 | WS_THICKFRAME.0);
        SetWindowLongW(
            HWND(hwnd as *mut std::ffi::c_void),
            GWL_STYLE,
            new_style as i32,
        );

        // Force refresh window frame and position
        let _ = SetWindowPos(
            HWND(hwnd as *mut std::ffi::c_void),
            HWND_TOP,
            0,
            0,
            0,
            0,
            SWP_NOMOVE | SWP_NOSIZE | SWP_FRAMECHANGED,
        );
    }
    Ok(())
}

#[tauri::command]
pub async fn create_overlay_window(
    app: tauri::AppHandle,
    url: String,
    label: String,
) -> Result<(), String> {
    // Close existing window with same label if it exists
    if let Some(existing) = app.get_webview_window(&label) {
        let _ = existing.close();
    }

    let is_dev = url.contains("localhost");

    #[cfg(windows)]
    let (screen_width, screen_height) = unsafe {
        (GetSystemMetrics(SM_CXSCREEN) as f64, GetSystemMetrics(SM_CYSCREEN) as f64)
    };
    #[cfg(target_os = "macos")]
    let (screen_width, screen_height) = {
        use objc::{class, msg_send, sel, sel_impl};
        use cocoa::base::{id, nil};
        unsafe {
            let screen: id = msg_send![class!(NSScreen), mainScreen];
            if screen == nil {
                (1920.0, 1080.0)
            } else {
                let frame: cocoa::foundation::NSRect = msg_send![screen, frame];
                (frame.size.width, frame.size.height)
            }
        }
    };
    #[cfg(not(any(windows, target_os = "macos")))]
    let (screen_width, screen_height) = (1920.0, 1080.0);

    let mut builder = WebviewWindowBuilder::new(
        &app,
        &label,
        WebviewUrl::External(url.parse().map_err(|e: url::ParseError| e.to_string())?),
    )
    .inner_size(screen_width, screen_height)
    .decorations(false)
    .transparent(true)
    .shadow(false)
    .skip_taskbar(true)
    .always_on_top(true);

    if is_dev {
        // Dev mode: disable always on top for easier debugging
        builder = builder.always_on_top(false);
    }

    let window = builder.build().map_err(|e| e.to_string())?;

    // Set position after build to ensure proper positioning
    window.set_position(tauri::Position::Physical(tauri::PhysicalPosition { x: 0, y: 0 }))
        .map_err(|e| e.to_string())?;
    window.set_size(tauri::Size::Physical(tauri::PhysicalSize {
        width: screen_width as u32,
        height: screen_height as u32,
    })).map_err(|e| e.to_string())?;

    #[cfg(windows)]
    {
        use raw_window_handle::RawWindowHandle;
        if let Ok(handle) = window.window_handle() {
            if let RawWindowHandle::Win32(h) = handle.as_raw() {
                let hwnd = h.hwnd.get() as isize;
                disable_window_transitions(hwnd).ok();
                remove_window_frame(hwnd).ok();
            }
        }
    }

    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn close_overlay_window(app: tauri::AppHandle, label: String) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(&label) {
        window.close().map_err(|e| e.to_string())?;
    } else {
        return Err(format!("Window '{}' not found", label));
    }

    Ok(())
}

#[tauri::command]
pub async fn detach_window(
    app: tauri::AppHandle,
    url: String,
    label: String,
    title: String,
) -> Result<(), String> {
    if let Some(existing) = app.get_webview_window(&label) {
        let _ = existing.close();
    }

    let is_dev = url.contains("localhost");

    let width = 800.0;
    let height = 600.0;

    let mut builder = WebviewWindowBuilder::new(
        &app,
        &label,
        WebviewUrl::External(url.parse().map_err(|e: url::ParseError| e.to_string())?),
    )
    .inner_size(width, height)
    .center()
    .title(&title)
    .resizable(true)
    .min_inner_size(400.0, 300.0);

    if is_dev {
        builder = builder.devtools(true);
    }

    let window = builder.build().map_err(|e| e.to_string())?;

    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn exit_app(app: tauri::AppHandle) -> Result<(), String> {
    app.exit(0);
    Ok(())
}

// =============================================================================
// Window Manager Commands - Control other windows on the system
// =============================================================================

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowInfo {
    pub hwnd: isize,
    pub title: String,
    pub process_name: String,
    pub is_visible: bool,
    pub is_minimized: bool,
    pub is_maximized: bool,
    pub is_always_on_top: bool,
}

#[cfg(windows)]
mod window_manager {
    use super::WindowInfo;
    use std::ffi::OsString;
    use std::os::windows::ffi::OsStringExt;
    use windows::Win32::Foundation::{BOOL, HWND, LPARAM};
    use windows::Win32::UI::WindowsAndMessaging::{
        EnumWindows, GetWindowTextW, IsWindowVisible, IsZoomed, ShowWindow,
        GetWindowThreadProcessId, SetForegroundWindow, SetWindowPos,
        GWL_STYLE, GWL_EXSTYLE, WS_MINIMIZE, WS_EX_TOPMOST, GetWindowLongW,
        PostMessageW, WM_CLOSE, SWP_NOSIZE, SWP_NOMOVE, HWND_TOPMOST, HWND_NOTOPMOST,
        SW_MINIMIZE, SW_MAXIMIZE, SW_RESTORE,
    };
    use std::sync::Mutex;

    struct EnumData {
        windows: Mutex<Vec<WindowInfo>>,
    }

    unsafe extern "system" fn enum_windows_callback(hwnd: HWND, lparam: LPARAM) -> BOOL {
        let data = &*(lparam.0 as *const EnumData);

        // Skip invisible windows
        if !IsWindowVisible(hwnd).as_bool() {
            return BOOL(1); // Continue enumeration
        }

        // Get window title
        let mut title_buf = [0u16; 512];
        let title_len = GetWindowTextW(hwnd, &mut title_buf);
        if title_len == 0 {
            return BOOL(1); // Continue enumeration
        }
        let title = OsString::from_wide(&title_buf[..title_len as usize])
            .to_string_lossy()
            .into_owned();

        // Skip empty titles and our own window
        if title.is_empty() || title.contains("Spotlight") {
            return BOOL(1);
        }

        // Get process name
        let mut process_id: u32 = 0;
        GetWindowThreadProcessId(hwnd, Some(&mut process_id));

        let process_name = get_process_name(process_id);

        // Get window state
        let is_minimized = (GetWindowLongW(hwnd, GWL_STYLE) as u32 & WS_MINIMIZE.0) != 0;
        let is_maximized = IsZoomed(hwnd).as_bool();

        // Check if window is always on top (WS_EX_TOPMOST extended style)
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
        BOOL(1) // Continue enumeration
    }

    fn get_process_name(process_id: u32) -> String {
        // Use None for the handle since we just want process name
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
                ).is_ok() {
                    let path = OsString::from_wide(&name_buf[..size as usize])
                        .to_string_lossy()
                        .into_owned();
                    // Extract just the filename
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
                0, 0, 0, 0,
                SWP_NOSIZE | SWP_NOMOVE,
            ).map_err(|e| e.to_string())
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
mod window_manager {
    use super::WindowInfo;

    pub fn list_windows_impl() -> Vec<WindowInfo> {
        // Return empty list on non-Windows platforms
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
    Ok(window_manager::list_windows_impl())
}

#[tauri::command]
pub fn minimize_window(hwnd: isize) -> Result<(), String> {
    window_manager::minimize_window_impl(hwnd)
}

#[tauri::command]
pub fn maximize_window(hwnd: isize) -> Result<(), String> {
    window_manager::maximize_window_impl(hwnd)
}

#[tauri::command]
pub fn restore_window(hwnd: isize) -> Result<(), String> {
    window_manager::restore_window_impl(hwnd)
}

#[tauri::command]
pub fn close_window(hwnd: isize) -> Result<(), String> {
    window_manager::close_window_impl(hwnd)
}

#[tauri::command]
pub fn set_window_always_on_top(hwnd: isize, on_top: bool) -> Result<(), String> {
    window_manager::set_window_always_on_top_impl(hwnd, on_top)
}

#[tauri::command]
pub fn focus_window(hwnd: isize) -> Result<(), String> {
    window_manager::focus_window_impl(hwnd)
}

// =============================================================================
// Child Webview Commands - Add webviews as children to the main window
// Uses Window::add_child API from Tauri
// =============================================================================

#[tauri::command]
pub async fn create_child_webview(
    app: tauri::AppHandle,
    url: String,
    label: String,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
    parent_label: String,
) -> Result<String, String> {
    let parent_window = app.get_window(&parent_label).ok_or(format!("Parent window '{}' not found", parent_label))?;

    // Script to intercept window.open and links with target="_blank"
    let initialization_script = r#"
        // Intercept window.open to open in same window
        window.open = function(url, name, specs) {
            if (url) {
                window.location.href = url;
            }
            return null;
        };
        // Intercept clicks on links with target="_blank"
        document.addEventListener('click', function(e) {
            var target = e.target.closest('a[target="_blank"]');
            if (target) {
                e.preventDefault();
                window.location.href = target.href;
            }
        }, true);
        // Intercept context menu on links
        document.addEventListener('contextmenu', function(e) {
            var link = e.target.closest('a');
            if (link) {
                e.preventDefault();
            }
        }, true);
    "#;

    // Use WebviewBuilder and Window::add_child to add webview to window
    let webview_builder = tauri::webview::WebviewBuilder::new(
        &label,
        WebviewUrl::External(url.parse().map_err(|e: url::ParseError| e.to_string())?),
    )
    .initialization_script(initialization_script);

    parent_window
        .add_child(webview_builder, tauri::Position::Logical(tauri::LogicalPosition { x, y }), tauri::Size::Logical(tauri::LogicalSize { width, height }))
        .map_err(|e| e.to_string())?;

    // Register the webview label
    CHILD_WEBVIEWS.lock().unwrap().insert(label.clone());

    Ok(label)
}

#[tauri::command]
pub async fn close_child_webview(app: tauri::AppHandle, label: String) -> Result<(), String> {
    // Try app.get_webview to get the Webview and close it
    if let Some(webview) = app.get_webview(&label) {
        webview.close().map_err(|e| e.to_string())?;
        // Unregister the webview label
        CHILD_WEBVIEWS.lock().unwrap().remove(&label);
        return Ok(());
    }

    Err(format!("Child webview '{}' not found", label))
}

#[tauri::command]
pub async fn close_all_child_webviews(app: tauri::AppHandle) -> Result<(), String> {
    // Get all registered webview labels
    let labels: Vec<String> = CHILD_WEBVIEWS.lock().unwrap().iter().cloned().collect();

    for label in labels {
        if let Some(webview) = app.get_webview(&label) {
            webview.close().map_err(|e| e.to_string())?;
        }
    }

    // Clear the registry
    CHILD_WEBVIEWS.lock().unwrap().clear();

    Ok(())
}

#[tauri::command]
pub async fn resize_child_webview(
    app: tauri::AppHandle,
    label: String,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
) -> Result<(), String> {
    let webview = app.get_webview(&label).ok_or("Child webview not found")?;
    webview
        .set_position(tauri::Position::Logical(tauri::LogicalPosition { x, y }))
        .map_err(|e| e.to_string())?;
    webview
        .set_size(tauri::Size::Logical(tauri::LogicalSize { width, height }))
        .map_err(|e| e.to_string())?;
    Ok(())
}
