/**
 * useDerivedAnalytics — Computes daily event data, snooze trends,
 * totals, avg solve time, streak, and pie breakdown from alarm events.
 */

import { useMemo } from "react";
import { AlarmEventType } from "@/types/alarm";
import * as ipc from "@/lib/mock-ipc";

const MAX_STREAK_DAYS = 365;

export interface DerivedAnalytics {
  dailyData: { date: string; fired: number; snoozed: number; dismissed: number; missed: number }[];
  snoozeTrend: { date: string; snoozeCount: number }[];
  totalFired: number;
  totalSnoozed: number;
  avgSolveTime: number;
  streak: number;
  pieData: { name: string; value: number }[];
}

function computeAvgSolveTime(events: ReturnType<typeof ipc.listAlarmEvents>): number {
  const solved = events.filter((e) => e.ChallengeSolveTimeSec !== null);
  if (solved.length === 0) return 0;
  return solved.reduce((sum, e) => sum + (e.ChallengeSolveTimeSec ?? 0), 0) / solved.length;
}

function computeStreak(events: ReturnType<typeof ipc.listAlarmEvents>): number {
  const dismissDates = new Set(
    events
      .filter((e) => e.Type === AlarmEventType.Fired || e.Type === AlarmEventType.Dismissed)
      .map((e) => e.FiredAt.split("T")[0])
  );

  let streak = 0;
  const today = new Date();
  for (let i = 0; i < MAX_STREAK_DAYS; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    if (!dismissDates.has(dateStr)) break;
    streak++;
  }
  return streak;
}

export function useDerivedAnalytics(): DerivedAnalytics {
  const events = ipc.listAlarmEvents();

  return useMemo(() => {
    const byDate = new Map<string, { fired: number; snoozed: number; dismissed: number; missed: number }>();
    events.forEach((e) => {
      const date = e.FiredAt.split("T")[0];
      const entry = byDate.get(date) ?? { fired: 0, snoozed: 0, dismissed: 0, missed: 0 };
      const key = e.Type.toLowerCase() as "fired" | "snoozed" | "dismissed" | "missed";
      entry[key] += 1;
      byDate.set(date, entry);
    });

    const dailyData = Array.from(byDate.entries())
      .map(([date, counts]) => ({ date: date.slice(5), ...counts }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const snoozeTrend = events
      .filter((e) => e.SnoozeCount > 0)
      .map((e) => ({
        date: e.FiredAt.split("T")[0].slice(5),
        snoozeCount: e.SnoozeCount,
      }));

    const totalFired = events.filter((e) => e.Type === AlarmEventType.Fired).length;
    const totalSnoozed = events.filter((e) => e.Type === AlarmEventType.Snoozed).length;
    const totalDismissed = events.filter((e) => e.Type === AlarmEventType.Dismissed).length;
    const totalMissed = events.filter((e) => e.Type === AlarmEventType.Missed).length;

    const pieData = [
      { name: "Fired", value: totalFired },
      { name: "Snoozed", value: totalSnoozed },
      { name: "Dismissed", value: totalDismissed },
      { name: "Missed", value: totalMissed },
    ].filter((d) => d.value > 0);

    return {
      dailyData,
      snoozeTrend,
      totalFired,
      totalSnoozed,
      avgSolveTime: computeAvgSolveTime(events),
      streak: computeStreak(events),
      pieData,
    };
  }, [events]);
}
