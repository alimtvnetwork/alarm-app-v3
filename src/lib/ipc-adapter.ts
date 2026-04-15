/**
 * IPC Adapter — Unified interface that delegates to mock-ipc (web) or tauri-commands (native).
 * All methods are async. Stores call this instead of mock-ipc or tauri-commands directly.
 */

import type { Alarm, AlarmGroup, AlarmEvent, AlarmSound, Settings, SnoozeState } from "@/types/alarm";
import { DEFAULT_SETTINGS } from "@/types/alarm";

const IS_TAURI = typeof window !== "undefined" && "__TAURI__" in window;

// ─── Lazy imports ────────────────────────────────────────────────

async function getMock() {
  return import("@/lib/mock-ipc");
}

async function getTauri() {
  return import("@/lib/tauri-commands");
}

// ─── Alarm Commands ──────────────────────────────────────────────

export async function listAlarms(): Promise<Alarm[]> {
  if (!IS_TAURI) {
    const mock = await getMock();
    return await mock.listAlarms();
  }
  return (await getTauri()).listAlarms();
}

export async function getAlarm(alarmId: string): Promise<Alarm | null> {
  if (!IS_TAURI) {
    const mock = await getMock();
    return await mock.getAlarm(alarmId);
  }
  const alarms = await listAlarms();
  return alarms.find((a) => a.AlarmId === alarmId) ?? null;
}

export async function createAlarm(alarm: Partial<Alarm>): Promise<Alarm | null> {
  if (!IS_TAURI) {
    const mock = await getMock();
    return await mock.createAlarm(alarm as Alarm);
  }
  return (await getTauri()).createAlarm(alarm);
}

export async function updateAlarm(alarm: Alarm): Promise<Alarm | null> {
  if (!IS_TAURI) {
    const mock = await getMock();
    return await mock.updateAlarm(alarm);
  }
  return (await getTauri()).updateAlarm(alarm);
}

export async function deleteAlarm(alarmId: string): Promise<{ UndoToken: string } | null> {
  if (!IS_TAURI) {
    const mock = await getMock();
    await mock.deleteAlarm(alarmId);
    return { UndoToken: alarmId };
  }
  return (await getTauri()).deleteAlarm(alarmId);
}

export async function undoDeleteAlarm(undoToken: string): Promise<Alarm | null> {
  if (!IS_TAURI) {
    const mock = await getMock();
    const alarm = await mock.getAlarm(undoToken);
    if (alarm) {
      return await mock.updateAlarm({ ...alarm, DeletedAt: null });
    }
    return null;
  }
  return (await getTauri()).undoDeleteAlarm(undoToken);
}

export async function toggleAlarm(alarmId: string, isEnabled?: boolean): Promise<Alarm | null> {
  if (!IS_TAURI) {
    const mock = await getMock();
    const alarm = await mock.getAlarm(alarmId);
    if (!alarm) return null;
    const newEnabled = isEnabled !== undefined ? isEnabled : !alarm.IsEnabled;
    return await mock.toggleAlarm(alarmId, newEnabled);
  }
  return (await getTauri()).toggleAlarm(alarmId);
}

export async function duplicateAlarm(alarmId: string): Promise<Alarm | null> {
  if (!IS_TAURI) {
    const mock = await getMock();
    const existing = await mock.getAlarm(alarmId);
    if (!existing) return null;
    const now = new Date().toISOString();
    const duplicate: Alarm = {
      ...existing,
      AlarmId: crypto.randomUUID(),
      Label: `${existing.Label} (copy)`,
      CreatedAt: now,
      UpdatedAt: now,
    };
    return await mock.createAlarm(duplicate);
  }
  return (await getTauri()).duplicateAlarm(alarmId);
}

export async function reorderAlarms(alarmIds: string[]): Promise<void> {
  if (!IS_TAURI) {
    const mock = await getMock();
    await mock.reorderAlarms(alarmIds);
    return;
  }
  await (await getTauri()).reorderAlarms(alarmIds);
}

// ─── Group Commands ──────────────────────────────────────────────

export async function listGroups(): Promise<AlarmGroup[]> {
  if (!IS_TAURI) {
    const mock = await getMock();
    return await mock.listGroups();
  }
  return (await getTauri()).listGroups();
}

export async function createGroup(name: string, color: string): Promise<AlarmGroup | null> {
  if (!IS_TAURI) {
    const mock = await getMock();
    const groups = await mock.listGroups();
    const group: AlarmGroup = {
      AlarmGroupId: crypto.randomUUID(),
      Name: name,
      Color: color,
      Position: groups.length,
      IsEnabled: true,
    };
    return await mock.createGroup(group);
  }
  return (await getTauri()).createGroup(name, color);
}

export async function updateGroup(group: AlarmGroup): Promise<AlarmGroup | null> {
  if (!IS_TAURI) {
    const mock = await getMock();
    return await mock.updateGroup(group);
  }
  return (await getTauri()).updateGroup(group);
}

export async function deleteGroup(groupId: string): Promise<void> {
  if (!IS_TAURI) {
    const mock = await getMock();
    await mock.deleteGroup(groupId);
    return;
  }
  await (await getTauri()).deleteGroup(groupId);
}

// ─── Settings Commands ───────────────────────────────────────────

export async function getSettings(): Promise<Settings> {
  if (!IS_TAURI) {
    const mock = await getMock();
    return await mock.getSettings();
  }
  return (await getTauri()).getSettings() ?? DEFAULT_SETTINGS;
}

export async function updateSettings(partial: Partial<Settings>): Promise<Settings> {
  if (!IS_TAURI) {
    const mock = await getMock();
    return await mock.updateSettings(partial);
  }
  const tauri = await getTauri();
  for (const [key, value] of Object.entries(partial)) {
    await tauri.updateSetting(key, String(value));
  }
  return (await tauri.getSettings()) ?? DEFAULT_SETTINGS;
}

// ─── Sound Commands ──────────────────────────────────────────────

export async function listSounds(): Promise<AlarmSound[]> {
  if (!IS_TAURI) {
    const mock = await getMock();
    return mock.listSounds();
  }
  const sounds = await (await getTauri()).listSounds();
  return sounds as unknown as AlarmSound[];
}

// ─── Snooze Commands ─────────────────────────────────────────────

export async function getSnoozeState(alarmId: string): Promise<SnoozeState | null> {
  if (!IS_TAURI) {
    const mock = await getMock();
    return await mock.getSnoozeState(alarmId);
  }
  const states = await (await getTauri()).getSnoozeState();
  return states.find((s) => s.AlarmId === alarmId) ?? null;
}

export async function snoozeAlarm(alarmId: string, durationMin: number): Promise<SnoozeState | null> {
  if (!IS_TAURI) {
    const mock = await getMock();
    return await mock.snoozeAlarm(alarmId, durationMin);
  }
  return (await getTauri()).snoozeAlarm(alarmId, durationMin);
}

export async function clearSnooze(alarmId: string): Promise<void> {
  if (!IS_TAURI) {
    const mock = await getMock();
    await mock.clearSnooze(alarmId);
    return;
  }
  await (await getTauri()).cancelSnooze(alarmId);
}

export async function dismissAlarm(alarmId: string): Promise<void> {
  if (!IS_TAURI) {
    const mock = await getMock();
    await mock.clearSnooze(alarmId);
    return;
  }
  await (await getTauri()).dismissAlarm(alarmId);
}

// ─── Event Commands ──────────────────────────────────────────────

export async function listAlarmEvents(limit?: number, offset?: number): Promise<AlarmEvent[]> {
  if (!IS_TAURI) {
    const mock = await getMock();
    const events = await mock.listAlarmEvents();
    const start = offset ?? 0;
    const end = limit ? start + limit : undefined;
    return events.slice(start, end);
  }
  return (await getTauri()).listAlarmEvents(limit, offset);
}

export async function createAlarmEvent(event: AlarmEvent): Promise<AlarmEvent> {
  if (!IS_TAURI) {
    const mock = await getMock();
    return await mock.createAlarmEvent(event);
  }
  return event;
}

export async function clearHistory(): Promise<void> {
  if (!IS_TAURI) {
    return;
  }
  await (await getTauri()).clearHistory();
}

// ─── Reset ───────────────────────────────────────────────────────

export async function resetAllData(): Promise<void> {
  if (!IS_TAURI) {
    const mock = await getMock();
    await mock.resetAllData();
    return;
  }
}

// ─── Utilities ───────────────────────────────────────────────────

export function isTauri(): boolean {
  return IS_TAURI;
}
