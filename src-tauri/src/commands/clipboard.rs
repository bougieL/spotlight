#[tauri::command]
pub fn get_clipboard_file_paths() -> Result<Vec<String>, String> {
    crate::clipboard::get_clipboard_file_paths()
}

#[tauri::command]
pub fn get_clipboard_text() -> Result<String, String> {
    crate::clipboard::get_clipboard_text()
}

#[tauri::command]
pub fn set_clipboard_text(text: String) -> Result<(), String> {
    crate::clipboard::set_clipboard_text(text)
}

#[tauri::command]
pub fn set_clipboard_image(data_url: String) -> Result<(), String> {
    crate::clipboard::set_clipboard_image(data_url)
}

#[tauri::command]
pub fn set_clipboard_files(files: Vec<String>) -> Result<(), String> {
    crate::clipboard::set_clipboard_files(files)
}

#[tauri::command]
pub fn get_clipboard_image() -> Result<String, String> {
    crate::clipboard::get_clipboard_image()
}

#[tauri::command]
pub fn start_clipboard_monitor(app: tauri::AppHandle) -> Result<(), String> {
    use tauri::Emitter;
    crate::clipboard::start_clipboard_monitor(move || {
        let _ = app.emit("clipboard-changed", ());
    });
    Ok(())
}

#[tauri::command]
pub fn stop_clipboard_monitor() -> Result<(), String> {
    crate::clipboard::stop_clipboard_monitor();
    Ok(())
}
