use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::Manager;

#[derive(Debug, Serialize)]
pub struct RipgrepResult {
    pub file: String,
    pub line: u32,
    pub content: String,
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

fn parse_rg_output(output: &str) -> Vec<RipgrepResult> {
    let mut results = Vec::new();

    for line in output.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }

        // ripgrep output format: file:line:content
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

#[derive(Debug, Deserialize)]
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
    args.push(path.unwrap_or_else(|| ".".to_string()).to_string());

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
