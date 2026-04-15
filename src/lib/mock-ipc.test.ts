/**
 * Integration tests for mock-ipc — IndexedDB-backed alarm CRUD,
 * settings persistence, group cascade delete, snooze, and events.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { deleteDB } from "@/lib/indexed-db";
import type { Alarm, AlarmGroup, AlarmEvent } from "@/types/alarm";
import {
  DEFAULT_SETTINGS,
  AlarmEventType,
  RepeatType,
  ChallengeType,
  ChallengeDifficulty,
  ThemeMode,
  DEFAULT_REPEAT_PATTERN,
} from "@/types/alarm";

let mockIpc: typeof import("@/lib/mock-ipc");

function makeAlarm(overrides: Partial<Alarm> = {}): Alarm {
  const now = new Date().toISOString();
  return {
    AlarmId: crypto.randomUUID(),
    Time: "08:00",
    Date: null,
    Label: "Test Alarm",
    IsEnabled: true,
    IsPreviousEnabled: null,
    Repeat: { ...DEFAULT_REPEAT_PATTERN },
    GroupId: null,
    SnoozeDurationMin: 5,
    MaxSnoozeCount: 3,
    SoundFile: "default.mp3",
    IsVibrationEnabled: true,
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
    ...overrides,
  };
}

describe("mock-ipc integration", () => {
  beforeEach(async () => {
    await deleteDB();
    const mod = await import("@/lib/mock-ipc");
    await mod.resetAllData();
    mockIpc = mod;
  });

  // ─── Alarm CRUD ─────────────────────────────────────────────────

  describe("alarm CRUD", () => {
    it("creates and lists alarms", async () => {
      const alarm = makeAlarm({ Label: "Morning" });
      await mockIpc.createAlarm(alarm);

      const list = await mockIpc.listAlarms();
      const found = list.find((a) => a.AlarmId === alarm.AlarmId);
      expect(found).toBeDefined();
      expect(found!.Label).toBe("Morning");
    });

    it("gets alarm by id", async () => {
      const alarm = makeAlarm();
      await mockIpc.createAlarm(alarm);

      const fetched = await mockIpc.getAlarm(alarm.AlarmId);
      expect(fetched).not.toBeNull();
      expect(fetched!.AlarmId).toBe(alarm.AlarmId);
    });

    it("updates alarm fields", async () => {
      const alarm = makeAlarm({ Label: "Old" });
      await mockIpc.createAlarm(alarm);

      const updated = await mockIpc.updateAlarm({ ...alarm, Label: "New" });
      expect(updated.Label).toBe("New");
      expect(updated.UpdatedAt).not.toBe(alarm.UpdatedAt);

      const fetched = await mockIpc.getAlarm(alarm.AlarmId);
      expect(fetched!.Label).toBe("New");
    });

    it("soft-deletes alarm (sets DeletedAt)", async () => {
      const alarm = makeAlarm();
      await mockIpc.createAlarm(alarm);

      await mockIpc.deleteAlarm(alarm.AlarmId);

      const list = await mockIpc.listAlarms();
      expect(list.find((a) => a.AlarmId === alarm.AlarmId)).toBeUndefined();

      const raw = await mockIpc.getAlarm(alarm.AlarmId);
      expect(raw).not.toBeNull();
      expect(raw!.DeletedAt).not.toBeNull();
    });

    it("toggles alarm enabled state", async () => {
      const alarm = makeAlarm({ IsEnabled: true });
      await mockIpc.createAlarm(alarm);

      const toggled = await mockIpc.toggleAlarm(alarm.AlarmId, false);
      expect(toggled!.IsEnabled).toBe(false);

      const toggled2 = await mockIpc.toggleAlarm(alarm.AlarmId, true);
      expect(toggled2!.IsEnabled).toBe(true);
    });

    it("reorders alarms by position", async () => {
      const a1 = makeAlarm({ Position: 0 });
      const a2 = makeAlarm({ Position: 1 });
      const a3 = makeAlarm({ Position: 2 });
      await mockIpc.createAlarm(a1);
      await mockIpc.createAlarm(a2);
      await mockIpc.createAlarm(a3);

      await mockIpc.reorderAlarms([a3.AlarmId, a2.AlarmId, a1.AlarmId]);

      const r1 = await mockIpc.getAlarm(a3.AlarmId);
      const r2 = await mockIpc.getAlarm(a1.AlarmId);
      expect(r1!.Position).toBe(0);
      expect(r2!.Position).toBe(2);
    });
  });

  // ─── Group CRUD & Cascade Delete ────────────────────────────────

  describe("group operations", () => {
    it("creates and lists groups", async () => {
      const group: AlarmGroup = {
        AlarmGroupId: "g-test-1",
        Name: "Work",
        Color: "#FF0000",
        Position: 0,
        IsEnabled: true,
      };
      await mockIpc.createGroup(group);

      const groups = await mockIpc.listGroups();
      const found = groups.find((g) => g.AlarmGroupId === "g-test-1");
      expect(found).toBeDefined();
      expect(found!.Name).toBe("Work");
    });

    it("updates group", async () => {
      const group: AlarmGroup = {
        AlarmGroupId: "g-test-2",
        Name: "Old",
        Color: "#000",
        Position: 0,
        IsEnabled: true,
      };
      await mockIpc.createGroup(group);
      await mockIpc.updateGroup({ ...group, Name: "New" });

      const groups = await mockIpc.listGroups();
      expect(groups.find((g) => g.AlarmGroupId === "g-test-2")!.Name).toBe("New");
    });

    it("cascade nullifies GroupId on alarms when group deleted", async () => {
      const group: AlarmGroup = {
        AlarmGroupId: "g-cascade",
        Name: "Cascade",
        Color: "#0F0",
        Position: 0,
        IsEnabled: true,
      };
      await mockIpc.createGroup(group);

      const alarm = makeAlarm({ GroupId: "g-cascade" });
      await mockIpc.createAlarm(alarm);

      await mockIpc.deleteGroup("g-cascade");

      const groups = await mockIpc.listGroups();
      expect(groups.find((g) => g.AlarmGroupId === "g-cascade")).toBeUndefined();

      const updated = await mockIpc.getAlarm(alarm.AlarmId);
      expect(updated!.GroupId).toBeNull();
    });
  });

  // ─── Settings ──────────────────────────────────────────────────

  describe("settings", () => {
    it("returns defaults on fresh db", async () => {
      const settings = await mockIpc.getSettings();
      expect(settings.Theme).toBe(DEFAULT_SETTINGS.Theme);
      expect(settings.DefaultSnoozeDurationMin).toBe(DEFAULT_SETTINGS.DefaultSnoozeDurationMin);
    });

    it("updates partial settings and persists", async () => {
      await mockIpc.updateSettings({ Theme: ThemeMode.Dark, Is24Hour: true });
      const settings = await mockIpc.getSettings();
      expect(settings.Theme).toBe(ThemeMode.Dark);
      expect(settings.Is24Hour).toBe(true);
      expect(settings.DefaultSnoozeDurationMin).toBe(DEFAULT_SETTINGS.DefaultSnoozeDurationMin);
    });
  });

  // ─── Snooze ────────────────────────────────────────────────────

  describe("snooze", () => {
    it("creates and retrieves snooze state", async () => {
      const alarm = makeAlarm();
      await mockIpc.createAlarm(alarm);

      const state = await mockIpc.snoozeAlarm(alarm.AlarmId, 5);
      expect(state.SnoozeCount).toBe(1);
      expect(state.SnoozeUntil).toBeDefined();

      const fetched = await mockIpc.getSnoozeState(alarm.AlarmId);
      expect(fetched).not.toBeNull();
      expect(fetched!.SnoozeCount).toBe(1);
    });

    it("increments snooze count on repeated snooze", async () => {
      const alarm = makeAlarm();
      await mockIpc.createAlarm(alarm);

      await mockIpc.snoozeAlarm(alarm.AlarmId, 5);
      const state2 = await mockIpc.snoozeAlarm(alarm.AlarmId, 5);
      expect(state2.SnoozeCount).toBe(2);
    });

    it("clears snooze state", async () => {
      const alarm = makeAlarm();
      await mockIpc.createAlarm(alarm);
      await mockIpc.snoozeAlarm(alarm.AlarmId, 5);

      await mockIpc.clearSnooze(alarm.AlarmId);
      const state = await mockIpc.getSnoozeState(alarm.AlarmId);
      expect(state).toBeNull();
    });
  });

  // ─── Events ────────────────────────────────────────────────────

  describe("events", () => {
    it("creates and lists events sorted by timestamp desc", async () => {
      const e1: AlarmEvent = {
        AlarmEventId: crypto.randomUUID(),
        AlarmId: "a-1",
        Type: AlarmEventType.Fired,
        FiredAt: "2026-01-01T08:00:00Z",
        DismissedAt: null,
        SnoozeCount: 0,
        ChallengeType: null,
        ChallengeSolveTimeSec: null,
        SleepQuality: null,
        Mood: null,
        AlarmLabelSnapshot: "Test",
        AlarmTimeSnapshot: "08:00",
        Timestamp: "2026-01-01T08:00:00Z",
      };
      const e2: AlarmEvent = {
        AlarmEventId: crypto.randomUUID(),
        AlarmId: "a-1",
        Type: AlarmEventType.Dismissed,
        FiredAt: "2026-01-01T08:05:00Z",
        DismissedAt: "2026-01-01T08:05:00Z",
        SnoozeCount: 0,
        ChallengeType: null,
        ChallengeSolveTimeSec: null,
        SleepQuality: null,
        Mood: null,
        AlarmLabelSnapshot: "Test",
        AlarmTimeSnapshot: "08:00",
        Timestamp: "2026-01-01T08:05:00Z",
      };
      await mockIpc.createAlarmEvent(e1);
      await mockIpc.createAlarmEvent(e2);

      const events = await mockIpc.listAlarmEvents();
      const ourEvents = events.filter((e) => e.AlarmId === "a-1");
      expect(ourEvents[0].AlarmEventId).toBe(e2.AlarmEventId);
      expect(ourEvents[1].AlarmEventId).toBe(e1.AlarmEventId);
    });
  });

  // ─── Sounds ────────────────────────────────────────────────────

  describe("sounds", () => {
    it("returns mock sounds list", () => {
      const sounds = mockIpc.listSounds();
      expect(sounds.length).toBeGreaterThan(0);
      expect(sounds[0]).toHaveProperty("AlarmSoundId");
    });
  });
});
