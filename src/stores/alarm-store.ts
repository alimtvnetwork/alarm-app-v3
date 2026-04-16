/**
 * Alarm Store — Zustand store for alarm and group CRUD.
 * Uses IPC adapter (mock in web, Tauri IPC in native).
 */

import { create } from "zustand";
import type { Alarm, AlarmGroup } from "@/types/alarm";
import { RepeatType, DEFAULT_REPEAT_PATTERN } from "@/types/alarm";
import * as ipc from "@/lib/ipc-adapter";
import { computeNextFireTime } from "@/lib/next-fire-time";
import {
  isNotificationSupported,
  hasAskedPermission,
  requestNotificationPermission,
} from "@/lib/alarm-notification";

interface AlarmStore {
  alarms: Alarm[];
  groups: AlarmGroup[];
  isLoading: boolean;

  // Alarm CRUD
  loadAlarms: () => Promise<void>;
  addAlarm: (partial: Partial<Alarm>) => Promise<Alarm>;
  updateAlarm: (alarm: Alarm) => Promise<void>;
  deleteAlarm: (alarmId: string) => Promise<void>;
  toggleAlarm: (alarmId: string, isEnabled: boolean) => Promise<void>;
  duplicateAlarm: (alarmId: string) => Promise<Alarm | null>;
  reorderAlarms: (alarmIds: string[]) => Promise<void>;

  // Group CRUD
  loadGroups: () => Promise<void>;
  addGroup: (name: string, color: string) => Promise<AlarmGroup | null>;
  updateGroup: (group: AlarmGroup) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
}

function generateId(): string {
  return crypto.randomUUID();
}

async function getAlarmTimeZone(): Promise<string> {
  const settings = await ipc.getSettings();
  return normalizeAlarmTimezone(settings.SystemTimezone);
}

function createDefaultAlarm(partial: Partial<Alarm>): Alarm {
  const now = new Date().toISOString();
  return {
    AlarmId: generateId(),
    Time: "07:00",
    Date: null,
    Label: "",
    IsEnabled: true,
    IsPreviousEnabled: null,
    Repeat: { ...DEFAULT_REPEAT_PATTERN },
    GroupId: null,
    SnoozeDurationMin: 5,
    MaxSnoozeCount: 3,
    SoundFile: "classic-beep",
    IsVibrationEnabled: false,
    IsGradualVolume: false,
    GradualVolumeDurationSec: 30,
    AutoDismissMin: 15,
    ChallengeType: null,
    ChallengeDifficulty: null,
    ChallengeShakeCount: null,
    ChallengeStepCount: null,
    NextFireTime: null,
    Position: 0,
    DeletedAt: null,
    CreatedAt: now,
    UpdatedAt: now,
    ...partial,
  };
}

export const useAlarmStore = create<AlarmStore>((set) => ({
  alarms: [],
  groups: [],
  isLoading: false,

  loadAlarms: async () => {
    set({ isLoading: true });
    try {
      const timeZone = await getAlarmTimeZone();
      const alarms = await ipc.listAlarms();
      const updated = await Promise.all(
        alarms.map(async (a) => {
          if (!a.NextFireTime && a.IsEnabled) {
            a.NextFireTime = computeNextFireTime(a, timeZone);
            await ipc.updateAlarm(a);
          }
          return a;
        })
      );
      set({ alarms: updated });
    } finally {
      set({ isLoading: false });
    }
  },

  addAlarm: async (partial) => {
    const alarm = createDefaultAlarm(partial);
    const timeZone = await getAlarmTimeZone();
    alarm.NextFireTime = computeNextFireTime(alarm, timeZone);

    if (ipc.isTauri()) {
      const created = await ipc.createAlarm(alarm);
      if (created) {
        set((s) => ({ alarms: [...s.alarms, created] }));
        return created;
      }
    } else {
      await ipc.createAlarm(alarm);
      set((s) => ({ alarms: [...s.alarms, alarm] }));
    }

    // Prompt for notification permission on first alarm creation
    if (isNotificationSupported() && !hasAskedPermission()) {
      requestNotificationPermission();
    }

    return alarm;
  },

  updateAlarm: async (alarm) => {
    const timeZone = await getAlarmTimeZone();
    alarm.NextFireTime = computeNextFireTime(alarm, timeZone);
    await ipc.updateAlarm(alarm);
    set((s) => ({
      alarms: s.alarms.map((a) => (a.AlarmId === alarm.AlarmId ? alarm : a)),
    }));
  },

  deleteAlarm: async (alarmId) => {
    await ipc.deleteAlarm(alarmId);
    set((s) => ({
      alarms: s.alarms.filter((a) => a.AlarmId !== alarmId),
    }));
  },

  toggleAlarm: async (alarmId, isEnabled) => {
    const updated = await ipc.toggleAlarm(alarmId, isEnabled);
    if (updated) {
      const timeZone = await getAlarmTimeZone();
      updated.NextFireTime = computeNextFireTime(updated, timeZone);
      await ipc.updateAlarm(updated);
      set((s) => ({
        alarms: s.alarms.map((a) => (a.AlarmId === alarmId ? updated : a)),
      }));
    }
  },

  duplicateAlarm: async (alarmId) => {
    const duplicate = await ipc.duplicateAlarm(alarmId);
    if (duplicate) {
      set((s) => ({ alarms: [...s.alarms, duplicate] }));
    }
    return duplicate;
  },

  reorderAlarms: async (alarmIds) => {
    await ipc.reorderAlarms(alarmIds);
    set((s) => {
      const map = new Map(s.alarms.map((a) => [a.AlarmId, a]));
      const ordered = alarmIds
        .map((id) => map.get(id))
        .filter(Boolean) as Alarm[];
      const rest = s.alarms.filter((a) => !alarmIds.includes(a.AlarmId));
      return { alarms: [...ordered, ...rest] };
    });
  },

  loadGroups: async () => {
    const groups = await ipc.listGroups();
    set({ groups });
  },

  addGroup: async (name, color) => {
    const group = await ipc.createGroup(name, color);
    if (group) {
      set((s) => ({ groups: [...s.groups, group] }));
    }
    return group;
  },

  updateGroup: async (group) => {
    await ipc.updateGroup(group);
    set((s) => ({
      groups: s.groups.map((g) =>
        g.AlarmGroupId === group.AlarmGroupId ? group : g
      ),
    }));
  },

  deleteGroup: async (groupId) => {
    await ipc.deleteGroup(groupId);
    set((s) => ({
      groups: s.groups.filter((g) => g.AlarmGroupId !== groupId),
      alarms: s.alarms.map((a) =>
        a.GroupId === groupId ? { ...a, GroupId: null } : a
      ),
    }));
  },
}));
