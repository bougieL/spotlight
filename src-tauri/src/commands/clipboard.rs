#[tauri::command]
pub fn get_clipboard_file_paths() -> Result<Vec<String>, String> {
    #[cfg(windows)]
    {
        use windows::Win32::Foundation::{HGLOBAL, HWND};
        use windows::Win32::System::DataExchange::{
            CloseClipboard, GetClipboardData, OpenClipboard,
        };
        use windows::Win32::System::Memory::{GlobalLock, GlobalUnlock};

        const CF_HDROP: u32 = 15;

        #[repr(C)]
        struct DROPFILES {
            p_files: u32,
            pt_x: i32,
            pt_y: i32,
            f_nc: bool,
            f_wide: bool,
        }

        unsafe {
            if OpenClipboard(HWND::default()).is_err() {
                return Err("Failed to open clipboard".to_string());
            }

            let mut paths = Vec::new();

            let hmem = GetClipboardData(CF_HDROP);
            if hmem.is_err() {
                let _ = CloseClipboard();
                return Ok(paths);
            }

            let hmem = hmem.unwrap();
            let hmem_hg: HGLOBAL = std::mem::transmute(hmem.0);

            let droplist = GlobalLock(hmem_hg);
            if droplist.is_null() {
                let _ = CloseClipboard();
                return Ok(paths);
            }

            let drop_files = &*(droplist as *const DROPFILES);

            let files_ptr = (droplist as *const u8).add(drop_files.p_files as usize) as *const u16;

            let mut current_ptr = files_ptr;
            loop {
                let mut end_ptr = current_ptr;
                while *end_ptr != 0 {
                    end_ptr = end_ptr.add(1);
                }

                if current_ptr == end_ptr {
                    break;
                }

                let len = end_ptr.offset_from(current_ptr) as usize;
                if len == 0 {
                    break;
                }

                let path_slice = std::slice::from_raw_parts(current_ptr, len);
                let path_str = String::from_utf16_lossy(path_slice);
                if !path_str.is_empty() {
                    paths.push(path_str);
                }

                current_ptr = end_ptr.add(1);
                if *current_ptr == 0 {
                    break;
                }
            }

            let _ = GlobalUnlock(hmem_hg);
            let _ = CloseClipboard();

            Ok(paths)
        }
    }

    #[cfg(not(windows))]
    {
        Ok(Vec::new())
    }
}
