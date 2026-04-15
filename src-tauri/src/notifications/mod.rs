// Notifications — Phase 7 implementation
// OS-native notifications for alarm fired, missed, and snooze expiry

use crate::storage::models::AlarmRow;

/// Send an OS notification when an alarm fires.
pub fn send_alarm_fired(app: &tauri::AppHandle, alarm: &AlarmRow, is_24_hour: bool) {
    use tauri_plugin_notification::NotificationExt;

    let label = if alarm.label.is_empty() {
        "Alarm"
    } else {
        &alarm.label
    };
    let time_str = format_time(&alarm.time, is_24_hour);

    let result = app
        .notification()
        .builder()
        .title(format!("⏰ {label}"))
        .body(format!("{time_str} — Tap to dismiss or snooze"))
        .show();

    match result {
        Ok(_) => tracing::debug!(label = %label, "Alarm fired notification sent"),
        Err(e) => tracing::warn!(error = %e, "Failed to show alarm notification"),
    }
}

/// Send an OS notification for missed alarms.
pub fn send_missed_alarms(app: &tauri::AppHandle, labels: &[String]) {
    use tauri_plugin_notification::NotificationExt;

    if labels.is_empty() {
        return;
    }

    let body = if labels.len() == 1 {
        format!("You missed {} while you were away", labels[0])
    } else {
        format!("You missed {} alarms: {}", labels.len(), labels.join(", "))
    };

    let result = app
        .notification()
        .builder()
        .title("Missed Alarm")
        .body(body)
        .show();

    match result {
        Ok(_) => tracing::debug!(count = labels.len(), "Missed alarm notification sent"),
        Err(e) => tracing::warn!(error = %e, "Failed to show missed alarm notification"),
    }
}

/// Send an OS notification when a snooze expires.
pub fn send_snooze_expired(
    app: &tauri::AppHandle,
    label: &str,
    snooze_count: i32,
    max_snooze_count: i32,
) {
    use tauri_plugin_notification::NotificationExt;

    let display_label = if label.is_empty() { "Alarm" } else { label };

    let result = app
        .notification()
        .builder()
        .title(format!("⏰ {display_label} (Snoozed)"))
        .body(format!(
            "Snooze ended — {snooze_count}/{max_snooze_count} snoozes used"
        ))
        .show();

    match result {
        Ok(_) => tracing::debug!(label = %display_label, "Snooze expired notification sent"),
        Err(e) => tracing::warn!(error = %e, "Failed to show snooze notification"),
    }
}

/// Format alarm time for notification display.
fn format_time(time: &str, is_24_hour: bool) -> String {
    if is_24_hour {
        return time.to_string();
    }

    // Parse HH:MM and convert to 12-hour format
    let parts: Vec<&str> = time.split(':').collect();
    if parts.len() != 2 {
        return time.to_string();
    }

    let hour: u32 = parts[0].parse().unwrap_or(0);
    let minute: u32 = parts[1].parse().unwrap_or(0);

    let (display_hour, period) = match hour {
        0 => (12, "AM"),
        1..=11 => (hour, "AM"),
        12 => (12, "PM"),
        _ => (hour - 12, "PM"),
    };

    format!("{display_hour}:{minute:02} {period}")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn format_12h() {
        assert_eq!(format_time("06:30", false), "6:30 AM");
        assert_eq!(format_time("13:00", false), "1:00 PM");
        assert_eq!(format_time("00:00", false), "12:00 AM");
        assert_eq!(format_time("12:00", false), "12:00 PM");
    }

    #[test]
    fn format_24h() {
        assert_eq!(format_time("06:30", true), "06:30");
        assert_eq!(format_time("13:00", true), "13:00");
    }
}
