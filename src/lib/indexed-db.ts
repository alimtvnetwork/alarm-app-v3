/**
 * IndexedDB Layer — Mirrors the SQLite schema from V1__initial_schema.sql.
 * Object stores: Alarms, AlarmGroups, Settings, SnoozeState, AlarmEvents, Quotes, Webhooks
 * Uses the `idb` library for a Promise-based API.
 *
 * v2: Added indexes (ByIsEnabled, ByDeletedAt, ByPosition, ByType, ByFiredAt,
 *     ByIsFavorite, ByIsCustom) to match spec query patterns.
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
      upgrade(db, oldVersion, _newVersion, transaction) {
        if (oldVersion < 1) {
          const alarmStore = db.createObjectStore("Alarms", { keyPath: "AlarmId" });
          alarmStore.createIndex("ByNextFireTime", "NextFireTime");
          alarmStore.createIndex("ByGroupId", "GroupId");
          alarmStore.createIndex("ByIsEnabled", "IsEnabled");
          alarmStore.createIndex("ByDeletedAt", "DeletedAt");

          const groupStore = db.createObjectStore("AlarmGroups", { keyPath: "AlarmGroupId" });
          groupStore.createIndex("ByPosition", "Position");

          db.createObjectStore("Settings", { keyPath: "Key" });
          db.createObjectStore("SnoozeState", { keyPath: "AlarmId" });

          const eventStore = db.createObjectStore("AlarmEvents", { keyPath: "AlarmEventId" });
          eventStore.createIndex("ByAlarmId", "AlarmId");
          eventStore.createIndex("ByTimestamp", "Timestamp");
          eventStore.createIndex("ByType", "Type");
          eventStore.createIndex("ByFiredAt", "FiredAt");

          const quoteStore = db.createObjectStore("Quotes", { keyPath: "QuoteId" });
          quoteStore.createIndex("ByIsFavorite", "IsFavorite");
          quoteStore.createIndex("ByIsCustom", "IsCustom");

          const webhookStore = db.createObjectStore("Webhooks", { keyPath: "WebhookId" });
          webhookStore.createIndex("ByAlarmId", "AlarmId");
        }

        if (oldVersion >= 1 && oldVersion < 2) {
          // Existing v1 users: add missing indexes via upgrade transaction
          const alarms = transaction.objectStore("Alarms");
          if (!alarms.indexNames.contains("ByIsEnabled")) alarms.createIndex("ByIsEnabled", "IsEnabled");
          if (!alarms.indexNames.contains("ByDeletedAt")) alarms.createIndex("ByDeletedAt", "DeletedAt");

          const groups = transaction.objectStore("AlarmGroups");
          if (!groups.indexNames.contains("ByPosition")) groups.createIndex("ByPosition", "Position");

          const events = transaction.objectStore("AlarmEvents");
          if (!events.indexNames.contains("ByType")) events.createIndex("ByType", "Type");
          if (!events.indexNames.contains("ByFiredAt")) events.createIndex("ByFiredAt", "FiredAt");

          const quotes = transaction.objectStore("Quotes");
          if (!quotes.indexNames.contains("ByIsFavorite")) quotes.createIndex("ByIsFavorite", "IsFavorite");
          if (!quotes.indexNames.contains("ByIsCustom")) quotes.createIndex("ByIsCustom", "IsCustom");
        }
      },
    });
  }
  return dbPromise;
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
