/// System Tray — Menu with alarm count, show window, and quit actions.
/// Updates badge/title when alarm count changes.
use tauri::{
    menu::{Menu, MenuItem},
    tray::{TrayIcon, TrayIconBuilder},
    AppHandle, Manager,
};

use rusqlite::Connection;
use std::sync::Arc;
use tokio::sync::Mutex;

type DbPool = Arc<Mutex<Connection>>;

/// Build and attach the system tray icon with menu.
pub fn setup_tray(app: &AppHandle) -> Result<TrayIcon, Box<dyn std::error::Error>> {
    let show_item = MenuItem::with_id(app, "show", "Show Alarm App", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

    let tray = TrayIconBuilder::new()
        .tooltip("Alarm App")
        .menu(&menu)
        .on_menu_event(move |app, event| match event.id.as_ref() {
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .build(app)?;

    Ok(tray)
}

/// Update the tray tooltip with the count of enabled alarms.
pub async fn update_tray_badge(app: &AppHandle, pool: &DbPool) {
    let conn = pool.lock().await;
    let count: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM Alarms WHERE IsEnabled = 1 AND DeletedAt IS NULL",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let tooltip = if count == 0 {
        "Alarm App — No active alarms".to_string()
    } else if count == 1 {
        "Alarm App — 1 active alarm".to_string()
    } else {
        format!("Alarm App — {count} active alarms")
    };

    // Update tooltip on existing tray icon
    if let Some(tray) = app.tray_by_id("main") {
        let _ = tray.set_tooltip(Some(&tooltip));
    }

    tracing::debug!(count, "Tray badge updated");
}
