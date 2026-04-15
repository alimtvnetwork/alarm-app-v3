/**
 * Mock IPC Layer — Simulates Tauri IPC commands using IndexedDB.
 * Mirrors the command signatures from spec/15-alarm-app/01-fundamentals/01-data-model.md.
 * Schema matches V1__initial_schema.sql (7 object stores).
 * When migrating to Tauri, replace this with real `invoke()` calls.
 */

import type { Alarm, AlarmGroup, AlarmEvent, AlarmSound, Settings, SnoozeState } from "@/types/alarm";
import { DEFAULT_SETTINGS } from "@/types/alarm";
import { normalizeAlarmTimezone } from "@/lib/alarm-timezone";
import { getDB } from "@/lib/indexed-db";
import { runTransaction } from "@/lib/db-transactions";
import { MOCK_SOUNDS } from "@/test/fixtures";

// ─── Settings Helpers ────────────────────────────────────────────

function settingsRowsToObj(rows: Array<{ Key: string; Value: string; ValueType: string }>): Settings {
  const s = { ...DEFAULT_SETTINGS };
  for (const { Key, Value } of rows) {
    switch (Key) {
      case "Theme": s.Theme = Value as Settings["Theme"]; break;
      case "ThemeSkin": s.ThemeSkin = Value; break;
      case "AccentColor": s.AccentColor = Value; break;
      case "TimeFormat": s.Is24Hour = Value === "24h"; break;
      case "DefaultSnoozeDuration": s.DefaultSnoozeDurationMin = Number(Value); break;
      case "DefaultMaxSnoozeCount": s.DefaultMaxSnoozeCount = Number(Value); break;
      case "DefaultSound": s.DefaultSound = Value; break;
      case "AutoDismissMin": s.AutoDismissMin = Number(Value); break;
      case "AutoLaunch": s.AutoLaunch = Value === "true"; break;
      case "MinimizeToTray": s.MinimizeToTray = Value === "true"; break;
      case "Language": s.Language = Value; break;
      case "EventRetentionDays": s.EventRetentionDays = Number(Value); break;
      case "IsGradualVolumeEnabled": s.IsGradualVolumeEnabled = Value === "true"; break;
      case "GradualVolumeDurationSec": s.GradualVolumeDurationSec = Number(Value); break;
      case "SystemTimezone": s.SystemTimezone = Value; break;
      case "ExportWarningDismissed": s.ExportWarningDismissed = Value === "true"; break;
      case "BedtimeEnabled": s.BedtimeEnabled = Value === "true"; break;
      case "BedtimeTime": s.BedtimeTime = Value; break;
      case "BedtimeReminderMinBefore": s.BedtimeReminderMinBefore = Number(Value); break;
      case "SleepGoalHours": s.SleepGoalHours = Number(Value); break;
    }
  }
  return s;
}

function settingsObjToRows(s: Settings): Array<{ Key: string; Value: string; ValueType: string }> {
  return [
    { Key: "Theme", Value: String(s.Theme), ValueType: "String" },
    { Key: "ThemeSkin", Value: s.ThemeSkin, ValueType: "String" },
    { Key: "AccentColor", Value: s.AccentColor, ValueType: "String" },
    { Key: "TimeFormat", Value: s.Is24Hour ? "24h" : "12h", ValueType: "String" },
    { Key: "DefaultSnoozeDuration", Value: String(s.DefaultSnoozeDurationMin), ValueType: "Integer" },
    { Key: "DefaultMaxSnoozeCount", Value: String(s.DefaultMaxSnoozeCount), ValueType: "Integer" },
    { Key: "DefaultSound", Value: s.DefaultSound, ValueType: "String" },
    { Key: "AutoDismissMin", Value: String(s.AutoDismissMin), ValueType: "Integer" },
    { Key: "AutoLaunch", Value: String(s.AutoLaunch), ValueType: "Boolean" },
    { Key: "MinimizeToTray", Value: String(s.MinimizeToTray), ValueType: "Boolean" },
    { Key: "Language", Value: s.Language, ValueType: "String" },
    { Key: "EventRetentionDays", Value: String(s.EventRetentionDays), ValueType: "Integer" },
    { Key: "IsGradualVolumeEnabled", Value: String(s.IsGradualVolumeEnabled), ValueType: "Boolean" },
    { Key: "GradualVolumeDurationSec", Value: String(s.GradualVolumeDurationSec), ValueType: "Integer" },
    { Key: "SystemTimezone", Value: s.SystemTimezone, ValueType: "String" },
    { Key: "ExportWarningDismissed", Value: String(s.ExportWarningDismissed), ValueType: "Boolean" },
    { Key: "BedtimeEnabled", Value: String(s.BedtimeEnabled), ValueType: "Boolean" },
    { Key: "BedtimeTime", Value: s.BedtimeTime, ValueType: "String" },
    { Key: "BedtimeReminderMinBefore", Value: String(s.BedtimeReminderMinBefore), ValueType: "Integer" },
    { Key: "SleepGoalHours", Value: String(s.SleepGoalHours), ValueType: "Integer" },
  ];
}

// ─── Seed Defaults ───────────────────────────────────────────────

async function seedIfEmpty(): Promise<void> {
  const db = await getDB();

  // Seed settings if empty
  const existingSettings = await db.getAll("Settings");
  if (existingSettings.length === 0) {
    await runTransaction(["Settings"], async (tx) => {
      const rows = settingsObjToRows(DEFAULT_SETTINGS);
      for (const row of rows) {
        await tx.objectStore("Settings").put(row);
      }
    });
  }

  // Seed sample data if no alarms exist
  const existingAlarms = await db.getAll("Alarms");
  if (existingAlarms.length === 0) {
    const { MOCK_ALARMS, MOCK_GROUPS, MOCK_EVENTS } = await import("@/test/fixtures");
    await runTransaction(["Alarms", "AlarmGroups", "AlarmEvents"], async (tx) => {
      for (const alarm of MOCK_ALARMS) {
        await tx.objectStore("Alarms").put(alarm as unknown as Record<string, unknown>);
      }
      for (const group of MOCK_GROUPS) {
        await tx.objectStore("AlarmGroups").put(group as unknown as Record<string, unknown>);
      }
      for (const event of MOCK_EVENTS) {
        await tx.objectStore("AlarmEvents").put(event as unknown as Record<string, unknown>);
      }
    });
  }
}

// ─── Initialize ──────────────────────────────────────────────────

let initPromise: Promise<void> | null = null;

export function ensureInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      // Run localStorage → IDB migration first
      const { migrateLocalStorageToIDB } = await import("@/lib/db-migration");
      await migrateLocalStorageToIDB();
      await seedIfEmpty();
      // Purge expired events based on EventRetentionDays setting
      const { purgeExpiredEvents } = await import("@/lib/db-transactions");
      const purged = await purgeExpiredEvents();
      if (purged > 0) {
        console.info(`[AlarmApp] Purged ${purged} expired event(s)`);
      }
    })();
  }
  return initPromise;
}

// Auto-init on import
ensureInitialized();

// ─── Alarm Commands ──────────────────────────────────────────────

export async function listAlarms(): Promise<Alarm[]> {
  await ensureInitialized();
  const db = await getDB();
  const all = await db.getAll("Alarms");
  return (all as unknown as Alarm[]).filter((a) => a.DeletedAt === null);
}

export async function getAlarm(alarmId: string): Promise<Alarm | null> {
  await ensureInitialized();
  const db = await getDB();
  const alarm = await db.get("Alarms", alarmId);
  return (alarm as unknown as Alarm) ?? null;
}

export async function createAlarm(alarm: Alarm): Promise<Alarm> {
  await ensureInitialized();
  const db = await getDB();
  await db.put("Alarms", alarm as unknown as Record<string, unknown>);
  return alarm;
}

export async function updateAlarm(alarm: Alarm): Promise<Alarm> {
  await ensureInitialized();
  const db = await getDB();
  const updated = { ...alarm, UpdatedAt: new Date().toISOString() };
  await db.put("Alarms", updated as unknown as Record<string, unknown>);
  return updated;
}

export async function deleteAlarm(alarmId: string): Promise<void> {
  await ensureInitialized();
  const db = await getDB();
  const alarm = await db.get("Alarms", alarmId);
  if (alarm) {
    const now = new Date().toISOString();
    await db.put("Alarms", {
      ...alarm,
      DeletedAt: now,
      UpdatedAt: now,
    });
  }
}

export async function toggleAlarm(alarmId: string, isEnabled: boolean): Promise<Alarm | null> {
  await ensureInitialized();
  const db = await getDB();
  const alarm = await db.get("Alarms", alarmId);
  if (!alarm) return null;
  const updated = {
    ...alarm,
    IsEnabled: isEnabled,
    UpdatedAt: new Date().toISOString(),
  };
  await db.put("Alarms", updated);
  return updated as unknown as Alarm;
}

export async function reorderAlarms(alarmIds: string[]): Promise<void> {
  await ensureInitialized();
  const db = await getDB();
  const tx = db.transaction("Alarms", "readwrite");
  for (let i = 0; i < alarmIds.length; i++) {
    const alarm = await tx.store.get(alarmIds[i]);
    if (alarm) {
      await tx.store.put({ ...alarm, Position: i });
    }
  }
  await tx.done;
}

// ─── Group Commands ──────────────────────────────────────────────

export async function listGroups(): Promise<AlarmGroup[]> {
  await ensureInitialized();
  const db = await getDB();
  return (await db.getAll("AlarmGroups")) as unknown as AlarmGroup[];
}

export async function createGroup(group: AlarmGroup): Promise<AlarmGroup> {
  await ensureInitialized();
  const db = await getDB();
  await db.put("AlarmGroups", group as unknown as Record<string, unknown>);
  return group;
}

export async function updateGroup(group: AlarmGroup): Promise<AlarmGroup> {
  await ensureInitialized();
  const db = await getDB();
  await db.put("AlarmGroups", group as unknown as Record<string, unknown>);
  return group;
}

export async function deleteGroup(groupId: string): Promise<void> {
  await ensureInitialized();
  const db = await getDB();
  await db.delete("AlarmGroups", groupId);
  // Unassign alarms from deleted group
  const tx = db.transaction("Alarms", "readwrite");
  const allAlarms = await tx.store.getAll();
  for (const alarm of allAlarms) {
    if ((alarm as unknown as Alarm).GroupId === groupId) {
      await tx.store.put({
        ...alarm,
        GroupId: null,
        UpdatedAt: new Date().toISOString(),
      });
    }
  }
  await tx.done;
}

// ─── Settings Commands ───────────────────────────────────────────

export async function getSettings(): Promise<Settings> {
  await ensureInitialized();
  const db = await getDB();
  const rows = await db.getAll("Settings");
  const settings = settingsRowsToObj(rows);
  return {
    ...settings,
    SystemTimezone: normalizeAlarmTimezone(settings.SystemTimezone),
  };
}

export async function updateSettings(partial: Partial<Settings>): Promise<Settings> {
  await ensureInitialized();
  const current = await getSettings();
  const updated = { ...current, ...partial };
  updated.SystemTimezone = normalizeAlarmTimezone(updated.SystemTimezone);
  const db = await getDB();
  const rows = settingsObjToRows(updated);
  const tx = db.transaction("Settings", "readwrite");
  for (const row of rows) {
    await tx.store.put(row);
  }
  await tx.done;
  return updated;
}

// ─── Sound Commands ──────────────────────────────────────────────

export function listSounds(): AlarmSound[] {
  return MOCK_SOUNDS;
}

// ─── Snooze Commands ─────────────────────────────────────────────

export async function getSnoozeState(alarmId: string): Promise<SnoozeState | null> {
  await ensureInitialized();
  const db = await getDB();
  const state = await db.get("SnoozeState", alarmId);
  return (state as unknown as SnoozeState) ?? null;
}

export async function snoozeAlarm(alarmId: string, durationMin: number): Promise<SnoozeState> {
  await ensureInitialized();
  const db = await getDB();
  const existing = await db.get("SnoozeState", alarmId);
  const snoozeUntil = new Date(Date.now() + durationMin * 60 * 1000).toISOString();

  const newState: SnoozeState = {
    AlarmId: alarmId,
    SnoozeUntil: snoozeUntil,
    SnoozeCount: existing ? (existing as unknown as SnoozeState).SnoozeCount + 1 : 1,
  };

  await db.put("SnoozeState", newState as unknown as Record<string, unknown>);
  return newState;
}

export async function clearSnooze(alarmId: string): Promise<void> {
  await ensureInitialized();
  const db = await getDB();
  await db.delete("SnoozeState", alarmId);
}

// ─── Event Commands ──────────────────────────────────────────────

export async function listAlarmEvents(): Promise<AlarmEvent[]> {
  await ensureInitialized();
  const db = await getDB();
  const all = await db.getAll("AlarmEvents");
  return (all as unknown as AlarmEvent[]).sort(
    (a, b) => new Date(b.Timestamp).getTime() - new Date(a.Timestamp).getTime()
  );
}

export async function createAlarmEvent(event: AlarmEvent): Promise<AlarmEvent> {
  await ensureInitialized();
  const db = await getDB();
  await db.put("AlarmEvents", event as unknown as Record<string, unknown>);
  return event;
}

// ─── Reset (dev utility) ────────────────────────────────────────

export async function resetAllData(): Promise<void> {
  const { deleteDB } = await import("@/lib/indexed-db");
  await deleteDB();
  initPromise = null;
  // Remove migration flag so seed runs fresh
  localStorage.removeItem("alarm_app_idb_migrated");
  await ensureInitialized();
}
