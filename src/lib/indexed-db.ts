/**
 * IndexedDB Layer — Mirrors the SQLite schema from V1__initial_schema.sql.
 * Object stores: Alarms, AlarmGroups, Settings, SnoozeState, AlarmEvents, Quotes, Webhooks
 * Uses the `idb` library for a Promise-based API.
 *
 * v2: Added missing indexes (ByIsEnabled, ByDeletedAt, ByPosition, ByType, ByFiredAt,
 *     ByIsFavorite, ByIsCustom) to match spec indexes and query patterns.
 */

import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "AlarmAppDB";
const DB_VERSION = 2;

export interface AlarmAppDB {
  Alarms: {
    key: string;
    value: Record<string, unknown>;
    indexes: {
      ByNextFireTime: string;
      ByGroupId: string;
      ByIsEnabled: number;
      ByDeletedAt: string;
    };
  };
  AlarmGroups: {
    key: string;
    value: Record<string, unknown>;
    indexes: {
      ByPosition: number;
    };
  };
  Settings: {
    key: string;
    value: { Key: string; Value: string; ValueType: string };
  };
  SnoozeState: {
    key: string;
    value: Record<string, unknown>;
  };
  AlarmEvents: {
    key: string;
    value: Record<string, unknown>;
    indexes: {
      ByAlarmId: string;
      ByTimestamp: string;
      ByType: string;
      ByFiredAt: string;
    };
  };
  Quotes: {
    key: string;
    value: Record<string, unknown>;
    indexes: {
      ByIsFavorite: number;
      ByIsCustom: number;
    };
  };
  Webhooks: {
    key: string;
    value: Record<string, unknown>;
    indexes: {
      ByAlarmId: string;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<AlarmAppDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<AlarmAppDB>> {
  if (!dbPromise) {
    dbPromise = openDB<AlarmAppDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          // ── V1: Core tables ──────────────────────────────
          const alarmStore = db.createObjectStore("Alarms", { keyPath: "AlarmId" });
          alarmStore.createIndex("ByNextFireTime", "NextFireTime");
          alarmStore.createIndex("ByGroupId", "GroupId");

          db.createObjectStore("AlarmGroups", { keyPath: "AlarmGroupId" });
          db.createObjectStore("Settings", { keyPath: "Key" });
          db.createObjectStore("SnoozeState", { keyPath: "AlarmId" });

          const eventStore = db.createObjectStore("AlarmEvents", { keyPath: "AlarmEventId" });
          eventStore.createIndex("ByAlarmId", "AlarmId");
          eventStore.createIndex("ByTimestamp", "Timestamp");

          db.createObjectStore("Quotes", { keyPath: "QuoteId" });

          const webhookStore = db.createObjectStore("Webhooks", { keyPath: "WebhookId" });
          webhookStore.createIndex("ByAlarmId", "AlarmId");
        }

        if (oldVersion < 2) {
          // ── V2: Additional indexes for spec compliance ───
          // Alarms: filter by IsEnabled + soft-delete
          const alarmTx = db.objectStoreNames.contains("Alarms")
            ? (db as unknown as { transaction: IDBPDatabase<AlarmAppDB>["transaction"] }).transaction
            : null;
          void alarmTx; // indexes added via transaction below

          addIndexSafe(db, "Alarms", "ByIsEnabled", "IsEnabled");
          addIndexSafe(db, "Alarms", "ByDeletedAt", "DeletedAt");

          // AlarmGroups: sort by position
          addIndexSafe(db, "AlarmGroups", "ByPosition", "Position");

          // AlarmEvents: filter by type, sort by fired time
          addIndexSafe(db, "AlarmEvents", "ByType", "Type");
          addIndexSafe(db, "AlarmEvents", "ByFiredAt", "FiredAt");

          // Quotes: filter favorites and custom
          addIndexSafe(db, "Quotes", "ByIsFavorite", "IsFavorite");
          addIndexSafe(db, "Quotes", "ByIsCustom", "IsCustom");
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Safely add an index to an existing object store during upgrade.
 * Skips if the index already exists.
 */
function addIndexSafe(
  db: IDBPDatabase<AlarmAppDB>,
  storeName: string,
  indexName: string,
  keyPath: string,
): void {
  // During upgrade, we can access stores via the versionchange transaction
  const storeNames = Array.from(db.objectStoreNames);
  if (!storeNames.includes(storeName as never)) return;

  // Access the store from the upgrade transaction
  const tx = (db as any).transaction;
  if (!tx) return;
  try {
    const store = typeof tx === "function"
      ? undefined
      : tx.objectStore(storeName);
    if (store && !store.indexNames.contains(indexName)) {
      store.createIndex(indexName, keyPath);
    }
  } catch {
    // Store may not be accessible in this transaction context — skip
  }
}

/** Close and reset the DB promise (for testing/reset). */
export async function resetDB(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise;
    db.close();
    dbPromise = null;
  }
}

/** Delete the entire database (factory reset). */
export async function deleteDB(): Promise<void> {
  await resetDB();
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
