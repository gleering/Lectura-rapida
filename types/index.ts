// Core domain types for ReadFlow AI.

export type ReaderMode = 1 | 2 | 3;

export const SPEED_OPTIONS = [
  100, 200, 300, 400, 500, 600, 700, 800, 1000, 1200, 1500, 2000,
] as const;

export type Speed = (typeof SPEED_OPTIONS)[number];

/** A book after PDF extraction. The heavy `words` array is stored separately
 *  from the lightweight metadata so the library screen stays fast. */
export interface BookMeta {
  id: string;
  title: string;
  author?: string;
  totalWords: number;
  totalPages: number;
  /** Word index the reader is currently positioned at. */
  progressIndex: number;
  /** Total accumulated reading time for this book, in ms. */
  timeReadMs: number;
  createdAt: number;
  updatedAt: number;
  finished: boolean;
  /** Approximate characters per page — used to estimate the current page. */
  wordsPerPage: number;
}

export interface BookContent {
  id: string;
  /** Every word in reading order. Index === position. */
  words: string[];
}

export interface Book extends BookMeta {
  words: string[];
}

/** Per-day training record used for streaks and daily charts. */
export interface DailyStat {
  /** ISO date, e.g. "2026-07-18". */
  date: string;
  wordsRead: number;
  timeReadMs: number;
  maxSpeed: number;
}

export interface GlobalStats {
  totalTimeMs: number;
  totalWordsRead: number;
  maxSpeed: number;
  booksFinished: number;
  /** Sum of every recorded reading speed sample, for computing the average. */
  speedSampleSum: number;
  speedSampleCount: number;
}

export type GoalType = "1000" | "3000" | "5000" | "book";

export interface ReadingGoal {
  type: GoalType;
  target: number; // words; Infinity-safe number for "book"
  progress: number;
  completed: boolean;
  createdAt: number;
}

export type ThemeMode = "dark" | "light";

export interface ReaderSettings {
  theme: ThemeMode;
  fontFamily: string;
  fontSize: number; // px
  textColor: string; // hex
  backgroundColor: string; // hex
  letterSpacing: number; // em
  /** Vertical position of the focus word, 0 (top) – 100 (bottom). */
  verticalPosition: number;
  orpEnabled: boolean;
  orpColor: string; // hex
  mode: ReaderMode;
  speed: Speed;
  /** Ask a comprehension question every N words (0 = disabled). */
  comprehensionInterval: number;
}

export const DEFAULT_SETTINGS: ReaderSettings = {
  theme: "dark",
  fontFamily:
    "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  fontSize: 64,
  textColor: "#ffffff",
  backgroundColor: "#000000",
  letterSpacing: 0,
  verticalPosition: 45,
  orpEnabled: true,
  orpColor: "#ef4444",
  mode: 1,
  speed: 300,
  comprehensionInterval: 0,
};
