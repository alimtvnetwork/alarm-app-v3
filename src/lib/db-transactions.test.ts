import { describe, it, expect, beforeEach } from "vitest";
import { runTransaction, purgeExpiredEvents } from "@/lib/db-transactions";
import { getDB, deleteDB } from "@/lib/indexed-db";
import { AppError } from "@/types/errors";

async function resetDatabase() {
  await deleteDB();
}

describe("runTransaction", () => {
  beforeEach(resetDatabase);

  it("commits data on success", async () => {
    await runTransaction(["Settings"], async (tx) => {
      await tx.objectStore("Settings").put({ Key: "TestKey", Value: "hello", ValueType: "String" });
    });

    const db = await getDB();
    const row = await db.get("Settings", "TestKey");
    expect(row?.Value).toBe("hello");
  });

  it("writes to multiple stores atomically", async () => {
    await runTransaction(["Alarms", "AlarmGroups"], async (tx) => {
      await tx.objectStore("AlarmGroups").put({
        AlarmGroupId: "g1", Name: "Work", Color: "#fff", Position: 0, IsEnabled: 1,
      });
      await tx.objectStore("Alarms").put({
        AlarmId: "a1", Time: "07:00", Label: "Test", GroupId: "g1",
        IsEnabled: 1, CreatedAt: new Date().toISOString(), UpdatedAt: new Date().toISOString(),
      });
    });

    const db = await getDB();
    const group = await db.get("AlarmGroups", "g1");
    const alarm = await db.get("Alarms", "a1");
    expect(group).toBeDefined();
    expect(alarm).toBeDefined();
  });

  it("rolls back on error and throws AppError", async () => {
    // Seed a row first
    const db = await getDB();
    await db.put("Settings", { Key: "Existing", Value: "before", ValueType: "String" });

    await expect(
      runTransaction(["Settings"], async (tx) => {
        await tx.objectStore("Settings").put({ Key: "Existing", Value: "changed", ValueType: "String" });
        throw new Error("simulated failure");
      }),
    ).rejects.toThrow(AppError);

    // Value should remain unchanged (rollback)
    const row = await db.get("Settings", "Existing");
    expect(row?.Value).toBe("before");
  });

  it("returns the callback result", async () => {
    const result = await runTransaction(["Settings"], async (tx) => {
      await tx.objectStore("Settings").put({ Key: "K", Value: "V", ValueType: "String" });
      return 42;
    });
    expect(result).toBe(42);
  });
});

describe("purgeExpiredEvents", () => {
  beforeEach(resetDatabase);

  it("purges events older than retention days", async () => {
    const db = await getDB();

    // Set retention to 7 days
    await db.put("Settings", { Key: "EventRetentionDays", Value: "7", ValueType: "Integer" });

    const now = new Date();
    const old = new Date(now);
    old.setDate(old.getDate() - 10);
    const recent = new Date(now);
    recent.setDate(recent.getDate() - 3);

    await db.put("AlarmEvents", {
      AlarmEventId: "old1", AlarmId: "a1", Type: "Fired",
      FiredAt: old.toISOString(), Timestamp: old.toISOString(),
      SnoozeCount: 0, AlarmLabelSnapshot: "", AlarmTimeSnapshot: "",
    });
    await db.put("AlarmEvents", {
      AlarmEventId: "recent1", AlarmId: "a1", Type: "Fired",
      FiredAt: recent.toISOString(), Timestamp: recent.toISOString(),
      SnoozeCount: 0, AlarmLabelSnapshot: "", AlarmTimeSnapshot: "",
    });

    const purged = await purgeExpiredEvents();
    expect(purged).toBe(1);

    const remaining = await db.getAll("AlarmEvents");
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.AlarmEventId).toBe("recent1");
  });

  it("returns 0 when no events are expired", async () => {
    const db = await getDB();
    const now = new Date();

    await db.put("AlarmEvents", {
      AlarmEventId: "fresh1", AlarmId: "a1", Type: "Fired",
      FiredAt: now.toISOString(), Timestamp: now.toISOString(),
      SnoozeCount: 0, AlarmLabelSnapshot: "", AlarmTimeSnapshot: "",
    });

    const purged = await purgeExpiredEvents();
    expect(purged).toBe(0);
  });

  it("uses default 90 days when no setting exists", async () => {
    const db = await getDB();
    const old = new Date();
    old.setDate(old.getDate() - 100);

    await db.put("AlarmEvents", {
      AlarmEventId: "ancient1", AlarmId: "a1", Type: "Fired",
      FiredAt: old.toISOString(), Timestamp: old.toISOString(),
      SnoozeCount: 0, AlarmLabelSnapshot: "", AlarmTimeSnapshot: "",
    });

    const purged = await purgeExpiredEvents();
    expect(purged).toBe(1);
  });

  it("returns 0 when retention is 0 (disabled)", async () => {
    const db = await getDB();
    await db.put("Settings", { Key: "EventRetentionDays", Value: "0", ValueType: "Integer" });

    const old = new Date();
    old.setDate(old.getDate() - 1000);
    await db.put("AlarmEvents", {
      AlarmEventId: "x1", AlarmId: "a1", Type: "Fired",
      FiredAt: old.toISOString(), Timestamp: old.toISOString(),
      SnoozeCount: 0, AlarmLabelSnapshot: "", AlarmTimeSnapshot: "",
    });

    const purged = await purgeExpiredEvents();
    expect(purged).toBe(0);
  });
});
