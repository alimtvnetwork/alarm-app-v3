use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

use crate::errors::AlarmAppError;
use crate::webhooks::{WebhookConfig, WebhookResult};

#[derive(Deserialize)]
pub struct CreateWebhookArgs {
    #[serde(rename = "AlarmId")]
    pub alarm_id: String,
    #[serde(rename = "Url")]
    pub url: String,
    #[serde(rename = "Payload")]
    pub payload: Option<String>,
}

#[derive(Serialize)]
pub struct WebhookResponse {
    #[serde(rename = "WebhookId")]
    pub webhook_id: String,
}

#[tauri::command]
pub fn create_webhook(
    db: State<'_, Mutex<rusqlite::Connection>>,
    args: CreateWebhookArgs,
) -> Result<WebhookResponse, AlarmAppError> {
    // Validate URL
    url::Url::parse(&args.url)
        .map_err(|e| AlarmAppError::Validation(format!("Invalid webhook URL: {e}")))?;

    let webhook_id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let conn = db.lock().unwrap();

    conn.execute(
        "INSERT INTO Webhooks (WebhookId, AlarmId, Url, Payload, CreatedAt) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![webhook_id, args.alarm_id, args.url, args.payload, now],
    )?;

    tracing::info!(webhook_id = %webhook_id, alarm_id = %args.alarm_id, "Webhook created");
    Ok(WebhookResponse { webhook_id })
}

#[tauri::command]
pub fn delete_webhook(
    db: State<'_, Mutex<rusqlite::Connection>>,
    webhook_id: String,
) -> Result<(), AlarmAppError> {
    let conn = db.lock().unwrap();
    let rows = conn.execute(
        "DELETE FROM Webhooks WHERE WebhookId = ?1",
        params![webhook_id],
    )?;

    if rows == 0 {
        return Err(AlarmAppError::Validation(format!(
            "Webhook not found: {webhook_id}"
        )));
    }

    tracing::info!(webhook_id = %webhook_id, "Webhook deleted");
    Ok(())
}

#[tauri::command]
pub fn list_webhooks(
    db: State<'_, Mutex<rusqlite::Connection>>,
    alarm_id: String,
) -> Result<Vec<WebhookConfig>, AlarmAppError> {
    let conn = db.lock().unwrap();
    let mut stmt =
        conn.prepare("SELECT WebhookId, AlarmId, Url, Payload FROM Webhooks WHERE AlarmId = ?1")?;

    let webhooks = stmt
        .query_map(params![alarm_id], |row| {
            Ok(WebhookConfig {
                webhook_id: row.get(0)?,
                alarm_id: row.get(1)?,
                url: row.get(2)?,
                payload: row.get(3)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(webhooks)
}

#[tauri::command]
pub async fn test_webhook(
    url: String,
    payload: Option<String>,
) -> Result<WebhookResult, AlarmAppError> {
    let config = WebhookConfig {
        webhook_id: "test".to_string(),
        alarm_id: "test".to_string(),
        url: url.clone(),
        payload,
    };

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .unwrap_or_default();

    let result = crate::webhooks::deliver_webhook(&client, &config).await;
    Ok(result)
}
