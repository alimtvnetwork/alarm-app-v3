/**
 * Export/Import utilities for alarm data.
 * Supports JSON and CSV export, JSON import with merge/replace modes.
 */

import type { Alarm } from "@/types/alarm";
import { ExportFormat, ImportMode } from "@/types/alarm";
import * as ipc from "@/lib/ipc-adapter";

// ─── Export ──────────────────────────────────────────────────────

function downloadFile(content: string, fileName: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

export async function exportAlarms(format: ExportFormat): Promise<void> {
  const alarms = await ipc.listAlarms();
  const timestamp = new Date().toISOString().split("T")[0];

  if (format === ExportFormat.Json) {
    const json = JSON.stringify(alarms, null, 2);
    downloadFile(json, `alarms-${timestamp}.json`, "application/json");
    return;
  }

  if (format === ExportFormat.Csv) {
    const headers = ["AlarmId", "Time", "Label", "IsEnabled", "RepeatType", "SoundFile", "SnoozeDurationMin", "MaxSnoozeCount"];
    const rows = alarms.map((a) =>
      [a.AlarmId, a.Time, `"${a.Label}"`, a.IsEnabled, a.Repeat.Type, a.SoundFile, a.SnoozeDurationMin, a.MaxSnoozeCount].join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    downloadFile(csv, `alarms-${timestamp}.csv`, "text/csv");
  }
}

// ─── Import ──────────────────────────────────────────────────────

export async function importAlarmsFromJson(
  jsonString: string,
  mode: ImportMode
): Promise<{ imported: number; skipped: number }> {
  const parsed = JSON.parse(jsonString) as Alarm[];
  if (!Array.isArray(parsed)) {
    throw new Error("Invalid format: expected an array of alarms");
  }

  const existing = await ipc.listAlarms();
  const existingIds = new Set(existing.map((a) => a.AlarmId));
  let imported = 0;
  let skipped = 0;

  if (mode === ImportMode.Replace) {
    for (const a of existing) {
      await ipc.deleteAlarm(a.AlarmId);
    }
    for (const a of parsed) {
      await ipc.createAlarm(a);
      imported++;
    }
  } else {
    for (const a of parsed) {
      if (existingIds.has(a.AlarmId)) {
        skipped++;
      } else {
        await ipc.createAlarm(a);
        imported++;
      }
    }
  }

  return { imported, skipped };
}

