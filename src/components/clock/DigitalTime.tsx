/**
 * DigitalTime — Animated flip-clock style digital time display.
 * Each digit animates on change. Hours get a special glow animation.
 * AM/PM badge is vertically centered.
 */

import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useSettingsStore } from "@/stores/settings-store";
import { useAlarmStore } from "@/stores/alarm-store";
import { getTimeParts } from "@/lib/timezone-clock";
import type { Alarm } from "@/types/alarm";

interface AnimatedDigitProps {
  digit: string;
  variant: "second" | "minute" | "hour";
}

const AnimatedDigit = ({ digit, variant }: AnimatedDigitProps) => {
  const prevRef = useRef(digit);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (prevRef.current !== digit) {
      prevRef.current = digit;
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 500);
      return () => clearTimeout(timer);
    }
  }, [digit]);

  const animationClass = isAnimating
    ? variant === "hour"
      ? "animate-digit-hour-glow"
      : variant === "minute"
        ? "animate-digit-roll"
        : "animate-digit-flip"
    : "";

  return (
    <span className={`inline-block tabular-nums transition-colors ${animationClass}`}>
      {digit}
    </span>
  );
};

interface FlipSegmentProps {
  value: string;
  label: string;
  variant: "second" | "minute" | "hour";
}

const FlipSegment = ({ value, label, variant }: FlipSegmentProps) => (
  <div className="flex flex-col items-center gap-0.5">
    <div className="text-3xl font-heading font-light tracking-wide text-flip-clock-text leading-none flex">
      {value.split("").map((char, i) => (
        <AnimatedDigit key={`${variant}-${i}`} digit={char} variant={variant} />
      ))}
    </div>
    <span className="text-[0.5rem] font-body font-medium tracking-[0.15em] uppercase text-flip-clock-text/40">
      {label}
    </span>
  </div>
);

const Colon = () => (
  <span className="text-xl font-heading font-light text-flip-clock-text/25 leading-none mb-3 animate-colon-pulse">
    :
  </span>
);

const DigitalTime = () => {
  const [now, setNow] = useState(new Date());
  const is24Hour = useSettingsStore((s) => s.settings.Is24Hour);
  const timeZone = useSettingsStore((s) => s.settings.SystemTimezone);
  const alarms = useAlarmStore((s) => s.alarms);
  const { t } = useTranslation();

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const { hours: h, minutes: m, seconds: s } = getTimeParts(now, timeZone);

  const displayHour = is24Hour
    ? String(h).padStart(2, "0")
    : String(h % 12 || 12).padStart(2, "0");
  const displayMin = String(m).padStart(2, "0");
  const displaySec = String(s).padStart(2, "0");
  const period = is24Hour ? null : (h >= 12 ? "PM" : "AM");

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      {/* Flip-clock card */}
      <div className="relative w-full max-w-sm rounded-2xl bg-flip-clock-bg px-5 py-5 shadow-lg">
        <div className="flex items-center justify-center gap-3">
          <FlipSegment value={displayHour} label={t("clock.hoursLabel", "HOURS")} variant="hour" />
          <Colon />
          <FlipSegment value={displayMin} label={t("clock.minutesLabel", "MINUTES")} variant="minute" />
          <Colon />
          <FlipSegment value={displaySec} label={t("clock.secondsLabel", "SECONDS")} variant="second" />
        </div>

        {/* AM/PM badge — vertically centered */}
        {period && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg bg-primary px-2.5 py-1.5">
            <span className="text-xs font-heading font-semibold tracking-wider text-primary-foreground">
              {period}
            </span>
          </div>
        )}
      </div>

      {/* Date below */}
      <p className="text-sm text-muted-foreground font-body">
        {now.toLocaleDateString("en-US", {
          timeZone,
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
      </p>
    </div>
  );
};

function getCountdown(
  alarms: Alarm[],
  t: (key: string, opts?: Record<string, unknown>) => string,
): string | null {
  const now = Date.now();
  let minDiffMs = Infinity;

  for (const alarm of alarms) {
    if (!alarm.IsEnabled || !alarm.NextFireTime) continue;
    const diff = new Date(alarm.NextFireTime).getTime() - now;
    if (diff > 0 && diff < minDiffMs) minDiffMs = diff;
  }

  if (minDiffMs === Infinity) return null;

  const MINUTE_MS = 60_000;
  const MINUTES_PER_HOUR = 60;
  const totalMin = Math.floor(minDiffMs / MINUTE_MS);
  const hours = Math.floor(totalMin / MINUTES_PER_HOUR);
  const mins = totalMin % MINUTES_PER_HOUR;

  const timeParts: string[] = [];
  if (hours > 0) timeParts.push(t("clock.hours", { count: hours }));
  if (mins > 0) timeParts.push(t("clock.minutes", { count: mins }));
  if (timeParts.length === 0) timeParts.push(t("clock.minutes", { count: 0 }));

  return t("clock.alarmIn", { time: timeParts.join(` ${t("clock.and")} `) });
}

export default DigitalTime;
