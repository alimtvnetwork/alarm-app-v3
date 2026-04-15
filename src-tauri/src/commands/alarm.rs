use rusqlite::params;
use serde::Deserialize;
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;
use uuid::Uuid;

use crate::errors::AlarmAppError;
use crate::storage::models::AlarmRow;

type DbPool = Arc<Mutex<rusqlite::Connection>>;

#[derive(Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct CreateAlarmPayload {
    pub time: String,
    pub date: Option<String>,
    pub label: Option<String>,
    pub repeat_type: Option<String>,
    pub repeat_days_of_week: Option<String>,
    pub repeat_interval_minutes: Option<i32>,
    pub repeat_cron_expression: Option<String>,
    pub group_id: Option<String>,
    pub snooze_duration_min: Option<i32>,
    pub max_snooze_count: Option<i32>,
    pub sound_file: Option<String>,
    pub is_vibration_enabled: Option<bool>,
    pub is_gradual_volume: Option<bool>,
    pub gradual_volume_duration_sec: Option<i32>,
    pub auto_dismiss_min: Option<i32>,
    pub challenge_type: Option<String>,
    pub challenge_difficulty: Option<String>,
    pub challenge_shake_count: Option<i32>,
    pub challenge_step_count: Option<i32>,
}

#[tauri::command]
pub async fn list_alarms(pool: State<'_, DbPool>) -> Result<Vec<AlarmRow>, AlarmAppError> {
    let conn = pool.lock().await;
    let mut stmt = conn.prepare(
        "SELECT * FROM Alarms WHERE DeletedAt IS NULL ORDER BY Position ASC, CreatedAt DESC",
    )?;
    let alarms = stmt
        .query_map([], AlarmRow::from_row)?
        .filter_map(|r| r.ok())
        .collect();
    Ok(alarms)
}

#[tauri::command]
pub async fn create_alarm(
    pool: State<'_, DbPool>,
    payload: CreateAlarmPayload,
) -> Result<AlarmRow, AlarmAppError> {
    // Validate time format
    if !is_valid_time(&payload.time) {
        return Err(AlarmAppError::Validation(
            "Time must be in HH:MM format (00:00-23:59)".into(),
        ));
    }

    let conn = pool.lock().await;
    let now = chrono::Utc::now().to_rfc3339();
    let alarm_id = Uuid::new_v4().to_string();

    let label = payload.label.unwrap_or_default();
    if label.len() > 100 {
        return Err(AlarmAppError::Validation(
            "Label must be 100 characters or fewer".into(),
        ));
    }

    conn.execute(
        "INSERT INTO Alarms (AlarmId, Time, Date, Label, IsEnabled, RepeatType, RepeatDaysOfWeek, RepeatIntervalMinutes, RepeatCronExpression, GroupId, SnoozeDurationMin, MaxSnoozeCount, SoundFile, IsVibrationEnabled, IsGradualVolume, GradualVolumeDurationSec, AutoDismissMin, ChallengeType, ChallengeDifficulty, ChallengeShakeCount, ChallengeStepCount, CreatedAt, UpdatedAt)
         VALUES (?1, ?2, ?3, ?4, 1, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22)",
        params![
            alarm_id,
            payload.time,
            payload.date,
            label,
            payload.repeat_type.unwrap_or_else(|| "Once".to_string()),
            payload.repeat_days_of_week.unwrap_or_else(|| "[]".to_string()),
            payload.repeat_interval_minutes.unwrap_or(0),
            payload.repeat_cron_expression.unwrap_or_default(),
            payload.group_id,
            payload.snooze_duration_min.unwrap_or(5),
            payload.max_snooze_count.unwrap_or(3),
            payload.sound_file.unwrap_or_else(|| "classic-beep".to_string()),
            payload.is_vibration_enabled.unwrap_or(false) as i32,
            payload.is_gradual_volume.unwrap_or(false) as i32,
            payload.gradual_volume_duration_sec.unwrap_or(30),
            payload.auto_dismiss_min.unwrap_or(0),
            payload.challenge_type,
            payload.challenge_difficulty,
            payload.challenge_shake_count,
            payload.challenge_step_count,
            now,
            now,
        ],
    )?;

    // Read back the inserted alarm
    let alarm = conn.query_row(
        "SELECT * FROM Alarms WHERE AlarmId = ?1",
        params![alarm_id],
        AlarmRow::from_row,
    )?;

    tracing::info!(alarm_id = %alarm_id, time = %payload.time, "Alarm created");
    Ok(alarm)
}

#[tauri::command]
pub async fn update_alarm(
    pool: State<'_, DbPool>,
    alarm: AlarmRow,
) -> Result<AlarmRow, AlarmAppError> {
    let conn = pool.lock().await;
    let now = chrono::Utc::now().to_rfc3339();

    if alarm.label.len() > 100 {
        return Err(AlarmAppError::Validation(
            "Label must be 100 characters or fewer".into(),
        ));
    }

    let rows = conn.execute(
        "UPDATE Alarms SET Time=?1, Date=?2, Label=?3, IsEnabled=?4, RepeatType=?5, RepeatDaysOfWeek=?6, RepeatIntervalMinutes=?7, RepeatCronExpression=?8, GroupId=?9, SnoozeDurationMin=?10, MaxSnoozeCount=?11, SoundFile=?12, IsVibrationEnabled=?13, IsGradualVolume=?14, GradualVolumeDurationSec=?15, AutoDismissMin=?16, ChallengeType=?17, ChallengeDifficulty=?18, ChallengeShakeCount=?19, ChallengeStepCount=?20, NextFireTime=?21, UpdatedAt=?22 WHERE AlarmId=?23 AND DeletedAt IS NULL",
        params![
            alarm.time,
            alarm.date,
            alarm.label,
            alarm.is_enabled as i32,
            serde_json::to_string(&alarm.repeat_type).unwrap_or_else(|_| "\"Once\"".to_string()).trim_matches('"'),
            alarm.repeat_days_of_week,
            alarm.repeat_interval_minutes,
            alarm.repeat_cron_expression,
            alarm.group_id,
            alarm.snooze_duration_min,
            alarm.max_snooze_count,
            alarm.sound_file,
            alarm.is_vibration_enabled as i32,
            alarm.is_gradual_volume as i32,
            alarm.gradual_volume_duration_sec,
            alarm.auto_dismiss_min,
            alarm.challenge_type.as_ref().map(|ct| serde_json::to_string(ct).unwrap_or_default().trim_matches('"').to_string()),
            alarm.challenge_difficulty.as_ref().map(|cd| serde_json::to_string(cd).unwrap_or_default().trim_matches('"').to_string()),
            alarm.challenge_shake_count,
            alarm.challenge_step_count,
            alarm.next_fire_time,
            now,
            alarm.alarm_id,
        ],
    )?;

    if rows == 0 {
        return Err(AlarmAppError::Validation("Alarm not found".into()));
    }

    let updated = conn.query_row(
        "SELECT * FROM Alarms WHERE AlarmId = ?1",
        params![alarm.alarm_id],
        AlarmRow::from_row,
    )?;

    Ok(updated)
}

#[derive(serde::Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct DeleteResponse {
    pub undo_token: String,
}

#[tauri::command]
pub async fn delete_alarm(
    pool: State<'_, DbPool>,
    alarm_id: String,
) -> Result<DeleteResponse, AlarmAppError> {
    let conn = pool.lock().await;
    let now = chrono::Utc::now().to_rfc3339();

    let rows = conn.execute(
        "UPDATE Alarms SET DeletedAt = ?1, UpdatedAt = ?1 WHERE AlarmId = ?2 AND DeletedAt IS NULL",
        params![now, alarm_id],
    )?;

    if rows == 0 {
        return Err(AlarmAppError::Validation("Alarm not found".into()));
    }

    tracing::info!(alarm_id = %alarm_id, "Alarm soft-deleted");
    Ok(DeleteResponse {
        undo_token: alarm_id,
    })
}

#[tauri::command]
pub async fn undo_delete_alarm(
    pool: State<'_, DbPool>,
    undo_token: String,
) -> Result<AlarmRow, AlarmAppError> {
    let conn = pool.lock().await;

    let rows = conn.execute(
        "UPDATE Alarms SET DeletedAt = NULL, UpdatedAt = ?1 WHERE AlarmId = ?2 AND DeletedAt IS NOT NULL",
        params![chrono::Utc::now().to_rfc3339(), undo_token],
    )?;

    if rows == 0 {
        return Err(AlarmAppError::Validation(
            "Undo token expired or invalid".into(),
        ));
    }

    let alarm = conn.query_row(
        "SELECT * FROM Alarms WHERE AlarmId = ?1",
        params![undo_token],
        AlarmRow::from_row,
    )?;

    tracing::info!(alarm_id = %undo_token, "Alarm delete undone");
    Ok(alarm)
}

#[tauri::command]
pub async fn toggle_alarm(
    pool: State<'_, DbPool>,
    alarm_id: String,
) -> Result<AlarmRow, AlarmAppError> {
    let conn = pool.lock().await;

    let current: i32 = conn
        .query_row(
            "SELECT IsEnabled FROM Alarms WHERE AlarmId = ?1 AND DeletedAt IS NULL",
            params![alarm_id],
            |row| row.get(0),
        )
        .map_err(|_| AlarmAppError::Validation("Alarm not found".into()))?;

    let new_state = if current != 0 { 0 } else { 1 };

    conn.execute(
        "UPDATE Alarms SET IsEnabled = ?1, UpdatedAt = ?2 WHERE AlarmId = ?3",
        params![new_state, chrono::Utc::now().to_rfc3339(), alarm_id],
    )?;

    let alarm = conn.query_row(
        "SELECT * FROM Alarms WHERE AlarmId = ?1",
        params![alarm_id],
        AlarmRow::from_row,
    )?;

    Ok(alarm)
}

#[tauri::command]
pub async fn duplicate_alarm(
    pool: State<'_, DbPool>,
    alarm_id: String,
) -> Result<AlarmRow, AlarmAppError> {
    let conn = pool.lock().await;

    let source = conn
        .query_row(
            "SELECT * FROM Alarms WHERE AlarmId = ?1 AND DeletedAt IS NULL",
            params![alarm_id],
            AlarmRow::from_row,
        )
        .map_err(|_| AlarmAppError::Validation("Source alarm not found".into()))?;

    let new_id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let new_label = format!("{} (Copy)", source.label);

    conn.execute(
        "INSERT INTO Alarms (AlarmId, Time, Date, Label, IsEnabled, RepeatType, RepeatDaysOfWeek, RepeatIntervalMinutes, RepeatCronExpression, GroupId, SnoozeDurationMin, MaxSnoozeCount, SoundFile, IsVibrationEnabled, IsGradualVolume, GradualVolumeDurationSec, AutoDismissMin, ChallengeType, ChallengeDifficulty, ChallengeShakeCount, ChallengeStepCount, NextFireTime, CreatedAt, UpdatedAt)
         SELECT ?1, Time, Date, ?2, IsEnabled, RepeatType, RepeatDaysOfWeek, RepeatIntervalMinutes, RepeatCronExpression, GroupId, SnoozeDurationMin, MaxSnoozeCount, SoundFile, IsVibrationEnabled, IsGradualVolume, GradualVolumeDurationSec, AutoDismissMin, ChallengeType, ChallengeDifficulty, ChallengeShakeCount, ChallengeStepCount, NextFireTime, ?3, ?3
         FROM Alarms WHERE AlarmId = ?4",
        params![new_id, new_label, now, alarm_id],
    )?;

    let alarm = conn.query_row(
        "SELECT * FROM Alarms WHERE AlarmId = ?1",
        params![new_id],
        AlarmRow::from_row,
    )?;

    tracing::info!(alarm_id = %new_id, source_id = %alarm_id, "Alarm duplicated");
    Ok(alarm)
}

#[tauri::command]
pub async fn reorder_alarms(
    pool: State<'_, DbPool>,
    alarm_ids: Vec<String>,
) -> Result<(), AlarmAppError> {
    let conn = pool.lock().await;
    let now = chrono::Utc::now().to_rfc3339();

    for (i, id) in alarm_ids.iter().enumerate() {
        conn.execute(
            "UPDATE Alarms SET Position = ?1, UpdatedAt = ?2 WHERE AlarmId = ?3",
            rusqlite::params![i as i32, now, id],
        )?;
    }

    Ok(())
}

fn is_valid_time(time: &str) -> bool {
    if time.len() != 5 {
        return false;
    }
    let parts: Vec<&str> = time.split(':').collect();
    if parts.len() != 2 {
        return false;
    }
    let hour: u32 = match parts[0].parse() {
        Ok(h) => h,
        Err(_) => return false,
    };
    let minute: u32 = match parts[1].parse() {
        Ok(m) => m,
        Err(_) => return false,
    };
    hour <= 23 && minute <= 59
}
