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
  BookSection,
  DailyStat,
  GlobalStats,
  ReadingGoal,
  ReaderSettings,
  ReviewCard,
  ConceptLink,
  MindMap,
  ProgressiveSummary,
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
  reviewCards: {
    key: string;
    value: ReviewCard;
    indexes: { "by-due": number; "by-book": string };
  };
  conceptLinks: {
    key: string;
    value: ConceptLink;
  };
}

const DB_NAME = "readflow-ai";
const DB_VERSION = 3;

let dbPromise: Promise<IDBPDatabase<ReadFlowDB>> | null = null;

function getDb() {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB is only available in the browser");
  }
  if (!dbPromise) {
    dbPromise = openDB<ReadFlowDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const books = db.createObjectStore("books", { keyPath: "id" });
          books.createIndex("by-updated", "updatedAt");
          db.createObjectStore("content", { keyPath: "id" });
          db.createObjectStore("kv");
        }
        if (oldVersion < 2) {
          const cards = db.createObjectStore("reviewCards", { keyPath: "id" });
          cards.createIndex("by-due", "dueDate");
          cards.createIndex("by-book", "bookId");
        }
        if (oldVersion < 3) {
          db.createObjectStore("conceptLinks", { keyPath: "id" });
        }
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
  words: string[],
  paraStarts?: number[],
  sections?: BookSection[],
  pdfPageStarts?: number[]
): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(["books", "content"], "readwrite");
  await Promise.all([
    tx.objectStore("books").put(meta),
    tx
      .objectStore("content")
      .put({ id: meta.id, words, paraStarts, sections, pdfPageStarts }),
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

/** Cachea las secciones detectadas bajo demanda (libros previos sin índice).
 *  `wordDetectV` marca la versión de la heurística por-palabras, para poder
 *  re-detectar en el futuro sin pisar libros con índice de outline. */
export async function updateBookSections(
  id: string,
  sections: BookSection[],
  wordDetectV?: number
): Promise<void> {
  const db = await getDb();
  const content = await db.get("content", id);
  if (!content) return;
  await db.put("content", { ...content, sections, sectionsWordV: wordDetectV });
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

// ---------------------------------------------------------------------------
// AI Summaries
// ---------------------------------------------------------------------------

export interface SummaryMeta {
  bookId: string;
  summary: string;
  generatedAt: number;
}

export async function saveSummary(
  bookId: string,
  summary: string
): Promise<void> {
  const db = await getDb();
  const meta: SummaryMeta = {
    bookId,
    summary,
    generatedAt: Date.now(),
  };
  await db.put("kv", meta, `summary_${bookId}`);
}

export async function getSummary(bookId: string): Promise<string | null> {
  const db = await getDb();
  const meta = (await db.get("kv", `summary_${bookId}`)) as
    | SummaryMeta
    | undefined;
  return meta?.summary || null;
}

// ---------------------------------------------------------------------------
// Comprehension Scores
// ---------------------------------------------------------------------------

export interface StoredComprehensionScore {
  bookId: string;
  scores: Array<{
    questionId: string;
    correct: boolean;
    timeToAnswer: number;
    difficulty: number;
    timestamp: number;
  }>;
  updatedAt: number;
}

export async function saveComprehensionScores(
  bookId: string,
  scores: Array<{
    questionId: string;
    correct: boolean;
    timeToAnswer: number;
    difficulty: number;
    timestamp: number;
  }>
): Promise<void> {
  const db = await getDb();
  const meta: StoredComprehensionScore = {
    bookId,
    scores,
    updatedAt: Date.now(),
  };
  await db.put("kv", meta, `comprehension_${bookId}`);
}

export async function getComprehensionScores(
  bookId: string
): Promise<StoredComprehensionScore["scores"]> {
  const db = await getDb();
  const meta = (await db.get("kv", `comprehension_${bookId}`)) as
    | StoredComprehensionScore
    | undefined;
  return meta?.scores || [];
}

// ---------------------------------------------------------------------------
// Review Cards (spaced repetition)
// ---------------------------------------------------------------------------

export async function saveReviewCard(card: ReviewCard): Promise<void> {
  const db = await getDb();
  await db.put("reviewCards", card);
}

export async function saveReviewCards(cards: ReviewCard[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction("reviewCards", "readwrite");
  await Promise.all([
    ...cards.map((c) => tx.store.put(c)),
    tx.done,
  ]);
}

export async function getReviewCard(
  id: string
): Promise<ReviewCard | undefined> {
  const db = await getDb();
  return db.get("reviewCards", id);
}

export async function getAllReviewCards(): Promise<ReviewCard[]> {
  const db = await getDb();
  return db.getAll("reviewCards");
}

export async function getReviewCardsByBook(
  bookId: string
): Promise<ReviewCard[]> {
  const db = await getDb();
  return db.getAllFromIndex("reviewCards", "by-book", bookId);
}

/** All cards due on or before `now`, most overdue first. */
export async function getDueReviewCards(
  now: number = Date.now()
): Promise<ReviewCard[]> {
  const db = await getDb();
  const range = IDBKeyRange.upperBound(now);
  return db.getAllFromIndex("reviewCards", "by-due", range);
}

export async function deleteReviewCard(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("reviewCards", id);
}

export async function deleteReviewCardsByBook(bookId: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction("reviewCards", "readwrite");
  const index = tx.store.index("by-book");
  let cursor = await index.openCursor(IDBKeyRange.only(bookId));
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}

// ---------------------------------------------------------------------------
// Concept Links (concept graph)
// ---------------------------------------------------------------------------

export async function saveConceptLinks(links: ConceptLink[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction("conceptLinks", "readwrite");
  await Promise.all([...links.map((l) => tx.store.put(l)), tx.done]);
}

export async function getAllConceptLinks(): Promise<ConceptLink[]> {
  const db = await getDb();
  return db.getAll("conceptLinks");
}

export async function clearConceptLinks(): Promise<void> {
  const db = await getDb();
  await db.clear("conceptLinks");
}

// ---------------------------------------------------------------------------
// Mind maps & progressive summaries (kv blobs, keyed by book id)
// ---------------------------------------------------------------------------

export async function saveMindMap(map: MindMap): Promise<void> {
  const db = await getDb();
  await db.put("kv", map, `mindmap_${map.bookId}`);
}

export async function getMindMap(bookId: string): Promise<MindMap | null> {
  const db = await getDb();
  const map = (await db.get("kv", `mindmap_${bookId}`)) as MindMap | undefined;
  return map ?? null;
}

export async function saveProgressiveSummary(
  summary: ProgressiveSummary
): Promise<void> {
  const db = await getDb();
  await db.put("kv", summary, `progsummary_${summary.bookId}`);
}

export async function getProgressiveSummary(
  bookId: string
): Promise<ProgressiveSummary | null> {
  const db = await getDb();
  const s = (await db.get("kv", `progsummary_${bookId}`)) as
    | ProgressiveSummary
    | undefined;
  return s ?? null;
}
