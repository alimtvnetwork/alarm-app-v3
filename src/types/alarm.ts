/**
 * Alarm App — Domain Types
 * Source of truth: spec/15-alarm-app/01-fundamentals/01-data-model.md v1.16.0
 * All enums use PascalCase values matching Rust serde serialization.
 */

// ─── Domain Enums ────────────────────────────────────────────────

export enum RepeatType {
  Once = "Once",
  Daily = "Daily",
  Weekly = "Weekly",
  Interval = "Interval",
  Cron = "Cron",
}

export enum ChallengeType {
  Math = "Math",
  Memory = "Memory",
  Shake = "Shake",
  Typing = "Typing",
  Qr = "Qr",
  Steps = "Steps",
}

export enum ChallengeDifficulty {
  Easy = "Easy",
  Medium = "Medium",
  Hard = "Hard",
}

export enum AlarmEventType {
  Fired = "Fired",
  Snoozed = "Snoozed",
  Dismissed = "Dismissed",
  Missed = "Missed",
}

export enum SoundCategory {
  Classic = "Classic",
  Gentle = "Gentle",
  Nature = "Nature",
  Digital = "Digital",
}

export enum SettingsValueType {
  String = "String",
  Integer = "Integer",
  Boolean = "Boolean",
  Json = "Json",
}

export enum ThemeMode {
  Light = "Light",
  Dark = "Dark",
  System = "System",
}

export enum ExportFormat {
  Json = "Json",
  Csv = "Csv",
  Ics = "Ics",
}

export enum ExportScope {
  All = "All",
  Selected = "Selected",
}

export enum DuplicateAction {
  Skip = "Skip",
  Overwrite = "Overwrite",
  Rename = "Rename",
}

export enum ImportMode {
  Merge = "Merge",
  Replace = "Replace",
}

export enum SortField {
  Date = "Date",
  Label = "Label",
  SnoozeCount = "SnoozeCount",
}

export enum SortOrder {
  Asc = "Asc",
  Desc = "Desc",
}

// ─── Interfaces ──────────────────────────────────────────────────

export interface RepeatPattern {
  Type: RepeatType;
  DaysOfWeek: number[];       // 0=Sun..6=Sat (for Weekly)
  IntervalMinutes: number;    // For Interval
  CronExpression: string;     // For Cron (croner v2.0)
}

export interface Alarm {
  AlarmId: string;
  Time: string;                              // "HH:MM" 24-hour
  Date: string | null;                       // "YYYY-MM-DD" or null
  Label: string;
  IsEnabled: boolean;
  IsPreviousEnabled: boolean | null;
  Repeat: RepeatPattern;
  GroupId: string | null;
  SnoozeDurationMin: number;                 // 1–30, default 5
  MaxSnoozeCount: number;                    // 0–10, default 3
  SoundFile: string;
  IsVibrationEnabled: boolean;
  IsGradualVolume: boolean;
  GradualVolumeDurationSec: number;          // 15 | 30 | 60
  AutoDismissMin: number;                    // 0 = manual
  ChallengeType: ChallengeType | null;
  ChallengeDifficulty: ChallengeDifficulty | null;
  ChallengeShakeCount: number | null;
  ChallengeStepCount: number | null;
  NextFireTime: string | null;               // ISO 8601
  Position: number;                          // 0-based sort order
  DeletedAt: string | null;                  // ISO 8601 soft-delete
  CreatedAt: string;
  UpdatedAt: string;
}

export interface AlarmGroup {
  AlarmGroupId: string;
  Name: string;               // max 50 chars
  Color: string;              // hex e.g. "#FF5733"
  Position: number;           // 0-based sort order
  IsEnabled: boolean;
}

export interface SnoozeState {
  AlarmId: string;
  SnoozeUntil: string;        // ISO 8601
  SnoozeCount: number;        // 1-based
}

export interface AlarmSound {
  AlarmSoundId: string;
  Name: string;
  FileName: string;
  Category: SoundCategory;
}

export interface AlarmEvent {
  AlarmEventId: string;
  AlarmId: string;
  Type: AlarmEventType;
  FiredAt: string;
  DismissedAt: string | null;
  SnoozeCount: number;
  ChallengeType: ChallengeType | null;
  ChallengeSolveTimeSec: number | null;
  SleepQuality: number | null;              // 1–5
  Mood: string | null;
  AlarmLabelSnapshot: string;
  AlarmTimeSnapshot: string;
  Timestamp: string;
}

export interface Settings {
  Theme: ThemeMode;
  ThemeSkin: string;
  AccentColor: string;
  Is24Hour: boolean;                         // Derived from TimeFormat
  DefaultSnoozeDurationMin: number;
  DefaultMaxSnoozeCount: number;
  AutoDismissMin: number;
  EventRetentionDays: number;
  IsGradualVolumeEnabled: boolean;
  GradualVolumeDurationSec: number;
  AutoLaunch: boolean;
  MinimizeToTray: boolean;
  Language: string;
  DefaultSound: string;
  ExportWarningDismissed: boolean;
  SystemTimezone: string;
  BedtimeEnabled: boolean;
  BedtimeTime: string;              // "HH:MM" 24h
  BedtimeReminderMinBefore: number; // minutes before bedtime
  SleepGoalHours: number;           // target sleep hours
}

export interface Quote {
  QuoteId: string;
  Text: string;
  Author: string;
  IsFavorite: boolean;
  IsCustom: boolean;
  CreatedAt: string;
}

export interface StreakData {
  CurrentStreak: number;
  LongestStreak: number;
  CalendarDays: string[];    // ISO date strings
}

export interface StreakCalendarDay {
  Date: string;              // YYYY-MM-DD
  IsOnTime: boolean;
}

// ─── IPC Error Response ──────────────────────────────────────────

export interface IpcErrorResponse {
  Message: string;
  Code: string;
}

// ─── Overlay State ───────────────────────────────────────────────

export interface OverlayState {
  IsVisible: boolean;
  FiringAlarm: Alarm | null;
  SnoozeState: SnoozeState | null;
}

// ─── Default Factories ───────────────────────────────────────────

export const DEFAULT_REPEAT_PATTERN: RepeatPattern = {
  Type: RepeatType.Once,
  DaysOfWeek: [],
  IntervalMinutes: 0,
  CronExpression: "",
};

export const DEFAULT_SETTINGS: Settings = {
  Theme: ThemeMode.System,
  ThemeSkin: "vscode",
  AccentColor: "#8b7355",
  Is24Hour: false,
  DefaultSnoozeDurationMin: 5,
  DefaultMaxSnoozeCount: 3,
  AutoDismissMin: 15,
  EventRetentionDays: 90,
  IsGradualVolumeEnabled: false,
  GradualVolumeDurationSec: 30,
  AutoLaunch: false,
  MinimizeToTray: true,
  Language: "en",
  DefaultSound: "classic-beep",
  ExportWarningDismissed: false,
  SystemTimezone: "Asia/Kuala_Lumpur",
  BedtimeEnabled: false,
  BedtimeTime: "22:30",
  BedtimeReminderMinBefore: 30,
  SleepGoalHours: 8,
};
