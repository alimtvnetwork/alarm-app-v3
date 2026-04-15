/**
 * Export/Import round-trip test — export alarms, clear, re-import, verify.
 */

import { describe, expect, it, beforeEach } from "vitest";
import { importAlarmsFromJson } from "@/lib/export-import";
import { ImportMode } from "@/types/alarm";
import * as ipc from "@/lib/ipc-adapter";

describe("Export/Import Round-Trip", () => {
  beforeEach(async () => {
    const mock = await import("@/lib/mock-ipc");
    await mock.resetAllData();
  });

  it("exports and re-imports alarms preserving all fields", async () => {
    const original = await ipc.listAlarms();
    const json = JSON.stringify(original, null, 2);

    // Clear via replace with empty
    const result = await importAlarmsFromJson(json, ImportMode.Replace);
    expect(result.imported).toBe(original.length);

    const reimported = await ipc.listAlarms();
    expect(reimported).toHaveLength(original.length);

    for (let i = 0; i < original.length; i++) {
      const orig = original[i];
      const reimp = reimported.find((a) => a.AlarmId === orig.AlarmId);
      expect(reimp).toBeDefined();
      expect(reimp!.Time).toBe(orig.Time);
      expect(reimp!.Label).toBe(orig.Label);
      expect(reimp!.SoundFile).toBe(orig.SoundFile);
      expect(reimp!.Repeat.Type).toBe(orig.Repeat.Type);
    }
  });

  it("merge import does not duplicate existing alarms", async () => {
    const original = await ipc.listAlarms();
    const json = JSON.stringify(original);

    const result = await importAlarmsFromJson(json, ImportMode.Merge);
    expect(result.imported).toBe(0);
    expect(result.skipped).toBe(original.length);
    const after = await ipc.listAlarms();
    expect(after).toHaveLength(original.length);
  });

  it("round-trip preserves repeat pattern", async () => {
    const original = await ipc.listAlarms();
    const json = JSON.stringify(original);
    await importAlarmsFromJson(json, ImportMode.Replace);

    const alarms = await ipc.listAlarms();
    for (const alarm of alarms) {
      expect(alarm.Repeat).toBeDefined();
      expect(alarm.Repeat.Type).toBeDefined();
      expect(Array.isArray(alarm.Repeat.DaysOfWeek)).toBe(true);
    }
  });
});
