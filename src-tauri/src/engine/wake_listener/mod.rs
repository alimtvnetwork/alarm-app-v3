// Wake listener — Platform-specific wake detection
// Detects system sleep/wake to re-evaluate missed alarms.

#[cfg(target_os = "linux")]
mod linux;
#[cfg(target_os = "macos")]
mod macos;
#[cfg(target_os = "windows")]
mod windows;

use crate::errors::AlarmAppError;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

/// Shared stop signal for graceful shutdown.
pub type StopSignal = Arc<AtomicBool>;

/// Create a new stop signal (initially false).
pub fn new_stop_signal() -> StopSignal {
    Arc::new(AtomicBool::new(false))
}

/// Platform-agnostic wake listener trait.
pub trait WakeListener: Send + Sync {
    fn start(
        &self,
        on_wake: Box<dyn Fn() + Send + Sync>,
        stop: StopSignal,
    ) -> Result<(), AlarmAppError>;

    fn stop(&self, stop: StopSignal);
}

/// Factory: create the correct wake listener for the current platform.
pub fn create_wake_listener() -> Box<dyn WakeListener> {
    #[cfg(target_os = "macos")]
    {
        Box::new(macos::MacOsWakeListener::new())
    }
    #[cfg(target_os = "windows")]
    {
        Box::new(windows::WindowsWakeListener::new())
    }
    #[cfg(target_os = "linux")]
    {
        Box::new(linux::LinuxWakeListener::new())
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    {
        Box::new(NoOpWakeListener)
    }
}

/// No-op wake listener for unsupported platforms.
#[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
struct NoOpWakeListener;

#[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
impl WakeListener for NoOpWakeListener {
    fn start(
        &self,
        _on_wake: Box<dyn Fn() + Send + Sync>,
        _stop: StopSignal,
    ) -> Result<(), AlarmAppError> {
        tracing::warn!("Wake listener not supported on this platform");
        Ok(())
    }
    fn stop(&self, _stop: StopSignal) {}
}

/// Shared uptime-based sleep detection used by all platforms as primary or fallback.
pub(crate) fn monitor_uptime_for_sleep(
    on_wake: Arc<Box<dyn Fn() + Send + Sync>>,
    stop: StopSignal,
    platform_label: &str,
) {
    use std::time::{Duration, Instant, SystemTime};

    let check_interval = Duration::from_secs(10);
    let sleep_threshold = Duration::from_secs(30);

    let mut last_check = Instant::now();
    let mut last_wall = SystemTime::now();

    loop {
        std::thread::sleep(check_interval);

        if stop.load(Ordering::Relaxed) {
            tracing::info!("{platform_label}: Wake listener stopped");
            break;
        }

        let now_instant = Instant::now();
        let now_wall = SystemTime::now();

        let monotonic_elapsed = now_instant.duration_since(last_check);
        let wall_elapsed = now_wall.duration_since(last_wall).unwrap_or(Duration::ZERO);

        if wall_elapsed > monotonic_elapsed + sleep_threshold {
            let gap = wall_elapsed - monotonic_elapsed;
            tracing::info!(
                gap_secs = gap.as_secs(),
                "{platform_label}: Detected system wake (wall clock gap)"
            );
            on_wake();
        }

        last_check = now_instant;
        last_wall = now_wall;
    }
}
