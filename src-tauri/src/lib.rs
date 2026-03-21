pub mod commands;
pub mod utils;

use commands::{
    get_clipboard_file_paths, get_installed_applications, launch_app, resize_window, save_pasted_file,
    save_temp_image,
};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            save_temp_image,
            save_pasted_file,
            get_clipboard_file_paths,
            resize_window,
            get_installed_applications,
            launch_app
        ])
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            if let Ok(Some(monitor)) = window.current_monitor() {
                let scale_factor = window.scale_factor().unwrap_or(1.0);
                let monitor_size = *monitor.size();
                let window_size = window.outer_size().unwrap_or(tauri::PhysicalSize {
                    width: 600,
                    height: 64,
                });

                let window_width = window_size.width as f64 / scale_factor;
                let monitor_width = monitor_size.width as f64 / scale_factor;

                let x = (monitor_width - window_width) / 2.0;
                let y = 200.0;

                let _ = window.set_position(tauri::Position::Logical(tauri::LogicalPosition {
                    x,
                    y,
                }));
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
