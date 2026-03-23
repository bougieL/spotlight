pub mod clipboard;
pub mod commands;
pub mod utils;

use commands::{
    get_app_icon, get_chrome_bookmarks, get_clipboard_file_paths, get_clipboard_image,
    get_clipboard_text, get_global_shortcut, get_installed_applications,
    get_plugin_storage_dir, launch_app, read_plugin_settings, register_global_shortcut,
    resize_window, save_pasted_file, save_temp_image, set_clipboard_files, set_clipboard_image,
    set_clipboard_text, start_clipboard_monitor, stop_clipboard_monitor, write_log,
    write_plugin_settings,
};
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![
            save_temp_image,
            save_pasted_file,
            get_clipboard_file_paths,
            get_clipboard_text,
            get_clipboard_image,
            set_clipboard_text,
            set_clipboard_image,
            set_clipboard_files,
            start_clipboard_monitor,
            stop_clipboard_monitor,
            resize_window,
            get_chrome_bookmarks,
            get_installed_applications,
            get_app_icon,
            launch_app,
            get_plugin_storage_dir,
            read_plugin_settings,
            write_plugin_settings,
            register_global_shortcut,
            get_global_shortcut,
            write_log
        ])
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();

            // Hide window on startup, show only when tray icon is clicked
            let _ = window.hide();

            if let Ok(Some(monitor)) = window.current_monitor() {
                let scale_factor = window.scale_factor().unwrap_or(1.0);
                let monitor_size = *monitor.size();
                let window_size = window.outer_size().unwrap_or(tauri::PhysicalSize {
                    width: 800,
                    height: 64,
                });

                let window_width = window_size.width as f64 / scale_factor;
                let monitor_width = monitor_size.width as f64 / scale_factor;

                let x = (monitor_width - window_width) / 2.0;
                let y = 200.0;

                let _ =
                    window.set_position(tauri::Position::Logical(tauri::LogicalPosition { x, y }));
            }

            // Build system tray menu
            let show_item = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            // Create system tray icon
            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().cloned().unwrap())
                .menu(&menu)
                .tooltip("spotlight")
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click { button, .. } = event {
                        if button == tauri::tray::MouseButton::Left {
                            if let Some(window) = tray.app_handle().get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
