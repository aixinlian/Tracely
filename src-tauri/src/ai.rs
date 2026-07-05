use serde::{Deserialize, Serialize};
use tracing::{info, warn, error};

// ── list_models ────────────────────────────────────────────────────────────────

#[derive(Deserialize)]
struct ModelsResponse {
    data: Vec<ModelInfo>,
}

#[derive(Deserialize)]
struct ModelInfo {
    id: String,
}

/// Fetch available model IDs from an OpenAI-compatible `/models` endpoint.
#[tauri::command]
pub async fn list_models(
    endpoint: String,
    api_key: Option<String>,
) -> Result<Vec<String>, String> {
    info!("Fetching models from endpoint: {}", endpoint);
    let client = reqwest::Client::new();

    // Normalise endpoint → append /models
    let base = endpoint.trim_end_matches('/');
    let url = format!("{}/models", base);

    let mut req = client.get(&url);
    if let Some(key) = api_key {
        if !key.is_empty() {
            req = req.header("Authorization", format!("Bearer {}", key));
        }
    }

    let response = req
        .send()
        .await
        .map_err(|e| {
            error!("Failed to fetch models from {}: {}", url, e);
            format!("请求失败：{}", e)
        })?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response
            .text()
            .await
            .unwrap_or_else(|_| "无法读取响应".to_string());
        warn!("Models API returned error {}: {}", status, body);
        return Err(format!("API 返回错误 {}：{}", status, body));
    }

    let models_response: ModelsResponse = response
        .json()
        .await
        .map_err(|e| {
            error!("Failed to parse models response: {}", e);
            format!("解析响应失败：{}", e)
        })?;

    let ids: Vec<String> = models_response.data.into_iter().map(|m| m.id).collect();
    info!("Successfully fetched {} models", ids.len());
    Ok(ids)
}

#[derive(Serialize, Deserialize)]
struct ChatMessage {
    role: String,
    content: String,
}

#[derive(Serialize)]
struct ChatRequest {
    model: String,
    messages: Vec<ChatMessage>,
}

#[derive(Deserialize)]
struct ChatChoice {
    message: ChatMessage,
}

#[derive(Deserialize)]
struct ChatResponse {
    choices: Vec<ChatChoice>,
}

/// Call an OpenAI-compatible chat completion endpoint.
#[tauri::command]
pub async fn chat_completion(
    endpoint: String,
    api_key: Option<String>,
    model: String,
    prompt: String,
) -> Result<String, String> {
    info!("Chat completion request - model: {}, endpoint: {}", model, endpoint);
    let client = reqwest::Client::new();

    let url = if endpoint.ends_with('/') {
        format!("{}chat/completions", endpoint)
    } else {
        format!("{}/chat/completions", endpoint)
    };

    let request_body = ChatRequest {
        model: model.clone(),
        messages: vec![ChatMessage {
            role: "user".to_string(),
            content: prompt,
        }],
    };

    let mut req = client.post(&url).json(&request_body);

    if let Some(key) = api_key {
        if !key.is_empty() {
            req = req.header("Authorization", format!("Bearer {}", key));
        }
    }

    let response = req
        .send()
        .await
        .map_err(|e| {
            error!("Chat completion request failed for model {}: {}", model, e);
            format!("请求失败：{}", e)
        })?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response
            .text()
            .await
            .unwrap_or_else(|_| "无法读取响应".to_string());
        warn!("Chat completion API returned error {} for model {}: {}", status, model, body);
        return Err(format!("API 返回错误 {}：{}", status, body));
    }

    let chat_response: ChatResponse = response
        .json()
        .await
        .map_err(|e| {
            error!("Failed to parse chat completion response: {}", e);
            format!("解析响应失败：{}", e)
        })?;

    let result = chat_response
        .choices
        .first()
        .map(|choice| choice.message.content.clone())
        .ok_or_else(|| {
            error!("Chat completion returned empty response");
            "API 返回为空".to_string()
        })?;

    info!("Chat completion successful, response length: {}", result.len());
    Ok(result)
}
