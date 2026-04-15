pub mod errors;

use reqwest::Client;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::time::Duration;

use self::errors::WebhookError;

/// Maximum retry attempts for webhook delivery.
const MAX_RETRIES: u32 = 3;
/// Base delay between retries (doubles each attempt).
const BASE_RETRY_DELAY_MS: u64 = 1000;
/// Request timeout per attempt.
const REQUEST_TIMEOUT_SECS: u64 = 10;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebhookConfig {
    #[serde(rename = "WebhookId")]
    pub webhook_id: String,
    #[serde(rename = "AlarmId")]
    pub alarm_id: String,
    #[serde(rename = "Url")]
    pub url: String,
    #[serde(rename = "Payload")]
    pub payload: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct WebhookResult {
    #[serde(rename = "WebhookId")]
    pub webhook_id: String,
    #[serde(rename = "IsSuccess")]
    pub is_success: bool,
    #[serde(rename = "StatusCode")]
    pub status_code: Option<u16>,
    #[serde(rename = "Attempts")]
    pub attempts: u32,
    #[serde(rename = "ErrorMessage")]
    pub error_message: Option<String>,
}

/// Load all webhooks for a given alarm from the database.
pub fn load_webhooks_for_alarm(
    conn: &Connection,
    alarm_id: &str,
) -> Result<Vec<WebhookConfig>, WebhookError> {
    let mut stmt = conn
        .prepare("SELECT WebhookId, AlarmId, Url, Payload FROM Webhooks WHERE AlarmId = ?1")
        .map_err(|e| WebhookError::Database(e.to_string()))?;

    let webhooks = stmt
        .query_map(rusqlite::params![alarm_id], |row| {
            Ok(WebhookConfig {
                webhook_id: row.get(0)?,
                alarm_id: row.get(1)?,
                url: row.get(2)?,
                payload: row.get(3)?,
            })
        })
        .map_err(|e| WebhookError::Database(e.to_string()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| WebhookError::Database(e.to_string()))?;

    Ok(webhooks)
}

/// Deliver a single webhook with retry logic (exponential backoff).
pub async fn deliver_webhook(client: &Client, webhook: &WebhookConfig) -> WebhookResult {
    let mut last_error: Option<String> = None;

    for attempt in 1..=MAX_RETRIES {
        match send_request(client, webhook).await {
            Ok(status) => {
                let is_success = (200..300).contains(&status);
                if is_success {
                    tracing::info!(
                        webhook_id = %webhook.webhook_id,
                        status = status,
                        attempts = attempt,
                        "Webhook delivered"
                    );
                    return WebhookResult {
                        webhook_id: webhook.webhook_id.clone(),
                        is_success: true,
                        status_code: Some(status),
                        attempts: attempt,
                        error_message: None,
                    };
                }
                last_error = Some(format!("HTTP {status}"));
                tracing::warn!(
                    webhook_id = %webhook.webhook_id,
                    status = status,
                    attempt = attempt,
                    "Webhook got non-2xx, retrying"
                );
            }
            Err(e) => {
                last_error = Some(e.to_string());
                tracing::warn!(
                    webhook_id = %webhook.webhook_id,
                    error = %e,
                    attempt = attempt,
                    "Webhook request failed, retrying"
                );
            }
        }

        if attempt < MAX_RETRIES {
            let delay = BASE_RETRY_DELAY_MS * 2u64.pow(attempt - 1);
            tokio::time::sleep(Duration::from_millis(delay)).await;
        }
    }

    WebhookResult {
        webhook_id: webhook.webhook_id.clone(),
        is_success: false,
        status_code: None,
        attempts: MAX_RETRIES,
        error_message: last_error,
    }
}

/// Fire all webhooks for an alarm (called by alarm engine on fire).
pub async fn fire_webhooks_for_alarm(conn: &Connection, alarm_id: &str) -> Vec<WebhookResult> {
    let webhooks = match load_webhooks_for_alarm(conn, alarm_id) {
        Ok(w) => w,
        Err(e) => {
            tracing::error!(alarm_id = %alarm_id, error = %e, "Failed to load webhooks");
            return vec![];
        }
    };

    if webhooks.is_empty() {
        return vec![];
    }

    let client = Client::builder()
        .timeout(Duration::from_secs(REQUEST_TIMEOUT_SECS))
        .build()
        .unwrap_or_default();

    let mut results = Vec::with_capacity(webhooks.len());
    for webhook in &webhooks {
        let result = deliver_webhook(&client, webhook).await;
        results.push(result);
    }

    let success_count = results.iter().filter(|r| r.is_success).count();
    tracing::info!(
        alarm_id = %alarm_id,
        total = webhooks.len(),
        succeeded = success_count,
        "Webhook delivery complete"
    );

    results
}

/// Send a single HTTP POST request.
async fn send_request(client: &Client, webhook: &WebhookConfig) -> Result<u16, WebhookError> {
    let mut request = client.post(&webhook.url);

    if let Some(ref payload) = webhook.payload {
        request = request
            .header("Content-Type", "application/json")
            .body(payload.clone());
    }

    let response = request
        .send()
        .await
        .map_err(|e| WebhookError::Network(e.to_string()))?;

    Ok(response.status().as_u16())
}
