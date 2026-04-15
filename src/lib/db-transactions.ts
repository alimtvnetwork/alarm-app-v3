/**
 * IndexedDB Transaction Helpers & Event Retention Purging
 * Source: spec/15-alarm-app/01-fundamentals/01-data-model.md (WAL mode, EventRetentionDays)
 *
 * Provides:
 * - runTransaction: multi-store atomic writes with auto-rollback on error
 * - purgeExpiredEvents: deletes AlarmEvents older than EventRetentionDays setting
 */

import { getDB } from "@/lib/indexed-db";
import type { AlarmAppDB } from "@/lib/indexed-db";
import type { IDBPDatabase } from "idb";
import { AppError, ErrorCode } from "@/types/errors";

type StoreNames = "Alarms" | "AlarmGroups" | "Settings" | "SnoozeState" | "AlarmEvents" | "Quotes" | "Webhooks";

// ─── Transactional Write Helper ──────────────────────────────────

/**
 * Execute a callback inside an IndexedDB readwrite transaction.
 * If the callback throws, the transaction aborts (auto-rollback).
 */
export async function runTransaction<T>(
  storeNames: StoreNames[],
  callback: (tx: ReturnType<IDBPDatabase<AlarmAppDB>["transaction"]>) => Promise<T>,
): Promise<T> {
  const db = await getDB();
  const tx = db.transaction(storeNames, "readwrite");

  try {
    const result = await callback(tx);
    await tx.done;
    return result;
  } catch (err) {
    try { tx.abort(); } catch { /* already aborted */ }
    throw new AppError(
      ErrorCode.Database,
      `Transaction failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

// ─── Event Retention Purging ─────────────────────────────────────

const DEFAULT_RETENTION_DAYS = 90;

/**
 * Purge AlarmEvents older than the configured EventRetentionDays setting.
 * Should be called on app startup and periodically.
 */
export async function purgeExpiredEvents(): Promise<number> {
  const db = await getDB();

  // Read retention setting
  const setting = await db.get("Settings", "EventRetentionDays");
  const retentionDays = setting ? Number(setting.Value) : DEFAULT_RETENTION_DAYS;

  if (retentionDays <= 0) return 0;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);
  const cutoffIso = cutoff.toISOString();

  // Find expired events using ByTimestamp index
  const tx = db.transaction("AlarmEvents", "readwrite");
  const index = tx.store.index("ByTimestamp");
  const range = IDBKeyRange.upperBound(cutoffIso);

  let purgedCount = 0;
  let cursor = await index.openCursor(range);

  while (cursor) {
    await cursor.delete();
    purgedCount++;
    cursor = await cursor.continue();
  }

  await tx.done;
  return purgedCount;
}
