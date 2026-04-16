/**
 * IPC Adapter — Alarm domain commands.
 */

import type { Alarm } from "@/types/alarm";
import { IS_TAURI, getMock, getTauri, safeInvoke } from "./shared";
import { normalizeAlarm, normalizeAlarms } from "@/lib/normalize-alarm";

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

// ─── Public API ──────────────────────────────────────────────────

export async function listAlarms(): Promise<Alarm[]> {
  const raw = (await safeInvoke(() => _listAlarms(), { source: "ipc", triggerAction: "listAlarms" })) ?? [];
  return normalizeAlarms(raw);
}

export async function getAlarm(alarmId: string): Promise<Alarm | null> {
  const raw = await safeInvoke(() => _getAlarm(alarmId), { source: "ipc", triggerAction: "getAlarm" });
  return raw ? normalizeAlarm(raw) : null;
}

export async function createAlarm(alarm: Partial<Alarm>): Promise<Alarm | null> {
  const raw = await safeInvoke(() => _createAlarm(alarm), { source: "ipc", triggerAction: "createAlarm" });
  return raw ? normalizeAlarm(raw) : null;
}

export async function updateAlarm(alarm: Alarm): Promise<Alarm | null> {
  const raw = await safeInvoke(() => _updateAlarm(alarm), { source: "ipc", triggerAction: "updateAlarm" });
  return raw ? normalizeAlarm(raw) : null;
}

export async function deleteAlarm(alarmId: string): Promise<{ UndoToken: string } | null> {
  return safeInvoke(() => _deleteAlarm(alarmId), { source: "ipc", triggerAction: "deleteAlarm" });
}

export async function undoDeleteAlarm(undoToken: string): Promise<Alarm | null> {
  return safeInvoke(() => _undoDeleteAlarm(undoToken), { source: "ipc", triggerAction: "undoDeleteAlarm" });
}

export async function toggleAlarm(alarmId: string, isEnabled?: boolean): Promise<Alarm | null> {
  const raw = await safeInvoke(() => _toggleAlarm(alarmId, isEnabled), { source: "ipc", triggerAction: "toggleAlarm" });
  return raw ? normalizeAlarm(raw) : null;
}

export async function duplicateAlarm(alarmId: string): Promise<Alarm | null> {
  const raw = await safeInvoke(() => _duplicateAlarm(alarmId), { source: "ipc", triggerAction: "duplicateAlarm" });
  return raw ? normalizeAlarm(raw) : null;
}

export async function reorderAlarms(alarmIds: string[]): Promise<void> {
  await safeInvoke(() => _reorderAlarms(alarmIds), { source: "ipc", triggerAction: "reorderAlarms" });
}
