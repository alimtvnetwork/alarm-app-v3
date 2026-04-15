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

// ─── Public API ──────────────────────────────────────────────────

export async function getSettings(): Promise<Settings> {
  return (await safeInvoke(() => _getSettings(), { source: "ipc", triggerAction: "getSettings" })) ?? DEFAULT_SETTINGS;
}

export async function updateSettings(partial: Partial<Settings>): Promise<Settings> {
  return (await safeInvoke(() => _updateSettings(partial), { source: "ipc", triggerAction: "updateSettings" })) ?? DEFAULT_SETTINGS;
}
