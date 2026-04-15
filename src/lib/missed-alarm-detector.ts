/**
 * MissedAlarmDetector — Detect alarms that fired while the app was closed.
 * Compares NextFireTime with current time to find missed alarms.
 */

import type { Alarm, AlarmEvent } from "@/types/alarm";
import { AlarmEventType } from "@/types/alarm";
import * as ipc from "@/lib/ipc-adapter";

const LAST_CHECK_KEY = "alarm_app_last_check";

function getLastCheckTime(): Date {
  const raw = localStorage.getItem(LAST_CHECK_KEY);
  if (!raw) return new Date(0);
  return new Date(raw);
}

function saveLastCheckTime(): void {
  localStorage.setItem(LAST_CHECK_KEY, new Date().toISOString());
}

export interface MissedAlarm {
  alarm: Alarm;
  missedAt: string;
}

export async function detectMissedAlarms(): Promise<MissedAlarm[]> {
  const lastCheck = getLastCheckTime();
  const now = new Date();
  const alarms = await ipc.listAlarms();
  const missed: MissedAlarm[] = [];

  for (const alarm of alarms) {
    if (!alarm.IsEnabled || !alarm.NextFireTime) continue;

    const fireTime = new Date(alarm.NextFireTime);
    if (fireTime > lastCheck && fireTime <= now) {
      missed.push({ alarm, missedAt: fireTime.toISOString() });
      await logMissedEvent(alarm, fireTime.toISOString());
    }
  }

  saveLastCheckTime();
  return missed;
}

async function logMissedEvent(alarm: Alarm, firedAt: string): Promise<void> {
  const event: AlarmEvent = {
    AlarmEventId: crypto.randomUUID(),
    AlarmId: alarm.AlarmId,
    Type: AlarmEventType.Missed,
    FiredAt: firedAt,
    DismissedAt: null,
    SnoozeCount: 0,
    ChallengeType: null,
    ChallengeSolveTimeSec: null,
    SleepQuality: null,
    Mood: null,
    AlarmLabelSnapshot: alarm.Label,
    AlarmTimeSnapshot: alarm.Time,
    Timestamp: new Date().toISOString(),
  };
  await ipc.createAlarmEvent(event);
}
