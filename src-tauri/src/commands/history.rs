use rusqlite::params;
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;

use crate::errors::AlarmAppError;
use crate::storage::models::AlarmEventRow;

type DbPool = Arc<Mutex<rusqlite::Connection>>;

#[tauri::command]
pub async fn list_alarm_events(
    pool: State<'_, DbPool>,
    limit: Option<i32>,
    offset: Option<i32>,
) -> Result<Vec<AlarmEventRow>, AlarmAppError> {
    let conn = pool.lock().await;
    let limit = limit.unwrap_or(100);
    let offset = offset.unwrap_or(0);

    let mut stmt =
        conn.prepare("SELECT * FROM AlarmEvents ORDER BY Timestamp DESC LIMIT ?1 OFFSET ?2")?;
    let events = stmt
        .query_map(params![limit, offset], AlarmEventRow::from_row)?
        .filter_map(|r| r.ok())
        .collect();
    Ok(events)
}

#[tauri::command]
pub async fn clear_history(pool: State<'_, DbPool>) -> Result<(), AlarmAppError> {
    let conn = pool.lock().await;
    conn.execute("DELETE FROM AlarmEvents", [])?;
    tracing::info!("Alarm event history cleared");
    Ok(())
}
