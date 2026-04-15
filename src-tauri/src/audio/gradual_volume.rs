// Gradual volume — Phase 5 implementation
// Quadratic t² volume curve for perceptually even fade-in

use rodio::Sink;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::watch;

const UPDATE_INTERVAL_MS: u64 = 100;
const MIN_VOLUME: f32 = 0.1;

/// Runs a gradual volume ramp on a tokio interval, updating sink volume every 100ms.
/// Uses a quadratic (t²) curve for perceptually even increase from 10% → 100%.
/// Stops when `cancel_rx` receives a signal or duration elapses.
pub async fn run_gradual_volume(
    sink: Arc<Sink>,
    duration_sec: u32,
    mut cancel_rx: watch::Receiver<bool>,
) {
    let mut interval = tokio::time::interval(Duration::from_millis(UPDATE_INTERVAL_MS));
    let start = Instant::now();
    let duration = Duration::from_secs(duration_sec as u64);

    sink.set_volume(MIN_VOLUME);

    loop {
        tokio::select! {
            _ = interval.tick() => {
                let elapsed = start.elapsed();
                if elapsed >= duration {
                    sink.set_volume(1.0);
                    break;
                }
                sink.set_volume(compute_quadratic_volume(elapsed, duration));
            }
            _ = cancel_rx.changed() => {
                tracing::debug!("Gradual volume cancelled");
                break;
            }
        }
    }
}

/// Quadratic curve: t² provides perceptually even increase from MIN_VOLUME → 1.0.
fn compute_quadratic_volume(elapsed: Duration, total: Duration) -> f32 {
    let t = elapsed.as_secs_f32() / total.as_secs_f32();
    MIN_VOLUME + (1.0 - MIN_VOLUME) * (t * t)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn volume_starts_at_min() {
        let v = compute_quadratic_volume(Duration::ZERO, Duration::from_secs(30));
        assert!((v - MIN_VOLUME).abs() < 0.001);
    }

    #[test]
    fn volume_ends_at_max() {
        let v = compute_quadratic_volume(Duration::from_secs(30), Duration::from_secs(30));
        assert!((v - 1.0).abs() < 0.001);
    }

    #[test]
    fn volume_is_monotonic() {
        let total = Duration::from_secs(30);
        let mut prev = 0.0_f32;
        for ms in (0..30000).step_by(100) {
            let v = compute_quadratic_volume(Duration::from_millis(ms), total);
            assert!(v >= prev, "Volume decreased at {ms}ms");
            prev = v;
        }
    }
}
