/**
 * IPC Adapter — Snooze & dismiss domain commands.
 */

import type { SnoozeState } from "@/types/alarm";
import { IS_TAURI, getMock, getTauri, safeInvoke } from "./shared";

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

// ─── Public API ──────────────────────────────────────────────────

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
