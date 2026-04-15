/**
 * IPC Adapter — Group domain commands.
 */

import type { AlarmGroup } from "@/types/alarm";
import { IS_TAURI, getMock, getTauri, safeInvoke } from "./shared";

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

// ─── Public API ──────────────────────────────────────────────────

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
