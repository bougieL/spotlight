#[cfg(windows)]
use windows::Win32::Graphics::Gdi::{GetDC, GetPixel, ReleaseDC};

#[cfg(windows)]
#[tauri::command]
pub fn get_color_at_position(x: i32, y: i32) -> Result<String, String> {
    unsafe {
        let hdc = GetDC(None);
        if hdc.is_invalid() {
            return Err("Failed to get device context".to_string());
        }

        let color = GetPixel(hdc, x, y);
        ReleaseDC(None, hdc);

        if color.0 == 0xFFFFFFFF {
            return Err("Failed to get pixel color".to_string());
        }

        let color_val = color.0;
        let r = (color_val & 0xFF) as u8;
        let g = ((color_val >> 8) & 0xFF) as u8;
        let b = ((color_val >> 16) & 0xFF) as u8;

        Ok(format!("#{:02X}{:02X}{:02X}", r, g, b))
    }
}

#[tauri::command]
pub fn copy_color_to_clipboard(color: String) -> Result<(), String> {
    crate::clipboard::set_clipboard_text(color)
}

#[cfg(not(windows))]
#[tauri::command]
pub fn get_color_at_position(_x: i32, _y: i32) -> Result<String, String> {
    Err("Screen color picking is not supported on this platform".to_string())
}
