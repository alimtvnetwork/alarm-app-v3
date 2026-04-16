/**
 * AlarmCard — Compact alarm row: drag handle, time+label+repeat, toggle.
 * Right-click context menu for Edit, Duplicate, Delete. Swipe-left to delete on touch.
 */

import { GripVertical, Pencil, Copy, Trash2 } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslation } from "react-i18next";
import { Switch } from "@/components/ui/switch";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { Alarm, AlarmGroup } from "@/types/alarm";
import { RepeatType } from "@/types/alarm";
import { useAlarmStore } from "@/stores/alarm-store";
import { useSettingsStore } from "@/stores/settings-store";
import { formatAlarmWaitText } from "@/lib/alarm-display";
import { useState, useRef } from "react";

function formatRepeat(alarm: Alarm, t: (key: string) => string): string {
  const { Repeat } = alarm;
  switch (Repeat.Type) {
    case RepeatType.Daily:
      return t("alarm.everyDay");
    case RepeatType.Weekly: {
      if (Repeat.DaysOfWeek.length === 7) return t("alarm.everyDay");
      if (
        Repeat.DaysOfWeek.length === 5 &&
        [1, 2, 3, 4, 5].every((d) => Repeat.DaysOfWeek.includes(d))
      ) {
        return t("alarm.weekdays");
      }
      if (
        Repeat.DaysOfWeek.length === 2 &&
        Repeat.DaysOfWeek.includes(0) &&
        Repeat.DaysOfWeek.includes(6)
      ) {
        return t("alarm.weekends");
      }
      const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      return Repeat.DaysOfWeek.map((d) => DAY_LABELS[d]).join(", ");
    }
    case RepeatType.Interval:
      return `Every ${Repeat.IntervalMinutes} min`;
    case RepeatType.Cron:
      return t("alarm.customSchedule");
    default:
      return alarm.Date ?? t("alarmForm.once");
  }
}

interface AlarmCardProps {
  alarm: Alarm;
  group: AlarmGroup | undefined;
  onEdit: (alarm: Alarm) => void;
  onDelete: (alarm: Alarm) => void;
}

const AlarmCard = ({ alarm, group, onEdit, onDelete }: AlarmCardProps) => {
  const toggleAlarm = useAlarmStore((s) => s.toggleAlarm);
  const duplicateAlarm = useAlarmStore((s) => s.duplicateAlarm);
  const { t } = useTranslation();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: alarm.AlarmId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Swipe-to-delete state
  const [swipeX, setSwipeX] = useState(0);
  const startXRef = useRef(0);
  const swipingRef = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    swipingRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const diff = e.touches[0].clientX - startXRef.current;
    if (diff < -10) {
      swipingRef.current = true;
      setSwipeX(Math.max(diff, -100));
    }
  };

  const handleTouchEnd = () => {
    if (swipeX < -60) {
      onDelete(alarm);
    }
    setSwipeX(0);
    swipingRef.current = false;
  };

  const is24Hour = useSettingsStore((s) => s.settings.Is24Hour);
  const displayTime = (() => {
    const [h, m] = alarm.Time.split(":").map(Number);
    if (is24Hour) return alarm.Time;
    const h12 = h % 12 || 12;
    const period = h >= 12 ? "PM" : "AM";
    return `${h12}:${String(m).padStart(2, "0")} ${period}`;
  })();
  const waitText = formatAlarmWaitText(alarm.NextFireTime, t);
  const repeatText = formatRepeat(alarm, t);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={setNodeRef}
          style={{
            ...style,
            transform:
              swipeX !== 0
                ? `translateX(${swipeX}px)`
                : CSS.Transform.toString(transform),
          }}
          className={`relative flex items-center gap-3 rounded-xl px-4 py-4 transition-all hover:bg-secondary/80 ${
            alarm.IsEnabled ? "" : "opacity-40"
          }`}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            className="touch-none text-muted-foreground/50 hover:text-muted-foreground"
            aria-label={t("alarm.dragToReorder")}
          >
            <GripVertical className="h-4 w-4" />
          </button>

          {/* Content — clickable to edit */}
          <button
            className="flex flex-1 items-center gap-3 text-left min-w-0"
            onClick={() => !swipingRef.current && onEdit(alarm)}
            aria-label={t("alarm.edit") + ": " + (alarm.Label || displayTime)}
          >
            <span className="shrink-0 text-xl font-heading font-bold leading-snug text-foreground tabular-nums tracking-tight whitespace-nowrap">
              {displayTime}
            </span>
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-sm font-body font-medium text-foreground truncate">
                {alarm.Label || repeatText}
              </span>
              <span className="text-xs text-muted-foreground/80 font-body truncate">
                {waitText ?? repeatText}
              </span>
            </div>
          </button>

          {/* Toggle */}
          <Switch
            checked={alarm.IsEnabled}
            onCheckedChange={(checked) => toggleAlarm(alarm.AlarmId, checked)}
            aria-label={`Toggle ${alarm.Label || "alarm"}`}
          />
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-44">
        <ContextMenuItem
          onClick={() => onEdit(alarm)}
          className="flex items-center gap-2"
        >
          <Pencil className="h-3.5 w-3.5" />
          {t("alarm.edit", "Edit")}
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => duplicateAlarm(alarm.AlarmId)}
          className="flex items-center gap-2"
        >
          <Copy className="h-3.5 w-3.5" />
          {t("alarm.duplicate", "Duplicate")}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={() => onDelete(alarm)}
          className="flex items-center gap-2 text-destructive focus:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {t("alarm.delete", "Delete")}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default AlarmCard;
