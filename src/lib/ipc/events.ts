/**
 * IPC Adapter — Events, sounds, and utility commands.
 */

import type { AlarmEvent, AlarmSound } from "@/types/alarm";
import { IS_TAURI, getMock, getTauri, safeInvoke } from "./shared";

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

async function _listSounds(): Promise<AlarmSound[]> {
  if (!IS_TAURI) {
    const mock = await getMock();
    return mock.listSounds();
  }
  const sounds = await (await getTauri()).listSounds();
  return sounds as unknown as AlarmSound[];
}

// ─── Public API ──────────────────────────────────────────────────

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

export async function listSounds(): Promise<AlarmSound[]> {
  return (await safeInvoke(() => _listSounds(), { source: "ipc", triggerAction: "listSounds" })) ?? [];
}
