// IndexedDB persistence — no server, no database. Everything lives on-device.
//
// We keep three stores:
//   - books:   lightweight metadata (fast to list on the library screen)
//   - content: the heavy word arrays, keyed by book id (loaded on demand)
//   - kv:      settings, global stats, daily stats and goals as JSON blobs

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type {
  BookMeta,
  BookContent,
  DailyStat,
  GlobalStats,
  ReadingGoal,
  ReaderSettings,
} from "@/types";
import { DEFAULT_SETTINGS } from "@/types";

interface ReadFlowDB extends DBSchema {
  books: {
    key: string;
    value: BookMeta;
    indexes: { "by-updated": number };
  };
  content: {
    key: string;
    value: BookContent;
  };
  kv: {
    key: string;
    value: unknown;
  };
}

const DB_NAME = "readflow-ai";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<ReadFlowDB>> | null = null;

function getDb() {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB is only available in the browser");
  }
  if (!dbPromise) {
    dbPromise = openDB<ReadFlowDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const books = db.createObjectStore("books", { keyPath: "id" });
        books.createIndex("by-updated", "updatedAt");
        db.createObjectStore("content", { keyPath: "id" });
        db.createObjectStore("kv");
      },
    });
  }
  return dbPromise;
}

// ---------------------------------------------------------------------------
// Books
// ---------------------------------------------------------------------------

export async function saveBook(
  meta: BookMeta,
  words: string[]
): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(["books", "content"], "readwrite");
  await Promise.all([
    tx.objectStore("books").put(meta),
    tx.objectStore("content").put({ id: meta.id, words }),
    tx.done,
  ]);
}

export async function updateBookMeta(meta: BookMeta): Promise<void> {
  const db = await getDb();
  await db.put("books", meta);
}

export async function getBookMeta(id: string): Promise<BookMeta | undefined> {
  const db = await getDb();
  return db.get("books", id);
}

export async function getBookContent(
  id: string
): Promise<BookContent | undefined> {
  const db = await getDb();
  return db.get("content", id);
}

export async function listBooks(): Promise<BookMeta[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex("books", "by-updated");
  return all.reverse(); // most recently read first
}

export async function deleteBook(id: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(["books", "content"], "readwrite");
  await Promise.all([
    tx.objectStore("books").delete(id),
    tx.objectStore("content").delete(id),
    tx.done,
  ]);
}

// ---------------------------------------------------------------------------
// Key-value blobs (settings / stats / goals)
// ---------------------------------------------------------------------------

async function kvGet<T>(key: string, fallback: T): Promise<T> {
  const db = await getDb();
  const value = (await db.get("kv", key)) as T | undefined;
  return value ?? fallback;
}

async function kvSet(key: string, value: unknown): Promise<void> {
  const db = await getDb();
  await db.put("kv", value, key);
}

export const getSettings = () =>
  kvGet<ReaderSettings>("settings", DEFAULT_SETTINGS);
export const saveSettings = (s: ReaderSettings) => kvSet("settings", s);

const EMPTY_STATS: GlobalStats = {
  totalTimeMs: 0,
  totalWordsRead: 0,
  maxSpeed: 0,
  booksFinished: 0,
  speedSampleSum: 0,
  speedSampleCount: 0,
};

export const getGlobalStats = () =>
  kvGet<GlobalStats>("globalStats", EMPTY_STATS);
export const saveGlobalStats = (s: GlobalStats) => kvSet("globalStats", s);

export const getDailyStats = () => kvGet<DailyStat[]>("dailyStats", []);
export const saveDailyStats = (s: DailyStat[]) => kvSet("dailyStats", s);

export const getGoal = () => kvGet<ReadingGoal | null>("goal", null);
export const saveGoal = (g: ReadingGoal | null) => kvSet("goal", g);

export interface ComprehensionScore {
  correct: number;
  total: number;
}
export const getComprehension = () =>
  kvGet<ComprehensionScore>("comprehension", { correct: 0, total: 0 });
export const saveComprehension = (s: ComprehensionScore) =>
  kvSet("comprehension", s);
