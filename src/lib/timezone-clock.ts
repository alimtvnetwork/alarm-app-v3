/**
 * Timezone-aware clock helpers.
 * Returns hours/minutes/seconds in a specific IANA timezone,
 * so clock displays match the configured SystemTimezone.
 */

import { normalizeAlarmTimezone } from "@/lib/alarm-timezone";

interface TimeParts {
  hours: number;
  minutes: number;
  seconds: number;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timeZone: string): Intl.DateTimeFormat {
  const tz = normalizeAlarmTimezone(timeZone);
  const cached = formatterCache.get(tz);
  if (cached) return cached;

  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  formatterCache.set(tz, fmt);
  return fmt;
}

export function getTimeParts(date: Date, timeZone: string): TimeParts {
  const parts = getFormatter(timeZone).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);

  return {
    hours: read("hour") % 24,
    minutes: read("minute"),
    seconds: read("second"),
  };
}
