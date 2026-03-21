use crate::utils::icon::extract_icon_base64;

#[derive(serde::Serialize)]
pub struct AppInfo {
    pub name: String,
    pub path: String,
    pub icon_data: Option<String>,
}

#[tauri::command]
pub fn get_installed_applications() -> Result<Vec<AppInfo>, String> {
    #[cfg(windows)]
    {
        use windows::Win32::System::Registry::{
            RegCloseKey, RegEnumKeyExW, RegOpenKeyExW, HKEY, HKEY_CURRENT_USER,
            HKEY_LOCAL_MACHINE, KEY_READ, KEY_WOW64_32KEY,
        };
        use windows::core::PWSTR;

        let mut apps: Vec<AppInfo> = Vec::new();

        unsafe {
            let registry_paths = [
                (
                    HKEY_LOCAL_MACHINE,
                    r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall",
                ),
                (
                    HKEY_LOCAL_MACHINE,
                    r"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall",
                ),
                (
                    HKEY_CURRENT_USER,
                    r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall",
                ),
            ];

            for (hkey_root, subkey_path) in registry_paths.iter() {
                let mut hkey: HKEY = HKEY::default();
                let subkey_wide: Vec<u16> =
                    subkey_path.encode_utf16().chain(std::iter::once(0)).collect();

                if RegOpenKeyExW(
                    *hkey_root,
                    windows::core::PCWSTR(subkey_wide.as_ptr()),
                    0,
                    KEY_READ | KEY_WOW64_32KEY,
                    &mut hkey,
                )
                .is_ok()
                {
                    let mut index: u32 = 0;
                    let mut name_buf: [u16; 256] = [0; 256];
                    let mut name_len: u32;
                    let null_pwstr = PWSTR::null();

                    loop {
                        name_len = name_buf.len() as u32;
                        let result = RegEnumKeyExW(
                            hkey,
                            index,
                            PWSTR(name_buf.as_mut_ptr()),
                            &mut name_len,
                            None,
                            null_pwstr,
                            None,
                            None,
                        );

                        if result.is_err() {
                            break;
                        }

                        let app_name =
                            String::from_utf16_lossy(&name_buf[..name_len as usize]);

                        let mut app_hkey: HKEY = HKEY::default();
                        let app_subkey_path = format!(r"{}\{}", subkey_path, app_name);
                        let app_subkey_wide: Vec<u16> = app_subkey_path
                            .encode_utf16()
                            .chain(std::iter::once(0))
                            .collect();

                        if RegOpenKeyExW(
                            *hkey_root,
                            windows::core::PCWSTR(app_subkey_wide.as_ptr()),
                            0,
                            KEY_READ,
                            &mut app_hkey,
                        )
                        .is_ok()
                        {
                            let display_name =
                                crate::utils::registry::query_registry_string(
                                    app_hkey,
                                    windows::core::w!("DisplayName"),
                                );
                            let install_location =
                                crate::utils::registry::query_registry_string(
                                    app_hkey,
                                    windows::core::w!("InstallLocation"),
                                );
                            let display_icon =
                                crate::utils::registry::query_registry_string(
                                    app_hkey,
                                    windows::core::w!("DisplayIcon"),
                                );

                            if let Some(name) = display_name {
                                if let Some(ref icon_str) = display_icon {
                                    println!("Rust: DisplayIcon for '{}': {}", name, icon_str);
                                }
                                // Try to use DisplayIcon which contains the exe path
                                // Various formats:
                                // - "C:\Path\to\app.exe"
                                // - "D:\Path\to\app.exe,0"
                                // - "D:\Path\to\Weixin"\微信.exe (directory in quotes, exe after)
                                let path = display_icon
                                    .as_ref()
                                    .and_then(|icon_str| {
                                        let clean_str = icon_str.trim();

                                        // Remove any parameters after comma (e.g., "app.exe,0" -> "app.exe")
                                        let without_params = clean_str.split(',').next().unwrap_or(clean_str);

                                        // Handle paths with quotes
                                        if without_params.contains('"') {
                                            // For format: "D:\Path\to\Dir"\exe.exe
                                            // Extract the quoted directory and append the exe filename
                                            let parts: Vec<&str> = without_params.split('"').collect();
                                            if parts.len() >= 3 {
                                                // parts[0] = empty or prefix
                                                // parts[1] = directory path
                                                // parts[2] = backslash + exe filename
                                                let dir = parts[1].trim_end_matches('\\');
                                                let exe_part = parts.get(2).unwrap_or(&"").trim_start_matches('\\');

                                                // Only construct path with backslash if exe_part is not empty
                                                if exe_part.is_empty() {
                                                    Some(dir.to_string())
                                                } else {
                                                    Some(format!(r"{}\{}", dir, exe_part))
                                                }
                                            } else {
                                                // For simple format: "C:\Path\to\app.exe"
                                                Some(without_params.replace('"', ""))
                                            }
                                        } else {
                                            Some(without_params.to_string())
                                        }
                                    })
                                    .unwrap_or_else(|| {
                                        // Fallback: only if DisplayIcon is completely missing
                                        let clean_name = name.replace('"', "").trim().to_string();
                                        if let Some(install_loc) = install_location {
                                            format!(r"{}\{}.exe", install_loc.trim_end_matches('\\'), clean_name)
                                        } else {
                                            format!(r"C:\Program Files\{}.exe", clean_name)
                                        }
                                    });

                                // Final cleanup: remove any remaining quotes and trim trailing backslashes
                                let clean_path = path.replace('"', "").trim_end_matches('\\').trim().to_string();

                                // Simple validation: check if path has valid extension
                                let has_valid_ext = clean_path.to_lowercase().ends_with(".exe")
                                    || clean_path.to_lowercase().ends_with(".lnk")
                                    || clean_path.to_lowercase().ends_with(".ico")
                                    || clean_path.to_lowercase().ends_with(".app");

                                if !has_valid_ext {
                                    println!("Rust: Skipping '{}' - invalid path: {}", name, clean_path);
                                    continue;
                                }

                                let icon_data = display_icon
                                    .as_ref()
                                    .and_then(|icon_str| {
                                        extract_icon_base64(&icon_str)
                                    });

                                println!("Rust: Processed path for '{}': {}", name, clean_path);

                                apps.push(AppInfo {
                                    name,
                                    path: clean_path,
                                    icon_data,
                                });
                            }

                            let _ = RegCloseKey(app_hkey);
                        }

                        index += 1;
                    }

                    let _ = RegCloseKey(hkey);
                }
            }
        }

        apps.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
        apps.dedup_by(|a, b| a.name.to_lowercase() == b.name.to_lowercase());

        Ok(apps)
    }

    #[cfg(target_os = "macos")]
    {
        let mut apps: Vec<AppInfo> = Vec::new();

        if let Ok(entries) = std::fs::read_dir("/Applications") {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.extension().map_or(false, |e| e == "app") {
                    if let Some(name) = path.file_stem() {
                        apps.push(AppInfo {
                            name: name.to_string_lossy().to_string(),
                            path: path.to_string_lossy().to_string(),
                            icon_data: None,
                        });
                    }
                }
            }
        }

        if let Ok(home) = std::env::var("HOME") {
            let user_apps = format!("{}/Applications", home);
            if let Ok(entries) = std::fs::read_dir(&user_apps) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.extension().map_or(false, |e| e == "app") {
                        if let Some(name) = path.file_stem() {
                            apps.push(AppInfo {
                                name: name.to_string_lossy().to_string(),
                                path: path.to_string_lossy().to_string(),
                                icon_data: None,
                            });
                        }
                    }
                }
            }
        }

        apps.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
        Ok(apps)
    }

    #[cfg(target_os = "linux")]
    {
        let mut apps: Vec<AppInfo> = Vec::new();

        let desktop_dirs = [
            "/usr/share/applications",
            "/usr/local/share/applications",
        ];

        if let Ok(home) = std::env::var("HOME") {
            let user_dir = format!("{}/.local/share/applications", home);
            let desktop_dirs_with_user: Vec<&str> =
                std::iter::once(user_dir.as_str())
                    .chain(desktop_dirs.iter().copied())
                    .collect();

            for dir in desktop_dirs_with_user {
                if let Ok(entries) = std::fs::read_dir(dir) {
                    for entry in entries.flatten() {
                        let path = entry.path();
                        if path.extension().map_or(false, |e| e == "desktop") {
                            if let Ok(content) = std::fs::read_to_string(&path) {
                                let mut name = String::new();
                                let mut exec = String::new();
                                let mut icon = Option::<String>::None;

                                for line in content.lines() {
                                    if line.starts_with("Name=") {
                                        name = line.trim_start_matches("Name=").to_string();
                                    } else if line.starts_with("Exec=") {
                                        exec = line.trim_start_matches("Exec=").to_string();
                                        if let Some(pos) = exec.find(' ') {
                                            exec = exec[..pos].to_string();
                                        }
                                    } else if line.starts_with("Icon=") {
                                        let icon_path =
                                            line.trim_start_matches("Icon=").to_string();
                                        icon = Some(icon_path);
                                    }
                                }

                                if !name.is_empty() && !exec.is_empty() {
                                    let icon_data =
                                        icon.and_then(|path| crate::utils::icon::read_icon_file(&path));
                                    apps.push(AppInfo {
                                        name,
                                        path: exec,
                                        icon_data,
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }

        apps.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
        Ok(apps)
    }

    #[cfg(not(any(windows, target_os = "macos", target_os = "linux")))]
    {
        Ok(Vec::new())
    }
}
