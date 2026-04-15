use rusqlite::params;
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;
use uuid::Uuid;

use crate::errors::AlarmAppError;
use crate::storage::models::AlarmGroupRow;

type DbPool = Arc<Mutex<rusqlite::Connection>>;

#[tauri::command]
pub async fn list_groups(pool: State<'_, DbPool>) -> Result<Vec<AlarmGroupRow>, AlarmAppError> {
    let conn = pool.lock().await;
    let mut stmt = conn.prepare("SELECT * FROM AlarmGroups ORDER BY Position ASC")?;
    let groups = stmt
        .query_map([], AlarmGroupRow::from_row)?
        .filter_map(|r| r.ok())
        .collect();
    Ok(groups)
}

#[tauri::command]
pub async fn create_group(
    pool: State<'_, DbPool>,
    name: String,
    color: String,
) -> Result<AlarmGroupRow, AlarmAppError> {
    if name.is_empty() || name.len() > 50 {
        return Err(AlarmAppError::Validation(
            "Group name must be 1-50 characters".into(),
        ));
    }

    let conn = pool.lock().await;
    let group_id = Uuid::new_v4().to_string();

    let position: i32 = conn
        .query_row(
            "SELECT COALESCE(MAX(Position), -1) + 1 FROM AlarmGroups",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    conn.execute(
        "INSERT INTO AlarmGroups (AlarmGroupId, Name, Color, Position, IsEnabled) VALUES (?1, ?2, ?3, ?4, 1)",
        params![group_id, name, color, position],
    )?;

    let group = conn.query_row(
        "SELECT * FROM AlarmGroups WHERE AlarmGroupId = ?1",
        params![group_id],
        AlarmGroupRow::from_row,
    )?;

    tracing::info!(group_id = %group_id, name = %name, "Group created");
    Ok(group)
}

#[tauri::command]
pub async fn update_group(
    pool: State<'_, DbPool>,
    group: AlarmGroupRow,
) -> Result<AlarmGroupRow, AlarmAppError> {
    if group.name.is_empty() || group.name.len() > 50 {
        return Err(AlarmAppError::Validation(
            "Group name must be 1-50 characters".into(),
        ));
    }

    let conn = pool.lock().await;
    let rows = conn.execute(
        "UPDATE AlarmGroups SET Name=?1, Color=?2, Position=?3 WHERE AlarmGroupId=?4",
        params![
            group.name,
            group.color,
            group.position,
            group.alarm_group_id
        ],
    )?;

    if rows == 0 {
        return Err(AlarmAppError::Validation("Group not found".into()));
    }

    let updated = conn.query_row(
        "SELECT * FROM AlarmGroups WHERE AlarmGroupId = ?1",
        params![group.alarm_group_id],
        AlarmGroupRow::from_row,
    )?;

    Ok(updated)
}

#[tauri::command]
pub async fn delete_group(pool: State<'_, DbPool>, group_id: String) -> Result<(), AlarmAppError> {
    let conn = pool.lock().await;

    // Unlink alarms from this group (ON DELETE SET NULL handles this, but be explicit)
    conn.execute(
        "UPDATE Alarms SET GroupId = NULL WHERE GroupId = ?1",
        params![group_id],
    )?;

    let rows = conn.execute(
        "DELETE FROM AlarmGroups WHERE AlarmGroupId = ?1",
        params![group_id],
    )?;

    if rows == 0 {
        return Err(AlarmAppError::Validation("Group not found".into()));
    }

    tracing::info!(group_id = %group_id, "Group deleted");
    Ok(())
}

#[tauri::command]
pub async fn toggle_group(
    pool: State<'_, DbPool>,
    group_id: String,
) -> Result<AlarmGroupRow, AlarmAppError> {
    let conn = pool.lock().await;

    let current: i32 = conn
        .query_row(
            "SELECT IsEnabled FROM AlarmGroups WHERE AlarmGroupId = ?1",
            params![group_id],
            |row| row.get(0),
        )
        .map_err(|_| AlarmAppError::Validation("Group not found".into()))?;

    let new_state = if current != 0 { 0 } else { 1 };

    // Toggle group
    conn.execute(
        "UPDATE AlarmGroups SET IsEnabled = ?1 WHERE AlarmGroupId = ?2",
        params![new_state, group_id],
    )?;

    // Toggle member alarms: save/restore IsPreviousEnabled
    if new_state == 0 {
        // Disabling group: save current alarm states, then disable all
        conn.execute(
            "UPDATE Alarms SET IsPreviousEnabled = IsEnabled, IsEnabled = 0 WHERE GroupId = ?1 AND DeletedAt IS NULL",
            params![group_id],
        )?;
    } else {
        // Enabling group: restore saved states
        conn.execute(
            "UPDATE Alarms SET IsEnabled = COALESCE(IsPreviousEnabled, 1), IsPreviousEnabled = NULL WHERE GroupId = ?1 AND DeletedAt IS NULL",
            params![group_id],
        )?;
    }

    let group = conn.query_row(
        "SELECT * FROM AlarmGroups WHERE AlarmGroupId = ?1",
        params![group_id],
        AlarmGroupRow::from_row,
    )?;

    tracing::info!(group_id = %group_id, enabled = new_state != 0, "Group toggled");
    Ok(group)
}
