/**
 * Alarm Store — Zustand store for alarm and group CRUD.
 * Uses IPC adapter (mock in web, Tauri IPC in native).
 */

import { create } from "zustand";
import type { Alarm, AlarmGroup } from "@/types/alarm";
import { DEFAULT_REPEAT_PATTERN } from "@/types/alarm";
import * as ipc from "@/lib/ipc-adapter";
import { computeNextFireTime } from "@/lib/next-fire-time";
import { normalizeAlarmTimezone } from "@/lib/alarm-timezone";
import { normalizeAlarm, normalizeAlarms } from "@/lib/normalize-alarm";
import {
  isNotificationSupported,
  hasAskedPermission,
  requestNotificationPermission,
} from "@/lib/alarm-notification";

interface AlarmStore {
  alarms: Alarm[];
  groups: AlarmGroup[];
  isLoading: boolean;
  loadAlarms: () => Promise<void>;
  addAlarm: (partial: Partial<Alarm>) => Promise<Alarm>;
  updateAlarm: (alarm: Alarm) => Promise<void>;
  deleteAlarm: (alarmId: string) => Promise<void>;
  toggleAlarm: (alarmId: string, isEnabled: boolean) => Promise<void>;
  duplicateAlarm: (alarmId: string) => Promise<Alarm | null>;
  reorderAlarms: (alarmIds: string[]) => Promise<void>;
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
  return normalizeAlarm({
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
  });
}

function withNextFireTime(alarm: Alarm, timeZone: string): Alarm {
  const normalizedAlarm = normalizeAlarm(alarm);
  normalizedAlarm.NextFireTime = computeNextFireTime(normalizedAlarm, timeZone);
  return normalizedAlarm;
}

export const useAlarmStore = create<AlarmStore>((set) => ({
  alarms: [],
  groups: [],
  isLoading: false,

  loadAlarms: async () => {
    set({ isLoading: true });
    try {
      const timeZone = await getAlarmTimeZone();
      const alarms = normalizeAlarms(await ipc.listAlarms());
      const updated = await Promise.all(
        alarms.map(async (alarm) => {
          if (!alarm.NextFireTime && alarm.IsEnabled) {
            const nextAlarm = withNextFireTime(alarm, timeZone);
            await ipc.updateAlarm(nextAlarm);
            return nextAlarm;
          }
          return normalizeAlarm(alarm);
        }),
      );
      set({ alarms: updated });
    } finally {
      set({ isLoading: false });
    }
  },

  addAlarm: async (partial) => {
    const timeZone = await getAlarmTimeZone();
    const alarm = withNextFireTime(createDefaultAlarm(partial), timeZone);

    if (ipc.isTauri()) {
      const created = await ipc.createAlarm(alarm);
      if (created) {
        const normalizedCreated = normalizeAlarm(created);
        set((s) => ({ alarms: [...s.alarms, normalizedCreated] }));
        if (isNotificationSupported() && !hasAskedPermission()) {
          requestNotificationPermission();
        }
        return normalizedCreated;
      }
    } else {
      await ipc.createAlarm(alarm);
      set((s) => ({ alarms: [...s.alarms, alarm] }));
    }

    if (isNotificationSupported() && !hasAskedPermission()) {
      requestNotificationPermission();
    }

    return alarm;
  },

  updateAlarm: async (alarm) => {
    const timeZone = await getAlarmTimeZone();
    const updatedAlarm = withNextFireTime(alarm, timeZone);
    const saved = await ipc.updateAlarm(updatedAlarm);
    const nextAlarm = saved ? normalizeAlarm(saved) : updatedAlarm;
    set((s) => ({
      alarms: s.alarms.map((item) =>
        item.AlarmId === nextAlarm.AlarmId ? nextAlarm : item,
      ),
    }));
  },

  deleteAlarm: async (alarmId) => {
    await ipc.deleteAlarm(alarmId);
    set((s) => ({
      alarms: s.alarms.filter((alarm) => alarm.AlarmId !== alarmId),
    }));
  },

  toggleAlarm: async (alarmId, isEnabled) => {
    const updated = await ipc.toggleAlarm(alarmId, isEnabled);
    if (!updated) return;
    const timeZone = await getAlarmTimeZone();
    const nextAlarm = withNextFireTime(updated, timeZone);
    const saved = await ipc.updateAlarm(nextAlarm);
    const normalizedSaved = saved ? normalizeAlarm(saved) : nextAlarm;
    set((s) => ({
      alarms: s.alarms.map((alarm) =>
        alarm.AlarmId === alarmId ? normalizedSaved : alarm,
      ),
    }));
  },

  duplicateAlarm: async (alarmId) => {
    const duplicate = await ipc.duplicateAlarm(alarmId);
    if (duplicate) {
      const normalizedDuplicate = normalizeAlarm(duplicate);
      set((s) => ({ alarms: [...s.alarms, normalizedDuplicate] }));
      return normalizedDuplicate;
    }
    return null;
  },

  reorderAlarms: async (alarmIds) => {
    await ipc.reorderAlarms(alarmIds);
    set((s) => {
      const map = new Map(s.alarms.map((alarm) => [alarm.AlarmId, alarm]));
      const ordered = alarmIds
        .map((id) => map.get(id))
        .filter(Boolean) as Alarm[];
      const rest = s.alarms.filter((alarm) => !alarmIds.includes(alarm.AlarmId));
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
      groups: s.groups.map((item) =>
        item.AlarmGroupId === group.AlarmGroupId ? group : item,
      ),
    }));
  },

  deleteGroup: async (groupId) => {
    await ipc.deleteGroup(groupId);
    set((s) => ({
      groups: s.groups.filter((group) => group.AlarmGroupId !== groupId),
      alarms: s.alarms.map((alarm) =>
        alarm.GroupId === groupId ? { ...alarm, GroupId: null } : alarm,
      ),
    }));
  },
}));
