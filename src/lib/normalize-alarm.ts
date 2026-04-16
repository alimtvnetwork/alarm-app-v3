/**
 * Alarm Normalizer — ensures alarms from any source (Rust backend, IndexedDB, import)
 * always have a valid `Repeat` field and other required nested objects.
 *
 * Root cause: The Rust backend may serialize RepeatPattern fields flat
 * (RepeatType, RepeatDaysOfWeek, RepeatIntervalMinutes, RepeatCronExpression)
 * instead of as a nested `Repeat` object, causing `alarm.Repeat` to be
 * undefined and crashing with "undefined is not an object (evaluating 'Repeat.Type')".
 */

import { RepeatType, DEFAULT_REPEAT_PATTERN } from "@/types/alarm";
import type { Alarm, RepeatPattern } from "@/types/alarm";

function parseDaysOfWeek(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value.filter((day): day is number => typeof day === "number");
  }
  if (typeof value !== "string") {
    return [];
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((day): day is number => typeof day === "number")
      : [];
  } catch {
    return [];
  }
}

/**
 * Normalizes an alarm object to ensure all required fields exist.
 * Handles:
 * - Missing `Repeat` → uses DEFAULT_REPEAT_PATTERN
 * - Flat Rust fields (RepeatType, RepeatDaysOfWeek, etc.) → rebuilds nested Repeat
 * - Partial Repeat object → fills missing sub-fields
 */
export function normalizeAlarm(raw: unknown): Alarm {
  const alarm = raw as Record<string, unknown>;

  if (!alarm.Repeat || typeof alarm.Repeat !== "object") {
    alarm.Repeat = buildRepeatFromFlat(alarm);
  } else {
    const repeat = alarm.Repeat as Partial<RepeatPattern>;
    alarm.Repeat = {
      Type: repeat.Type ?? RepeatType.Once,
      DaysOfWeek: parseDaysOfWeek(repeat.DaysOfWeek),
      IntervalMinutes:
        typeof repeat.IntervalMinutes === "number" ? repeat.IntervalMinutes : 0,
      CronExpression:
        typeof repeat.CronExpression === "string" ? repeat.CronExpression : "",
    };
  }

  return alarm as Alarm;
}

/**
 * Builds a RepeatPattern from flat Rust-style fields on the alarm object.
 */
function buildRepeatFromFlat(alarm: Record<string, unknown>): RepeatPattern {
  const repeatType =
    (alarm.RepeatType as string)
    ?? (alarm.repeat_type as string)
    ?? (alarm.Type as string)
    ?? "";
  const daysOfWeek =
    alarm.RepeatDaysOfWeek
    ?? alarm.repeat_days_of_week
    ?? alarm.DaysOfWeek
    ?? alarm.days_of_week;
  const intervalMinutes =
    (alarm.RepeatIntervalMinutes as number)
    ?? (alarm.repeat_interval_minutes as number)
    ?? (alarm.IntervalMinutes as number)
    ?? (alarm.interval_minutes as number);
  const cronExpression =
    (alarm.RepeatCronExpression as string)
    ?? (alarm.repeat_cron_expression as string)
    ?? (alarm.CronExpression as string)
    ?? (alarm.cron_expression as string);

  delete alarm.RepeatType;
  delete alarm.repeat_type;
  delete alarm.Type;
  delete alarm.RepeatDaysOfWeek;
  delete alarm.repeat_days_of_week;
  delete alarm.DaysOfWeek;
  delete alarm.days_of_week;
  delete alarm.RepeatIntervalMinutes;
  delete alarm.repeat_interval_minutes;
  delete alarm.IntervalMinutes;
  delete alarm.interval_minutes;
  delete alarm.RepeatCronExpression;
  delete alarm.repeat_cron_expression;
  delete alarm.CronExpression;
  delete alarm.cron_expression;

  if (!repeatType) {
    return { ...DEFAULT_REPEAT_PATTERN };
  }

  return {
    Type: (Object.values(RepeatType).includes(repeatType as RepeatType)
      ? repeatType
      : RepeatType.Once) as RepeatType,
    DaysOfWeek: parseDaysOfWeek(daysOfWeek),
    IntervalMinutes: typeof intervalMinutes === "number" ? intervalMinutes : 0,
    CronExpression: typeof cronExpression === "string" ? cronExpression : "",
  };
}

/**
 * Normalizes an array of alarms.
 */
export function normalizeAlarms(raw: unknown[]): Alarm[] {
  return raw.map(normalizeAlarm);
}
