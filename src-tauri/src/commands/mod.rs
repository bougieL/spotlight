pub mod apps;
pub mod autostart;
pub mod chrome;
pub mod clipboard;
pub mod everything;
pub mod file;
pub mod launcher;
pub mod log;
pub mod screen;
pub mod search;
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
pub use everything::search_everything;
pub use file::{save_pasted_file, save_temp_image};
pub use launcher::launch_app;
pub use log::write_log;
pub use screen::{capture_full_screen};
pub use shell::execute_shell_command;
pub use shortcut::{get_global_shortcut, register_global_shortcut};
pub use storage::{get_plugin_storage_dir, read_plugin_settings, write_plugin_settings};
pub use search::search_with_rg;
pub use window::{close_overlay_window, create_overlay_window, detach_window, exit_app, hide_window, resize_window};
