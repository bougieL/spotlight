pub mod clipboard;
pub mod commands;
pub mod utils;

use commands::{
    capture_full_screen, execute_shell_command, get_app_icon, get_autostart_enabled,
    get_chrome_bookmarks, get_clipboard_file_paths, get_clipboard_image, get_clipboard_text,
    get_global_shortcut, get_installed_applications, get_plugin_storage_dir, get_user_home,
    show_window, hide_window, launch_app,
    read_plugin_settings, register_global_shortcut, resize_window, save_pasted_file,
    save_temp_image, save_image_file, compress_png_lossless, glob_image_files, search_with_rg, search_files_with_rg, set_autostart_enabled, set_clipboard_files, set_clipboard_image,
    set_clipboard_text, start_clipboard_monitor, stop_clipboard_monitor, write_log,
    write_plugin_settings, create_overlay_window, close_overlay_window, exit_app,
    detach_window, list_windows, minimize_window, maximize_window, restore_window,
    close_window, set_window_always_on_top, focus_window,
    create_child_webview, close_child_webview, resize_child_webview, close_all_child_webviews,
};
use tauri::Manager;

#[cfg(windows)]
use windows::Win32::Graphics::Dwm::{DwmSetWindowAttribute, DWMWA_TRANSITIONS_FORCEDISABLED};
#[cfg(windows)]
use windows::Win32::Foundation::HWND;
#[cfg(windows)]
use raw_window_handle::HasWindowHandle;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--hidden"]),
        ))
        .invoke_handler(tauri::generate_handler![
            save_temp_image,
            save_pasted_file,
            save_image_file,
            compress_png_lossless,
            glob_image_files,
            get_clipboard_file_paths,
            get_clipboard_text,
            get_clipboard_image,
            set_clipboard_text,
            set_clipboard_image,
            set_clipboard_files,
            start_clipboard_monitor,
            stop_clipboard_monitor,
            hide_window,
            show_window,
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
            write_log,
            create_overlay_window,
            close_overlay_window,
            exit_app,
            capture_full_screen,
            execute_shell_command,
            get_autostart_enabled,
            set_autostart_enabled,
            search_with_rg,
            search_files_with_rg,
            get_user_home,
            detach_window,
            list_windows,
            minimize_window,
            maximize_window,
            restore_window,
            close_window,
            set_window_always_on_top,
            focus_window,
            create_child_webview,
            close_child_webview,
            resize_child_webview,
            close_all_child_webviews,
        ])
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();

            // Hide window on startup, show only when tray icon is clicked
            let _ = window.hide();
            let _ = window.set_skip_taskbar(true);

            // Disable window animations on Windows
            #[cfg(windows)]
            {
                use raw_window_handle::RawWindowHandle;
                if let Ok(handle) = window.window_handle() {
                    if let RawWindowHandle::Win32(h) = handle.as_raw() {
                        let hwnd = h.hwnd.get() as isize;
                        unsafe {
                            let enabled: u32 = 1;
                            let _ = DwmSetWindowAttribute(
                                HWND(hwnd as *mut std::ffi::c_void),
                                DWMWA_TRANSITIONS_FORCEDISABLED,
                                &enabled as *const u32 as *const std::ffi::c_void,
                                std::mem::size_of::<u32>() as u32,
                            );
                        }
                    }
                }
            }

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

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
