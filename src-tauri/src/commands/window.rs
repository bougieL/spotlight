use tauri::Manager;

#[tauri::command]
pub fn resize_window(app: tauri::AppHandle, height: f64) -> Result<(), String> {
    let window = app.get_webview_window("main").ok_or("Window not found")?;
    window
        .set_size(tauri::Size::Logical(tauri::LogicalSize {
            width: 600.0,
            height,
        }))
        .map_err(|e| e.to_string())?;
    Ok(())
}
