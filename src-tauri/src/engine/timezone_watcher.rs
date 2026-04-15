/// Timezone Change Detector — Monitors OS timezone changes and updates settings.
/// Runs as a background task polling every 60 seconds.
use rusqlite::Connection;
use std::sync::Arc;
use tokio::sync::Mutex;
use tokio::time::{interval, Duration};

type DbPool = Arc<Mutex<Connection>>;

/// Start a background task that detects timezone changes.
pub fn start_timezone_watcher(pool: Arc<Mutex<Connection>>, app_handle: tauri::AppHandle) {
    tauri::async_runtime::spawn(async move {
        let mut ticker = interval(Duration::from_secs(60));
        let mut last_tz = get_system_timezone();

        tracing::info!(tz = %last_tz, "Timezone watcher started");

        loop {
            ticker.tick().await;
            let current_tz = get_system_timezone();

            if current_tz != last_tz {
                tracing::info!(
                    old = %last_tz,
                    new = %current_tz,
                    "Timezone change detected"
                );

                // Update settings in DB
                let conn = pool.lock().await;
                let _ = conn.execute(
                    "INSERT INTO Settings (Key, Value, ValueType) VALUES ('SystemTimezone', ?1, 'String') \
                     ON CONFLICT(Key) DO UPDATE SET Value = ?1",
                    rusqlite::params![current_tz],
                );
                drop(conn);

                // Emit event to frontend
                use tauri::Emitter;
                let _ = app_handle.emit("timezone-changed", &current_tz);

                last_tz = current_tz;
            }
        }
    });
}

/// Get the current OS timezone (IANA identifier).
fn get_system_timezone() -> String {
    // Use iana-time-zone crate for cross-platform detection
    iana_time_zone::get_timezone().unwrap_or_else(|_| "UTC".to_string())
}
