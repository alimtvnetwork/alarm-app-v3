/**
 * Export/Import Tests — Verifies JSON export format and import merge/replace modes.
 */

import { describe, expect, it, beforeEach, vi } from "vitest";
import { importAlarmsFromJson } from "@/lib/export-import";
import { ImportMode, DEFAULT_SETTINGS } from "@/types/alarm";
import * as ipc from "@/lib/ipc-adapter";
import { MOCK_ALARMS, MOCK_GROUPS } from "@/test/fixtures";

describe("export-import", () => {
  beforeEach(async () => {
    const mock = await import("@/lib/mock-ipc");
    await mock.resetAllData();
  });

  it("importAlarmsFromJson in Merge mode skips existing IDs", async () => {
    const existing = await ipc.listAlarms();
    const json = JSON.stringify(existing);

    const result = await importAlarmsFromJson(json, ImportMode.Merge);
    expect(result.skipped).toBe(existing.length);
    expect(result.imported).toBe(0);
  });

  it("importAlarmsFromJson in Merge mode adds new alarms", async () => {
    const alarms = await ipc.listAlarms();
    const newAlarm = {
      ...alarms[0],
      AlarmId: "import-test-new-id",
      Label: "Imported",
    };
    const json = JSON.stringify([newAlarm]);

    const result = await importAlarmsFromJson(json, ImportMode.Merge);
    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(0);
  });

  it("importAlarmsFromJson in Replace mode replaces all alarms", async () => {
    const before = await ipc.listAlarms();
    expect(before.length).toBeGreaterThan(0);

    const newAlarms = [
      { ...before[0], AlarmId: "replace-1", Label: "Replaced" },
    ];
    const json = JSON.stringify(newAlarms);

    const result = await importAlarmsFromJson(json, ImportMode.Replace);
    expect(result.imported).toBe(1);
  });

  it("importAlarmsFromJson throws on invalid input", async () => {
    await expect(importAlarmsFromJson("{}", ImportMode.Merge)).rejects.toThrow(
      "Invalid format"
    );
  });

  it("importAlarmsFromJson throws on malformed JSON", async () => {
    await expect(importAlarmsFromJson("not json", ImportMode.Merge)).rejects.toThrow();
  });
});
