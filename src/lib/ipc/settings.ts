/**
 * IPC Adapter — Settings domain commands.
 */

import type { Settings } from "@/types/alarm";
import { DEFAULT_SETTINGS } from "@/types/alarm";
import { IS_TAURI, getMock, getTauri, safeInvoke } from "./shared";

async function _getSettings(): Promise<Settings> {
  if (!IS_TAURI) {
    const mock = await getMock();
    return await mock.getSettings();
  }
  return (await getTauri()).getSettings() ?? DEFAULT_SETTINGS;
}

/**
 * Map a frontend Settings field to one or more backend Settings table rows.
 * The backend stores keys like "TimeFormat" (12h/24h) while the frontend uses Is24Hour.
 */
function mapSettingToBackend(key: string, value: unknown): Array<[string, string]> {
  switch (key) {
    case "Is24Hour":
      return [["TimeFormat", value ? "24h" : "12h"]];
    case "DefaultSnoozeDurationMin":
      return [["DefaultSnoozeDuration", String(value)]];
    // Bedtime fields are not persisted in the Settings table yet — skip silently.
    case "BedtimeEnabled":
    case "BedtimeTime":
    case "BedtimeReminderMinBefore":
    case "SleepGoalHours":
      return [];
    default:
      return [[key, String(value)]];
  }
}

async function _updateSettings(partial: Partial<Settings>): Promise<Settings> {
  if (!IS_TAURI) {
    const mock = await getMock();
    return await mock.updateSettings(partial);
  }
  const tauri = await getTauri();
  for (const [key, value] of Object.entries(partial)) {
    for (const [backendKey, backendValue] of mapSettingToBackend(key, value)) {
      await tauri.updateSetting(backendKey, backendValue);
    }
  }
  return (await tauri.getSettings()) ?? DEFAULT_SETTINGS;
}

// ─── Public API ──────────────────────────────────────────────────

export async function getSettings(): Promise<Settings> {
  return (await safeInvoke(() => _getSettings(), { source: "ipc", triggerAction: "getSettings" })) ?? DEFAULT_SETTINGS;
}

export async function updateSettings(partial: Partial<Settings>): Promise<Settings> {
  return (await safeInvoke(() => _updateSettings(partial), { source: "ipc", triggerAction: "updateSettings" })) ?? DEFAULT_SETTINGS;
}
