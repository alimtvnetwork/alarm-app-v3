/**
 * NextFireTime — Compute the next fire time for an alarm.
 * Handles Once, Daily, and Weekly repeat patterns.
 */

import type { Alarm } from "@/types/alarm";
import { RepeatType } from "@/types/alarm";
import { DEFAULT_ALARM_TIMEZONE, normalizeAlarmTimezone } from "@/lib/alarm-timezone";

interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

interface ClockTime {
  hour: number;
  minute: number;
}

type ZonedDateTime = CalendarDate & ClockTime;

const WEEK_LOOKAHEAD_DAYS = 7;
const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timeZone: string): Intl.DateTimeFormat {
  const tz = normalizeAlarmTimezone(timeZone);
  const cached = formatterCache.get(tz);
  if (cached) return cached;

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  formatterCache.set(timeZone, formatter);
  return formatter;
}

function readPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): number {
  return Number(parts.find((part) => part.type === type)?.value ?? 0);
}

function parseTime(value: string): ClockTime | null {
  const [hour, minute] = value.split(":").map(Number);
  const isValid = Number.isInteger(hour)
    && Number.isInteger(minute)
    && hour >= 0
    && hour < 24
    && minute >= 0
    && minute < 60;
  return isValid ? { hour, minute } : null;
}

function parseDate(value: string | null): CalendarDate | null {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const isValid = Number.isInteger(year)
    && Number.isInteger(month)
    && Number.isInteger(day)
    && date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
  return isValid ? { year, month, day } : null;
}

function getComparableStamp(value: ZonedDateTime): number {
  return Date.UTC(value.year, value.month - 1, value.day, value.hour, value.minute, 0, 0);
}

function getZonedDateTime(date: Date, timeZone: string): ZonedDateTime {
  const parts = getFormatter(timeZone).formatToParts(date);
  return {
    year: readPart(parts, "year"),
    month: readPart(parts, "month"),
    day: readPart(parts, "day"),
    hour: readPart(parts, "hour") % 24,
    minute: readPart(parts, "minute"),
  };
}

function getToday(now: Date, timeZone: string): CalendarDate {
  const { year, month, day } = getZonedDateTime(now, timeZone);
  return { year, month, day };
}

function addDays(date: CalendarDate, offset: number): CalendarDate {
  const value = new Date(Date.UTC(date.year, date.month - 1, date.day));
  value.setUTCDate(value.getUTCDate() + offset);
  return {
    year: value.getUTCFullYear(),
    month: value.getUTCMonth() + 1,
    day: value.getUTCDate(),
  };
}

function getWeekday(date: CalendarDate): number {
  return new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();
}

function toUtcDate(date: CalendarDate, time: ClockTime, timeZone: string): Date {
  const target = { ...date, ...time };
  let guess = getComparableStamp(target);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const zoned = getZonedDateTime(new Date(guess), timeZone);
    const diff = getComparableStamp(target) - getComparableStamp(zoned);
    if (diff === 0) break;
    guess += diff;
  }

  return new Date(guess);
}

function computeOnce(alarm: Alarm, time: ClockTime, now: Date, timeZone: string): string | null {
  const explicitDate = parseDate(alarm.Date);
  if (alarm.Date && !explicitDate) return null;
  const date = explicitDate ?? getToday(now, timeZone);
  const target = toUtcDate(date, time, timeZone);
  if (explicitDate) return target > now ? target.toISOString() : null;
  return target > now
    ? target.toISOString()
    : toUtcDate(addDays(date, 1), time, timeZone).toISOString();
}

function computeDaily(time: ClockTime, now: Date, timeZone: string): string {
  const today = getToday(now, timeZone);
  const target = toUtcDate(today, time, timeZone);
  return target > now
    ? target.toISOString()
    : toUtcDate(addDays(today, 1), time, timeZone).toISOString();
}

function computeWeekly(alarm: Alarm, time: ClockTime, now: Date, timeZone: string): string | null {
  if (alarm.Repeat.DaysOfWeek.length === 0) return null;
  const today = getToday(now, timeZone);

  for (let offset = 0; offset <= WEEK_LOOKAHEAD_DAYS; offset += 1) {
    const date = addDays(today, offset);
    if (!alarm.Repeat.DaysOfWeek.includes(getWeekday(date))) continue;
    const target = toUtcDate(date, time, timeZone);
    if (target > now) return target.toISOString();
  }

  return null;
}

export function computeNextFireTime(
  alarm: Alarm,
  timeZone = DEFAULT_ALARM_TIMEZONE,
  now = new Date(),
): string | null {
  if (!alarm.IsEnabled) return null;

  const time = parseTime(alarm.Time);
  if (!time) return null;

  const resolvedTimeZone = normalizeAlarmTimezone(timeZone);

  if (alarm.Repeat.Type === RepeatType.Once) {
    return computeOnce(alarm, time, now, resolvedTimeZone);
  }

  if (alarm.Repeat.Type === RepeatType.Daily) {
    return computeDaily(time, now, resolvedTimeZone);
  }

  if (alarm.Repeat.Type === RepeatType.Weekly) {
    return computeWeekly(alarm, time, now, resolvedTimeZone);
  }

  return null;
}
