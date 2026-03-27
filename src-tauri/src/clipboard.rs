use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;

static MONITOR_RUNNING: AtomicBool = AtomicBool::new(false);

#[cfg(windows)]
struct CallbackPtr(*mut dyn Fn());
#[cfg(windows)]
unsafe impl Send for CallbackPtr {}
#[cfg(windows)]
static CALLBACK_PTR: Mutex<Option<CallbackPtr>> = Mutex::new(None);

// ── macOS NSPasteboard helpers ──────────────────────────────────────────

#[cfg(target_os = "macos")]
mod macos_clip {
    use cocoa::appkit::NSPasteboard;
    use cocoa::base::{id, nil, NO, YES};
    use objc::runtime::Object;
    use objc::{class, msg_send, sel, sel_impl};

    pub fn get_pasteboard() -> id {
        unsafe {
            let cls = class!(NSPasteboard);
            let pb: id = msg_send![cls, generalPasteboard];
            pb
        }
    }

    pub fn get_string(pb: id, type_name: id) -> Option<String> {
        unsafe {
            let s: id = msg_send![pb, stringForType: type_name];
            if s == nil {
                None
            } else {
                let utf8: *const i8 = msg_send![s, UTF8String];
                if utf8.is_null() {
                    None
                } else {
                    let cstr = std::ffi::CStr::from_ptr(utf8);
                    Some(cstr.to_string_lossy().into_owned())
                }
            }
        }
    }

    pub fn set_string(pb: id, text: &str, type_name: id) -> bool {
        unsafe {
            let cls = class!(NSString);
            let ns_str: id = msg_send![cls, alloc];
            let ns_str: id = msg_send![ns_str,
                initWithBytes:text.as_ptr()
                length:text.len()
                encoding:4u64 // NSUTF8StringEncoding
            ];
            if ns_str == nil {
                return false;
            }
            let _: id = msg_send![pb, clearContents];
            let result: bool = msg_send![pb, setString:ns_str forType:type_name];
            let _: () = msg_send![ns_str, release];
            result
        }
    }

    pub fn get_data(pb: id, type_name: id) -> Option<Vec<u8>> {
        unsafe {
            let data: id = msg_send![pb, dataForType: type_name];
            if data == nil {
                None
            } else {
                let bytes: *const u8 = msg_send![data, bytes];
                let length: usize = msg_send![data, length];
                if bytes.is_null() || length == 0 {
                    None
                } else {
                    let slice = std::slice::from_raw_parts(bytes, length);
                    Some(slice.to_vec())
                }
            }
        }
    }

    pub fn read_file_urls(pb: id) -> Vec<String> {
        unsafe {
            let url_class: id = msg_send![class!(NSURL), class];
            let classes: id = msg_send![class!(NSArray), arrayWithObject: url_class];
            let options: id = msg_send![class!(NSDictionary), dictionary];
            let items: id = msg_send![pb, readObjectsForClasses:classes options:options];

            if items == nil {
                return Vec::new();
            }

            let count: usize = msg_send![items, count];
            let mut result = Vec::new();
            for i in 0..count {
                let url: id = msg_send![items, objectAtIndex: i];
                if url != nil {
                    let path: id = msg_send![url, path];
                    if path != nil {
                        let utf8: *const i8 = msg_send![path, UTF8String];
                        if !utf8.is_null() {
                            let cstr = std::ffi::CStr::from_ptr(utf8);
                            result.push(cstr.to_string_lossy().into_owned());
                        }
                    }
                }
            }
            result
        }
    }

    pub fn get_clipboard_image_base64(pb: id) -> Option<String> {
        unsafe {
            // Try reading PNG data directly
            let png_type: id = msg_send![class!(NSPasteboardTypePNG), stringValue];
            let mut image_data = get_data(pb, png_type);

            // Fallback: read TIFF and convert to PNG
            if image_data.is_none() {
                let tiff_type: id = msg_send![class!(NSPasteboardTypeTIFF), stringValue];
                if let Some(tiff_bytes) = get_data(pb, tiff_type) {
                    let img = image::load_from_memory(&tiff_bytes).ok()?;
                    let mut png_bytes = Vec::new();
                    let mut cursor = std::io::Cursor::new(&mut png_bytes);
                    img.write_to(&mut cursor, image::ImageFormat::Png).ok()?;
                    image_data = Some(png_bytes);
                }
            }

            let png_bytes = image_data?;
            if png_bytes.is_empty() {
                return None;
            }

            let base64 =
                base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &png_bytes);
            Some(format!("data:image/png;base64,{}", base64))
        }
    }

    pub fn set_clipboard_image_from_png(pb: id, png_bytes: &[u8]) -> Result<(), String> {
        unsafe {
            let cls = class!(NSData);
            let data: id = msg_send![cls, alloc];
            let data: id = msg_send![data,
                initWithBytes:png_bytes.as_ptr()
                length:png_bytes.len()
            ];
            if data == nil {
                return Err("Failed to create NSData for image".to_string());
            }

            let _: id = msg_send![pb, clearContents];

            let png_type: id = msg_send![class!(NSPasteboardTypePNG), stringValue];
            let types: id = msg_send![class!(NSArray), arrayWithObject: png_type];
            let _: id = msg_send![pb, declareTypes:types owner:0];
            let result: bool = msg_send![pb, setData:data forType:png_type];

            let _: () = msg_send![data, release];

            if result {
                Ok(())
            } else {
                Err("Failed to set image data on clipboard".to_string())
            }
        }
    }

    // Start clipboard monitoring using CGEventTap for instant paste detection
    // Returns true if event tap was successfully created, false if fallback to polling is needed
    pub fn start_event_tap<F>(callback: F) -> bool
    where
        F: Fn() + Send + 'static,
    {
        use cocoa::base::{id, nil, BOOL, NO, YES};

        // Store callback in a thread-safe way
        let callback_ptr: *mut Box<dyn Fn()> = Box::into_raw(Box::new(Box::new(callback)));

        std::thread::spawn(move || {
            unsafe {
                let mut last_change_count: i64 = msg_send![macos_clip::get_pasteboard(), changeCount];

                loop {
                    let current_change_count: i64 = msg_send![macos_clip::get_pasteboard(), changeCount];
                    if current_change_count != last_change_count {
                        last_change_count = current_change_count;
                        if let Some(cb) = callback_ptr.as_ref() {
                            cb();
                        }
                    }
                    std::thread::sleep(std::time::Duration::from_millis(50));
                }
            }
        });

        // Polling approach started successfully
        true
    }
}

// ── Public clipboard API ───────────────────────────────────────────────

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

    #[cfg(target_os = "macos")]
    {
        let pb = macos_clip::get_pasteboard();
        Ok(macos_clip::read_file_urls(pb))
    }

    #[cfg(not(any(windows, target_os = "macos")))]
    {
        Ok(Vec::new())
    }
}

pub fn get_clipboard_text() -> Result<String, String> {
    #[cfg(windows)]
    {
        use windows::Win32::Foundation::{HGLOBAL, HWND};
        use windows::Win32::System::DataExchange::{
            CloseClipboard, GetClipboardData, OpenClipboard,
        };
        use windows::Win32::System::Memory::{GlobalLock, GlobalUnlock};

        const CF_UNICODETEXT: u32 = 13;

        unsafe {
            if OpenClipboard(HWND::default()).is_err() {
                return Err("Failed to open clipboard".to_string());
            }

            let hmem = GetClipboardData(CF_UNICODETEXT);
            if hmem.is_err() {
                let _ = CloseClipboard();
                return Ok(String::new());
            }

            let hmem = hmem.unwrap();
            let hmem_hg: HGLOBAL = std::mem::transmute(hmem.0);

            let text_ptr = GlobalLock(hmem_hg);
            if text_ptr.is_null() {
                let _ = CloseClipboard();
                return Ok(String::new());
            }

            let text_len = wcslen(text_ptr as *const u16);
            let text = String::from_utf16_lossy(std::slice::from_raw_parts(
                text_ptr as *const u16,
                text_len,
            ));

            let _ = GlobalUnlock(hmem_hg);
            let _ = CloseClipboard();

            Ok(text)
        }
    }

    #[cfg(target_os = "macos")]
    {
        use objc::{class, msg_send, sel, sel_impl};
        let pb = macos_clip::get_pasteboard();
        let type_name: objc::runtime::id =
            unsafe { msg_send![class!(NSPasteboardTypeString), stringValue] };
        Ok(macos_clip::get_string(pb, type_name).unwrap_or_default())
    }

    #[cfg(not(any(windows, target_os = "macos")))]
    {
        Ok(String::new())
    }
}

pub fn set_clipboard_text(text: String) -> Result<(), String> {
    #[cfg(windows)]
    {
        use windows::Win32::Foundation::HWND;
        use windows::Win32::System::DataExchange::{
            CloseClipboard, EmptyClipboard, OpenClipboard, SetClipboardData,
        };
        use windows::Win32::System::Memory::{
            GlobalAlloc, GlobalLock, GlobalUnlock, GMEM_MOVEABLE,
        };

        const CF_UNICODETEXT: u32 = 13;

        unsafe {
            if OpenClipboard(HWND::default()).is_err() {
                return Err("Failed to open clipboard".to_string());
            }

            let _ = EmptyClipboard();

            let wide_chars: Vec<u16> = text.encode_utf16().chain(std::iter::once(0)).collect();
            let size_bytes = wide_chars.len() * std::mem::size_of::<u16>();

            let hmem = GlobalAlloc(GMEM_MOVEABLE, size_bytes);
            if hmem.is_err() {
                let _ = CloseClipboard();
                return Err("Failed to allocate memory".to_string());
            }

            let hmem = hmem.unwrap();
            let hmem_ptr = GlobalLock(hmem);

            std::ptr::copy_nonoverlapping(
                wide_chars.as_ptr(),
                hmem_ptr as *mut u16,
                wide_chars.len(),
            );

            let _ = GlobalUnlock(hmem);

            let hmem_handle: windows::Win32::Foundation::HANDLE = std::mem::transmute(hmem);
            let result = SetClipboardData(CF_UNICODETEXT, hmem_handle);
            if result.is_err() {
                let _ = CloseClipboard();
                return Err("Failed to set clipboard data".to_string());
            }

            let _ = CloseClipboard();
            Ok(())
        }
    }

    #[cfg(target_os = "macos")]
    {
        use objc::{class, msg_send, sel, sel_impl};
        let pb = macos_clip::get_pasteboard();
        let type_name: objc::runtime::id =
            unsafe { msg_send![class!(NSPasteboardTypeString), stringValue] };
        if macos_clip::set_string(pb, &text, type_name) {
            Ok(())
        } else {
            Err("Failed to set clipboard text".to_string())
        }
    }

    #[cfg(not(any(windows, target_os = "macos")))]
    {
        let _ = text;
        Ok(())
    }
}

pub fn get_clipboard_image() -> Result<String, String> {
    #[cfg(windows)]
    {
        use windows::Win32::Foundation::HWND;
        use windows::Win32::Graphics::Gdi::{
            CreateCompatibleDC, DeleteDC, GetDIBits, GetObjectW, SelectObject, BITMAP, BITMAPINFO,
            BITMAPINFOHEADER, DIB_RGB_COLORS, HBITMAP, HGDIOBJ,
        };
        use windows::Win32::System::DataExchange::{
            CloseClipboard, GetClipboardData, OpenClipboard,
        };

        const CF_BITMAP: u32 = 2;

        unsafe {
            if OpenClipboard(HWND::default()).is_err() {
                return Err("Failed to open clipboard".to_string());
            }

            // Try to get bitmap first
            let hmem = GetClipboardData(CF_BITMAP);
            if hmem.is_err() {
                let _ = CloseClipboard();
                return Ok(String::new());
            }

            let hbitmap = HBITMAP(hmem.unwrap().0);

            // Get bitmap info
            let mut bitmap = BITMAP::default();
            let size = std::mem::size_of::<BITMAP>() as i32;
            let _ = GetObjectW(
                HGDIOBJ(hbitmap.0),
                size,
                Some(&mut bitmap as *mut _ as *mut _),
            );

            let width = bitmap.bmWidth;
            let height = bitmap.bmHeight;

            // Create device context and select bitmap
            let hdc = CreateCompatibleDC(None);
            let old_bitmap = SelectObject(hdc, HGDIOBJ(hbitmap.0));

            // Setup BITMAPINFO for RGB data
            let mut bmi = BITMAPINFO {
                bmiHeader: BITMAPINFOHEADER {
                    biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
                    biWidth: width,
                    biHeight: -height, // Top-down
                    biPlanes: 1,
                    biBitCount: 32,
                    biCompression: 0, // BI_RGB
                    biSizeImage: (width * height * 4) as u32,
                    ..Default::default()
                },
                ..Default::default()
            };

            let buf_size = (width * height * 4) as usize;
            let mut buffer: Vec<u8> = vec![0u8; buf_size];

            let result = GetDIBits(
                hdc,
                hbitmap,
                0,
                height as u32,
                Some(buffer.as_mut_ptr() as *mut _),
                &mut bmi,
                DIB_RGB_COLORS,
            );

            // Cleanup
            let _ = SelectObject(hdc, old_bitmap);
            let _ = DeleteDC(hdc);
            let _ = CloseClipboard();

            if result == 0 {
                return Err("Failed to get bitmap data".to_string());
            }

            // Convert BGRA to RGBA
            for chunk in buffer.chunks_exact_mut(4) {
                chunk.swap(0, 2);
            }

            // Encode to PNG and then base64
            let img = image::RgbaImage::from_raw(width as u32, height as u32, buffer)
                .ok_or("Failed to create image from buffer")?;

            let mut png_data = Vec::new();
            let mut cursor = std::io::Cursor::new(&mut png_data);
            img.write_to(&mut cursor, image::ImageFormat::Png)
                .map_err(|e| format!("Failed to encode PNG: {}", e))?;

            let base64 =
                base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &png_data);
            Ok(format!("data:image/png;base64,{}", base64))
        }
    }

    #[cfg(target_os = "macos")]
    {
        let pb = macos_clip::get_pasteboard();
        Ok(macos_clip::get_clipboard_image_base64(pb).unwrap_or_default())
    }

    #[cfg(not(any(windows, target_os = "macos")))]
    {
        Ok(String::new())
    }
}

pub fn set_clipboard_files(files: Vec<String>) -> Result<(), String> {
    #[cfg(windows)]
    {
        use windows::Win32::Foundation::HWND;
        use windows::Win32::System::DataExchange::{
            CloseClipboard, EmptyClipboard, OpenClipboard, SetClipboardData,
        };
        use windows::Win32::System::Memory::{
            GlobalAlloc, GlobalLock, GlobalUnlock, GMEM_MOVEABLE,
        };

        const CF_HDROP: u32 = 15;

        unsafe {
            if OpenClipboard(HWND::default()).is_err() {
                return Err("Failed to open clipboard".to_string());
            }

            let _ = EmptyClipboard();

            // Calculate required memory size
            // DROPFILES struct + file paths (null-separated, double-null terminated)
            let mut paths_data: Vec<u16> = Vec::new();
            for file in &files {
                paths_data.extend(file.encode_utf16());
                paths_data.push(0); // Null separator
            }
            paths_data.push(0); // Double null terminator

            let dropfiles_size = 20; // sizeof(DROPFILES) = 5 * 4 bytes
            let paths_size = paths_data.len() * std::mem::size_of::<u16>();
            let total_size = dropfiles_size + paths_size;

            let hmem = GlobalAlloc(GMEM_MOVEABLE, total_size);
            if hmem.is_err() {
                let _ = CloseClipboard();
                return Err("Failed to allocate memory".to_string());
            }

            let hmem = hmem.unwrap();
            let ptr = GlobalLock(hmem) as *mut u8;

            // Write DROPFILES struct
            let dropfiles_ptr = ptr as *mut u32;
            *dropfiles_ptr.add(0) = dropfiles_size as u32; // pFiles offset
            *dropfiles_ptr.add(1) = 0; // pt.x
            *dropfiles_ptr.add(2) = 0; // pt.y
            *dropfiles_ptr.add(3) = 0; // fNC
            *dropfiles_ptr.add(4) = 1; // fWide (true for Unicode)

            // Write file paths
            let paths_ptr = ptr.add(dropfiles_size) as *mut u16;
            std::ptr::copy_nonoverlapping(paths_data.as_ptr(), paths_ptr, paths_data.len());

            let _ = GlobalUnlock(hmem);

            let hmem_handle = windows::Win32::Foundation::HANDLE(hmem.0);
            let _ = SetClipboardData(CF_HDROP, hmem_handle);

            let _ = CloseClipboard();
            Ok(())
        }
    }

    #[cfg(target_os = "macos")]
    {
        use cocoa::base::{id, nil};
        use objc::{class, msg_send, sel, sel_impl};
        use std::ffi::CString;

        unsafe {
            let pb = macos_clip::get_pasteboard();

            let cls = class!(NSMutableArray);
            let file_urls: id = msg_send![cls, arrayWithCapacity: files.len()];

            for path in &files {
                let c_path =
                    CString::new(path.as_str()).map_err(|e| format!("Invalid path: {}", e))?;
                let ns_string_cls = class!(NSString);
                let ns_path: id = msg_send![ns_string_cls,
                    stringWithUTF8String: c_path.as_ptr()
                ];
                if ns_path == nil {
                    continue;
                }
                let url_cls = class!(NSURL);
                let file_url: id = msg_send![url_cls, fileURLWithPath: ns_path];
                if file_url != nil {
                    let _: () = msg_send![file_urls, addObject: file_url];
                }
            }

            let _: id = msg_send![pb, clearContents];
            let result: bool = msg_send![pb, writeObjects: file_urls];

            if result {
                Ok(())
            } else {
                Err("Failed to set clipboard files".to_string())
            }
        }
    }

    #[cfg(not(any(windows, target_os = "macos")))]
    {
        let _ = files;
        Ok(())
    }
}

/// Start monitoring system clipboard changes.
/// The callback is invoked each time the clipboard content changes.
/// On Windows, uses native `AddClipboardFormatListener` for instant notifications.
/// On other platforms, falls back to polling with change count detection.
pub fn start_clipboard_monitor(callback: impl Fn() + Send + 'static) {
    if MONITOR_RUNNING.load(Ordering::SeqCst) {
        return;
    }
    MONITOR_RUNNING.store(true, Ordering::SeqCst);

    #[cfg(windows)]
    {
        use windows::Win32::Foundation::{HWND, LPARAM, LRESULT, WPARAM};
        use windows::Win32::System::DataExchange::AddClipboardFormatListener;
        use windows::Win32::UI::WindowsAndMessaging::{
            CreateWindowExW, DispatchMessageW, GetMessageW, RegisterClassW, TranslateMessage,
            CW_USEDEFAULT, MSG, WINDOW_EX_STYLE, WM_CLIPBOARDUPDATE, WNDCLASSW,
            WS_OVERLAPPEDWINDOW,
        };

        let callback_ptr = CallbackPtr(Box::into_raw(Box::new(callback)));
        *CALLBACK_PTR.lock().unwrap() = Some(callback_ptr);

        unsafe extern "system" fn wnd_proc(
            hwnd: HWND,
            msg: u32,
            wparam: WPARAM,
            lparam: LPARAM,
        ) -> LRESULT {
            if msg == WM_CLIPBOARDUPDATE {
                if let Ok(guard) = CALLBACK_PTR.lock() {
                    if let Some(ref ptr) = *guard {
                        unsafe {
                            (&*ptr.0)();
                        }
                    }
                }
                return LRESULT(0);
            }
            unsafe {
                windows::Win32::UI::WindowsAndMessaging::DefWindowProcW(hwnd, msg, wparam, lparam)
            }
        }

        std::thread::spawn(move || unsafe {
            let class_name: Vec<u16> = "SpotlightClipboardMonitor\0".encode_utf16().collect();

            let wc = WNDCLASSW {
                lpfnWndProc: Some(wnd_proc),
                hInstance: windows::Win32::Foundation::HINSTANCE(
                    windows::Win32::System::LibraryLoader::GetModuleHandleW(None)
                        .unwrap_or_default()
                        .0,
                ),
                lpszClassName: windows::core::PCWSTR(class_name.as_ptr()),
                ..Default::default()
            };

            RegisterClassW(&wc);

            let hwnd = CreateWindowExW(
                WINDOW_EX_STYLE(0),
                windows::core::PCWSTR(class_name.as_ptr()),
                windows::core::PCWSTR(class_name.as_ptr()),
                WS_OVERLAPPEDWINDOW,
                CW_USEDEFAULT,
                CW_USEDEFAULT,
                CW_USEDEFAULT,
                CW_USEDEFAULT,
                None,
                None,
                None,
                None,
            )
            .unwrap_or(HWND::default());

            if hwnd == HWND::default() {
                MONITOR_RUNNING.store(false, Ordering::SeqCst);
                return;
            }

            let _ = AddClipboardFormatListener(hwnd);

            let mut msg = MSG::default();
            while MONITOR_RUNNING.load(Ordering::SeqCst) {
                let result = GetMessageW(&mut msg, None, 0, 0);
                if result.0 == 0 || result.0 == -1 {
                    break;
                }
                let _ = TranslateMessage(&msg);
                let _ = DispatchMessageW(&msg);
            }

            // Cleanup
            let _ = windows::Win32::System::DataExchange::RemoveClipboardFormatListener(hwnd);
            let _ = windows::Win32::UI::WindowsAndMessaging::DestroyWindow(hwnd);

            // Reclaim and drop the callback
            if let Some(cb) = CALLBACK_PTR.lock().unwrap().take() {
                let _ = Box::from_raw(cb.0);
            }
        });
    }

    #[cfg(target_os = "macos")]
    {
        // Try CGEventTap first for instant paste detection
        if macos_clip::start_event_tap(callback) {
            return;
        }

        // Fall back to polling if event tap is not available
        let mut last_change_count: i64 = unsafe {
            let pb = macos_clip::get_pasteboard();
            msg_send![pb, changeCount]
        };

        std::thread::spawn(move || {
            while MONITOR_RUNNING.load(Ordering::SeqCst) {
                let current_count: i64 = unsafe {
                    let pb = macos_clip::get_pasteboard();
                    msg_send![pb, changeCount]
                };
                if current_count != last_change_count {
                    last_change_count = current_count;
                    callback();
                }
                std::thread::sleep(std::time::Duration::from_millis(200));
            }
        });
    }

    #[cfg(not(any(windows, target_os = "macos")))]
    {
        std::thread::spawn(move || {
            while MONITOR_RUNNING.load(Ordering::SeqCst) {
                callback();
                std::thread::sleep(std::time::Duration::from_millis(500));
            }
        });
    }
}

/// Stop the clipboard monitor.
pub fn stop_clipboard_monitor() {
    if !MONITOR_RUNNING.load(Ordering::SeqCst) {
        return;
    }
    MONITOR_RUNNING.store(false, Ordering::SeqCst);

    #[cfg(windows)]
    {
        // Post WM_QUIT to unblock the message loop
        unsafe {
            use windows::Win32::UI::WindowsAndMessaging::PostQuitMessage;
            PostQuitMessage(0);
        }
    }
}

#[cfg(windows)]
unsafe fn wcslen(s: *const u16) -> usize {
    let mut count = 0;
    while *s.add(count) != 0 {
        count += 1;
    }
    count
}
pub fn set_clipboard_image(data_url: String) -> Result<(), String> {
    #[cfg(windows)]
    {
        use base64::Engine;
        use windows::Win32::Foundation::HWND;
        use windows::Win32::Graphics::Gdi::{
            CreateCompatibleBitmap, CreateCompatibleDC, DeleteDC, DeleteObject, SetDIBits,
            BITMAPINFO, BITMAPINFOHEADER, DIB_RGB_COLORS,
        };
        use windows::Win32::System::DataExchange::{
            CloseClipboard, EmptyClipboard, OpenClipboard, SetClipboardData,
        };

        const CF_BITMAP: u32 = 2;

        unsafe {
            // Extract base64 data from data URL
            let base64_data = data_url
                .split(',')
                .nth(1)
                .ok_or("Invalid data URL format")?;

            let image_data = base64::engine::general_purpose::STANDARD
                .decode(base64_data)
                .map_err(|e| format!("Failed to decode base64: {}", e))?;

            // Decode PNG
            let img = image::load_from_memory(&image_data)
                .map_err(|e| format!("Failed to decode image: {}", e))?
                .to_rgba8();

            let (width, height) = img.dimensions();

            // Convert RGBA to BGRA
            let mut bgra_data = img.to_vec();
            for chunk in bgra_data.chunks_exact_mut(4) {
                chunk.swap(0, 2);
            }

            if OpenClipboard(HWND::default()).is_err() {
                return Err("Failed to open clipboard".to_string());
            }

            let _ = EmptyClipboard();

            // Create device context and bitmap
            let hdc = CreateCompatibleDC(None);
            let hbitmap = CreateCompatibleBitmap(hdc, width as i32, height as i32);

            // Setup BITMAPINFO - bottom-up DIB (positive height for Windows GDI)
            let mut bmi = BITMAPINFO {
                bmiHeader: BITMAPINFOHEADER {
                    biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
                    biWidth: width as i32,
                    biHeight: height as i32,
                    biPlanes: 1,
                    biBitCount: 32,
                    biCompression: 0,
                    biSizeImage: (width * height * 4) as u32,
                    ..Default::default()
                },
                ..Default::default()
            };

            // Set bitmap bits from bottom-up (scan line 0 is bottom)
            let _ = SetDIBits(
                hdc,
                hbitmap,
                0,
                height,
                bgra_data.as_ptr() as *const _,
                &mut bmi,
                DIB_RGB_COLORS,
            );

            // Cleanup DC
            let _ = DeleteDC(hdc);

            // Set clipboard data
            let hmem_handle = windows::Win32::Foundation::HANDLE(hbitmap.0);
            let _ = SetClipboardData(CF_BITMAP, hmem_handle);

            // Delete bitmap handle (clipboard has its own copy)
            let _ = DeleteObject(windows::Win32::Graphics::Gdi::HGDIOBJ(hbitmap.0));

            let _ = CloseClipboard();
            Ok(())
        }
    }

    #[cfg(target_os = "macos")]
    {
        use base64::Engine;

        let base64_data = data_url
            .split(',')
            .nth(1)
            .ok_or("Invalid data URL format")?;

        let png_bytes = base64::engine::general_purpose::STANDARD
            .decode(base64_data)
            .map_err(|e| format!("Failed to decode base64: {}", e))?;

        let pb = macos_clip::get_pasteboard();
        macos_clip::set_clipboard_image_from_png(pb, &png_bytes)
    }

    #[cfg(not(any(windows, target_os = "macos")))]
    {
        let _ = data_url;
        Ok(())
    }
}
