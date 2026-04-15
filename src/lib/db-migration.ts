/**
 * One-time migration: localStorage → IndexedDB.
 * Transfers all existing alarm app data, then marks migration complete.
 */

import { getDB } from "@/lib/indexed-db";
import type { Alarm, AlarmGroup, AlarmEvent, Settings, SnoozeState } from "@/types/alarm";
import { DEFAULT_SETTINGS } from "@/types/alarm";

const MIGRATION_FLAG = "alarm_app_idb_migrated";

const LS_KEYS = {
  ALARMS: "alarm_app_alarms",
  GROUPS: "alarm_app_groups",
  SETTINGS: "alarm_app_settings",
  EVENTS: "alarm_app_events",
  SNOOZE: "alarm_app_snooze",
} as const;

function loadLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Convert a Settings object to key-value rows for the Settings store. */
function settingsToRows(s: Settings): Array<{ Key: string; Value: string; ValueType: string }> {
  const mapping: Record<string, { value: string; type: string }> = {
    Theme: { value: String(s.Theme), type: "String" },
    ThemeSkin: { value: s.ThemeSkin, type: "String" },
    AccentColor: { value: s.AccentColor, type: "String" },
    TimeFormat: { value: s.Is24Hour ? "24h" : "12h", type: "String" },
    DefaultSnoozeDuration: { value: String(s.DefaultSnoozeDurationMin), type: "Integer" },
    DefaultMaxSnoozeCount: { value: String(s.DefaultMaxSnoozeCount), type: "Integer" },
    DefaultSound: { value: s.DefaultSound, type: "String" },
    AutoDismissMin: { value: String(s.AutoDismissMin), type: "Integer" },
    AutoLaunch: { value: String(s.AutoLaunch), type: "Boolean" },
    MinimizeToTray: { value: String(s.MinimizeToTray), type: "Boolean" },
    Language: { value: s.Language, type: "String" },
    EventRetentionDays: { value: String(s.EventRetentionDays), type: "Integer" },
    IsGradualVolumeEnabled: { value: String(s.IsGradualVolumeEnabled), type: "Boolean" },
    GradualVolumeDurationSec: { value: String(s.GradualVolumeDurationSec), type: "Integer" },
    SystemTimezone: { value: s.SystemTimezone, type: "String" },
    ExportWarningDismissed: { value: String(s.ExportWarningDismissed), type: "Boolean" },
    BedtimeEnabled: { value: String(s.BedtimeEnabled), type: "Boolean" },
    BedtimeTime: { value: s.BedtimeTime, type: "String" },
    BedtimeReminderMinBefore: { value: String(s.BedtimeReminderMinBefore), type: "Integer" },
    SleepGoalHours: { value: String(s.SleepGoalHours), type: "Integer" },
  };

  return Object.entries(mapping).map(([key, { value, type }]) => ({
    Key: key,
    Value: value,
    ValueType: type,
  }));
}

export async function migrateLocalStorageToIDB(): Promise<void> {
  // Skip if already migrated or no localStorage data exists
  if (localStorage.getItem(MIGRATION_FLAG) === "true") return;

  const hasData = Object.values(LS_KEYS).some((k) => localStorage.getItem(k) !== null);
  if (!hasData) {
    localStorage.setItem(MIGRATION_FLAG, "true");
    return;
  }

  const db = await getDB();
  const tx = db.transaction(
    ["Alarms", "AlarmGroups", "Settings", "AlarmEvents", "SnoozeState"],
    "readwrite"
  );

  // Migrate alarms
  const alarms = loadLS<Alarm[]>(LS_KEYS.ALARMS, []);
  for (const alarm of alarms) {
    await tx.objectStore("Alarms").put(alarm as unknown as Record<string, unknown>);
  }

  // Migrate groups
  const groups = loadLS<AlarmGroup[]>(LS_KEYS.GROUPS, []);
  for (const group of groups) {
    await tx.objectStore("AlarmGroups").put(group as unknown as Record<string, unknown>);
  }

  // Migrate settings
  const settings = loadLS<Settings>(LS_KEYS.SETTINGS, DEFAULT_SETTINGS);
  const rows = settingsToRows(settings);
  for (const row of rows) {
    await tx.objectStore("Settings").put(row);
  }

  // Migrate events
  const events = loadLS<AlarmEvent[]>(LS_KEYS.EVENTS, []);
  for (const event of events) {
    await tx.objectStore("AlarmEvents").put(event as unknown as Record<string, unknown>);
  }

  // Migrate snooze states
  const snoozes = loadLS<SnoozeState[]>(LS_KEYS.SNOOZE, []);
  for (const snooze of snoozes) {
    await tx.objectStore("SnoozeState").put(snooze as unknown as Record<string, unknown>);
  }

  await tx.done;

  localStorage.setItem(MIGRATION_FLAG, "true");
  console.info("[DB Migration] localStorage → IndexedDB complete");
}
