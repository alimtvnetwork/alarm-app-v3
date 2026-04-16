/**
 * Alarm Normalizer — ensures alarms from any source (Rust backend, IndexedDB, import)
 * always have a valid `Repeat` field and other required nested objects.
 *
 * Root cause: The Rust backend may serialize RepeatPattern fields flat
 * (RepeatType, DaysOfWeek, IntervalMinutes, CronExpression) instead of
 * as a nested `Repeat` object, causing `alarm.Repeat` to be undefined
 * and crashing with "undefined is not an object (evaluating 'Repeat.Type')".
 */

import { RepeatType, DEFAULT_REPEAT_PATTERN } from "@/types/alarm";
import type { Alarm, RepeatPattern } from "@/types/alarm";

/**
 * Normalizes an alarm object to ensure all required fields exist.
 * Handles:
 * - Missing `Repeat` → uses DEFAULT_REPEAT_PATTERN
 * - Flat Rust fields (RepeatType, DaysOfWeek, etc.) → rebuilds nested Repeat
 * - Partial Repeat object → fills missing sub-fields
 */
export function normalizeAlarm(raw: unknown): Alarm {
  const alarm = raw as Record<string, unknown>;

  // Build Repeat from flat fields if nested Repeat is missing
  if (!alarm.Repeat || typeof alarm.Repeat !== "object") {
    alarm.Repeat = buildRepeatFromFlat(alarm);
  } else {
    // Ensure all sub-fields exist even if Repeat is partial
    const repeat = alarm.Repeat as Partial<RepeatPattern>;
    alarm.Repeat = {
      Type: repeat.Type ?? RepeatType.Once,
      DaysOfWeek: Array.isArray(repeat.DaysOfWeek) ? repeat.DaysOfWeek : [],
      IntervalMinutes: typeof repeat.IntervalMinutes === "number" ? repeat.IntervalMinutes : 0,
      CronExpression: typeof repeat.CronExpression === "string" ? repeat.CronExpression : "",
    };
  }

  return alarm as unknown as Alarm;
}

/**
 * Builds a RepeatPattern from flat Rust-style fields on the alarm object.
 * Looks for: RepeatType, DaysOfWeek, IntervalMinutes, CronExpression
 */
function buildRepeatFromFlat(alarm: Record<string, unknown>): RepeatPattern {
  const repeatType = (alarm.RepeatType as string) ?? (alarm.repeat_type as string);
  const daysOfWeek = (alarm.DaysOfWeek as number[]) ?? (alarm.days_of_week as number[]);
  const intervalMinutes = (alarm.IntervalMinutes as number) ?? (alarm.interval_minutes as number);
  const cronExpression = (alarm.CronExpression as string) ?? (alarm.cron_expression as string);

  // Clean up flat fields so they don't pollute the object
  delete alarm.RepeatType;
  delete alarm.repeat_type;
  delete alarm.DaysOfWeek;
  delete alarm.days_of_week;
  delete alarm.IntervalMinutes;
  delete alarm.interval_minutes;
  delete alarm.CronExpression;
  delete alarm.cron_expression;

  if (!repeatType) {
    return { ...DEFAULT_REPEAT_PATTERN };
  }

  return {
    Type: (Object.values(RepeatType).includes(repeatType as RepeatType)
      ? repeatType
      : RepeatType.Once) as RepeatType,
    DaysOfWeek: Array.isArray(daysOfWeek) ? daysOfWeek : [],
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
