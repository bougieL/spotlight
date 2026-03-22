use std::collections::HashSet;
use std::path::Path;

#[derive(serde::Serialize)]
pub struct AppInfo {
    pub name: String,
    pub path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub icon_data: Option<String>,
}

const SKIP_PATTERNS: &[&str] = &[
    "install",
    "setup",
    "update",
    "uninstall",
    "unins",
    "helper",
    "service",
    "launcher",
    "bootstrap",
    "telemetry",
    "report",
    "crashreporter",
    "diagnose",
    "config",
    "startup",
    "autostart",
    "autorun",
    "python",
    "pythonw",
    "python3",
    "node",
    "npm",
    "npx",
    "yarn",
    "powershell",
    "pwsh",
    "cmd",
    "oneocr",
    "onnx",
    "opencv",
    "libpng",
    "zlib",
    "libjpeg",
    "vcruntime",
    "vcredist",
    "msvcp",
    "mfc",
    "directx",
    "xact",
    "xaudio",
    "xinput",
    "gpu",
    "cuda",
    "cudart",
    "opengl",
    "opencl",
    "steam",
    "epic",
    "origin",
    "uplay",
    "gog",
    "adobe",
    "creative cloud",
    "nvidia",
    "amd",
    "intel",
    "radeon",
    "geforce",
];

#[cfg(windows)]
fn is_skip_file(name: &str) -> bool {
    let lower = name.to_lowercase();
    SKIP_PATTERNS.iter().any(|p| lower.contains(p))
        || lower.ends_with(".dll")
        || lower.ends_with(".winmd")
        || lower.ends_with(".tlb")
        || lower.ends_with(".ocx")
        || lower.contains("_backup")
        || lower.contains("_old")
        || lower.contains("_native")
        || lower.contains("_wrapper")
        || lower.contains("_host")
        || lower.contains("_runtime")
        || lower.contains("_framework")
}

#[cfg(windows)]
unsafe fn search_directory_recursively(
    dir_path: &Path,
    apps: &mut Vec<AppInfo>,
    seen_paths: &mut HashSet<String>,
) {
    if let Ok(entries) = std::fs::read_dir(dir_path) {
        for entry in entries.flatten() {
            let entry_path = entry.path();

            if entry_path.is_dir() {
                if let Ok(meta) = std::fs::symlink_metadata(&entry_path) {
                    if meta.file_type().is_symlink() {
                        continue;
                    }
                }
                search_directory_recursively(&entry_path, apps, seen_paths);
            } else if entry_path.extension().map_or(false, |e| e == "lnk") {
                if let Some(name) = entry_path.file_stem() {
                    let name_str = name.to_string_lossy().to_string();
                    let target_path = get_shortcut_target(&entry_path)
                        .unwrap_or_else(|| entry_path.to_string_lossy().to_string());

                    let is_uri = target_path.chars().nth(1).map_or(false, |c| c != ':');
                    if target_path.is_empty() || (target_path.contains(':') && is_uri) {
                        continue;
                    }

                    let target_ext = Path::new(&target_path)
                        .extension()
                        .map(|e| e.to_string_lossy().to_lowercase());
                    if target_ext.as_ref().map(|e| e.as_str()) != Some("exe") {
                        continue;
                    }

                    let resolved = Path::new(&target_path);
                    let canonical = resolved
                        .canonicalize()
                        .unwrap_or_else(|_| resolved.to_path_buf());
                    let path_str = canonical.to_string_lossy().to_string();

                    if seen_paths.contains(&path_str) {
                        continue;
                    }
                    seen_paths.insert(path_str);

                    apps.push(AppInfo {
                        name: name_str,
                        path: target_path,
                        icon_data: None,
                    });
                }
            }
        }
    }
}

// Resolve symlink to get the actual target path
#[cfg(windows)]
fn resolve_symlink(path: &Path) -> String {
    if let Ok(meta) = std::fs::symlink_metadata(path) {
        if meta.file_type().is_symlink() {
            if let Ok(target) = std::fs::read_link(path) {
                let target_str = target.to_string_lossy().to_string();

                // Convert Unix-style path to Windows path if needed
                // /c/... -> C:\...
                let converted = if target_str.starts_with("/c/") {
                    let rest = &target_str[3..];
                    format!("C:{}", rest.replace('/', "\\"))
                } else if target_str.starts_with("/")
                    && target_str.len() > 2
                    && target_str.chars().nth(2) == Some('/')
                {
                    let drive = target_str
                        .chars()
                        .nth(1)
                        .map(|c| c.to_ascii_uppercase())
                        .unwrap_or('C');
                    let rest = &target_str[3..];
                    format!("{}:{}", drive, rest.replace('/', "\\"))
                } else {
                    target_str
                };

                // If still a symlink (chain), try to resolve again
                let p = Path::new(&converted);
                if p.exists()
                    && std::fs::symlink_metadata(p)
                        .map(|m| m.file_type().is_symlink())
                        .unwrap_or(false)
                {
                    return resolve_symlink(p);
                }

                return converted;
            }
        }
    }
    path.to_string_lossy().to_string()
}

#[cfg(windows)]
unsafe fn search_windows_apps_directory(
    dir_path: &Path,
    apps: &mut Vec<AppInfo>,
    seen_paths: &mut HashSet<String>,
    seen_names: &mut HashSet<String>,
) {
    if let Ok(entries) = std::fs::read_dir(dir_path) {
        for entry in entries.flatten() {
            let entry_path = entry.path();

            if entry_path.is_dir() {
                if let Ok(sub_entries) = std::fs::read_dir(&entry_path) {
                    for sub_entry in sub_entries.flatten() {
                        let sub_path = sub_entry.path();
                        if sub_path.extension().map_or(false, |e| e == "exe") {
                            let file_name = sub_path
                                .file_name()
                                .map(|n| n.to_string_lossy().to_string())
                                .unwrap_or_default();

                            if is_skip_file(&file_name) {
                                continue;
                            }

                            let name = sub_path
                                .file_stem()
                                .map(|n| n.to_string_lossy().to_string())
                                .unwrap_or_default();

                            let clean_name = clean_windows_app_name(&name);
                            let clean_lower = clean_name.to_lowercase();

                            if seen_names.contains(&clean_lower)
                                || clean_name.is_empty()
                                || clean_name.len() < 2
                            {
                                continue;
                            }

                            let resolved_path = resolve_symlink(&sub_path);
                            let resolved = Path::new(&resolved_path);
                            let canonical = resolved
                                .canonicalize()
                                .unwrap_or_else(|_| resolved.to_path_buf());
                            let path_str = canonical.to_string_lossy().to_string();

                            if seen_paths.contains(&path_str) {
                                continue;
                            }
                            seen_paths.insert(path_str);
                            seen_names.insert(clean_lower);

                            apps.push(AppInfo {
                                name: clean_name,
                                path: resolved_path,
                                icon_data: None,
                            });
                        }
                    }
                }
            } else if entry_path.extension().map_or(false, |e| e == "exe") {
                let file_name = entry_path
                    .file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_default();

                if is_skip_file(&file_name) {
                    continue;
                }

                let name = entry_path
                    .file_stem()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_default();

                let clean_name = if name.to_lowercase() == "snippingtool" {
                    "Snipping Tool".to_string()
                } else if name.to_lowercase() == "snippingtoolui" {
                    continue;
                } else {
                    clean_windows_app_name(&name)
                };

                let clean_lower = clean_name.to_lowercase();
                if seen_names.contains(&clean_lower) || clean_name.is_empty() {
                    continue;
                }

                let resolved_path = resolve_symlink(&entry_path);
                let resolved = Path::new(&resolved_path);
                let canonical = resolved
                    .canonicalize()
                    .unwrap_or_else(|_| resolved.to_path_buf());
                let path_str = canonical.to_string_lossy().to_string();

                if seen_paths.contains(&path_str) {
                    continue;
                }
                seen_paths.insert(path_str);
                seen_names.insert(clean_lower);

                apps.push(AppInfo {
                    name: clean_name,
                    path: resolved_path,
                    icon_data: None,
                });
            }
        }
    }
}

// Clean up Windows App names (remove version numbers, package prefixes, etc.)
#[cfg(windows)]
fn clean_windows_app_name(name: &str) -> String {
    // First, preserve known app names (case-insensitive check)
    let lower = name.to_lowercase();
    match lower.as_str() {
        "snippingtool" => return "Snipping Tool".to_string(),
        "notepad" => return "Notepad".to_string(),
        "mspaint" | "pbrush" => return "Paint".to_string(),
        "calculator" => return "Calculator".to_string(),
        "store" | "microsoftstore" => return "Store".to_string(),
        "wt" => return "Windows Terminal".to_string(),
        "gethelp" => return "Get Help".to_string(),
        "media player" | "medialayer" => return "Media Player".to_string(),
        "actionsmcp" | "actionsmcp host" => return "Actions".to_string(),
        _ => {}
    }

    // Remove package prefixes
    let cleaned = name
        .replace("Microsoft.Windows.", "")
        .replace("Microsoft.", "")
        .replace("Windows.", "")
        .replace("Microsoft", "");

    // Remove version numbers and architecture suffixes
    let re = regex_lite::Regex::new(r"[\-_]\d+(\.\d+)*(_[a-zA-Z0-9]+)?$")
        .unwrap_or_else(|_| regex_lite::Regex::new(r"dummy").unwrap());
    let cleaned = re.replace_all(&cleaned, "").to_string();

    // If name has uppercase letters (camelCase), try to split them
    if cleaned.chars().any(|c| c.is_uppercase()) {
        let mut result = Vec::new();
        let mut current = String::new();
        for c in cleaned.chars() {
            if c.is_uppercase() && !current.is_empty() {
                result.push(current);
                current = String::new();
            }
            current.push(c);
        }
        if !current.is_empty() {
            result.push(current);
        }
        result.join(" ")
    } else if !cleaned.is_empty() {
        // Just title case the whole thing
        cleaned
            .chars()
            .next()
            .map(|c| c.to_uppercase().collect::<String>() + &cleaned[1..].to_lowercase())
            .unwrap_or(cleaned)
    } else {
        cleaned
    }
}

#[tauri::command]
pub fn get_installed_applications() -> Result<Vec<AppInfo>, String> {
    #[cfg(windows)]
    {
        use windows::Win32::System::Com::{CoInitializeEx, COINIT_MULTITHREADED};

        let mut apps: Vec<AppInfo> = Vec::new();
        let mut seen_paths: HashSet<String> = HashSet::new();
        let mut seen_names: HashSet<String> = HashSet::new();

        let start_menu_user = std::env::var("APPDATA")
            .map(|p| format!(r"{}\Microsoft\Windows\Start Menu\Programs", p))
            .ok();
        let start_menu_all = std::env::var("PROGRAMDATA")
            .map(|p| format!(r"{}\Microsoft\Windows\Start Menu\Programs", p))
            .ok();
        let desktop_user = std::env::var("USERPROFILE")
            .map(|p| format!(r"{}\Desktop", p))
            .ok();
        let desktop_common = std::env::var("PROGRAMDATA")
            .map(|p| format!(r"{}\Microsoft\Windows\Desktop", p))
            .ok();

        let mut windowsapps_paths: Vec<String> = Vec::new();

        if let Ok(local) = std::env::var("LOCALAPPDATA") {
            let path = format!(r"{}\Microsoft\WindowsApps", local);
            if Path::new(&path).exists() {
                windowsapps_paths.push(path);
            }
        }

        if let Ok(program_files) = std::env::var("ProgramFiles") {
            let path = format!(r"{}\WindowsApps", program_files);
            if Path::new(&path).exists() {
                windowsapps_paths.push(path);
            }
        }

        if let Ok(program_files_x86) = std::env::var("ProgramFiles(x86)") {
            let path = format!(r"{}\WindowsApps", program_files_x86);
            if Path::new(&path).exists() {
                windowsapps_paths.push(path);
            }
        }

        let search_paths: Vec<String> = start_menu_user
            .into_iter()
            .chain(start_menu_all.into_iter())
            .chain(desktop_user.into_iter())
            .chain(desktop_common.into_iter())
            .collect();

        unsafe {
            let _ = CoInitializeEx(None, COINIT_MULTITHREADED);

            for dir_path in &search_paths {
                let path = Path::new(dir_path);
                if path.exists() {
                    search_directory_recursively(path, &mut apps, &mut seen_paths);
                }
            }

            for dir_path in &windowsapps_paths {
                let path = Path::new(dir_path);
                if path.exists() {
                    search_windows_apps_directory(
                        path,
                        &mut apps,
                        &mut seen_paths,
                        &mut seen_names,
                    );
                }
            }
        }

        apps.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
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

        let desktop_dirs = ["/usr/share/applications", "/usr/local/share/applications"];

        if let Ok(home) = std::env::var("HOME") {
            let user_dir = format!("{}/.local/share/applications", home);
            let desktop_dirs_with_user: Vec<&str> = std::iter::once(user_dir.as_str())
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
                                    let icon_data = icon
                                        .and_then(|path| crate::utils::icon::read_icon_file(&path));
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

#[tauri::command]
pub fn get_app_icon(path: String) -> Option<String> {
    crate::utils::icon::extract_icon_base64(&path)
}

#[cfg(windows)]
unsafe fn get_shortcut_target(lnk_path: &std::path::Path) -> Option<String> {
    use windows::core::{Interface, PCWSTR};
    use windows::Win32::Storage::FileSystem::WIN32_FIND_DATAW;
    use windows::Win32::System::Com::{CoCreateInstance, IPersistFile, CLSCTX_INPROC_SERVER};
    use windows::Win32::UI::Shell::{IShellLinkW, ShellLink};

    let shell_link: IShellLinkW = CoCreateInstance(&ShellLink, None, CLSCTX_INPROC_SERVER).ok()?;
    let persist_file: IPersistFile = shell_link.cast().ok()?;

    let path_wide: Vec<u16> = lnk_path
        .to_string_lossy()
        .encode_utf16()
        .chain(std::iter::once(0))
        .collect();
    persist_file
        .Load(
            PCWSTR(path_wide.as_ptr()),
            windows::Win32::System::Com::STGM(0),
        )
        .ok()?;

    let mut target_buf: [u16; windows::Win32::Foundation::MAX_PATH as usize] =
        [0; windows::Win32::Foundation::MAX_PATH as usize];
    let mut find_data: WIN32_FIND_DATAW = WIN32_FIND_DATAW::default();

    shell_link
        .GetPath(&mut target_buf, &mut find_data, 0)
        .ok()?;

    let null_pos = target_buf
        .iter()
        .position(|&c| c == 0)
        .unwrap_or(target_buf.len());
    let target = String::from_utf16_lossy(&target_buf[..null_pos]);
    if target.is_empty() {
        None
    } else {
        Some(target)
    }
}
