use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::Manager;

#[derive(Debug, Serialize)]
pub struct RipgrepResult {
    pub file: String,
    pub line: u32,
    pub content: String,
}

#[derive(Debug, Serialize)]
pub struct FileResult {
    pub name: String,
    pub path: String,
}

#[cfg(windows)]
pub fn get_windows_drives() -> Vec<String> {
    let mut drives = Vec::new();
    // Check drives from C to Z
    for letter in b'C'..=b'Z' {
        let drive = format!("{}:\\", letter as char);
        if std::path::Path::new(&drive).exists() {
            drives.push(drive);
        }
    }
    drives
}

#[cfg(windows)]
pub fn get_user_home_dir() -> String {
    std::env::var("USERPROFILE").unwrap_or_else(|_| "C:\\Users\\Default".to_string())
}

#[cfg(not(windows))]
pub fn get_user_home_dir() -> String {
    std::env::var("HOME").unwrap_or_else(|_| "/".to_string())
}

#[tauri::command]
pub fn get_user_home() -> String {
    get_user_home_dir()
}

fn find_binary(app: &tauri::AppHandle, name: &str) -> Option<PathBuf> {
    // 1. Dev mode: check src-tauri/binaries/
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
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
    #[cfg(windows)]
    {
        if let Ok(output) = std::process::Command::new("where").arg(name).output() {
            if output.status.success() {
                let path_str = String::from_utf8_lossy(&output.stdout);
                if let Some(first_line) = path_str.lines().next() {
                    let p = PathBuf::from(first_line.trim());
                    if p.exists() {
                        return Some(p);
                    }
                }
            }
        }
    }
    #[cfg(not(windows))]
    {
        if let Ok(output) = std::process::Command::new("which").arg(name).output() {
            if output.status.success() {
                let path_str = String::from_utf8_lossy(&output.stdout);
                if let Some(first_line) = path_str.lines().next() {
                    let p = PathBuf::from(first_line.trim());
                    if p.exists() {
                        return Some(p);
                    }
                }
            }
        }
    }

    None
}

pub fn parse_rg_output(output: &str) -> Vec<RipgrepResult> {
    let mut results = Vec::new();

    for line in output.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }

        // ripgrep output format: file:line:content
        // On Windows, file paths contain drive letters like C:\, so we need special handling
        if cfg!(windows) {
            // Try to find Windows path pattern: starts with X:\ or X:/
            if let Some((first_part, rest)) = line.split_once(':') {
                if first_part.len() == 1 && first_part.chars().next().map(|c| c.is_ascii_alphabetic()).unwrap_or(false) {
                    // This looks like a Windows drive letter (e.g., "C")
                    // The rest is like "\Users\...\file.rs:10:content"
                    let stripped = rest.strip_prefix('\\')
                        .or_else(|| rest.strip_prefix("\\\\"))
                        .or_else(|| rest.strip_prefix('/'));
                    if let Some(stripped) = stripped {
                        // Now find the last colon, which separates line:content from the file path
                        if let Some((file_and_line, content)) = stripped.rsplit_once(':') {
                            if let Some((file_path, line_str)) = file_and_line.rsplit_once(':') {
                                if let Ok(line_num) = line_str.parse::<u32>() {
                                    let full_path = format!("{}:\\{}", first_part, file_path);
                                    results.push(RipgrepResult {
                                        file: full_path,
                                        line: line_num,
                                        content: content.to_string(),
                                    });
                                    continue;
                                }
                            }
                        }
                    }
                }
            }
            // Fall through to normal parsing for Unix paths or other formats
        }

        // Standard parsing for non-Windows or fallback
        if let Some((file_part, rest)) = line.split_once(':') {
            if let Some((line_part, content)) = rest.split_once(':') {
                if let Ok(line_num) = line_part.parse::<u32>() {
                    results.push(RipgrepResult {
                        file: file_part.to_string(),
                        line: line_num,
                        content: content.to_string(),
                    });
                }
            }
        }
    }

    results
}

#[derive(Debug, Deserialize, Serialize)]
pub struct SearchOptions {
    pub case_sensitive: bool,
    pub whole_word: bool,
    pub regex: bool,
    pub file_type: Option<String>,
}

#[tauri::command]
pub fn search_with_rg(
    app: tauri::AppHandle,
    query: String,
    path: Option<String>,
    options: Option<SearchOptions>,
) -> Result<Vec<RipgrepResult>, String> {
    if query.trim().is_empty() {
        return Ok(vec![]);
    }

    let rg_name = if cfg!(windows) { "rg.exe" } else { "rg" };

    let rg_path = find_binary(&app, rg_name).ok_or_else(|| {
        format!("{} not found. Please place it in src-tauri/binaries/", rg_name)
    })?;

    let mut args = vec![
        "--line-number".to_string(),
        "--with-filename".to_string(),
        "-e".to_string(),
        query.clone(),
    ];

    // Apply search options
    if let Some(opts) = &options {
        if opts.case_sensitive {
            args.push("-s".to_string());
        }
        if opts.whole_word {
            args.push("-w".to_string());
        }
        if !opts.regex {
            args.push("-F".to_string());
        }
        if let Some(ft) = &opts.file_type {
            args.push("--type".to_string());
            args.push(ft.clone());
        }
    }

    // Limit results to prevent performance issues
    args.push("--".to_string());

    #[cfg(windows)]
    {
        let search_paths: Vec<String> = if let Some(p) = path {
            // User provided path, split by semicolon if multiple
            p.split(';')
                .map(|s| s.trim().to_string().replace('\\', "/"))
                .filter(|s| !s.is_empty())
                .collect()
        } else {
            // Default to user home directory
            vec![get_user_home_dir().replace('\\', "/")]
        };
        for sp in search_paths {
            args.push(sp);
        }
    }

    #[cfg(not(windows))]
    args.push(path.unwrap_or_else(|| "/".to_string()).to_string());

    let output = std::process::Command::new(&rg_path)
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to execute {}: {}", rg_path.display(), e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        if !stderr.is_empty() {
            return Err(format!("Ripgrep error: {}", stderr));
        }
        return Ok(vec![]);
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    Ok(parse_rg_output(&stdout))
}

// Search files by name only (using ripgrep -g glob pattern)
#[tauri::command]
pub fn search_files_with_rg(
    app: tauri::AppHandle,
    query: String,
    path: Option<String>,
    case_sensitive: Option<bool>,
) -> Result<Vec<FileResult>, String> {
    if query.trim().is_empty() {
        return Ok(vec![]);
    }

    let rg_name = if cfg!(windows) { "rg.exe" } else { "rg" };

    let rg_path = find_binary(&app, rg_name).ok_or_else(|| {
        format!("{} not found. Please place it in src-tauri/binaries/", rg_name)
    })?;

    let mut args = vec![
        "-l".to_string(),
        "--binary".to_string(),
        "-e".to_string(),
        "".to_string(),  // match empty pattern (all content)
    ];

    // Use glob pattern to match filename
    let case_flag = if let Some(cs) = case_sensitive {
        if cs { "-s" } else { "-i" }
    } else {
        "-i"  // default case insensitive
    };

    // Build glob pattern - matches query anywhere in filename (including extensions)
    let glob_pattern = format!("*{}*", query);

    args.push("-g".to_string());
    args.push(glob_pattern);
    args.push(case_flag.to_string());

    args.push("--".to_string());

    #[cfg(windows)]
    {
        let search_paths: Vec<String> = if let Some(p) = path {
            p.split(';')
                .map(|s| s.trim().to_string().replace('\\', "/"))
                .filter(|s| !s.is_empty())
                .collect()
        } else {
            // Default to user home directory
            vec![get_user_home_dir().replace('\\', "/")]
        };
        for sp in search_paths {
            args.push(sp);
        }
    }

    #[cfg(not(windows))]
    args.push(path.unwrap_or_else(|| get_user_home_dir()).to_string());

    let output = std::process::Command::new(&rg_path)
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to execute {}: {}", rg_path.display(), e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        if !stderr.is_empty() {
            return Err(format!("Ripgrep error: {}", stderr));
        }
        return Ok(vec![]);
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    Ok(parse_file_output(&stdout))
}

fn parse_file_output(output: &str) -> Vec<FileResult> {
    let mut results = Vec::new();
    let mut seen = std::collections::HashSet::new();

    for line in output.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }

        // Use path as key to deduplicate
        if seen.insert(line.to_string()) {
            let path = line.to_string();
            let name = std::path::Path::new(&path)
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_else(|| path.clone());

            results.push(FileResult {
                name,
                path,
            });
        }
    }

    results
}
