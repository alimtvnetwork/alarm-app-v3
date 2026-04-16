const LEGACY_RUNTIME_TIMEZONES = new Set(["UTC", "Etc/UTC"]);

export const DEFAULT_ALARM_TIMEZONE = "Asia/Kuala_Lumpur";

export function normalizeAlarmTimezone(timeZone?: string | null): string {
  if (!timeZone || timeZone.trim() === "") return DEFAULT_ALARM_TIMEZONE;
  return LEGACY_RUNTIME_TIMEZONES.has(timeZone)
    ? DEFAULT_ALARM_TIMEZONE
    : timeZone;
}