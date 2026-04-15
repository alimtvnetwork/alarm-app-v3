/**
 * IPC Adapter — Unified interface that delegates to mock-ipc (web) or tauri-commands (native).
 * All methods are async. Stores call this instead of mock-ipc or tauri-commands directly.
 * All calls are wrapped with safeInvoke for error capture, timeout, and auto-toast.
 */

import type { Alarm, AlarmGroup, AlarmEvent, AlarmSound, Settings, SnoozeState } from "@/types/alarm";
import { DEFAULT_SETTINGS } from "@/types/alarm";
import { safeInvoke } from "@/stores/error-store";

const IS_TAURI = typeof window !== "undefined" && "__TAURI__" in window;

// ─── Lazy imports ────────────────────────────────────────────────

async function getMock() {
  return import("@/lib/mock-ipc");
}

async function getTauri() {
  return import("@/lib/tauri-commands");
}

// ─── Internal (unwrapped) implementations ────────────────────────

async function _listAlarms(): Promise<Alarm[]> {
  if (!IS_TAURI) {
    const mock = await getMock();
    return await mock.listAlarms();
  }
  return (await getTauri()).listAlarms();
}

async function _getAlarm(alarmId: string): Promise<Alarm | null> {
  if (!IS_TAURI) {
    const mock = await getMock();
    return await mock.getAlarm(alarmId);
  }
  const alarms = await _listAlarms();
  return alarms.find((a) => a.AlarmId === alarmId) ?? null;
}

async function _createAlarm(alarm: Partial<Alarm>): Promise<Alarm | null> {
  if (!IS_TAURI) {
    const mock = await getMock();
    return await mock.createAlarm(alarm as Alarm);
  }
  return (await getTauri()).createAlarm(alarm);
}

async function _updateAlarm(alarm: Alarm): Promise<Alarm | null> {
  if (!IS_TAURI) {
    const mock = await getMock();
    return await mock.updateAlarm(alarm);
  }
  return (await getTauri()).updateAlarm(alarm);
}

async function _deleteAlarm(alarmId: string): Promise<{ UndoToken: string } | null> {
  if (!IS_TAURI) {
    const mock = await getMock();
    await mock.deleteAlarm(alarmId);
    return { UndoToken: alarmId };
  }
  return (await getTauri()).deleteAlarm(alarmId);
}

async function _undoDeleteAlarm(undoToken: string): Promise<Alarm | null> {
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

async function _toggleAlarm(alarmId: string, isEnabled?: boolean): Promise<Alarm | null> {
  if (!IS_TAURI) {
    const mock = await getMock();
    const alarm = await mock.getAlarm(alarmId);
    if (!alarm) return null;
    const newEnabled = isEnabled !== undefined ? isEnabled : !alarm.IsEnabled;
    return await mock.toggleAlarm(alarmId, newEnabled);
  }
  return (await getTauri()).toggleAlarm(alarmId);
}

async function _duplicateAlarm(alarmId: string): Promise<Alarm | null> {
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

async function _reorderAlarms(alarmIds: string[]): Promise<void> {
  if (!IS_TAURI) {
    const mock = await getMock();
    await mock.reorderAlarms(alarmIds);
    return;
  }
  await (await getTauri()).reorderAlarms(alarmIds);
}

async function _listGroups(): Promise<AlarmGroup[]> {
  if (!IS_TAURI) {
    const mock = await getMock();
    return await mock.listGroups();
  }
  return (await getTauri()).listGroups();
}

async function _createGroup(name: string, color: string): Promise<AlarmGroup | null> {
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

async function _updateGroup(group: AlarmGroup): Promise<AlarmGroup | null> {
  if (!IS_TAURI) {
    const mock = await getMock();
    return await mock.updateGroup(group);
  }
  return (await getTauri()).updateGroup(group);
}

async function _deleteGroup(groupId: string): Promise<void> {
  if (!IS_TAURI) {
    const mock = await getMock();
    await mock.deleteGroup(groupId);
    return;
  }
  await (await getTauri()).deleteGroup(groupId);
}

async function _getSettings(): Promise<Settings> {
  if (!IS_TAURI) {
    const mock = await getMock();
    return await mock.getSettings();
  }
  return (await getTauri()).getSettings() ?? DEFAULT_SETTINGS;
}

async function _updateSettings(partial: Partial<Settings>): Promise<Settings> {
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

async function _listSounds(): Promise<AlarmSound[]> {
  if (!IS_TAURI) {
    const mock = await getMock();
    return mock.listSounds();
  }
  const sounds = await (await getTauri()).listSounds();
  return sounds as unknown as AlarmSound[];
}

async function _getSnoozeState(alarmId: string): Promise<SnoozeState | null> {
  if (!IS_TAURI) {
    const mock = await getMock();
    return await mock.getSnoozeState(alarmId);
  }
  const states = await (await getTauri()).getSnoozeState();
  return states.find((s) => s.AlarmId === alarmId) ?? null;
}

async function _snoozeAlarm(alarmId: string, durationMin: number): Promise<SnoozeState | null> {
  if (!IS_TAURI) {
    const mock = await getMock();
    return await mock.snoozeAlarm(alarmId, durationMin);
  }
  return (await getTauri()).snoozeAlarm(alarmId, durationMin);
}

async function _clearSnooze(alarmId: string): Promise<void> {
  if (!IS_TAURI) {
    const mock = await getMock();
    await mock.clearSnooze(alarmId);
    return;
  }
  await (await getTauri()).cancelSnooze(alarmId);
}

async function _dismissAlarm(alarmId: string): Promise<void> {
  if (!IS_TAURI) {
    const mock = await getMock();
    await mock.clearSnooze(alarmId);
    return;
  }
  await (await getTauri()).dismissAlarm(alarmId);
}

async function _listAlarmEvents(limit?: number, offset?: number): Promise<AlarmEvent[]> {
  if (!IS_TAURI) {
    const mock = await getMock();
    const events = await mock.listAlarmEvents();
    const start = offset ?? 0;
    const end = limit ? start + limit : undefined;
    return events.slice(start, end);
  }
  return (await getTauri()).listAlarmEvents(limit, offset);
}

async function _createAlarmEvent(event: AlarmEvent): Promise<AlarmEvent> {
  if (!IS_TAURI) {
    const mock = await getMock();
    return await mock.createAlarmEvent(event);
  }
  return event;
}

async function _clearHistory(): Promise<void> {
  if (!IS_TAURI) {
    return;
  }
  await (await getTauri()).clearHistory();
}

async function _resetAllData(): Promise<void> {
  if (!IS_TAURI) {
    const mock = await getMock();
    await mock.resetAllData();
    return;
  }
}

// ─── Public API (all wrapped with safeInvoke) ────────────────────

export async function listAlarms(): Promise<Alarm[]> {
  return (await safeInvoke(() => _listAlarms(), { source: "ipc", triggerAction: "listAlarms" })) ?? [];
}

export async function getAlarm(alarmId: string): Promise<Alarm | null> {
  return safeInvoke(() => _getAlarm(alarmId), { source: "ipc", triggerAction: "getAlarm" });
}

export async function createAlarm(alarm: Partial<Alarm>): Promise<Alarm | null> {
  return safeInvoke(() => _createAlarm(alarm), { source: "ipc", triggerAction: "createAlarm" });
}

export async function updateAlarm(alarm: Alarm): Promise<Alarm | null> {
  return safeInvoke(() => _updateAlarm(alarm), { source: "ipc", triggerAction: "updateAlarm" });
}

export async function deleteAlarm(alarmId: string): Promise<{ UndoToken: string } | null> {
  return safeInvoke(() => _deleteAlarm(alarmId), { source: "ipc", triggerAction: "deleteAlarm" });
}

export async function undoDeleteAlarm(undoToken: string): Promise<Alarm | null> {
  return safeInvoke(() => _undoDeleteAlarm(undoToken), { source: "ipc", triggerAction: "undoDeleteAlarm" });
}

export async function toggleAlarm(alarmId: string, isEnabled?: boolean): Promise<Alarm | null> {
  return safeInvoke(() => _toggleAlarm(alarmId, isEnabled), { source: "ipc", triggerAction: "toggleAlarm" });
}

export async function duplicateAlarm(alarmId: string): Promise<Alarm | null> {
  return safeInvoke(() => _duplicateAlarm(alarmId), { source: "ipc", triggerAction: "duplicateAlarm" });
}

export async function reorderAlarms(alarmIds: string[]): Promise<void> {
  await safeInvoke(() => _reorderAlarms(alarmIds), { source: "ipc", triggerAction: "reorderAlarms" });
}

export async function listGroups(): Promise<AlarmGroup[]> {
  return (await safeInvoke(() => _listGroups(), { source: "ipc", triggerAction: "listGroups" })) ?? [];
}

export async function createGroup(name: string, color: string): Promise<AlarmGroup | null> {
  return safeInvoke(() => _createGroup(name, color), { source: "ipc", triggerAction: "createGroup" });
}

export async function updateGroup(group: AlarmGroup): Promise<AlarmGroup | null> {
  return safeInvoke(() => _updateGroup(group), { source: "ipc", triggerAction: "updateGroup" });
}

export async function deleteGroup(groupId: string): Promise<void> {
  await safeInvoke(() => _deleteGroup(groupId), { source: "ipc", triggerAction: "deleteGroup" });
}

export async function getSettings(): Promise<Settings> {
  return (await safeInvoke(() => _getSettings(), { source: "ipc", triggerAction: "getSettings" })) ?? DEFAULT_SETTINGS;
}

export async function updateSettings(partial: Partial<Settings>): Promise<Settings> {
  return (await safeInvoke(() => _updateSettings(partial), { source: "ipc", triggerAction: "updateSettings" })) ?? DEFAULT_SETTINGS;
}

export async function listSounds(): Promise<AlarmSound[]> {
  return (await safeInvoke(() => _listSounds(), { source: "ipc", triggerAction: "listSounds" })) ?? [];
}

export async function getSnoozeState(alarmId: string): Promise<SnoozeState | null> {
  return safeInvoke(() => _getSnoozeState(alarmId), { source: "ipc", triggerAction: "getSnoozeState" });
}

export async function snoozeAlarm(alarmId: string, durationMin: number): Promise<SnoozeState | null> {
  return safeInvoke(() => _snoozeAlarm(alarmId, durationMin), { source: "ipc", triggerAction: "snoozeAlarm" });
}

export async function clearSnooze(alarmId: string): Promise<void> {
  await safeInvoke(() => _clearSnooze(alarmId), { source: "ipc", triggerAction: "clearSnooze" });
}

export async function dismissAlarm(alarmId: string): Promise<void> {
  await safeInvoke(() => _dismissAlarm(alarmId), { source: "ipc", triggerAction: "dismissAlarm" });
}

export async function listAlarmEvents(limit?: number, offset?: number): Promise<AlarmEvent[]> {
  return (await safeInvoke(() => _listAlarmEvents(limit, offset), { source: "ipc", triggerAction: "listAlarmEvents" })) ?? [];
}

export async function createAlarmEvent(event: AlarmEvent): Promise<AlarmEvent> {
  return (await safeInvoke(() => _createAlarmEvent(event), { source: "ipc", triggerAction: "createAlarmEvent" })) ?? event;
}

export async function clearHistory(): Promise<void> {
  await safeInvoke(() => _clearHistory(), { source: "ipc", triggerAction: "clearHistory" });
}

export async function resetAllData(): Promise<void> {
  await safeInvoke(() => _resetAllData(), { source: "ipc", triggerAction: "resetAllData" });
}

// ─── Utilities ───────────────────────────────────────────────────

export function isTauri(): boolean {
  return IS_TAURI;
}
