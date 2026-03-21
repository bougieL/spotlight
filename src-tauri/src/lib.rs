// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

#[tauri::command]
fn save_temp_image(data_url: String) -> Result<String, String> {
    // Parse data URL: data:image/png;base64,<base64_data>
    let parts: Vec<&str> = data_url.splitn(2, ',').collect();
    if parts.len() != 2 {
        return Err("Invalid data URL format".to_string());
    }

    let base64_data = parts[1];
    let image_data = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, base64_data).map_err(|e| e.to_string())?;

    // Get temp directory
    let temp_dir = std::env::temp_dir();
    let file_name = format!("spotlight_{}.png", uuid::Uuid::new_v4());
    let file_path: PathBuf = temp_dir.join(&file_name);

    fs::write(&file_path, image_data).map_err(|e| e.to_string())?;

    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![greet, save_temp_image])
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            if let Ok(Some(monitor)) = window.current_monitor() {
                let scale_factor = window.scale_factor().unwrap_or(1.0);
                let monitor_size = *monitor.size();
                let window_size = window.outer_size().unwrap_or(tauri::PhysicalSize { width: 600, height: 64 });

                let window_width = window_size.width as f64 / scale_factor;
                let monitor_width = monitor_size.width as f64 / scale_factor;

                let x = (monitor_width - window_width) / 2.0;
                let y = 200.0;

                let _ = window.set_position(tauri::Position::Logical(
                    tauri::LogicalPosition { x, y },
                ));
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
