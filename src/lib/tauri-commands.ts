/**
 * Tauri IPC Command Wrappers
 * All frontend IPC calls go through safeInvoke() with 5s timeout + error toast.
 *
 * NOTE: In the Lovable web preview, these are no-ops that return null.
 * When running in Tauri, they call real Rust backend commands.
 */

import { toast } from "sonner";
import type {
  Alarm,
  AlarmGroup,
  AlarmEvent,
  Settings,
  IpcErrorResponse,
} from "@/types/alarm";
import { normalizeAlarm, normalizeAlarms } from "@/lib/normalize-alarm";

const IPC_TIMEOUT_MS = 5000;
const IS_TAURI = typeof window !== "undefined" && "__TAURI__" in window;

/**
 * Safe IPC invoke with timeout and error handling.
 * Returns null on error (shows toast).
 */
async function safeInvoke<T>(
  command: string,
  args?: Record<string, unknown>
): Promise<T | null> {
  if (!IS_TAURI) {
    console.warn(`[safeInvoke] Not in Tauri — skipping: ${command}`);
    return null;
  }

  try {
    // Dynamic import — @tauri-apps/api is only available in Tauri runtime
    const tauriApi = await import("@tauri-apps/api/core" as string);
    const invoke = tauriApi.invoke as (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
    const result = await Promise.race([
      invoke(command, args),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), IPC_TIMEOUT_MS)
      ),
    ]);
    return result as T;
  } catch (error) {
    const message = getErrorMessage(error);
    toast.error(message);
    console.error(`IPC ${command} failed:`, error);
    return null;
  }
}

function getErrorMessage(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }
  if (error instanceof Error) {
    if (error.message === "timeout") {
      return "Operation timed out — try again";
    }
    return error.message;
  }
  // IPC structured error
  if (typeof error === "object" && error !== null && "Message" in error) {
    const ipcError = error as IpcErrorResponse;
    return mapErrorCodeToMessage(ipcError.Code, ipcError.Message);
  }
  return "Something went wrong";
}

function mapErrorCodeToMessage(code: string, message: string): string {
  switch (code) {
    case "Database":
      return "Failed to save — try again";
    case "Audio":
      return "Could not play sound — using default";
    case "IpcTimeout":
      return "Operation timed out — try again";
    case "FileNotFound":
      return "Sound file missing — using default";
    case "SoundFileTooLarge":
      return "Sound file must be under 10MB";
    case "Validation":
      return message;
    default:
      return message;
  }
}

// ── Typed Command Wrappers ───────────────────────────────────────

export async function listAlarms(): Promise<Alarm[]> {
  const raw = (await safeInvoke<unknown[]>("list_alarms")) ?? [];
  return normalizeAlarms(raw);
}

export async function createAlarm(
  payload: Partial<Alarm>
): Promise<Alarm | null> {
  const raw = await safeInvoke<unknown>("create_alarm", { payload });
  return raw ? normalizeAlarm(raw) : null;
}

export async function updateAlarm(alarm: Alarm): Promise<Alarm | null> {
  const raw = await safeInvoke<unknown>("update_alarm", { alarm });
  return raw ? normalizeAlarm(raw) : null;
}

export async function deleteAlarm(
  alarmId: string
): Promise<{ UndoToken: string } | null> {
  return safeInvoke<{ UndoToken: string }>("delete_alarm", {
    alarmId,
  });
}

export async function undoDeleteAlarm(
  undoToken: string
): Promise<Alarm | null> {
  const raw = await safeInvoke<unknown>("undo_delete_alarm", { undoToken });
  return raw ? normalizeAlarm(raw) : null;
}

export async function toggleAlarm(alarmId: string): Promise<Alarm | null> {
  const raw = await safeInvoke<unknown>("toggle_alarm", { alarmId });
  return raw ? normalizeAlarm(raw) : null;
}

export async function duplicateAlarm(alarmId: string): Promise<Alarm | null> {
  const raw = await safeInvoke<unknown>("duplicate_alarm", { alarmId });
  return raw ? normalizeAlarm(raw) : null;
}

export async function reorderAlarms(alarmIds: string[]): Promise<void> {
  await safeInvoke("reorder_alarms", { alarmIds });
}

export async function listGroups(): Promise<AlarmGroup[]> {
  return (await safeInvoke<AlarmGroup[]>("list_groups")) ?? [];
}

export async function createGroup(
  name: string,
  color: string
): Promise<AlarmGroup | null> {
  return safeInvoke<AlarmGroup>("create_group", { name, color });
}

export async function updateGroup(
  group: AlarmGroup
): Promise<AlarmGroup | null> {
  return safeInvoke<AlarmGroup>("update_group", { group });
}

export async function deleteGroup(groupId: string): Promise<void> {
  await safeInvoke("delete_group", { groupId });
}

export async function toggleGroup(
  groupId: string
): Promise<AlarmGroup | null> {
  return safeInvoke<AlarmGroup>("toggle_group", { groupId });
}

export async function getSettings(): Promise<Settings | null> {
  return safeInvoke<Settings>("get_settings");
}

export async function updateSetting(
  key: string,
  value: string
): Promise<void> {
  await safeInvoke("update_setting", { key, value });
}

export async function listAlarmEvents(
  limit?: number,
  offset?: number
): Promise<AlarmEvent[]> {
  return (
    (await safeInvoke<AlarmEvent[]>("list_alarm_events", {
      limit: limit ?? 100,
      offset: offset ?? 0,
    })) ?? []
  );
}

export async function clearHistory(): Promise<void> {
  await safeInvoke("clear_history");
}

export async function logFromFrontend(
  level: string,
  message: string
): Promise<void> {
  await safeInvoke("log_from_frontend", { level, message });
}

// ── Snooze Commands ──

export interface SnoozeState {
  AlarmId: string;
  SnoozeUntil: string;
  SnoozeCount: number;
}

export async function snoozeAlarm(
  alarmId: string,
  durationMin?: number
): Promise<SnoozeState | null> {
  return safeInvoke<SnoozeState>("snooze_alarm", {
    payload: { AlarmId: alarmId, DurationMin: durationMin },
  });
}

export async function getSnoozeState(): Promise<SnoozeState[]> {
  return (await safeInvoke<SnoozeState[]>("get_snooze_state")) ?? [];
}

export async function cancelSnooze(alarmId: string): Promise<void> {
  await safeInvoke("cancel_snooze", { alarmId });
}

export async function dismissAlarm(alarmId: string): Promise<void> {
  await safeInvoke("dismiss_alarm", { alarmId });
}

// ── Audio Commands ──

export interface AlarmSound {
  AlarmSoundId: string;
  Name: string;
  FileName: string;
  Category: string;
}

export interface SoundValidationResult {
  IsValid: boolean;
  Error: string | null;
}

export async function listSounds(): Promise<AlarmSound[]> {
  return (await safeInvoke<AlarmSound[]>("list_sounds")) ?? [];
}

export async function setCustomSound(filePath: string): Promise<AlarmSound | null> {
  return safeInvoke<AlarmSound>("set_custom_sound", {
    payload: { FilePath: filePath },
  });
}

export async function validateCustomSound(filePath: string): Promise<SoundValidationResult | null> {
  return safeInvoke<SoundValidationResult>("validate_custom_sound", {
    payload: { FilePath: filePath },
  });
}
