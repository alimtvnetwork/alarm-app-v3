import { describe, expect, it } from "vitest";
import { serializeAlarmForTauri } from "@/lib/ipc/serialize-alarm";
import { MOCK_ALARMS } from "@/test/fixtures";

describe("serializeAlarmForTauri", () => {
  it("flattens Repeat into Rust-compatible root fields", () => {
    const payload = serializeAlarmForTauri(structuredClone(MOCK_ALARMS[0]));

    expect(payload.Repeat).toBeUndefined();
    expect(payload.RepeatType).toBe("Weekly");
    expect(payload.RepeatDaysOfWeek).toBe("[1,2,3,4,5]");
    expect(payload.RepeatIntervalMinutes).toBe(0);
    expect(payload.RepeatCronExpression).toBe("");
    expect(payload.NextFireTime).toBe(MOCK_ALARMS[0].NextFireTime);
  });
});