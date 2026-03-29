use serde::Serialize;
use std::time::Duration;
use tauri::Manager;

#[derive(Debug, Serialize)]
pub struct EverythingResult {
    pub name: String,
    pub path: String,
    pub size: String,
    pub date_modified: String,
}

fn find_binary(app: &tauri::AppHandle, name: &str) -> Option<std::path::PathBuf> {
    // 1. Dev mode: check src-tauri/binaries/
    let manifest_dir = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let candidate = manifest_dir.join("binaries").join(name);
    if candidate.exists() {
        return Some(candidate);
    }

    // 2. Check resource directory (release build)
    if let Ok(res_dir) = app.path().resource_dir() {
        let candidate = res_dir.join("binaries").join(name);
        if candidate.exists() {
            return Some(candidate);
        }
        let candidate = res_dir.join(name);
        if candidate.exists() {
            return Some(candidate);
        }
    }

    // 3. Check alongside the main executable
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            let candidate = exe_dir.join("binaries").join(name);
            if candidate.exists() {
                return Some(candidate);
            }
            let candidate = exe_dir.join(name);
            if candidate.exists() {
                return Some(candidate);
            }
        }
    }

    // 4. Check user data directory
    if let Ok(data_dir) = app.path().app_data_dir() {
        let candidate = data_dir.join("binaries").join(name);
        if candidate.exists() {
            return Some(candidate);
        }
    }

    // 5. Fall back to PATH
    if let Ok(output) = std::process::Command::new("where").arg(name).output() {
        if output.status.success() {
            let path_str = String::from_utf8_lossy(&output.stdout);
            if let Some(first_line) = path_str.lines().next() {
                let p = std::path::PathBuf::from(first_line.trim());
                if p.exists() {
                    return Some(p);
                }
            }
        }
    }

    None
}

#[cfg(windows)]
fn is_everything_running() -> bool {
    use windows::Win32::UI::WindowsAndMessaging::FindWindowW;

    let class_name: Vec<u16> = "EVERYTHING_TASKBAR_NOTIFICATION"
        .encode_utf16()
        .chain(std::iter::once(0))
        .collect();

    unsafe {
        FindWindowW(
            windows::core::PCWSTR(class_name.as_ptr()),
            windows::core::PCWSTR::null(),
        )
        .is_ok()
    }
}

#[cfg(windows)]
fn start_everything(app: &tauri::AppHandle) -> Result<(), String> {
    if is_everything_running() {
        return Ok(());
    }

    let everything_path = find_binary(app, "Everything.exe").ok_or_else(|| {
        "Everything.exe not found. Please place it in src-tauri/binaries/".to_string()
    })?;

    // Start Everything in the background with -startup flag
    // -startup: run as background service, no UI
    // -config: use a config dir next to the exe
    std::process::Command::new(&everything_path)
        .arg("-startup")
        .stdin(std::process::Stdio::null())
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .spawn()
        .map_err(|e| format!("Failed to start Everything: {}", e))?;

    // Wait for Everything to initialize (up to 5 seconds)
    for _ in 0..50 {
        std::thread::sleep(Duration::from_millis(100));
        if is_everything_running() {
            // Give it a bit more time to build its index
            std::thread::sleep(Duration::from_millis(500));
            return Ok(());
        }
    }

    Err("Everything started but IPC window not found after waiting. It may need more time to initialize.".to_string())
}

fn parse_es_output(output: &str) -> Vec<EverythingResult> {
    let mut results = Vec::new();

    for line in output.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }

        let parts: Vec<&str> = line.splitn(4, '\t').collect();

        if parts.len() >= 2 {
            results.push(EverythingResult {
                name: parts[0].to_string(),
                path: parts[1].to_string(),
                size: if parts.len() > 2 {
                    parts[2].to_string()
                } else {
                    String::new()
                },
                date_modified: if parts.len() > 3 {
                    parts[3].to_string()
                } else {
                    String::new()
                },
            });
        }
    }

    results
}

#[tauri::command]
pub fn search_everything(
    app: tauri::AppHandle,
    query: String,
) -> Result<Vec<EverythingResult>, String> {
    if query.trim().is_empty() {
        return Ok(vec![]);
    }

    #[cfg(not(windows))]
    {
        let _ = (app, query);
        return Err("Everything search is only available on Windows".to_string());
    }

    #[cfg(windows)]
    {
        start_everything(&app)?;

        let es_path = find_binary(&app, "es.exe").ok_or_else(|| {
            "es.exe not found. Please place it in src-tauri/binaries/".to_string()
        })?;

        let output = std::process::Command::new(&es_path)
            .args(["-n", "20", "-size", "-date-modified", "-r", &query])
            .output()
            .map_err(|e| format!("Failed to execute {}: {}", es_path.display(), e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            if !stderr.is_empty() {
                return Err(format!("Everything search error: {}", stderr));
            }
            return Ok(vec![]);
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        Ok(parse_es_output(&stdout))
    }
}
