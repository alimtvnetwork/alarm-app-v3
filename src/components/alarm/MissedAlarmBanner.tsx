/**
 * MissedAlarmBanner — Shows a dismissible banner when missed alarms are detected.
 */

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, X } from "lucide-react";
import { detectMissedAlarms, type MissedAlarm } from "@/lib/missed-alarm-detector";

const MissedAlarmBanner = () => {
  const [missed, setMissed] = useState<MissedAlarm[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    detectMissedAlarms().then(setMissed);
  }, []);

  if (dismissed || missed.length === 0) return null;

  const formatMissedTime = (iso: string): string => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="w-full rounded-xl bg-destructive/10 border border-destructive/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-heading font-semibold text-destructive">
              {t("missed.title", { count: missed.length })}
            </p>
            <div className="flex flex-col gap-0.5">
              {missed.map((m) => (
                <p key={m.alarm.AlarmId} className="text-xs font-body text-muted-foreground">
                  {t("missed.missedAt", {
                    name: m.alarm.Label || m.alarm.Time,
                    time: formatMissedTime(m.missedAt),
                  })}
                </p>
              ))}
            </div>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded-md p-1 hover:bg-destructive/10 transition-colors"
          aria-label="Dismiss missed alarm notification"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
};

export default MissedAlarmBanner;
