// Linux wake listener — D-Bus PrepareForSleep + uptime fallback
// Primary: listens for systemd-logind PrepareForSleep signal
// Fallback: uptime gap detection for non-systemd systems

use crate::engine::wake_listener::{monitor_uptime_for_sleep, StopSignal, WakeListener};
use crate::errors::AlarmAppError;
use std::sync::atomic::Ordering;
use std::sync::Arc;

/// Linux wake listener using D-Bus + uptime fallback.
pub struct LinuxWakeListener;

impl LinuxWakeListener {
    pub fn new() -> Self {
        Self
    }
}

impl WakeListener for LinuxWakeListener {
    fn start(
        &self,
        on_wake: Box<dyn Fn() + Send + Sync>,
        stop: StopSignal,
    ) -> Result<(), AlarmAppError> {
        let on_wake = Arc::new(on_wake);
        let on_wake_dbus = on_wake.clone();
        let stop_dbus = stop.clone();

        // Primary: D-Bus listener
        tokio::spawn(async move {
            if let Err(e) = run_dbus_listener(on_wake_dbus, stop_dbus).await {
                tracing::warn!(error = %e, "D-Bus wake listener failed");
            }
        });

        // Fallback: uptime monitor
        let stop_fallback = stop.clone();
        std::thread::Builder::new()
            .name("wake-listener-linux-fallback".to_string())
            .spawn(move || {
                monitor_uptime_for_sleep(on_wake, stop_fallback, "Linux");
            })
            .map_err(|e| AlarmAppError::Audio(format!("Failed to start wake listener: {e}")))?;

        tracing::info!("Linux wake listener started (D-Bus + uptime fallback)");
        Ok(())
    }

    fn stop(&self, stop: StopSignal) {
        stop.store(true, Ordering::Relaxed);
        tracing::debug!("Linux wake listener stop signaled");
    }
}

/// Connect to system D-Bus and listen for PrepareForSleep signals.
async fn run_dbus_listener(
    on_wake: Arc<Box<dyn Fn() + Send + Sync>>,
    stop: StopSignal,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    use futures_lite::StreamExt;
    use zbus::Connection;

    let connection = Connection::system().await.map_err(|e| {
        tracing::warn!(error = %e, "D-Bus system bus unavailable");
        e
    })?;

    tracing::info!("Connected to D-Bus system bus for sleep/wake signals");

    // Subscribe to PrepareForSleep signal
    let rule = "type='signal',interface='org.freedesktop.login1.Manager',member='PrepareForSleep'";
    connection
        .call_method(
            Some("org.freedesktop.DBus"),
            "/org/freedesktop/DBus",
            Some("org.freedesktop.DBus"),
            "AddMatch",
            &rule,
        )
        .await?;

    let mut stream = zbus::MessageStream::from(&connection);

    while let Some(msg) = stream.next().await {
        if stop.load(Ordering::Relaxed) {
            tracing::info!("Linux: D-Bus listener stopped");
            break;
        }

        let msg = match msg {
            Ok(m) => m,
            Err(e) => {
                tracing::warn!(error = %e, "D-Bus message error");
                continue;
            }
        };

        let header = msg.header();
        let is_sleep_signal = header
            .member()
            .is_some_and(|m| m.as_str() == "PrepareForSleep");
        if !is_sleep_signal {
            continue;
        }

        let body: Result<(bool,), _> = msg.body().deserialize();
        match body {
            Ok((is_sleeping,)) => {
                if is_sleeping {
                    tracing::info!("Linux: System entering sleep");
                } else {
                    tracing::info!("Linux: System woke from sleep");
                    on_wake();
                }
            }
            Err(e) => {
                tracing::warn!(error = %e, "Failed to parse PrepareForSleep body");
            }
        }
    }

    Ok(())
}
