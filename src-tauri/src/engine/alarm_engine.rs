// Alarm Engine — Phase 3 implementation
// 30-second background polling loop with AlarmQueue

use std::sync::Arc;

use chrono::{DateTime, NaiveDate, NaiveTime, Utc};
use chrono_tz::Tz;
use rusqlite::{params, Connection};
use tokio::sync::Mutex;
use tokio::time::{interval, Duration};

use crate::engine::scheduler::{compute_next_fire_time, AlarmContext};

use crate::storage::models::{AlarmEventType, AlarmRow, RepeatType};

/// Polling interval: 30 seconds
const POLL_INTERVAL_SECS: u64 = 30;

/// Grace period for missed alarm detection (5 minutes)
const MISSED_ALARM_GRACE_SECS: i64 = 300;

// ── AlarmQueue Entry ──

/// Represents a due alarm ready to fire.
#[derive(Debug, Clone)]
pub struct DueAlarm {
    pub alarm: AlarmRow,
    pub scheduled_time: DateTime<Utc>,
    pub is_missed: bool,
}

// ── Engine Start ──

/// Start the alarm engine background loop.
/// Spawns a tokio task that polls every 30 seconds.
pub fn start_engine(pool: Arc<Mutex<Connection>>, app_handle: tauri::AppHandle) {
    tauri::async_runtime::spawn(async move {
        tracing::info!("Alarm engine started ({}s interval)", POLL_INTERVAL_SECS);

        // Cold-start: check for missed alarms immediately
        check_missed_alarms_on_start(&pool, &app_handle).await;

        let mut ticker = interval(Duration::from_secs(POLL_INTERVAL_SECS));

        loop {
            ticker.tick().await;
            poll_due_alarms(&pool, &app_handle).await;
        }
    });
}

// ── Cold-Start Missed Alarm Check ──

async fn check_missed_alarms_on_start(
    pool: &Arc<Mutex<Connection>>,
    app_handle: &tauri::AppHandle,
) {
    let conn = pool.lock().await;
    let now = Utc::now();
    let tz = load_timezone(&conn);

    // Check missed alarms
    let due_alarms = query_due_alarms(&conn, &now);
    if !due_alarms.is_empty() {
        tracing::warn!(count = due_alarms.len(), "Cold start: found missed alarms");
        for alarm in &due_alarms {
            log_alarm_event(&conn, &alarm.alarm_id, AlarmEventType::Missed);
            advance_next_fire_time(&conn, alarm, &tz);
        }
        let labels: Vec<String> = due_alarms
            .iter()
            .map(|a| {
                if a.label.is_empty() {
                    a.time.clone()
                } else {
                    a.label.clone()
                }
            })
            .collect();
        crate::notifications::send_missed_alarms(app_handle, &labels);
        emit_missed_alarms(app_handle, &labels);
    }

    // Recover active snoozes
    recover_snoozes(&conn, &now, app_handle);
}

/// On cold start, re-schedule active snoozes or fire expired ones.
fn recover_snoozes(conn: &Connection, now: &DateTime<Utc>, app_handle: &tauri::AppHandle) {
    let mut stmt = match conn.prepare("SELECT * FROM SnoozeState") {
        Ok(s) => s,
        Err(_) => return,
    };

    let snoozes: Vec<_> = stmt
        .query_map([], |row| {
            crate::storage::models::SnoozeStateRow::from_row(row)
        })
        .unwrap_or_else(|_| panic!("query_map failed"))
        .filter_map(|r| r.ok())
        .collect();

    for snooze in snoozes {
        let expiry = chrono::DateTime::parse_from_rfc3339(&snooze.snooze_until)
            .map(|dt| dt.with_timezone(&Utc));

        match expiry {
            Ok(exp) if exp <= *now => {
                tracing::info!(alarm_id = %snooze.alarm_id, "Snooze expired during downtime — re-firing");
                use tauri::Emitter;
                let _ = app_handle.emit("snooze-expired", &snooze.alarm_id);
            }
            Ok(exp) => {
                let remaining = (exp - *now).to_std().unwrap_or_default();
                let alarm_id = snooze.alarm_id.clone();
                let handle = app_handle.clone();
                tauri::async_runtime::spawn(async move {
                    tokio::time::sleep(tokio::time::Duration::from(remaining)).await;
                    tracing::info!(alarm_id = %alarm_id, "Recovered snooze expired — re-firing");
                    use tauri::Emitter;
                    let _ = handle.emit("snooze-expired", &alarm_id);
                });
            }
            Err(_) => {
                tracing::warn!(alarm_id = %snooze.alarm_id, "Invalid SnoozeUntil — clearing");
                let _ = conn.execute(
                    "DELETE FROM SnoozeState WHERE AlarmId = ?1",
                    params![snooze.alarm_id],
                );
            }
        }
    }
}

// ── Polling Loop ──

async fn poll_due_alarms(pool: &Arc<Mutex<Connection>>, app_handle: &tauri::AppHandle) {
    let conn = pool.lock().await;
    let now = Utc::now();
    let tz = load_timezone(&conn);

    let due_alarms = query_due_alarms(&conn, &now);

    if due_alarms.is_empty() {
        return;
    }

    for alarm in &due_alarms {
        let scheduled = alarm
            .next_fire_time
            .as_ref()
            .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
            .map(|dt| dt.with_timezone(&Utc));

        let is_missed = scheduled
            .map(|s| (now - s).num_seconds() > MISSED_ALARM_GRACE_SECS)
            .unwrap_or(false);

        if is_missed {
            tracing::warn!(alarm_id = %alarm.alarm_id, "Alarm missed (>{MISSED_ALARM_GRACE_SECS}s late)");
            log_alarm_event(&conn, &alarm.alarm_id, AlarmEventType::Missed);
            advance_next_fire_time(&conn, alarm, &tz);
            let labels = vec![if alarm.label.is_empty() {
                alarm.time.clone()
            } else {
                alarm.label.clone()
            }];
            crate::notifications::send_missed_alarms(app_handle, &labels);
            emit_missed_alarms(app_handle, &labels);
        } else {
            tracing::info!(alarm_id = %alarm.alarm_id, label = %alarm.label, "Firing alarm");
            log_alarm_event(&conn, &alarm.alarm_id, AlarmEventType::Fired);
            let is_24h = load_is_24_hour(&conn);
            crate::notifications::send_alarm_fired(app_handle, alarm, is_24h);
            emit_alarm_fired(app_handle, alarm);
            advance_next_fire_time(&conn, alarm, &tz);
        }
    }
}

// ── Database Queries ──

/// Query all alarms that are due (NextFireTime <= now, enabled, not deleted).
fn query_due_alarms(conn: &Connection, now: &DateTime<Utc>) -> Vec<AlarmRow> {
    let now_str = now.to_rfc3339();

    let mut stmt = match conn.prepare(
        "SELECT * FROM Alarms \
         WHERE IsEnabled = 1 \
         AND DeletedAt IS NULL \
         AND NextFireTime IS NOT NULL \
         AND NextFireTime <= ?1 \
         ORDER BY NextFireTime ASC",
    ) {
        Ok(s) => s,
        Err(e) => {
            tracing::error!(error = %e, "Failed to prepare due-alarms query");
            return Vec::new();
        }
    };

    stmt.query_map([&now_str], |row| AlarmRow::from_row(row))
        .unwrap_or_else(|e| {
            tracing::error!(error = %e, "Failed to query due alarms");
            panic!("query_map failed");
        })
        .filter_map(|r| r.ok())
        .collect()
}

/// Advance an alarm's NextFireTime after firing, or disable if one-time.
fn advance_next_fire_time(conn: &Connection, alarm: &AlarmRow, tz: &Tz) {
    let ctx = AlarmContext::new(tz, Utc::now());
    let alarm_time = NaiveTime::parse_from_str(&alarm.time, "%H:%M").ok();
    let alarm_date = alarm
        .date
        .as_ref()
        .and_then(|d| NaiveDate::parse_from_str(d, "%Y-%m-%d").ok());
    let repeat = alarm.repeat_pattern();

    let (new_next, should_disable) = match alarm_time {
        Some(time) => {
            let next = compute_next_fire_time(time, alarm_date, &repeat, &ctx);
            let disable = next.is_none() || repeat.r#type == RepeatType::Once;
            (next, disable)
        }
        None => (None, true),
    };

    let next_str = new_next.map(|t| t.to_rfc3339());
    let now_str = Utc::now().to_rfc3339();

    if should_disable {
        let _ = conn.execute(
            "UPDATE Alarms SET IsEnabled = 0, NextFireTime = NULL, UpdatedAt = ?1 WHERE AlarmId = ?2",
            rusqlite::params![now_str, alarm.alarm_id],
        );
        tracing::info!(alarm_id = %alarm.alarm_id, "One-time alarm disabled after firing");
    } else {
        let _ = conn.execute(
            "UPDATE Alarms SET NextFireTime = ?1, UpdatedAt = ?2 WHERE AlarmId = ?3",
            rusqlite::params![next_str, now_str, alarm.alarm_id],
        );
        tracing::debug!(alarm_id = %alarm.alarm_id, next = ?next_str, "Advanced NextFireTime");
    }
}

/// Insert an AlarmEvents row.
fn log_alarm_event(conn: &Connection, alarm_id: &str, event_type: AlarmEventType) {
    let event_id = uuid::Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let type_str = match event_type {
        AlarmEventType::Fired => "Fired",
        AlarmEventType::Missed => "Missed",
        AlarmEventType::Snoozed => "Snoozed",
        AlarmEventType::Dismissed => "Dismissed",
    };

    let result = conn.execute(
        "INSERT INTO AlarmEvents (AlarmEventId, AlarmId, Type, FiredAt, SnoozeCount, AlarmLabelSnapshot, AlarmTimeSnapshot, Timestamp) \
         SELECT ?1, ?2, ?3, ?4, 0, Label, Time, ?4 FROM Alarms WHERE AlarmId = ?2",
        rusqlite::params![event_id, alarm_id, type_str, now],
    );

    if let Err(e) = result {
        tracing::error!(error = %e, alarm_id = %alarm_id, "Failed to log alarm event");
    }
}

// ── Settings Helpers ──

/// Load the system timezone from settings. Falls back to UTC.
fn load_timezone(conn: &Connection) -> Tz {
    let tz_str: String = conn
        .query_row(
            "SELECT Value FROM Settings WHERE Key = 'SystemTimezone'",
            [],
            |row| row.get(0),
        )
        .unwrap_or_else(|_| "UTC".to_string());

    tz_str.parse::<Tz>().unwrap_or(chrono_tz::UTC)
}

/// Load the Is24Hour setting. Falls back to false.
fn load_is_24_hour(conn: &Connection) -> bool {
    conn.query_row(
        "SELECT Value FROM Settings WHERE Key = 'TimeFormat'",
        [],
        |row| row.get::<_, String>(0),
    )
    .map(|v| v == "24h")
    .unwrap_or(false)
}

// ── IPC Event Emitters ──

/// Emit `alarm-fired` event to frontend with alarm data.
fn emit_alarm_fired(app_handle: &tauri::AppHandle, alarm: &AlarmRow) {
    use tauri::Emitter;
    let _ = app_handle.emit("alarm-fired", serde_json::to_value(alarm).ok());
}

/// Emit `alarms-missed` event to frontend with list of labels.
fn emit_missed_alarms(app_handle: &tauri::AppHandle, labels: &[String]) {
    use tauri::Emitter;
    let _ = app_handle.emit("alarms-missed", labels);
}

// ── Wake Recovery ──

/// Called by wake_listener when system resumes from sleep.
/// Re-checks for missed alarms immediately.
pub async fn on_system_wake(pool: &Arc<Mutex<Connection>>, app_handle: &tauri::AppHandle) {
    tracing::info!("System wake detected — checking for missed alarms");
    poll_due_alarms(pool, app_handle).await;
}
