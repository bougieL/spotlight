use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

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

    let window = WebviewWindowBuilder::new(
        &app,
        &label,
        WebviewUrl::External(url.parse().map_err(|e: url::ParseError| e.to_string())?),
    )
    .inner_size(1920.0, 1080.0)
    .decorations(false)
    .transparent(true)
    .skip_taskbar(true)
    .always_on_top(true)
    .build()
    .map_err(|e| e.to_string())?;

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
