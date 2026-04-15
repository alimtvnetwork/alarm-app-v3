/**
 * IPC Adapter Tests — Verifies the adapter delegates to mock-ipc in web mode.
 */

import { describe, expect, it, beforeEach } from "vitest";
import * as adapter from "@/lib/ipc-adapter";
import { MOCK_ALARMS, MOCK_GROUPS, MOCK_SOUNDS, MOCK_EVENTS } from "@/test/fixtures";
import { DEFAULT_SETTINGS } from "@/types/alarm";

function seed() {
  localStorage.setItem("alarm_app_alarms", JSON.stringify(MOCK_ALARMS));
  localStorage.setItem("alarm_app_groups", JSON.stringify(MOCK_GROUPS));
  localStorage.setItem("alarm_app_settings", JSON.stringify(DEFAULT_SETTINGS));
  localStorage.setItem("alarm_app_events", JSON.stringify(MOCK_EVENTS));
}

describe("ipc-adapter (web mode)", () => {
  beforeEach(() => {
    localStorage.clear();
    seed();
  });

  it("isTauri returns false in web preview", () => {
    expect(adapter.isTauri()).toBe(false);
  });

  it("listAlarms returns seeded mock alarms", async () => {
    const alarms = await adapter.listAlarms();
    expect(Array.isArray(alarms)).toBe(true);
    expect(alarms.length).toBeGreaterThan(0);
  });

  it("createAlarm adds and returns alarm", async () => {
    const before = await adapter.listAlarms();
    const alarm = await adapter.createAlarm({
      AlarmId: crypto.randomUUID(),
      Time: "09:00",
      Label: "Test Adapter",
      DeletedAt: null,
    });
    expect(alarm).not.toBeNull();

    const after = await adapter.listAlarms();
    expect(after.length).toBe(before.length + 1);
  });

  it("deleteAlarm removes alarm and returns undo token", async () => {
    const alarms = await adapter.listAlarms();
    const target = alarms[0];
    const result = await adapter.deleteAlarm(target.AlarmId);
    expect(result).not.toBeNull();
    expect(result!.UndoToken).toBe(target.AlarmId);

    const after = await adapter.listAlarms();
    expect(after.find((a) => a.AlarmId === target.AlarmId)).toBeUndefined();
  });

  it("toggleAlarm flips IsEnabled", async () => {
    const alarms = await adapter.listAlarms();
    const target = alarms[0];
    const toggled = await adapter.toggleAlarm(target.AlarmId, !target.IsEnabled);
    expect(toggled).not.toBeNull();
    expect(toggled!.IsEnabled).toBe(!target.IsEnabled);
  });

  it("getSettings returns default settings", async () => {
    const settings = await adapter.getSettings();
    expect(settings.Theme).toBeDefined();
    expect(settings.SystemTimezone).toBeDefined();
  });

  it("updateSettings persists changes", async () => {
    await adapter.updateSettings({ Is24Hour: true });
    const settings = await adapter.getSettings();
    expect(settings.Is24Hour).toBe(true);
  });

  it("listGroups returns array", async () => {
    const groups = await adapter.listGroups();
    expect(Array.isArray(groups)).toBe(true);
  });

  it("createGroup adds a new group", async () => {
    const before = await adapter.listGroups();
    const group = await adapter.createGroup("Test Group", "#FF0000");
    expect(group).not.toBeNull();
    expect(group!.Name).toBe("Test Group");

    const after = await adapter.listGroups();
    expect(after.length).toBe(before.length + 1);
  });

  it("snoozeAlarm creates snooze state", async () => {
    const alarms = await adapter.listAlarms();
    const target = alarms[0];
    const state = await adapter.snoozeAlarm(target.AlarmId, 5);
    expect(state).not.toBeNull();
    expect(state!.SnoozeCount).toBe(1);
    expect(state!.AlarmId).toBe(target.AlarmId);
  });

  it("clearSnooze removes snooze state", async () => {
    const alarms = await adapter.listAlarms();
    const target = alarms[0];
    await adapter.snoozeAlarm(target.AlarmId, 5);
    await adapter.clearSnooze(target.AlarmId);
    const state = await adapter.getSnoozeState(target.AlarmId);
    expect(state).toBeNull();
  });

  it("listSounds returns built-in sounds", async () => {
    const sounds = await adapter.listSounds();
    expect(sounds.length).toBeGreaterThan(0);
    expect(sounds[0].Name).toBeDefined();
  });

  it("listAlarmEvents returns array", async () => {
    const events = await adapter.listAlarmEvents();
    expect(Array.isArray(events)).toBe(true);
  });

  it("duplicateAlarm creates copy with (copy) suffix", async () => {
    const alarms = await adapter.listAlarms();
    const target = alarms[0];
    const copy = await adapter.duplicateAlarm(target.AlarmId);
    expect(copy).not.toBeNull();
    expect(copy!.Label).toContain("(copy)");
    expect(copy!.AlarmId).not.toBe(target.AlarmId);
  });
});

describe("ipc-adapter error handling", () => {
  beforeEach(() => {
    localStorage.clear();
    seed();
  });

  it("listAlarms returns empty array when mock throws", async () => {
    const mock = await import("@/lib/mock-ipc");
    const original = mock.listAlarms;
    mock.listAlarms = () => Promise.reject(new Error("DB crash"));

    const result = await adapter.listAlarms();
    expect(result).toEqual([]);

    mock.listAlarms = original;
  });

  it("getAlarm returns null when mock throws", async () => {
    const mock = await import("@/lib/mock-ipc");
    const original = mock.getAlarm;
    mock.getAlarm = () => Promise.reject(new Error("not found"));

    const result = await adapter.getAlarm("nonexistent");
    expect(result).toBeNull();

    mock.getAlarm = original;
  });

  it("getSettings returns DEFAULT_SETTINGS when mock throws", async () => {
    const mock = await import("@/lib/mock-ipc");
    const original = mock.getSettings;
    mock.getSettings = () => Promise.reject(new Error("settings crash"));

    const result = await adapter.getSettings();
    expect(result).toEqual(DEFAULT_SETTINGS);

    mock.getSettings = original;
  });

  it("listGroups returns empty array when mock throws", async () => {
    const mock = await import("@/lib/mock-ipc");
    const original = mock.listGroups;
    mock.listGroups = () => Promise.reject(new Error("group crash"));

    const result = await adapter.listGroups();
    expect(result).toEqual([]);

    mock.listGroups = original;
  });

  it("listSounds returns empty array when mock throws", async () => {
    const mock = await import("@/lib/mock-ipc");
    const original = mock.listSounds;
    mock.listSounds = () => { throw new Error("sounds crash"); };

    const result = await adapter.listSounds();
    expect(result).toEqual([]);

    mock.listSounds = original;
  });
});
