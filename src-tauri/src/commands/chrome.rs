use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChromeBookmark {
    pub id: String,
    pub name: String,
    pub url: String,
    pub profile: String,
    pub folder_path: Vec<String>,
}

#[derive(Debug, Deserialize)]
struct ChromeBookmarkFile {
    roots: ChromeRoots,
}

#[derive(Debug, Deserialize)]
struct ChromeRoots {
    #[serde(rename = "bookmark_bar")]
    bookmark_bar: Option<ChromeNode>,
    #[serde(rename = "other")]
    other: Option<ChromeNode>,
    synced: Option<ChromeNode>,
}

#[derive(Debug, Deserialize)]
struct ChromeNode {
    #[serde(rename = "id")]
    id: Option<String>,
    #[serde(rename = "name")]
    name: Option<String>,
    #[serde(rename = "url")]
    url: Option<String>,
    #[serde(rename = "type")]
    node_type: Option<String>,
    #[serde(rename = "children")]
    children: Option<Vec<ChromeNode>>,
}

fn get_chrome_base_path() -> Option<PathBuf> {
    #[cfg(target_os = "windows")]
    {
        std::env::var("LOCALAPPDATA")
            .ok()
            .map(|p| PathBuf::from(p).join("Google").join("Chrome").join("User Data"))
    }
    #[cfg(target_os = "macos")]
    {
        std::env::var("HOME")
            .ok()
            .map(|p| PathBuf::from(p).join("Library").join("Application Support").join("Google").join("Chrome"))
    }
    #[cfg(target_os = "linux")]
    {
        std::env::var("HOME")
            .ok()
            .map(|p| PathBuf::from(p).join(".config").join("google-chrome"))
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        None
    }
}

fn get_profile_names(base_path: &PathBuf) -> Vec<String> {
    let mut profiles = vec!["Default".to_string()];

    // Check for other profiles
    let profile_dir = base_path.join("Profiles");
    if profile_dir.exists() {
        if let Ok(entries) = fs::read_dir(&profile_dir) {
            for entry in entries.flatten() {
                let name = entry.file_name().to_string_lossy().to_string();
                if name != "system_profile" && name != "Default" {
                    profiles.push(name);
                }
            }
        }
    }

    // Also check for Default profile directories
    let default_profile_path = base_path.join("Default");
    if !profiles.contains(&"Default".to_string()) && default_profile_path.exists() {
        profiles.insert(0, "Default".to_string());
    }

    profiles
}

fn parse_bookmark_node(
    node: &ChromeNode,
    folder_path: &[String],
    profile: &str,
    bookmarks: &mut Vec<ChromeBookmark>,
) {
    let current_folder = node.name.clone().unwrap_or_default();
    let mut new_folder_path = folder_path.to_vec();
    if !current_folder.is_empty() && node.children.is_some() {
        new_folder_path.push(current_folder);
    }

    if let Some(ref node_type) = node.node_type {
        if node_type == "url" {
            if let (Some(id), Some(name), Some(url)) =
                (&node.id, &node.name, &node.url)
            {
                bookmarks.push(ChromeBookmark {
                    id: id.clone(),
                    name: name.clone(),
                    url: url.clone(),
                    profile: profile.to_string(),
                    folder_path: new_folder_path.clone(),
                });
            }
        }
    }

    if let Some(ref children) = node.children {
        for child in children {
            parse_bookmark_node(child, &new_folder_path, profile, bookmarks);
        }
    }
}

fn read_bookmarks_for_profile(
    base_path: &PathBuf,
    profile: &str,
) -> Vec<ChromeBookmark> {
    let mut bookmarks = Vec::new();

    let bookmark_file_path = if profile == "Default" {
        base_path.join("Default").join("Bookmarks")
    } else {
        base_path.join("Profiles").join(profile).join("Bookmarks")
    };

    if !bookmark_file_path.exists() {
        return bookmarks;
    }

    let content = match fs::read_to_string(&bookmark_file_path) {
        Ok(c) => c,
        Err(_) => return bookmarks,
    };

    let bookmark_file: ChromeBookmarkFile = match serde_json::from_str(&content) {
        Ok(f) => f,
        Err(_) => return bookmarks,
    };

    if let Some(ref bar) = bookmark_file.roots.bookmark_bar {
        parse_bookmark_node(bar, &[], profile, &mut bookmarks);
    }

    if let Some(ref other) = bookmark_file.roots.other {
        parse_bookmark_node(other, &[], profile, &mut bookmarks);
    }

    if let Some(ref synced) = bookmark_file.roots.synced {
        parse_bookmark_node(synced, &[], profile, &mut bookmarks);
    }

    bookmarks
}

#[tauri::command]
pub fn get_chrome_bookmarks() -> Result<Vec<ChromeBookmark>, String> {
    let base_path = get_chrome_base_path().ok_or("Could not find Chrome user data directory")?;

    if !base_path.exists() {
        return Err("Chrome user data directory not found".to_string());
    }

    let profiles = get_profile_names(&base_path);
    let mut all_bookmarks = Vec::new();

    for profile in profiles {
        let bookmarks = read_bookmarks_for_profile(&base_path, &profile);
        all_bookmarks.extend(bookmarks);
    }

    Ok(all_bookmarks)
}
