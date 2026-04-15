/**
 * IPC Adapter — Barrel re-export.
 * Delegates to domain modules in src/lib/ipc/.
 * All consumers import from this file unchanged.
 */

export { listAlarms, getAlarm, createAlarm, updateAlarm, deleteAlarm, undoDeleteAlarm, toggleAlarm, duplicateAlarm, reorderAlarms } from "./ipc/alarms";
export { listGroups, createGroup, updateGroup, deleteGroup } from "./ipc/groups";
export { getSettings, updateSettings } from "./ipc/settings";
export { getSnoozeState, snoozeAlarm, clearSnooze, dismissAlarm } from "./ipc/snooze";
export { listAlarmEvents, createAlarmEvent, clearHistory, resetAllData, listSounds } from "./ipc/events";

// ─── Utilities ───────────────────────────────────────────────────

export { IS_TAURI as _IS_TAURI } from "./ipc/shared";

export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI__" in window;
}
