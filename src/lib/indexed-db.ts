/**
 * IndexedDB Layer — Mirrors the SQLite schema from V1__initial_schema.sql.
 * Object stores: Alarms, AlarmGroups, Settings, SnoozeState, AlarmEvents, Quotes, Webhooks
 * Uses the `idb` library for a Promise-based API.
 */

import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "AlarmAppDB";
const DB_VERSION = 1;

export interface AlarmAppDB {
  Alarms: {
    key: string;
    value: Record<string, unknown>;
    indexes: {
      "ByNextFireTime": string;
      "ByGroupId": string;
    };
  };
  AlarmGroups: {
    key: string;
    value: Record<string, unknown>;
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
      "ByAlarmId": string;
      "ByTimestamp": string;
    };
  };
  Quotes: {
    key: string;
    value: Record<string, unknown>;
  };
  Webhooks: {
    key: string;
    value: Record<string, unknown>;
    indexes: {
      "ByAlarmId": string;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<AlarmAppDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<AlarmAppDB>> {
  if (!dbPromise) {
    dbPromise = openDB<AlarmAppDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Alarms
        const alarmStore = db.createObjectStore("Alarms", { keyPath: "AlarmId" });
        alarmStore.createIndex("ByNextFireTime", "NextFireTime");
        alarmStore.createIndex("ByGroupId", "GroupId");

        // AlarmGroups
        db.createObjectStore("AlarmGroups", { keyPath: "AlarmGroupId" });

        // Settings (key-value store matching spec)
        db.createObjectStore("Settings", { keyPath: "Key" });

        // SnoozeState
        db.createObjectStore("SnoozeState", { keyPath: "AlarmId" });

        // AlarmEvents
        const eventStore = db.createObjectStore("AlarmEvents", { keyPath: "AlarmEventId" });
        eventStore.createIndex("ByAlarmId", "AlarmId");
        eventStore.createIndex("ByTimestamp", "Timestamp");

        // Quotes
        db.createObjectStore("Quotes", { keyPath: "QuoteId" });

        // Webhooks
        const webhookStore = db.createObjectStore("Webhooks", { keyPath: "WebhookId" });
        webhookStore.createIndex("ByAlarmId", "AlarmId");
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
