use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};
use raw_window_handle::HasWindowHandle;
use std::collections::HashSet;
use std::sync::LazyLock;
use std::sync::Mutex;

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
        let disabled: u32 = DWMNCRP_DISABLED.0 as u32;
        DwmSetWindowAttribute(
            HWND(hwnd as *mut std::ffi::c_void),
            DWMWA_NCRENDERING_POLICY,
            &disabled as *const u32 as *const std::ffi::c_void,
            std::mem::size_of::<u32>() as u32,
        )
        .map_err(|e| e.to_string())?;

        let style = GetWindowLongW(HWND(hwnd as *mut std::ffi::c_void), GWL_STYLE) as u32;
        let new_style = style & !(WS_BORDER.0 | WS_THICKFRAME.0);
        SetWindowLongW(
            HWND(hwnd as *mut std::ffi::c_void),
            GWL_STYLE,
            new_style as i32,
        );

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
        use cocoa::base::{id, nil};
        use objc::{class, msg_send, sel, sel_impl};
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
        builder = builder.always_on_top(false);
    }

    let window = builder.build().map_err(|e| e.to_string())?;

    window
        .set_position(tauri::Position::Physical(tauri::PhysicalPosition { x: 0, y: 0 }))
        .map_err(|e| e.to_string())?;
    window
        .set_size(tauri::Size::Physical(tauri::PhysicalSize {
            width: screen_width as u32,
            height: screen_height as u32,
        }))
        .map_err(|e| e.to_string())?;

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

pub use child_webview::{close_all_child_webviews, close_child_webview, create_child_webview, resize_child_webview};
pub use window_manager::{
    close_window, focus_window, list_windows, maximize_window, minimize_window, restore_window,
    set_window_always_on_top, WindowInfo,
};

mod window_manager;
mod child_webview;
