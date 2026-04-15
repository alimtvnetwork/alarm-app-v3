// Audio IPC commands — Phase 5
// list_sounds, set_custom_sound, validate_custom_sound, preview_sound, stop_audio

use serde::{Deserialize, Serialize};

use crate::audio::player;
use crate::errors::AlarmAppError;
use crate::storage::models::{AlarmSound, SoundCategory};

/// Built-in sound library — 10 sounds across 4 categories.
fn builtin_sounds() -> Vec<AlarmSound> {
    vec![
        AlarmSound {
            alarm_sound_id: "classic-beep".into(),
            name: "Classic Beep".into(),
            file_name: "classic-beep.wav".into(),
            category: SoundCategory::Classic,
        },
        AlarmSound {
            alarm_sound_id: "digital-buzz".into(),
            name: "Digital Buzz".into(),
            file_name: "digital-buzz.wav".into(),
            category: SoundCategory::Digital,
        },
        AlarmSound {
            alarm_sound_id: "gentle-chime".into(),
            name: "Gentle Chime".into(),
            file_name: "gentle-chime.wav".into(),
            category: SoundCategory::Gentle,
        },
        AlarmSound {
            alarm_sound_id: "rooster".into(),
            name: "Rooster".into(),
            file_name: "rooster.wav".into(),
            category: SoundCategory::Classic,
        },
        AlarmSound {
            alarm_sound_id: "bell".into(),
            name: "Bell".into(),
            file_name: "bell.wav".into(),
            category: SoundCategory::Classic,
        },
        AlarmSound {
            alarm_sound_id: "rain-gentle".into(),
            name: "Gentle Rain".into(),
            file_name: "rain-gentle.wav".into(),
            category: SoundCategory::Nature,
        },
        AlarmSound {
            alarm_sound_id: "birds-morning".into(),
            name: "Morning Birds".into(),
            file_name: "birds-morning.wav".into(),
            category: SoundCategory::Nature,
        },
        AlarmSound {
            alarm_sound_id: "ocean-wave".into(),
            name: "Ocean Wave".into(),
            file_name: "ocean-wave.wav".into(),
            category: SoundCategory::Nature,
        },
        AlarmSound {
            alarm_sound_id: "urgent-siren".into(),
            name: "Urgent Siren".into(),
            file_name: "urgent-siren.wav".into(),
            category: SoundCategory::Digital,
        },
        AlarmSound {
            alarm_sound_id: "soft-piano".into(),
            name: "Soft Piano".into(),
            file_name: "soft-piano.wav".into(),
            category: SoundCategory::Gentle,
        },
    ]
}

/// List all available alarm sounds (built-in library).
#[tauri::command]
pub async fn list_sounds() -> Result<Vec<AlarmSound>, AlarmAppError> {
    Ok(builtin_sounds())
}

#[derive(Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct SetCustomSoundPayload {
    pub file_path: String,
}

/// Validate and register a custom sound file.
#[tauri::command]
pub async fn set_custom_sound(payload: SetCustomSoundPayload) -> Result<AlarmSound, AlarmAppError> {
    player::validate_custom_sound(&payload.file_path)?;

    let file_name = std::path::Path::new(&payload.file_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("custom-sound")
        .to_string();

    let sound = AlarmSound {
        alarm_sound_id: payload.file_path.clone(),
        name: file_name.clone(),
        file_name,
        category: SoundCategory::Classic,
    };

    tracing::info!(path = %payload.file_path, "Custom sound registered");
    Ok(sound)
}

#[derive(Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct ValidateCustomSoundPayload {
    pub file_path: String,
}

#[derive(Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct SoundValidationResult {
    pub is_valid: bool,
    pub error: Option<String>,
}

/// Validate a custom sound file without registering it.
#[tauri::command]
pub async fn validate_custom_sound(
    payload: ValidateCustomSoundPayload,
) -> Result<SoundValidationResult, AlarmAppError> {
    match player::validate_custom_sound(&payload.file_path) {
        Ok(()) => Ok(SoundValidationResult {
            is_valid: true,
            error: None,
        }),
        Err(e) => Ok(SoundValidationResult {
            is_valid: false,
            error: Some(e.to_string()),
        }),
    }
}
