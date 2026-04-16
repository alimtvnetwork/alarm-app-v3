import { describe, expect, it } from "vitest";
import type { Alarm } from "@/types/alarm";
import { DEFAULT_REPEAT_PATTERN, RepeatType } from "@/types/alarm";
import {
  DEFAULT_ALARM_TIMEZONE,
  normalizeAlarmTimezone,
} from "@/lib/alarm-timezone";
import { computeNextFireTime } from "@/lib/next-fire-time";

function buildAlarm(partial: Partial<Alarm>): Alarm {
  return {
    AlarmId: "alarm-1",
    Time: "08:01",
    Date: null,
    Label: "Test",
    IsEnabled: true,
    IsPreviousEnabled: null,
    Repeat: { ...DEFAULT_REPEAT_PATTERN, Type: RepeatType.Daily },
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
    CreatedAt: "2026-04-13T00:00:00.000Z",
    UpdatedAt: "2026-04-13T00:00:00.000Z",
    ...partial,
  };
}

describe("computeNextFireTime", () => {
  it("computes the next daily alarm in Malaysia time", () => {
    const now = new Date("2026-04-13T00:00:00.000Z");

    const nextFireTime = computeNextFireTime(
      buildAlarm({}),
      DEFAULT_ALARM_TIMEZONE,
      now,
    );

    expect(nextFireTime).toBe("2026-04-13T00:01:00.000Z");
  });

  it("rolls the next daily alarm to tomorrow after the local time passes", () => {
    const now = new Date("2026-04-13T00:02:00.000Z");

    const nextFireTime = computeNextFireTime(
      buildAlarm({}),
      DEFAULT_ALARM_TIMEZONE,
      now,
    );

    expect(nextFireTime).toBe("2026-04-14T00:01:00.000Z");
  });

  it("preserves explicit once dates in Malaysia time", () => {
    const now = new Date("2026-04-12T16:00:00.000Z");

    const nextFireTime = computeNextFireTime(
      buildAlarm({
        Time: "07:30",
        Date: "2026-04-13",
        Repeat: { ...DEFAULT_REPEAT_PATTERN, Type: RepeatType.Once },
      }),
      DEFAULT_ALARM_TIMEZONE,
      now,
    );

    expect(nextFireTime).toBe("2026-04-12T23:30:00.000Z");
  });

  it("normalizes simple flat repeat fields before reading alarm.Repeat.Type", () => {
    const now = new Date("2026-04-13T00:00:00.000Z");
    const rawAlarm = {
      ...buildAlarm({}),
      Repeat: undefined,
      RepeatType: RepeatType.Daily,
      DaysOfWeek: [],
      IntervalMinutes: 0,
      CronExpression: "",
    } as unknown as Alarm;

    const nextFireTime = computeNextFireTime(
      rawAlarm,
      DEFAULT_ALARM_TIMEZONE,
      now,
    );

    expect(nextFireTime).toBe("2026-04-13T00:01:00.000Z");
  });

  it("normalizes Rust RepeatDaysOfWeek payloads before reading alarm.Repeat.Type", () => {
    const now = new Date("2026-04-13T00:00:00.000Z");
    const rawAlarm = {
      ...buildAlarm({}),
      Repeat: undefined,
      RepeatType: RepeatType.Weekly,
      RepeatDaysOfWeek: "[1,3,5]",
      RepeatIntervalMinutes: 0,
      RepeatCronExpression: "",
    } as unknown as Alarm;

    const nextFireTime = computeNextFireTime(
      rawAlarm,
      DEFAULT_ALARM_TIMEZONE,
      now,
    );

    expect(nextFireTime).toBe("2026-04-13T00:01:00.000Z");
  });

  it("normalizes legacy UTC settings to Malaysia time", () => {
    expect(normalizeAlarmTimezone("UTC")).toBe(DEFAULT_ALARM_TIMEZONE);
  });
});
