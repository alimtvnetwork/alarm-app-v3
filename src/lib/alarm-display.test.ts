import { describe, expect, it } from "vitest";
import { formatAlarmCardTitle, formatAlarmWaitText } from "@/lib/alarm-display";
import { MOCK_ALARMS } from "@/test/fixtures";

function translate(key: string, options?: Record<string, unknown>): string {
  if (key === "clock.alarmIn") return `Alarm in ${String(options?.time ?? "")}`;
  if (key === "clock.hours") return `${String(options?.count ?? 0)} hours`;
  if (key === "clock.minutes") return `${String(options?.count ?? 0)} minutes`;
  if (key === "clock.and") return "and";
  if (key === "alarmForm.once") return "Once";
  return key;
}

describe("alarm display helpers", () => {
  it("formats the wait text from next fire time", () => {
    const waitText = formatAlarmWaitText(
      "2026-04-16T02:30:00.000Z",
      translate,
      new Date("2026-04-16T00:00:00.000Z"),
    );

    expect(waitText).toBe("Alarm in 2 hours and 30 minutes");
  });

  it("uses the formatted next run as title when no label exists", () => {
    const title = formatAlarmCardTitle(
      { ...MOCK_ALARMS[0], Label: "", NextFireTime: "2026-04-16T23:00:00.000Z" },
      "Asia/Kuala_Lumpur",
      false,
      translate,
    );

    expect(title).not.toBe("Once");
    expect(title.length).toBeGreaterThan(0);
  });
});