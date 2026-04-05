use std::collections::HashSet;
use std::sync::LazyLock;
use std::sync::Mutex;
use tauri::Manager;

static CHILD_WEBVIEWS: LazyLock<Mutex<HashSet<String>>> = LazyLock::new(|| Mutex::new(HashSet::new()));

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

    let initialization_script = r#"
        window.open = function(url, name, specs) {
            if (url) {
                window.location.href = url;
            }
            return null;
        };
        document.addEventListener('click', function(e) {
            var target = e.target.closest('a[target="_blank"]');
            if (target) {
                e.preventDefault();
                window.location.href = target.href;
            }
        }, true);
        document.addEventListener('contextmenu', function(e) {
            var link = e.target.closest('a');
            if (link) {
                e.preventDefault();
            }
        }, true);
    "#;

    let webview_builder = tauri::webview::WebviewBuilder::new(
        &label,
        tauri::WebviewUrl::External(url.parse().map_err(|e: url::ParseError| e.to_string())?),
    )
    .initialization_script(initialization_script);

    parent_window
        .add_child(webview_builder, tauri::Position::Logical(tauri::LogicalPosition { x, y }), tauri::Size::Logical(tauri::LogicalSize { width, height }))
        .map_err(|e| e.to_string())?;

    CHILD_WEBVIEWS.lock().unwrap().insert(label.clone());

    Ok(label)
}

#[tauri::command]
pub async fn close_child_webview(app: tauri::AppHandle, label: String) -> Result<(), String> {
    if let Some(webview) = app.get_webview(&label) {
        webview.close().map_err(|e| e.to_string())?;
        CHILD_WEBVIEWS.lock().unwrap().remove(&label);
        return Ok(());
    }

    Err(format!("Child webview '{}' not found", label))
}

#[tauri::command]
pub async fn close_all_child_webviews(app: tauri::AppHandle) -> Result<(), String> {
    let labels: Vec<String> = CHILD_WEBVIEWS.lock().unwrap().iter().cloned().collect();

    for label in labels {
        if let Some(webview) = app.get_webview(&label) {
            webview.close().map_err(|e| e.to_string())?;
        }
    }

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
