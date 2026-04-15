/**
 * Integration tests for mock-ipc — IndexedDB-backed alarm CRUD,
 * settings persistence, group cascade delete, snooze, and events.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { deleteDB } from "@/lib/indexed-db";
import type { Alarm, AlarmGroup, AlarmEvent } from "@/types/alarm";
import { DEFAULT_SETTINGS, AlarmEventType, RepeatType, ChallengeType, ChallengeDifficulty, DEFAULT_REPEAT_PATTERN } from "@/types/alarm";

// We need to reset the init promise between tests
let mockIpc: typeof import("@/lib/mock-ipc");

function makeAlarm(overrides: Partial<Alarm> = {}): Alarm {
  const now = new Date().toISOString();
  return {
    AlarmId: crypto.randomUUID(),
    Time: "08:00",
    Date: null,
    Label: "Test Alarm",
    IsEnabled: true,
    RepeatType: RepeatType.None,
    RepeatPattern: DEFAULT_REPEAT_PATTERN,
    Sound: "default.mp3",
    Volume: 80,
    IsVibrationEnabled: true,
    SnoozeDurationMin: 5,
    MaxSnoozeCount: 3,
    ChallengeType: ChallengeType.None,
    ChallengeDifficulty: ChallengeDifficulty.Medium,
    GroupId: null,
    Position: 0,
    Timezone: "Asia/Kuala_Lumpur",
    CreatedAt: now,
    UpdatedAt: now,
    DeletedAt: null,
    ...overrides,
  };
}

describe("mock-ipc integration", () => {
  beforeEach(async () => {
    await deleteDB();
    // Re-import to reset initPromise
    const mod = await import("@/lib/mock-ipc");
    // Reset the init promise by calling resetAllData
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

      // listAlarms filters out deleted
      const list = await mockIpc.listAlarms();
      expect(list.find((a) => a.AlarmId === alarm.AlarmId)).toBeUndefined();

      // But getAlarm still returns it (with DeletedAt set)
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

      // Reverse order
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

      // Group removed
      const groups = await mockIpc.listGroups();
      expect(groups.find((g) => g.AlarmGroupId === "g-cascade")).toBeUndefined();

      // Alarm's GroupId nullified
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
      await mockIpc.updateSettings({ Theme: "dark", Is24Hour: true });
      const settings = await mockIpc.getSettings();
      expect(settings.Theme).toBe("dark");
      expect(settings.Is24Hour).toBe(true);
      // Other defaults preserved
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
        EventType: AlarmEventType.Fired,
        Timestamp: "2026-01-01T08:00:00Z",
      };
      const e2: AlarmEvent = {
        AlarmEventId: crypto.randomUUID(),
        AlarmId: "a-1",
        EventType: AlarmEventType.Dismissed,
        Timestamp: "2026-01-01T08:05:00Z",
      };
      await mockIpc.createAlarmEvent(e1);
      await mockIpc.createAlarmEvent(e2);

      const events = await mockIpc.listAlarmEvents();
      // e2 is newer, should be first
      expect(events[0].AlarmEventId).toBe(e2.AlarmEventId);
      expect(events[1].AlarmEventId).toBe(e1.AlarmEventId);
    });
  });

  // ─── Sounds ────────────────────────────────────────────────────

  describe("sounds", () => {
    it("returns mock sounds list", () => {
      const sounds = mockIpc.listSounds();
      expect(sounds.length).toBeGreaterThan(0);
      expect(sounds[0]).toHaveProperty("SoundId");
    });
  });
});
