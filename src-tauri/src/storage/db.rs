use refinery::embed_migrations;
use rusqlite::{params, Connection};

use crate::errors::AlarmAppError;
use crate::storage::models::SettingsResponse;

embed_migrations!("migrations");

/// Run refinery migrations on the database.
pub fn run_migrations(conn: &mut Connection) -> Result<(), AlarmAppError> {
    migrations::runner()
        .run(conn)
        .map_err(|e| AlarmAppError::Migration(e.to_string()))?;

    tracing::info!("Migrations complete");
    Ok(())
}

/// Set WAL mode and other PRAGMAs after migrations.
pub fn set_pragmas(conn: &Connection) {
    let pragmas = [
        "PRAGMA journal_mode=WAL",
        "PRAGMA busy_timeout=5000",
        "PRAGMA foreign_keys=ON",
        "PRAGMA synchronous=NORMAL",
    ];
    for pragma in &pragmas {
        if let Err(e) = conn.execute_batch(pragma) {
            tracing::warn!(pragma = pragma, error = %e, "PRAGMA failed");
        }
    }
}

/// Load all settings into a typed SettingsResponse struct.
pub fn load_settings(conn: &Connection) -> SettingsResponse {
    let mut settings = SettingsResponse::default();

    let mut stmt = match conn.prepare("SELECT Key, Value FROM Settings") {
        Ok(s) => s,
        Err(e) => {
            tracing::warn!(error = %e, "Failed to load settings, using defaults");
            return settings;
        }
    };

    let rows = stmt.query_map([], |row| {
        let key: String = row.get(0)?;
        let value: String = row.get(1)?;
        Ok((key, value))
    });

    if let Ok(rows) = rows {
        for row in rows.flatten() {
            let (key, value) = row;
            settings.apply_setting(&key, &value);
        }
    }

    settings
}

/// Get a single setting value by key.
pub fn get_setting(conn: &Connection, key: &str) -> Option<String> {
    conn.query_row(
        "SELECT Value FROM Settings WHERE Key = ?1",
        params![key],
        |row| row.get(0),
    )
    .ok()
}

/// Update a single setting value.
pub fn update_setting(conn: &Connection, key: &str, value: &str) -> Result<(), AlarmAppError> {
    let rows = conn.execute(
        "UPDATE Settings SET Value = ?1 WHERE Key = ?2",
        params![value, key],
    )?;

    if rows == 0 {
        return Err(AlarmAppError::Validation(format!(
            "Unknown setting key: {key}"
        )));
    }

    tracing::info!(key = key, value = value, "Setting updated");
    Ok(())
}

/// Purge alarm events older than retention period.
pub fn purge_old_events(conn: &Connection) {
    let retention_days: i64 = get_setting(conn, "EventRetentionDays")
        .and_then(|v| v.parse().ok())
        .unwrap_or(90);

    let cutoff = chrono::Utc::now() - chrono::Duration::days(retention_days);
    match conn.execute(
        "DELETE FROM AlarmEvents WHERE Timestamp < ?1",
        params![cutoff.to_rfc3339()],
    ) {
        Ok(rows) => {
            tracing::info!(
                rows_purged = rows,
                retention_days = retention_days,
                "Purged old alarm events"
            );
        }
        Err(e) => {
            tracing::warn!(error = %e, "purge_old_events: DELETE failed");
        }
    }
}

/// Insert an alarm event.
pub fn insert_alarm_event(
    conn: &Connection,
    event_id: &str,
    alarm_id: &str,
    event_type: &str,
    fired_at: &str,
    label_snapshot: &str,
    time_snapshot: &str,
) -> Result<(), AlarmAppError> {
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO AlarmEvents (AlarmEventId, AlarmId, Type, FiredAt, SnoozeCount, AlarmLabelSnapshot, AlarmTimeSnapshot, Timestamp)
         VALUES (?1, ?2, ?3, ?4, 0, ?5, ?6, ?7)",
        params![event_id, alarm_id, event_type, fired_at, label_snapshot, time_snapshot, now],
    )?;
    Ok(())
}
