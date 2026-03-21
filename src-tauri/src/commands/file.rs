use std::fs;
use std::path::PathBuf;

#[tauri::command]
pub fn save_temp_image(data_url: String) -> Result<String, String> {
    let parts: Vec<&str> = data_url.splitn(2, ',').collect();
    if parts.len() != 2 {
        return Err("Invalid data URL format".to_string());
    }

    let base64_data = parts[1];
    let image_data =
        base64::Engine::decode(&base64::engine::general_purpose::STANDARD, base64_data)
            .map_err(|e| e.to_string())?;

    let temp_dir = std::env::temp_dir();
    let file_name = format!("spotlight_{}.png", uuid::Uuid::new_v4());
    let file_path: PathBuf = temp_dir.join(&file_name);

    fs::write(&file_path, image_data).map_err(|e| e.to_string())?;

    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn save_pasted_file(data_url: String, file_name: String) -> Result<String, String> {
    let parts: Vec<&str> = data_url.splitn(2, ',').collect();
    if parts.len() != 2 {
        return Err("Invalid data URL format".to_string());
    }

    let base64_data = parts[1];
    let file_data =
        base64::Engine::decode(&base64::engine::general_purpose::STANDARD, base64_data)
            .map_err(|e| e.to_string())?;

    let temp_dir = std::env::temp_dir();
    let safe_file_name = format!("spotlight_{}_{}", uuid::Uuid::new_v4(), file_name);
    let file_path: PathBuf = temp_dir.join(&safe_file_name);

    fs::write(&file_path, file_data).map_err(|e| e.to_string())?;

    Ok(file_path.to_string_lossy().to_string())
}
