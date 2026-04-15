/**
 * AlarmChecker — Polls for due alarms every 30s and fires the overlay.
 * Also checks for missed alarms on mount (cold start).
 */

import { useEffect, useRef } from "react";
import * as ipc from "@/lib/ipc-adapter";
import { useOverlayStore } from "@/stores/overlay-store";
import { useAlarmStore } from "@/stores/alarm-store";
import { detectMissedAlarms } from "@/lib/missed-alarm-detector";
import { computeNextFireTime } from "@/lib/next-fire-time";
import { toast } from "sonner";
import { fireAlarmNotification } from "@/lib/alarm-notification";

const POLL_INTERVAL_MS = 30_000;

const AlarmChecker = () => {
  const fireAlarm = useOverlayStore((s) => s.fireAlarm);
  const isVisible = useOverlayStore((s) => s.isVisible);
  const refreshAlarms = useAlarmStore((s) => s.loadAlarms);
  const firedIdsRef = useRef<Set<string>>(new Set());

  // Cold-start: detect missed alarms
  useEffect(() => {
    detectMissedAlarms().then((missed) => {
      if (missed.length > 0) {
        toast.warning(`${missed.length} alarm(s) missed while you were away`, {
          description: missed.map((m) => `${m.alarm.Label || m.alarm.Time}`).join(", "),
          duration: 8000,
        });
      }
    });
  }, []);

  // Polling loop
  useEffect(() => {
    const check = async () => {
      if (isVisible) return;

      const alarms = await ipc.listAlarms();
      const now = new Date();

      for (const alarm of alarms) {
        if (!alarm.IsEnabled || !alarm.NextFireTime) continue;
        if (firedIdsRef.current.has(alarm.AlarmId)) continue;

        const fireTime = new Date(alarm.NextFireTime);
        if (fireTime <= now) {
          firedIdsRef.current.add(alarm.AlarmId);
          fireAlarm(alarm);
          fireAlarmNotification(alarm.Label, alarm.Time);

          const updated = { ...alarm };
          const settings = await ipc.getSettings();
          updated.NextFireTime = computeNextFireTime(updated, settings.SystemTimezone);
          if (!updated.NextFireTime) {
            updated.IsEnabled = false;
          }
          await ipc.updateAlarm(updated);
          refreshAlarms();
          break;
        }
      }
    };

    check();

    const id = setInterval(check, POLL_INTERVAL_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        check();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [fireAlarm, isVisible, refreshAlarms]);

  useEffect(() => {
    if (!isVisible) {
      const timeout = setTimeout(() => {
        firedIdsRef.current.clear();
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [isVisible]);

  return null;
};

export default AlarmChecker;
