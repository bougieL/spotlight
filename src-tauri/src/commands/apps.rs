use crate::utils::icon::{extract_icon_base64, generate_letter_icon};

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
                    let mut name_len: u32 = name_buf.len() as u32;
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
                                let path = install_location
                                    .unwrap_or_else(|| {
                                        format!(r"C:\Program Files\{}", name)
                                    });
                                let icon_data = display_icon
                                    .and_then(|icon_str| {
                                        extract_icon_base64(&icon_str)
                                    })
                                    .or_else(|| generate_letter_icon(&name));

                                apps.push(AppInfo {
                                    name,
                                    path,
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
