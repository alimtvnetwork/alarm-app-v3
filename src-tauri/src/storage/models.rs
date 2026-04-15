use serde::{Deserialize, Serialize};

// ── Domain Enums ──

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum RepeatType {
    Once,
    Daily,
    Weekly,
    Interval,
    Cron,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum ChallengeType {
    Math,
    Memory,
    Shake,
    Typing,
    Qr,
    Steps,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum ChallengeDifficulty {
    Easy,
    Medium,
    Hard,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum AlarmEventType {
    Fired,
    Snoozed,
    Dismissed,
    Missed,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum SoundCategory {
    Classic,
    Gentle,
    Nature,
    Digital,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum SettingsValueType {
    String,
    Integer,
    Boolean,
    Json,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum ThemeMode {
    Light,
    Dark,
    System,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum ExportFormat {
    Json,
    Csv,
    Ics,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum ExportScope {
    All,
    Selected,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum DuplicateAction {
    Skip,
    Overwrite,
    Rename,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum ImportMode {
    Merge,
    Replace,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum SortField {
    Date,
    Label,
    SnoozeCount,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum SortOrder {
    Asc,
    Desc,
}

// ── FromStr Implementations ──

impl std::str::FromStr for RepeatType {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "Once" => Ok(Self::Once),
            "Daily" => Ok(Self::Daily),
            "Weekly" => Ok(Self::Weekly),
            "Interval" => Ok(Self::Interval),
            "Cron" => Ok(Self::Cron),
            _ => Err(format!("Unknown RepeatType: {s}")),
        }
    }
}

impl std::str::FromStr for ChallengeType {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "Math" => Ok(Self::Math),
            "Memory" => Ok(Self::Memory),
            "Shake" => Ok(Self::Shake),
            "Typing" => Ok(Self::Typing),
            "Qr" => Ok(Self::Qr),
            "Steps" => Ok(Self::Steps),
            _ => Err(format!("Unknown ChallengeType: {s}")),
        }
    }
}

impl std::str::FromStr for ChallengeDifficulty {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "Easy" => Ok(Self::Easy),
            "Medium" => Ok(Self::Medium),
            "Hard" => Ok(Self::Hard),
            _ => Err(format!("Unknown ChallengeDifficulty: {s}")),
        }
    }
}

impl std::str::FromStr for AlarmEventType {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "Fired" => Ok(Self::Fired),
            "Snoozed" => Ok(Self::Snoozed),
            "Dismissed" => Ok(Self::Dismissed),
            "Missed" => Ok(Self::Missed),
            _ => Err(format!("Unknown AlarmEventType: {s}")),
        }
    }
}

impl std::str::FromStr for SoundCategory {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "Classic" => Ok(Self::Classic),
            "Gentle" => Ok(Self::Gentle),
            "Nature" => Ok(Self::Nature),
            "Digital" => Ok(Self::Digital),
            _ => Err(format!("Unknown SoundCategory: {s}")),
        }
    }
}

impl std::str::FromStr for ThemeMode {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "Light" => Ok(Self::Light),
            "Dark" => Ok(Self::Dark),
            "System" => Ok(Self::System),
            _ => Err(format!("Unknown ThemeMode: {s}")),
        }
    }
}

// ── RepeatPattern ──

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct RepeatPattern {
    pub r#type: RepeatType,
    pub days_of_week: Vec<u8>,
    pub interval_minutes: u32,
    pub cron_expression: String,
}

// ── AlarmRow ──

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct AlarmRow {
    pub alarm_id: String,
    pub time: String,
    pub date: Option<String>,
    pub label: String,
    pub is_enabled: bool,
    pub is_previous_enabled: Option<bool>,
    pub repeat_type: RepeatType,
    pub repeat_days_of_week: String,
    pub repeat_interval_minutes: i32,
    pub repeat_cron_expression: String,
    pub group_id: Option<String>,
    pub snooze_duration_min: i32,
    pub max_snooze_count: i32,
    pub sound_file: String,
    pub is_vibration_enabled: bool,
    pub is_gradual_volume: bool,
    pub gradual_volume_duration_sec: i32,
    pub auto_dismiss_min: i32,
    pub challenge_type: Option<ChallengeType>,
    pub challenge_difficulty: Option<ChallengeDifficulty>,
    pub challenge_shake_count: Option<i32>,
    pub challenge_step_count: Option<i32>,
    pub next_fire_time: Option<String>,
    pub position: i32,
    pub deleted_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl AlarmRow {
    pub fn days_of_week(&self) -> Vec<u8> {
        serde_json::from_str(&self.repeat_days_of_week).unwrap_or_default()
    }

    pub fn repeat_pattern(&self) -> RepeatPattern {
        RepeatPattern {
            r#type: self.repeat_type.clone(),
            days_of_week: self.days_of_week(),
            interval_minutes: self.repeat_interval_minutes as u32,
            cron_expression: self.repeat_cron_expression.clone(),
        }
    }

    pub fn from_row(row: &rusqlite::Row) -> rusqlite::Result<Self> {
        Ok(Self {
            alarm_id: row.get("AlarmId")?,
            time: row.get("Time")?,
            date: row.get("Date")?,
            label: row.get("Label")?,
            is_enabled: row.get::<_, i32>("IsEnabled")? != 0,
            is_previous_enabled: row
                .get::<_, Option<i32>>("IsPreviousEnabled")?
                .map(|v| v != 0),
            repeat_type: row
                .get::<_, String>("RepeatType")?
                .parse()
                .unwrap_or(RepeatType::Once),
            repeat_days_of_week: row.get("RepeatDaysOfWeek")?,
            repeat_interval_minutes: row.get("RepeatIntervalMinutes")?,
            repeat_cron_expression: row.get("RepeatCronExpression")?,
            group_id: row.get("GroupId")?,
            snooze_duration_min: row.get("SnoozeDurationMin")?,
            max_snooze_count: row.get("MaxSnoozeCount")?,
            sound_file: row.get("SoundFile")?,
            is_vibration_enabled: row.get::<_, i32>("IsVibrationEnabled")? != 0,
            is_gradual_volume: row.get::<_, i32>("IsGradualVolume")? != 0,
            gradual_volume_duration_sec: row.get("GradualVolumeDurationSec")?,
            auto_dismiss_min: row.get("AutoDismissMin")?,
            challenge_type: row
                .get::<_, Option<String>>("ChallengeType")?
                .and_then(|s| s.parse().ok()),
            challenge_difficulty: row
                .get::<_, Option<String>>("ChallengeDifficulty")?
                .and_then(|s| s.parse().ok()),
            challenge_shake_count: row.get("ChallengeShakeCount")?,
            challenge_step_count: row.get("ChallengeStepCount")?,
            next_fire_time: row.get("NextFireTime")?,
            position: row.get("Position")?,
            deleted_at: row.get("DeletedAt")?,
            created_at: row.get("CreatedAt")?,
            updated_at: row.get("UpdatedAt")?,
        })
    }

    pub fn is_disabled(&self) -> bool {
        !self.is_enabled
    }
    pub fn is_vibration_off(&self) -> bool {
        !self.is_vibration_enabled
    }
    pub fn is_fixed_volume(&self) -> bool {
        !self.is_gradual_volume
    }
}

// ── AlarmGroupRow ──

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct AlarmGroupRow {
    pub alarm_group_id: String,
    pub name: String,
    pub color: String,
    pub position: i32,
    pub is_enabled: bool,
}

impl AlarmGroupRow {
    pub fn from_row(row: &rusqlite::Row) -> rusqlite::Result<Self> {
        Ok(Self {
            alarm_group_id: row.get("AlarmGroupId")?,
            name: row.get("Name")?,
            color: row.get("Color")?,
            position: row.get("Position")?,
            is_enabled: row.get::<_, i32>("IsEnabled")? != 0,
        })
    }
}

// ── SnoozeStateRow ──

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct SnoozeStateRow {
    pub alarm_id: String,
    pub snooze_until: String,
    pub snooze_count: i32,
}

impl SnoozeStateRow {
    pub fn from_row(row: &rusqlite::Row) -> rusqlite::Result<Self> {
        Ok(Self {
            alarm_id: row.get("AlarmId")?,
            snooze_until: row.get("SnoozeUntil")?,
            snooze_count: row.get("SnoozeCount")?,
        })
    }
}

// ── AlarmEventRow ──

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct AlarmEventRow {
    pub alarm_event_id: String,
    pub alarm_id: String,
    pub r#type: AlarmEventType,
    pub fired_at: String,
    pub dismissed_at: Option<String>,
    pub snooze_count: i32,
    pub challenge_type: Option<ChallengeType>,
    pub challenge_solve_time_sec: Option<f64>,
    pub sleep_quality: Option<i32>,
    pub mood: Option<String>,
    pub alarm_label_snapshot: String,
    pub alarm_time_snapshot: String,
    pub timestamp: String,
}

impl AlarmEventRow {
    pub fn from_row(row: &rusqlite::Row) -> rusqlite::Result<Self> {
        Ok(Self {
            alarm_event_id: row.get("AlarmEventId")?,
            alarm_id: row.get("AlarmId")?,
            r#type: row
                .get::<_, String>("Type")?
                .parse()
                .unwrap_or(AlarmEventType::Fired),
            fired_at: row.get("FiredAt")?,
            dismissed_at: row.get("DismissedAt")?,
            snooze_count: row.get("SnoozeCount")?,
            challenge_type: row
                .get::<_, Option<String>>("ChallengeType")?
                .and_then(|s| s.parse().ok()),
            challenge_solve_time_sec: row.get("ChallengeSolveTimeSec")?,
            sleep_quality: row.get("SleepQuality")?,
            mood: row.get("Mood")?,
            alarm_label_snapshot: row.get("AlarmLabelSnapshot")?,
            alarm_time_snapshot: row.get("AlarmTimeSnapshot")?,
            timestamp: row.get("Timestamp")?,
        })
    }
}

// ── AlarmSound (in-memory, no DB table) ──

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct AlarmSound {
    pub alarm_sound_id: String,
    pub name: String,
    pub file_name: String,
    pub category: SoundCategory,
}

// ── Quote ──

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct Quote {
    pub quote_id: String,
    pub text: String,
    pub author: String,
    pub is_favorite: bool,
    pub is_custom: bool,
    pub created_at: String,
}

impl Quote {
    pub fn from_row(row: &rusqlite::Row) -> rusqlite::Result<Self> {
        Ok(Self {
            quote_id: row.get("QuoteId")?,
            text: row.get("Text")?,
            author: row.get("Author")?,
            is_favorite: row.get::<_, i32>("IsFavorite")? != 0,
            is_custom: row.get::<_, i32>("IsCustom")? != 0,
            created_at: row.get("CreatedAt")?,
        })
    }

    pub fn is_not_favorite(&self) -> bool {
        !self.is_favorite
    }
    pub fn is_built_in(&self) -> bool {
        !self.is_custom
    }
}

// ── StreakData ──

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct StreakData {
    pub current_streak: u32,
    pub longest_streak: u32,
    pub calendar_days: Vec<String>,
}

// ── StreakCalendarDay ──

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct StreakCalendarDay {
    pub date: String,
    pub is_on_time: bool,
}

impl StreakCalendarDay {
    pub fn is_late(&self) -> bool {
        !self.is_on_time
    }
}

// ── SettingsResponse ──

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct SettingsResponse {
    pub theme: ThemeMode,
    pub theme_skin: String,
    pub accent_color: String,
    pub is_24_hour: bool,
    pub default_snooze_duration_min: i32,
    pub default_max_snooze_count: i32,
    pub auto_dismiss_min: i32,
    pub event_retention_days: i32,
    pub is_gradual_volume_enabled: bool,
    pub gradual_volume_duration_sec: i32,
    pub auto_launch: bool,
    pub minimize_to_tray: bool,
    pub language: String,
    pub default_sound: String,
    pub export_warning_dismissed: bool,
    pub system_timezone: String,
}

impl Default for SettingsResponse {
    fn default() -> Self {
        Self {
            theme: ThemeMode::System,
            theme_skin: "default".to_string(),
            accent_color: "#8b7355".to_string(),
            is_24_hour: false,
            default_snooze_duration_min: 5,
            default_max_snooze_count: 3,
            auto_dismiss_min: 15,
            event_retention_days: 90,
            is_gradual_volume_enabled: false,
            gradual_volume_duration_sec: 30,
            auto_launch: false,
            minimize_to_tray: true,
            language: "en".to_string(),
            default_sound: "classic-beep".to_string(),
            export_warning_dismissed: false,
            system_timezone: String::new(),
        }
    }
}

impl SettingsResponse {
    pub fn apply_setting(&mut self, key: &str, value: &str) {
        match key {
            "Theme" => self.theme = value.parse().unwrap_or(ThemeMode::System),
            "ThemeSkin" => self.theme_skin = value.to_string(),
            "AccentColor" => self.accent_color = value.to_string(),
            "TimeFormat" => self.is_24_hour = value == "24h",
            "DefaultSnoozeDuration" => {
                self.default_snooze_duration_min = value.parse().unwrap_or(5);
            }
            "DefaultMaxSnoozeCount" => {
                self.default_max_snooze_count = value.parse().unwrap_or(3);
            }
            "AutoDismissMin" => {
                self.auto_dismiss_min = value.parse().unwrap_or(15);
            }
            "EventRetentionDays" => {
                self.event_retention_days = value.parse().unwrap_or(90);
            }
            "IsGradualVolumeEnabled" => {
                self.is_gradual_volume_enabled = value == "true";
            }
            "GradualVolumeDurationSec" => {
                self.gradual_volume_duration_sec = value.parse().unwrap_or(30);
            }
            "AutoLaunch" => self.auto_launch = value == "true",
            "MinimizeToTray" => self.minimize_to_tray = value == "true",
            "Language" => self.language = value.to_string(),
            "DefaultSound" => self.default_sound = value.to_string(),
            "ExportWarningDismissed" => {
                self.export_warning_dismissed = value == "true";
            }
            "SystemTimezone" => self.system_timezone = value.to_string(),
            _ => {
                tracing::debug!(key = key, "Unknown settings key");
            }
        }
    }
}
