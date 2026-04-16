/**
 * AnalogClock — SVG-based analog clock with hour/minute/second hands.
 * Design: warm cream face, brown hands matching design system tokens.
 */

import { useEffect, useState } from "react";
import { useSettingsStore } from "@/stores/settings-store";
import { getTimeParts } from "@/lib/timezone-clock";
import { normalizeAlarmTimezone } from "@/lib/alarm-timezone";

const CLOCK_SIZE = 220;
const CENTER = CLOCK_SIZE / 2;
const FACE_RADIUS = 96;
const HOUR_HAND_LENGTH = 52;
const MINUTE_HAND_LENGTH = 72;
const SECOND_HAND_LENGTH = 78;

function getHandAngles(date: Date, timeZone: string) {
  const { hours, minutes, seconds } = getTimeParts(date, timeZone);
  const h = hours % 12;
  const ms = date.getMilliseconds();

  const secondAngle = ((seconds + ms / 1000) / 60) * 360;
  const minuteAngle = ((minutes + seconds / 60) / 60) * 360;
  const hourAngle = ((h + minutes / 60) / 12) * 360;

  return { hourAngle, minuteAngle, secondAngle };
}

function HandLine({
  angle,
  length,
  width,
  className,
}: {
  angle: number;
  length: number;
  width: number;
  className: string;
}) {
  const rad = ((angle - 90) * Math.PI) / 180;
  const x2 = CENTER + length * Math.cos(rad);
  const y2 = CENTER + length * Math.sin(rad);

  return (
    <line
      x1={CENTER}
      y1={CENTER}
      x2={x2}
      y2={y2}
      strokeWidth={width}
      strokeLinecap="round"
      className={className}
    />
  );
}

const AnalogClock = () => {
  const [now, setNow] = useState(new Date());
  const rawTimeZone = useSettingsStore((s) => s.settings.SystemTimezone);
  const timeZone = normalizeAlarmTimezone(rawTimeZone);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const { hourAngle, minuteAngle, secondAngle } = getHandAngles(now, timeZone);

  // Tick marks
  const ticks = Array.from({ length: 60 }, (_, i) => {
    const isHour = i % 5 === 0;
    const rad = ((i * 6 - 90) * Math.PI) / 180;
    const outerR = FACE_RADIUS - 4;
    const innerR = isHour ? FACE_RADIUS - 16 : FACE_RADIUS - 10;
    return {
      x1: CENTER + innerR * Math.cos(rad),
      y1: CENTER + innerR * Math.sin(rad),
      x2: CENTER + outerR * Math.cos(rad),
      y2: CENTER + outerR * Math.sin(rad),
      isHour,
    };
  });

  return (
    <svg
      width={CLOCK_SIZE}
      height={CLOCK_SIZE}
      viewBox={`0 0 ${CLOCK_SIZE} ${CLOCK_SIZE}`}
      aria-label="Analog clock"
      role="img"
    >
      {/* Face */}
      <circle
        cx={CENTER}
        cy={CENTER}
        r={FACE_RADIUS}
        className="fill-clock-face stroke-border"
        strokeWidth={2}
      />

      {/* Tick marks */}
      {ticks.map((t, i) => (
        <line
          key={i}
          x1={t.x1}
          y1={t.y1}
          x2={t.x2}
          y2={t.y2}
          strokeWidth={t.isHour ? 2 : 1}
          strokeLinecap="round"
          className={t.isHour ? "stroke-clock-tick" : "stroke-muted-foreground/40"}
        />
      ))}

      {/* Hour hand */}
      <HandLine
        angle={hourAngle}
        length={HOUR_HAND_LENGTH}
        width={4}
        className="stroke-clock-hand"
      />

      {/* Minute hand */}
      <HandLine
        angle={minuteAngle}
        length={MINUTE_HAND_LENGTH}
        width={3}
        className="stroke-clock-hand"
      />

      {/* Second hand */}
      <HandLine
        angle={secondAngle}
        length={SECOND_HAND_LENGTH}
        width={1.5}
        className="stroke-primary"
      />

      {/* Center dot */}
      <circle cx={CENTER} cy={CENTER} r={4} className="fill-clock-hand" />
      <circle cx={CENTER} cy={CENTER} r={2} className="fill-primary" />
    </svg>
  );
};

export default AnalogClock;
