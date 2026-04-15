// Export/Import commands — Phase 9 implementation
// JSON export/import of alarms and groups via native file dialog

use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;

use crate::errors::AlarmAppError;
use crate::storage::models::{AlarmGroupRow, AlarmRow};

type DbPool = Arc<Mutex<rusqlite::Connection>>;

// ── Export Payload ──

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct ExportData {
    pub version: String,
    pub exported_at: String,
    pub alarms: Vec<AlarmRow>,
    pub groups: Vec<AlarmGroupRow>,
}

/// Export all alarms and groups as a JSON structure.
#[tauri::command]
pub async fn export_alarms(pool: State<'_, DbPool>) -> Result<ExportData, AlarmAppError> {
    let conn = pool.lock().await;

    let mut alarm_stmt =
        conn.prepare("SELECT * FROM Alarms WHERE DeletedAt IS NULL ORDER BY CreatedAt DESC")?;
    let alarms: Vec<AlarmRow> = alarm_stmt
        .query_map([], AlarmRow::from_row)?
        .filter_map(|r| r.ok())
        .collect();

    let mut group_stmt = conn.prepare("SELECT * FROM AlarmGroups ORDER BY Position ASC")?;
    let groups: Vec<AlarmGroupRow> = group_stmt
        .query_map([], AlarmGroupRow::from_row)?
        .filter_map(|r| r.ok())
        .collect();

    let now = chrono::Utc::now().to_rfc3339();

    tracing::info!(
        alarm_count = alarms.len(),
        group_count = groups.len(),
        "Alarms exported"
    );

    Ok(ExportData {
        version: "1.0.0".into(),
        exported_at: now,
        alarms,
        groups,
    })
}

// ── Import ──

#[derive(Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct ImportPayload {
    pub data: String, // JSON string of ExportData
    pub mode: ImportMode,
}

#[derive(Deserialize, PartialEq)]
pub enum ImportMode {
    Merge,
    Replace,
}

#[derive(Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct ImportResult {
    pub alarms_imported: usize,
    pub groups_imported: usize,
    pub alarms_skipped: usize,
}

/// Import alarms and groups from JSON.
#[tauri::command]
pub async fn import_alarms(
    pool: State<'_, DbPool>,
    payload: ImportPayload,
) -> Result<ImportResult, AlarmAppError> {
    let export: ExportData = serde_json::from_str(&payload.data)
        .map_err(|e| AlarmAppError::ExportImport(format!("Invalid JSON: {e}")))?;

    let conn = pool.lock().await;
    let now = chrono::Utc::now().to_rfc3339();

    if payload.mode == ImportMode::Replace {
        conn.execute("DELETE FROM Alarms", [])?;
        conn.execute("DELETE FROM AlarmGroups", [])?;
        tracing::info!("Replace mode: cleared existing alarms and groups");
    }

    // Import groups first (alarms reference them)
    let mut groups_imported = 0;
    for group in &export.groups {
        let exists: bool = conn
            .query_row(
                "SELECT COUNT(*) FROM AlarmGroups WHERE AlarmGroupId = ?1",
                params![group.alarm_group_id],
                |row| row.get::<_, i32>(0).map(|c| c > 0),
            )
            .unwrap_or(false);

        if !exists {
            conn.execute(
                "INSERT INTO AlarmGroups (AlarmGroupId, Name, Color, Position, IsEnabled) VALUES (?1, ?2, ?3, ?4, ?5)",
                params![
                    group.alarm_group_id,
                    group.name,
                    group.color,
                    group.position,
                    group.is_enabled as i32,
                ],
            )?;
            groups_imported += 1;
        }
    }

    // Import alarms
    let mut alarms_imported = 0;
    let mut alarms_skipped = 0;
    for alarm in &export.alarms {
        let exists: bool = conn
            .query_row(
                "SELECT COUNT(*) FROM Alarms WHERE AlarmId = ?1",
                params![alarm.alarm_id],
                |row| row.get::<_, i32>(0).map(|c| c > 0),
            )
            .unwrap_or(false);

        if exists {
            alarms_skipped += 1;
            continue;
        }

        let repeat_type_str = serde_json::to_string(&alarm.repeat_type)
            .unwrap_or_else(|_| "\"Once\"".into())
            .trim_matches('"')
            .to_string();
        let challenge_type_str = alarm
            .challenge_type
            .as_ref()
            .and_then(|ct| serde_json::to_string(ct).ok())
            .map(|s| s.trim_matches('"').to_string());
        let challenge_diff_str = alarm
            .challenge_difficulty
            .as_ref()
            .and_then(|cd| serde_json::to_string(cd).ok())
            .map(|s| s.trim_matches('"').to_string());

        conn.execute(
            "INSERT INTO Alarms (AlarmId, Time, Date, Label, IsEnabled, RepeatType, RepeatDaysOfWeek, RepeatIntervalMinutes, RepeatCronExpression, GroupId, SnoozeDurationMin, MaxSnoozeCount, SoundFile, IsVibrationEnabled, IsGradualVolume, GradualVolumeDurationSec, AutoDismissMin, ChallengeType, ChallengeDifficulty, ChallengeShakeCount, ChallengeStepCount, NextFireTime, CreatedAt, UpdatedAt)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24)",
            params![
                alarm.alarm_id,
                alarm.time,
                alarm.date,
                alarm.label,
                alarm.is_enabled as i32,
                repeat_type_str,
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
                challenge_type_str,
                challenge_diff_str,
                alarm.challenge_shake_count,
                alarm.challenge_step_count,
                alarm.next_fire_time,
                now,
                now,
            ],
        )?;
        alarms_imported += 1;
    }

    tracing::info!(
        alarms = alarms_imported,
        groups = groups_imported,
        skipped = alarms_skipped,
        "Import complete"
    );

    Ok(ImportResult {
        alarms_imported,
        groups_imported,
        alarms_skipped,
    })
}
