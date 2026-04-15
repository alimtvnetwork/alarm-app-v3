/**
 * StreakCalendar — Monthly calendar view showing alarm dismissal history.
 * Navigation arrows, day grid, today highlight, dismissal dot indicators.
 */

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AlarmEventType } from "@/types/alarm";
import * as ipc from "@/lib/ipc-adapter";

const WEEK_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const StreakCalendar = () => {
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [history, setHistory] = useState<Record<string, number>>({});

  useEffect(() => {
    ipc.listAlarmEvents().then((events) => {
      const counts: Record<string, number> = {};
      for (const ev of events) {
        if (ev.Type === AlarmEventType.Dismissed) {
          const day = ev.FiredAt.slice(0, 10);
          counts[day] = (counts[day] ?? 0) + 1;
        }
      }
      setHistory(counts);
    });
  }, []);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const monthLabel = viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const goToPrevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const goToNextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const toLocalKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const cells = useMemo(() => {
    const result: Array<{ day: number; key: string; isCurrentMonth: boolean; isToday: boolean; hasDismissal: boolean }> = [];

    for (let i = firstDay - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const key = toLocalKey(new Date(year, month - 1, d));
      result.push({ day: d, key, isCurrentMonth: false, isToday: false, hasDismissal: (history[key] ?? 0) > 0 });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const key = toLocalKey(new Date(year, month, d));
      result.push({ day: d, key, isCurrentMonth: true, isToday: key === todayStr, hasDismissal: (history[key] ?? 0) > 0 });
    }

    const remaining = 7 - (result.length % 7);
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        const key = toLocalKey(new Date(year, month + 1, d));
        result.push({ day: d, key, isCurrentMonth: false, isToday: false, hasDismissal: (history[key] ?? 0) > 0 });
      }
    }

    return result;
  }, [year, month, history, todayStr, firstDay, daysInMonth, prevMonthDays]);

  const selectedLabel = selectedDate
    ? new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
    : null;

  const selectedCount = selectedDate ? (history[selectedDate] ?? 0) : 0;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={goToPrevMonth}
            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-heading font-semibold text-foreground">{monthLabel}</span>
          <button
            onClick={goToNextMonth}
            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-0 mb-1">
          {WEEK_LABELS.map((label) => (
            <span key={label} className="text-center text-[11px] font-body font-medium text-muted-foreground py-1">
              {label}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell) => {
            const isSelected = cell.key === selectedDate;
            return (
              <button
                key={cell.key}
                onClick={() => setSelectedDate(cell.key === selectedDate ? null : cell.key)}
                className={`relative flex items-center justify-center aspect-square text-sm font-body transition-colors rounded-full
                  ${!cell.isCurrentMonth ? "text-muted-foreground/40" : ""}
                  ${cell.isToday ? "bg-foreground text-card font-semibold" : ""}
                  ${isSelected && !cell.isToday ? "bg-secondary font-semibold text-foreground" : ""}
                  ${cell.isCurrentMonth && !cell.isToday && !isSelected ? "text-foreground hover:bg-secondary/60" : ""}
                `}
              >
                {cell.day}
                {cell.hasDismissal && (
                  <span className={`absolute bottom-1 h-1 w-1 rounded-full ${cell.isToday ? "bg-card/60" : "bg-primary"}`} />
                )}
              </button>
            );
          })}
        </div>

        {selectedLabel && (
          <div className="mt-4 pt-3 border-t border-border">
            <p className="text-sm font-heading font-semibold text-foreground">{selectedLabel}</p>
            {selectedCount > 0 ? (
              <p className="text-xs font-body text-muted-foreground mt-1">
                {selectedCount} alarm{selectedCount > 1 ? "s" : ""} dismissed
              </p>
            ) : (
              <p className="text-xs font-body text-muted-foreground mt-1">No alarms dismissed</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StreakCalendar;
