use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AIChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AIChatRequest {
    pub endpoint_type: String,
    pub api_url: String,
    pub api_key: String,
    pub messages: Vec<AIChatMessage>,
    pub model: Option<String>,
    pub max_tokens: Option<u32>,
    pub temperature: Option<f32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AIChatResponse {
    pub content: String,
    pub usage: Option<HashMap<String, u32>>,
}

#[tauri::command]
pub async fn ai_chat(request: AIChatRequest) -> Result<AIChatResponse, String> {
    let content = match request.endpoint_type.as_str() {
        "openai" => send_openai_request(&request).await,
        "anthropic" => send_anthropic_request(&request).await,
        _ => Err(format!("Unknown endpoint type: {}", request.endpoint_type)),
    }?;

    Ok(AIChatResponse {
        content,
        usage: None,
    })
}

async fn send_openai_request(request: &AIChatRequest) -> Result<String, String> {
    let model = request.model.clone().unwrap_or_else(|| "gpt-4o-mini".to_string());
    let max_tokens = request.max_tokens.unwrap_or(1024);
    let temperature = request.temperature.unwrap_or(0.7);

    let body = serde_json::json!({
        "model": model,
        "messages": request.messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
    });

    let client = Client::new();
    let response = client
        .post(&request.api_url)
        .header("Authorization", format!("Bearer {}", request.api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| e.to_string())?;

    json["choices"]
        .get(0)
        .and_then(|c| c.get("message"))
        .and_then(|m| m.get("content"))
        .and_then(|s| s.as_str())
        .map(|s| s.to_string())
        .ok_or_else(|| "Failed to parse OpenAI response".to_string())
}

async fn send_anthropic_request(request: &AIChatRequest) -> Result<String, String> {
    let model = request.model.clone().unwrap_or_else(|| "claude-3-5-haiku-20241022".to_string());
    let max_tokens = request.max_tokens.unwrap_or(1024);

    // Convert messages to Anthropic format
    let mut anthropic_messages: Vec<serde_json::Value> = Vec::new();
    for msg in &request.messages {
        if msg.role == "system" {
            continue; // System messages handled separately
        }
        anthropic_messages.push(serde_json::json!({
            "role": msg.role,
            "content": msg.content,
        }));
    }

    let system_msg = request
        .messages
        .iter()
        .find(|m| m.role == "system")
        .map(|m| m.content.clone());

    let mut body = serde_json::json!({
        "model": model,
        "messages": anthropic_messages,
        "max_tokens": max_tokens,
    });

    if let Some(system) = system_msg {
        body["system"] = serde_json::json!(system);
    }

    let client = Client::new();
    let response = client
        .post(&request.api_url)
        .header("x-api-key", &request.api_key)
        .header("anthropic-version", "2023-06-01")
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| e.to_string())?;

    json["content"]
        .get(0)
        .and_then(|c| c.get("text"))
        .and_then(|s| s.as_str())
        .map(|s| s.to_string())
        .ok_or_else(|| "Failed to parse Anthropic response".to_string())
}
