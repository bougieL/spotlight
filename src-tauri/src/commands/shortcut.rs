use std::sync::Mutex;
use tauri::AppHandle;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

use crate::commands::show_window;

static CURRENT_SHORTCUT: Mutex<Option<Shortcut>> = Mutex::new(None);

fn show_window_impl(app_handle: &AppHandle) {
    let _ = show_window(app_handle.clone());
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
                show_window_impl(&app_handle_clone);
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
