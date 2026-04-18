import { useEffect, useState } from "react";
import { useAlarmStore } from "@/stores/alarm-store";
import { useSettingsStore } from "@/stores/settings-store";
import { Bug, ChevronDown, ChevronUp } from "lucide-react";
import { normalizeAlarmTimezone } from "@/lib/alarm-timezone";

const TICK_MS = 1000;

const AlarmDebugPanel = () => {
  const alarms = useAlarmStore((s) => s.alarms);
  const settings = useSettingsStore((s) => s.settings);
  const [now, setNow] = useState(new Date());
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const localTime = now.toLocaleString("en-GB", {
    timeZone: normalizeAlarmTimezone(settings.SystemTimezone),
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const utcTime = now.toISOString().slice(11, 19);

  const enabledAlarms = alarms.filter((a) => a.IsEnabled);

  return (
    <div className="mt-4 rounded-xl border border-border/50 bg-muted/50 text-xs font-mono overflow-hidden">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-muted-foreground hover:text-foreground transition-colors"
      >
        <Bug className="h-3.5 w-3.5" />
        <span className="font-sans font-medium text-[11px] uppercase tracking-wider">
          Debug
        </span>
        <span className="ml-auto flex items-center gap-3 text-[11px]">
          <span className="text-foreground/70">{localTime}</span>
          {isOpen ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </span>
      </button>

      {isOpen && (
        <div className="border-t border-border/30 px-4 py-3 space-y-2.5">
          <div className="grid grid-cols-2 gap-y-1 text-[11px]">
            <span className="text-muted-foreground">Timezone</span>
            <span className="text-foreground/80 text-right">
              {settings.SystemTimezone}
            </span>
            <span className="text-muted-foreground">Local</span>
            <span className="text-foreground/80 text-right">{localTime}</span>
            <span className="text-muted-foreground">UTC</span>
            <span className="text-foreground/80 text-right">{utcTime}</span>
          </div>

          {enabledAlarms.length > 0 && (
            <div className="space-y-1 pt-1 border-t border-border/20">
              <span className="text-muted-foreground text-[10px] uppercase tracking-wider">
                Active Alarms
              </span>
              {enabledAlarms.map((alarm) => {
                const fireStr = alarm.NextFireTime
                  ? new Date(alarm.NextFireTime).toLocaleString("en-GB", {
                      timeZone: normalizeAlarmTimezone(settings.SystemTimezone),
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })
                  : "—";

                const isDue =
                  alarm.NextFireTime && new Date(alarm.NextFireTime) <= now;

                return (
                  <div
                    key={alarm.AlarmId}
                    className="flex items-center justify-between text-[11px]"
                  >
                    <span className="text-foreground/70 truncate max-w-[45%]">
                      {alarm.Label || alarm.Time}
                    </span>
                    <span
                      className={
                        isDue
                          ? "text-destructive font-semibold"
                          : "text-foreground/60"
                      }
                    >
                      {fireStr}
                      {isDue && " ⚡ DUE"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {enabledAlarms.length === 0 && (
            <p className="text-muted-foreground/60 text-[11px] italic">
              No active alarms
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default AlarmDebugPanel;