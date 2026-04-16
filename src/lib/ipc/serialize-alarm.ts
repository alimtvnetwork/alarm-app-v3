import { normalizeAlarm } from "@/lib/normalize-alarm";
import type { Alarm } from "@/types/alarm";

const EMPTY_REPEAT_DAYS = "[]";

function stringifyRepeatDays(daysOfWeek: number[]): string {
  return daysOfWeek.length === 0 ? EMPTY_REPEAT_DAYS : JSON.stringify(daysOfWeek);
}

export function serializeAlarmForTauri(alarm: Partial<Alarm>): Record<string, unknown> {
  const normalizedAlarm = normalizeAlarm(alarm);
  const { Repeat, ...rest } = normalizedAlarm;

  return {
    ...rest,
    RepeatType: Repeat.Type,
    RepeatDaysOfWeek: stringifyRepeatDays(Repeat.DaysOfWeek),
    RepeatIntervalMinutes: Repeat.IntervalMinutes,
    RepeatCronExpression: Repeat.CronExpression,
  };
}