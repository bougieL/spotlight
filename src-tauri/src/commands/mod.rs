pub mod apps;
pub mod autostart;
pub mod chrome;
pub mod clipboard;
pub mod file;
pub mod launcher;
pub mod log;
pub mod screen;
pub mod search;

#[cfg(test)]
mod search_test;
pub mod shell;
pub mod shortcut;
pub mod storage;
pub mod window;

pub use apps::{get_app_icon, get_installed_applications};
pub use autostart::{get_autostart_enabled, set_autostart_enabled};
pub use chrome::get_chrome_bookmarks;
pub use clipboard::{
    get_clipboard_file_paths, get_clipboard_image, get_clipboard_text, set_clipboard_files,
    set_clipboard_image, set_clipboard_text, start_clipboard_monitor, stop_clipboard_monitor,
};
pub use file::{save_pasted_file, save_temp_image, save_image_file, compress_png_lossless, glob_image_files};
pub use launcher::launch_app;
pub use log::write_log;
pub use screen::{capture_full_screen};
pub use shell::execute_shell_command;
pub use shortcut::{get_global_shortcut, register_global_shortcut};
pub use storage::{get_plugin_storage_dir, get_app_data_dir, open_path, read_plugin_settings, write_plugin_settings};
pub use search::{search_with_rg, search_files_with_rg, get_user_home};
pub use window::{show_window, close_overlay_window, create_overlay_window, detach_window, exit_app, hide_window, resize_window, list_windows, minimize_window, maximize_window, restore_window, close_window, set_window_always_on_top, focus_window, create_child_webview, close_child_webview, resize_child_webview, close_all_child_webviews, simulate_mouse_click};
