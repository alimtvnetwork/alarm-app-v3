use rusqlite::params;
use serde::Deserialize;
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;

use crate::errors::AlarmAppError;
use crate::storage::models::SnoozeStateRow;

type DbPool = Arc<Mutex<rusqlite::Connection>>;

#[derive(Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct SnoozePayload {
    pub alarm_id: String,
    pub duration_min: Option<u32>,
}

/// Snooze an alarm: increment count, set SnoozeUntil, spawn exact-time re-fire task.
#[tauri::command]
pub async fn snooze_alarm(
    pool: State<'_, DbPool>,
    app_handle: tauri::AppHandle,
    payload: SnoozePayload,
) -> Result<SnoozeStateRow, AlarmAppError> {
    let conn = pool.lock().await;

    // Get alarm's configured snooze duration and max count
    let (snooze_dur, max_count): (i32, i32) = conn
        .query_row(
            "SELECT SnoozeDurationMin, MaxSnoozeCount FROM Alarms WHERE AlarmId = ?1 AND DeletedAt IS NULL",
            params![payload.alarm_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|_| AlarmAppError::Validation("Alarm not found".into()))?;

    if max_count == 0 {
        return Err(AlarmAppError::Validation(
            "This alarm does not allow snoozing".into(),
        ));
    }

    let duration_min = payload.duration_min.unwrap_or(snooze_dur as u32);

    // Get or create snooze state
    let current_count: i32 = conn
        .query_row(
            "SELECT SnoozeCount FROM SnoozeState WHERE AlarmId = ?1",
            params![payload.alarm_id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let new_count = current_count + 1;
    if new_count > max_count {
        return Err(AlarmAppError::Validation(
            "Maximum snooze count reached".into(),
        ));
    }

    let now = chrono::Utc::now();
    let snooze_until = now + chrono::Duration::minutes(duration_min as i64);
    let snooze_until_str = snooze_until.to_rfc3339();

    // Upsert snooze state
    conn.execute(
        "INSERT INTO SnoozeState (AlarmId, SnoozeUntil, SnoozeCount) VALUES (?1, ?2, ?3) \
         ON CONFLICT(AlarmId) DO UPDATE SET SnoozeUntil = ?2, SnoozeCount = ?3",
        params![payload.alarm_id, snooze_until_str, new_count],
    )?;

    // Log snooze event
    let event_id = uuid::Uuid::new_v4().to_string();
    let now_str = now.to_rfc3339();
    conn.execute(
        "INSERT INTO AlarmEvents (AlarmEventId, AlarmId, Type, FiredAt, SnoozeCount, AlarmLabelSnapshot, AlarmTimeSnapshot, Timestamp) \
         SELECT ?1, ?2, 'Snoozed', ?3, ?4, Label, Time, ?3 FROM Alarms WHERE AlarmId = ?2",
        params![event_id, payload.alarm_id, now_str, new_count],
    )?;

    tracing::info!(
        alarm_id = %payload.alarm_id,
        count = new_count,
        until = %snooze_until_str,
        "Alarm snoozed"
    );

    // Spawn exact-time re-fire task
    let alarm_id_clone = payload.alarm_id.clone();
    let sleep_dur = std::time::Duration::from_secs(duration_min as u64 * 60);
    tokio::spawn(async move {
        tokio::time::sleep(tokio::time::Duration::from(sleep_dur)).await;
        tracing::info!(alarm_id = %alarm_id_clone, "Snooze expired — emitting re-fire event");
        use tauri::Emitter;
        let _ = app_handle.emit("snooze-expired", &alarm_id_clone);
    });

    let state = SnoozeStateRow {
        alarm_id: payload.alarm_id,
        snooze_until: snooze_until_str,
        snooze_count: new_count,
    };

    Ok(state)
}

/// Get all active snooze states.
#[tauri::command]
pub async fn get_snooze_state(
    pool: State<'_, DbPool>,
) -> Result<Vec<SnoozeStateRow>, AlarmAppError> {
    let conn = pool.lock().await;
    let mut stmt = conn.prepare("SELECT * FROM SnoozeState")?;
    let states = stmt
        .query_map([], SnoozeStateRow::from_row)?
        .filter_map(|r| r.ok())
        .collect();
    Ok(states)
}

/// Cancel an active snooze (on dismiss or alarm deletion).
#[tauri::command]
pub async fn cancel_snooze(pool: State<'_, DbPool>, alarm_id: String) -> Result<(), AlarmAppError> {
    let conn = pool.lock().await;
    conn.execute(
        "DELETE FROM SnoozeState WHERE AlarmId = ?1",
        params![alarm_id],
    )?;
    tracing::info!(alarm_id = %alarm_id, "Snooze cancelled");
    Ok(())
}

/// Dismiss an alarm: clear snooze state and log dismiss event.
#[tauri::command]
pub async fn dismiss_alarm(pool: State<'_, DbPool>, alarm_id: String) -> Result<(), AlarmAppError> {
    let conn = pool.lock().await;

    // Clear snooze state
    conn.execute(
        "DELETE FROM SnoozeState WHERE AlarmId = ?1",
        params![alarm_id],
    )?;

    // Log dismiss event
    let event_id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO AlarmEvents (AlarmEventId, AlarmId, Type, FiredAt, DismissedAt, SnoozeCount, AlarmLabelSnapshot, AlarmTimeSnapshot, Timestamp) \
         SELECT ?1, ?2, 'Dismissed', ?3, ?3, COALESCE(ss.SnoozeCount, 0), a.Label, a.Time, ?3 \
         FROM Alarms a LEFT JOIN SnoozeState ss ON ss.AlarmId = a.AlarmId WHERE a.AlarmId = ?2",
        params![event_id, alarm_id, now],
    )?;

    tracing::info!(alarm_id = %alarm_id, "Alarm dismissed");
    Ok(())
}
