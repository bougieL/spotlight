use raw_window_handle::HasWindowHandle;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

static CURRENT_SHORTCUT: Mutex<Option<Shortcut>> = Mutex::new(None);

#[cfg(windows)]
fn focus_window(hwnd: isize) {
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::WindowsAndMessaging::{
        SetForegroundWindow, SetWindowPos, HWND_TOPMOST, SWP_NOMOVE, SWP_NOSIZE, SWP_SHOWWINDOW,
    };
    unsafe {
        let _ = SetForegroundWindow(HWND(hwnd as *mut std::ffi::c_void));
        let _ = SetWindowPos(
            HWND(hwnd as *mut std::ffi::c_void),
            HWND_TOPMOST,
            0,
            0,
            0,
            0,
            SWP_NOSIZE | SWP_NOMOVE | SWP_SHOWWINDOW,
        );
    }
}

#[cfg(not(windows))]
fn focus_window(_hwnd: isize) {}

fn show_window(app_handle: &AppHandle) {
    if let Some(window) = app_handle.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();

        #[cfg(windows)]
        {
            use raw_window_handle::RawWindowHandle;
            if let Ok(handle) = window.window_handle() {
                if let RawWindowHandle::Win32(h) = handle.as_raw() {
                    focus_window(h.hwnd.get() as isize);
                }
            }
        }
        #[cfg(not(windows))]
        let _ = app_handle;
    }
}

#[tauri::command]
pub fn register_global_shortcut(app_handle: AppHandle, shortcut: String) -> Result<(), String> {
    let new_shortcut: Shortcut = shortcut
        .parse()
        .map_err(|e| format!("Failed to parse shortcut '{}': {}", shortcut, e))?;

    let old_shortcut = {
        let current = CURRENT_SHORTCUT.lock().unwrap();
        current.clone()
    };

    if let Some(ref old) = old_shortcut {
        let _ = app_handle.global_shortcut().unregister(old.clone());
    }

    let _ = app_handle
        .global_shortcut()
        .unregister(new_shortcut.clone());

    let app_handle_clone = app_handle.clone();
    app_handle
        .global_shortcut()
        .on_shortcut(new_shortcut.clone(), move |_app, _shortcut, event| {
            if event.state == ShortcutState::Pressed {
                show_window(&app_handle_clone);
            }
        })
        .map_err(|e| format!("Failed to set shortcut handler: {}", e))?;

    let mut current = CURRENT_SHORTCUT.lock().unwrap();
    *current = Some(new_shortcut);

    Ok(())
}

#[tauri::command]
pub fn get_global_shortcut() -> Result<String, String> {
    let current = CURRENT_SHORTCUT.lock().unwrap();
    match &*current {
        Some(shortcut) => Ok(shortcut.to_string()),
        None => Ok("Alt+Space".to_string()),
    }
}
