// Audio player — Phase 5 implementation
// rodio playback, sound resolution, custom sound validation

use std::io::BufReader;
use std::path::{Path, PathBuf};
use std::sync::Arc;

use rodio::{Decoder, OutputStream, OutputStreamHandle, Sink};
use tokio::sync::watch;

use crate::errors::AlarmAppError;

const MAX_SOUND_FILE_SIZE: u64 = 10 * 1024 * 1024; // 10 MB
const ALLOWED_EXTENSIONS: &[&str] = &["mp3", "wav", "ogg", "flac"];
const DEFAULT_SOUND: &str = "classic-beep";

// ── AlarmPlayer ──

/// Manages audio playback for alarm firing.
/// Each fire creates a new Sink for independent control.
pub struct AlarmPlayer {
    _stream: OutputStream,
    stream_handle: OutputStreamHandle,
    current_sink: Option<Arc<Sink>>,
    cancel_tx: Option<watch::Sender<bool>>,
}

impl AlarmPlayer {
    /// Create a new AlarmPlayer. Call once at startup.
    pub fn new() -> Result<Self, AlarmAppError> {
        let (_stream, stream_handle) = OutputStream::try_default()
            .map_err(|e| AlarmAppError::Audio(format!("No audio output device: {e}")))?;

        tracing::info!("Audio player initialized");
        Ok(Self {
            _stream,
            stream_handle,
            current_sink: None,
            cancel_tx: None,
        })
    }

    /// Play an alarm sound. Resolves built-in or custom path, handles gradual volume.
    pub fn play(
        &mut self,
        sound_file: &str,
        is_gradual_volume: bool,
        gradual_volume_duration_sec: i32,
        sounds_dir: &Path,
    ) -> Result<(), AlarmAppError> {
        // Stop any currently playing alarm
        self.stop();

        let path = resolve_sound_path(sound_file, sounds_dir);
        let file = std::fs::File::open(&path).map_err(|_| AlarmAppError::FileNotFound {
            path: path.to_string_lossy().to_string(),
        })?;

        let source = Decoder::new(BufReader::new(file))
            .map_err(|e| AlarmAppError::Audio(format!("Failed to decode audio: {e}")))?;

        let sink = Sink::try_new(&self.stream_handle)
            .map_err(|e| AlarmAppError::Audio(format!("Failed to create audio sink: {e}")))?;

        let sink = Arc::new(sink);

        if is_gradual_volume {
            sink.set_volume(0.1);
            let (cancel_tx, cancel_rx) = watch::channel(false);
            self.cancel_tx = Some(cancel_tx);

            let sink_clone = Arc::clone(&sink);
            let dur = gradual_volume_duration_sec.max(15) as u32;
            tokio::spawn(async move {
                crate::audio::gradual_volume::run_gradual_volume(sink_clone, dur, cancel_rx).await;
            });
        } else {
            sink.set_volume(1.0);
        }

        sink.append(source);
        self.current_sink = Some(sink);

        tracing::info!(sound = %sound_file, gradual = is_gradual_volume, "Alarm audio playing");
        Ok(())
    }

    /// Stop current playback.
    pub fn stop(&mut self) {
        if let Some(tx) = self.cancel_tx.take() {
            let _ = tx.send(true);
        }
        if let Some(sink) = self.current_sink.take() {
            sink.stop();
        }
        tracing::debug!("Audio playback stopped");
    }

    /// Preview a sound briefly (3 seconds).
    pub fn preview(&mut self, sound_file: &str, sounds_dir: &Path) -> Result<(), AlarmAppError> {
        self.play(sound_file, false, 0, sounds_dir)
    }

    /// Check if audio is currently playing.
    pub fn is_playing(&self) -> bool {
        self.current_sink.as_ref().is_some_and(|s| !s.empty())
    }
}

// ── Sound Path Resolution ──

/// Resolve a sound file identifier to an actual filesystem path.
/// Built-in sounds use key lookup; custom sounds use the stored path.
fn resolve_sound_path(sound_file: &str, sounds_dir: &Path) -> PathBuf {
    let is_builtin = !sound_file.contains('/') && !sound_file.contains('\\');

    if is_builtin {
        return get_builtin_sound_path(sound_file, sounds_dir);
    }

    // Custom sound — verify existence, fallback if missing
    let custom_path = Path::new(sound_file);
    if custom_path.exists() {
        return custom_path.to_path_buf();
    }

    tracing::warn!(path = %sound_file, "Custom sound file missing — using default");
    get_builtin_sound_path(DEFAULT_SOUND, sounds_dir)
}

/// Get the filesystem path for a built-in sound.
fn get_builtin_sound_path(key: &str, sounds_dir: &Path) -> PathBuf {
    // Try common extensions in order
    for ext in ALLOWED_EXTENSIONS {
        let candidate = sounds_dir.join(format!("{key}.{ext}"));
        if candidate.exists() {
            return candidate;
        }
    }
    // Fallback to .wav if nothing found
    sounds_dir.join(format!("{key}.wav"))
}

// ── Custom Sound Validation ──

/// Validates a custom sound file path.
pub fn validate_custom_sound(path: &str) -> Result<(), AlarmAppError> {
    tracing::debug!(path = %path, "validate_custom_sound");
    validate_extension(path)?;
    reject_symlink(path)?;
    let canonical = resolve_canonical(path)?;
    reject_restricted_path(&canonical)?;
    validate_file_size(&canonical)
}

fn validate_extension(path: &str) -> Result<(), AlarmAppError> {
    let ext = Path::new(path)
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase())
        .unwrap_or_default();
    if !ALLOWED_EXTENSIONS.contains(&ext.as_str()) {
        return Err(AlarmAppError::InvalidSoundFormat(ext));
    }
    Ok(())
}

fn reject_symlink(path: &str) -> Result<(), AlarmAppError> {
    if Path::new(path).is_symlink() {
        return Err(AlarmAppError::SymlinkRejected);
    }
    Ok(())
}

fn resolve_canonical(path: &str) -> Result<PathBuf, AlarmAppError> {
    Path::new(path)
        .canonicalize()
        .map_err(|_| AlarmAppError::FileNotFound {
            path: path.to_string(),
        })
}

fn reject_restricted_path(canonical: &Path) -> Result<(), AlarmAppError> {
    let path_str = canonical.to_string_lossy();
    #[cfg(target_os = "macos")]
    if path_str.starts_with("/System") || path_str.starts_with("/Library") {
        return Err(AlarmAppError::RestrictedPath);
    }
    #[cfg(target_os = "windows")]
    if path_str.starts_with("C:\\Windows") || path_str.starts_with("C:\\Program Files") {
        return Err(AlarmAppError::RestrictedPath);
    }
    #[cfg(target_os = "linux")]
    if path_str.starts_with("/etc") || path_str.starts_with("/sys") || path_str.starts_with("/proc")
    {
        return Err(AlarmAppError::RestrictedPath);
    }
    Ok(())
}

fn validate_file_size(canonical: &Path) -> Result<(), AlarmAppError> {
    let metadata = std::fs::metadata(canonical).map_err(|_| AlarmAppError::FileNotFound {
        path: canonical.to_string_lossy().to_string(),
    })?;
    if metadata.len() > MAX_SOUND_FILE_SIZE {
        return Err(AlarmAppError::SoundFileTooLarge {
            size_bytes: metadata.len(),
            max_bytes: MAX_SOUND_FILE_SIZE,
        });
    }
    Ok(())
}
