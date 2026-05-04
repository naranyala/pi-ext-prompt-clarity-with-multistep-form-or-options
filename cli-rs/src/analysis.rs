use crate::types::AmbiguityReport;
use anyhow::{anyhow, Result};
use reqwest::Client;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
struct ChatCompletionRequest {
    model: String,
    messages: Vec<ChatMessage>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ChatMessage {
    role: String,
    content: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct ChatCompletionResponse {
    choices: Vec<Choice>,
}

#[derive(Debug, Serialize, Deserialize)]
struct Choice {
    message: ChatMessage,
}

pub struct SemanticAnalyzer {
    client: Client,
    api_key: String,
    base_url: String,
    model: String,
}

impl SemanticAnalyzer {
    pub fn new(api_key: String, base_url: Option<String>, model: Option<String>) -> Self {
        Self {
            client: Client::new(),
            api_key,
            base_url: base_url.unwrap_or_else(|| "https://api.openai.com/v1".to_string()),
            model: model.unwrap_or_else(|| "gpt-4o".to_string()),
        }
    }

    pub async fn analyze(&self, prompt: &str) -> Result<AmbiguityReport> {
        let system_prompt = r#"You are an ambiguity analysis expert. 
Analyze the user's prompt to identify missing information.
Categorize the missing information into these dimensions:
- technology: missing tech stack, libraries, or frameworks
- scope: missing boundaries (file, folder, project)
- format: missing output requirements (JSON, Markdown, etc.)
- context: missing reference to existing code or state
- intent: missing clear goal (fix, refactor, explain)

For each missing dimension, you MUST provide:
1. A short label explaining what is missing.
2. 3-4 highly probable suggestions based on the context of the prompt.
3. EVIDENCE: A specific reason why this is missing. Quote the prompt or explain the logical gap. If you cannot find a clear gap, do NOT include this dimension.

Return ONLY a valid JSON object with this structure:
{
  "score": number, // 0.0 (precise) to 1.0 (very vague)
  "dimensions": ["technology", "scope", etc...],
  "suggestions": [
    {
      "dimension": "technology",
      "label": "Missing framework specification",
      "suggestions": ["React", "Vue", "Svelte", "Vanilla JS"],
      "evidence": "The user mentioned 'web app' but did not specify a frontend library."
    }
  ]
}"#;

        let response = self.client
            .post(&format!("{}/chat/completions", self.base_url))
            .header("Authorization", format!("Bearer {}", self.api_key))
            .json(&ChatCompletionRequest {
                model: self.model.clone(),
                messages: vec![
                    ChatMessage {
                        role: "system".to_string(),
                        content: system_prompt.to_string(),
                    },
                    ChatMessage {
                        role: "user".to_string(),
                        content: prompt.to_string(),
                    },
                ],
            })
            .send()
            .await?
            .error_for_status()?;

        let completion: ChatCompletionResponse = response.json().await?;
        let content = completion
            .choices
            .get(0)
            .ok_or_else(|| anyhow!("No completion choices returned"))?
            .message
            .content
            .clone();

        let report: AmbiguityReport = serde_json::from_str(&content)
            .map_err(|e| anyhow!("Failed to parse LLM response as JSON: {}. Content: {}", e, content))?;

        Ok(report)
    }
}
