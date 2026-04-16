import { normalizeAlarmTimezone } from "@/lib/alarm-timezone";
import type { Alarm } from "@/types/alarm";

const MS_PER_MINUTE = 60_000;
const MINUTES_PER_HOUR = 60;

type Translate = (key: string, options?: Record<string, unknown>) => string;

function formatAlarmDuration(totalMinutes: number, t: Translate): string {
  const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
  const minutes = totalMinutes % MINUTES_PER_HOUR;
  if (hours === 0) return t("clock.minutes", { count: minutes });
  if (minutes === 0) return t("clock.hours", { count: hours });

  return [
    t("clock.hours", { count: hours }),
    t("clock.and"),
    t("clock.minutes", { count: minutes }),
  ].join(" ");
}

export function formatAlarmWaitText(
  nextFireTime: string | null,
  t: Translate,
  now = new Date(),
): string | null {
  if (!nextFireTime) return null;
  const diffMs = new Date(nextFireTime).getTime() - now.getTime();
  const totalMinutes = Math.max(0, Math.ceil(diffMs / MS_PER_MINUTE));
  return t("clock.alarmIn", { time: formatAlarmDuration(totalMinutes, t) });
}

export function formatAlarmNextRunText(
  nextFireTime: string | null,
  timeZone: string,
  is24Hour: boolean,
): string | null {
  if (!nextFireTime) return null;

  return new Date(nextFireTime).toLocaleString(undefined, {
    timeZone: normalizeAlarmTimezone(timeZone),
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: !is24Hour,
  });
}

export function formatAlarmCardTitle(
  alarm: Alarm,
  timeZone: string,
  is24Hour: boolean,
  t: Translate,
): string {
  return alarm.Label || formatAlarmNextRunText(alarm.NextFireTime, timeZone, is24Hour) || t("alarmForm.once");
}