use rusqlite::params;
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;

use crate::errors::AlarmAppError;
use crate::storage::db;
use crate::storage::models::SettingsResponse;

type DbPool = Arc<Mutex<rusqlite::Connection>>;

#[tauri::command]
pub async fn get_settings(pool: State<'_, DbPool>) -> Result<SettingsResponse, AlarmAppError> {
    let conn = pool.lock().await;
    Ok(db::load_settings(&conn))
}

#[tauri::command]
pub async fn update_setting(
    pool: State<'_, DbPool>,
    key: String,
    value: String,
) -> Result<(), AlarmAppError> {
    let conn = pool.lock().await;
    db::update_setting(&conn, &key, &value)
}
