// Wellness commands — Phase 9 implementation
// Bedtime reminder, sleep calculator, mood/sleep quality logging

use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;

use crate::errors::AlarmAppError;

type DbPool = Arc<Mutex<rusqlite::Connection>>;

// ── Sleep Calculator ──

#[derive(Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct SleepCalcPayload {
    pub wake_time: String,       // HH:MM
    pub sleep_cycles: Option<u8>, // default 5-6
}

#[derive(Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct SleepCalcResult {
    pub recommended_bedtimes: Vec<String>, // HH:MM list
    pub sleep_duration_hours: f64,
}

const SLEEP_CYCLE_MIN: u32 = 90;
const FALL_ASLEEP_MIN: u32 = 15;

/// Calculate optimal bedtimes based on wake time and sleep cycles.
#[tauri::command]
pub async fn calculate_bedtime(
    payload: SleepCalcPayload,
) -> Result<SleepCalcResult, AlarmAppError> {
    let wake_parts: Vec<&str> = payload.wake_time.split(':').collect();
    if wake_parts.len() != 2 {
        return Err(AlarmAppError::Validation("Wake time must be HH:MM".into()));
    }
    let wake_h: u32 = wake_parts[0]
        .parse()
        .map_err(|_| AlarmAppError::Validation("Invalid hour".into()))?;
    let wake_m: u32 = wake_parts[1]
        .parse()
        .map_err(|_| AlarmAppError::Validation("Invalid minute".into()))?;

    if wake_h > 23 || wake_m > 59 {
        return Err(AlarmAppError::Validation("Time out of range".into()));
    }

    let wake_total_min = wake_h * 60 + wake_m;
    let mut bedtimes = Vec::new();

    for cycles in (3..=6).rev() {
        let sleep_min = cycles * SLEEP_CYCLE_MIN + FALL_ASLEEP_MIN;
        let bedtime_min = (wake_total_min + 1440 - sleep_min) % 1440;
        let h = bedtime_min / 60;
        let m = bedtime_min % 60;
        bedtimes.push(format!("{h:02}:{m:02}"));
    }

    let default_cycles = payload.sleep_cycles.unwrap_or(5) as u32;
    let duration_hours =
        (default_cycles * SLEEP_CYCLE_MIN) as f64 / 60.0;

    Ok(SleepCalcResult {
        recommended_bedtimes: bedtimes,
        sleep_duration_hours: duration_hours,
    })
}

// ── Log Sleep Quality & Mood ──

#[derive(Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct LogSleepPayload {
    pub alarm_event_id: String,
    pub sleep_quality: Option<i32>, // 1-5
    pub mood: Option<String>,
}

/// Log sleep quality and mood for a dismissed alarm event.
#[tauri::command]
pub async fn log_sleep_quality(
    pool: State<'_, DbPool>,
    payload: LogSleepPayload,
) -> Result<(), AlarmAppError> {
    if let Some(q) = payload.sleep_quality {
        if !(1..=5).contains(&q) {
            return Err(AlarmAppError::Validation(
                "Sleep quality must be 1-5".into(),
            ));
        }
    }

    let conn = pool.lock().await;
    let rows = conn.execute(
        "UPDATE AlarmEvents SET SleepQuality = ?1, Mood = ?2 WHERE AlarmEventId = ?3",
        params![payload.sleep_quality, payload.mood, payload.alarm_event_id],
    )?;

    if rows == 0 {
        return Err(AlarmAppError::Validation("Event not found".into()));
    }

    tracing::info!(
        event_id = %payload.alarm_event_id,
        quality = ?payload.sleep_quality,
        "Sleep quality logged"
    );
    Ok(())
}

// ── Bedtime Reminder ──

#[derive(Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct BedtimeStatus {
    pub is_bedtime_soon: bool,
    pub minutes_until_bedtime: Option<i64>,
    pub recommended_bedtime: Option<String>,
}

/// Check if bedtime is approaching based on the earliest enabled alarm.
#[tauri::command]
pub async fn check_bedtime(
    pool: State<'_, DbPool>,
) -> Result<BedtimeStatus, AlarmAppError> {
    let conn = pool.lock().await;

    // Get earliest enabled alarm time
    let earliest: Option<String> = conn
        .query_row(
            "SELECT Time FROM Alarms WHERE IsEnabled = 1 AND DeletedAt IS NULL ORDER BY Time ASC LIMIT 1",
            [],
            |row| row.get(0),
        )
        .ok();

    let Some(wake_time) = earliest else {
        return Ok(BedtimeStatus {
            is_bedtime_soon: false,
            minutes_until_bedtime: None,
            recommended_bedtime: None,
        });
    };

    let parts: Vec<&str> = wake_time.split(':').collect();
    if parts.len() != 2 {
        return Ok(BedtimeStatus {
            is_bedtime_soon: false,
            minutes_until_bedtime: None,
            recommended_bedtime: None,
        });
    }

    let wake_h: u32 = parts[0].parse().unwrap_or(7);
    let wake_m: u32 = parts[1].parse().unwrap_or(0);
    let wake_total = wake_h * 60 + wake_m;

    // 5 cycles + fall asleep = 7h45m before wake
    let sleep_needed = 5 * SLEEP_CYCLE_MIN + FALL_ASLEEP_MIN;
    let bedtime_total = (wake_total + 1440 - sleep_needed) % 1440;
    let bedtime_str = format!("{:02}:{:02}", bedtime_total / 60, bedtime_total % 60);

    let now = chrono::Local::now();
    let now_total = (now.format("%H").to_string().parse::<u32>().unwrap_or(0)) * 60
        + now.format("%M").to_string().parse::<u32>().unwrap_or(0);

    let diff = if bedtime_total >= now_total {
        bedtime_total as i64 - now_total as i64
    } else {
        (bedtime_total as i64 + 1440) - now_total as i64
    };

    let is_soon = diff <= 60 && diff >= 0;

    Ok(BedtimeStatus {
        is_bedtime_soon: is_soon,
        minutes_until_bedtime: Some(diff),
        recommended_bedtime: Some(bedtime_str),
    })
}
