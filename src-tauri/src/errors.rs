use serde::Serialize;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AlarmAppError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),

    #[error("Audio playback failed: {0}")]
    Audio(String),

    #[error("IPC timeout after {timeout_ms}ms")]
    IpcTimeout { timeout_ms: u64 },

    #[error("File not found: {path}")]
    FileNotFound { path: String },

    #[error("Migration failed: {0}")]
    Migration(String),

    #[error("Notification permission denied")]
    NotificationDenied,

    #[error("Invalid sound format: {0}")]
    InvalidSoundFormat(String),

    #[error("Symlink rejected: custom sounds must not be symlinks")]
    SymlinkRejected,

    #[error("Sound file too large: {size_bytes} bytes (max {max_bytes})")]
    SoundFileTooLarge { size_bytes: u64, max_bytes: u64 },

    #[error("Restricted path: cannot use files from system directories")]
    RestrictedPath,

    #[error("Concurrent modification: row was changed by another operation")]
    ConcurrentModification,

    #[error("Invalid alarm data: {0}")]
    Validation(String),

    #[error("Export/import failed: {0}")]
    ExportImport(String),
}

/// Structured IPC error returned to the frontend.
#[derive(Serialize)]
pub struct IpcErrorResponse {
    #[serde(rename = "Message")]
    pub message: String,
    #[serde(rename = "Code")]
    pub code: String,
}

impl From<AlarmAppError> for IpcErrorResponse {
    fn from(err: AlarmAppError) -> Self {
        Self {
            message: err.to_string(),
            code: error_code(&err),
        }
    }
}

fn error_code(err: &AlarmAppError) -> String {
    match err {
        AlarmAppError::Database(_) => "Database",
        AlarmAppError::Audio(_) => "Audio",
        AlarmAppError::IpcTimeout { .. } => "IpcTimeout",
        AlarmAppError::FileNotFound { .. } => "FileNotFound",
        AlarmAppError::Migration(_) => "Migration",
        AlarmAppError::NotificationDenied => "NotificationDenied",
        AlarmAppError::InvalidSoundFormat(_) => "InvalidSoundFormat",
        AlarmAppError::SymlinkRejected => "SymlinkRejected",
        AlarmAppError::SoundFileTooLarge { .. } => "SoundFileTooLarge",
        AlarmAppError::RestrictedPath => "RestrictedPath",
        AlarmAppError::ConcurrentModification => "ConcurrentModification",
        AlarmAppError::Validation(_) => "Validation",
        AlarmAppError::ExportImport(_) => "ExportImport",
    }
    .to_string()
}

/// Serialize AlarmAppError for Tauri IPC (returns the Display string).
impl Serialize for AlarmAppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        let response = IpcErrorResponse {
            message: self.to_string(),
            code: error_code(self),
        };
        response.serialize(serializer)
    }
}
