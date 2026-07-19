// Core domain types for ReadFlow AI.

export type ReaderMode = 1 | 2 | 3;

/**
 * Estilo de presentación de la lectura — una escalera de rehabilitación que
 * retira andamiaje progresivamente:
 *   rsvp  → las palabras vienen solas (máxima ayuda, sin movimiento ocular).
 *   pacer → texto en contexto con un realce guía que barre a ritmo fijo.
 *   page  → página autopaso, como un libro real (mínima ayuda; la graduación).
 */
export type ReadingMethod = "rsvp" | "pacer" | "page";

export interface ReadingMethodInfo {
  id: ReadingMethod;
  label: string;
  /** Frase corta que explica para qué sirve en la rehabilitación. */
  tagline: string;
  /** Escalón en la escalera (1 = más ayuda). */
  step: number;
}

/** Orden de la escalera, del más asistido al más autónomo. */
export const READING_METHODS: ReadingMethodInfo[] = [
  {
    id: "rsvp",
    label: "RSVP",
    tagline: "Las palabras vienen solas. Reconstruye el foco.",
    step: 1,
  },
  {
    id: "pacer",
    label: "Guía",
    tagline: "Un realce guía tu mirada por el texto a ritmo fijo.",
    step: 2,
  },
  {
    id: "page",
    label: "Página",
    tagline: "Página a tu ritmo, como un libro real. La graduación.",
    step: 3,
  },
];

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
  /** AI-generated summary of the book. */
  summary?: string;
  /** Whether summary generation is in progress. */
  summaryLoading?: boolean;
}

export interface BookContent {
  id: string;
  /** Every word in reading order. Index === position. */
  words: string[];
  /**
   * Índices de palabra donde empieza cada párrafo (detectados al parsear el
   * PDF). Opcional: los libros guardados antes de esta versión no lo tienen y
   * la app reconstruye párrafos aproximados por oraciones.
   */
  paraStarts?: number[];
  /** Secciones detectadas (índice). Ausente en libros previos → se recalcula. */
  sections?: BookSection[];
  /** Índice de palabra donde arranca cada página FÍSICA del PDF. Para mapear el
   *  índice embebido (getOutline). No confundir con la paginación de lectura de
   *  PageReader. */
  pdfPageStarts?: number[];
}

/** Categoría de una sección del índice, para ícono y agrupación en la UI. */
export type SectionKind =
  | "cover"
  | "prologue"
  | "preface"
  | "introduction"
  | "part"
  | "chapter"
  | "subchapter"
  | "epilogue"
  | "appendix"
  | "bibliography"
  | "other";

/** Una sección del índice del libro. El fin de la sección se deriva del
 *  `startWord` de la siguiente sección (en orden) o del fin del libro. */
export interface BookSection {
  id: string;
  title: string;
  /** 0 = nivel superior (parte), 1 = capítulo, 2 = subcapítulo… */
  level: number;
  kind: SectionKind;
  /** Índice de palabra donde empieza la sección. */
  startWord: number;
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

/** A spaced-repetition review card generated from a book concept.
 *  Scheduling follows the SM-2 algorithm (Ebbinghaus spacing effect). */
export type ReviewCardState = "new" | "learning" | "review";

export interface ReviewCard {
  id: string;
  bookId: string;
  /** Short concept title. */
  concept: string;
  /** Open recall question (active retrieval prompt). */
  prompt: string;
  /** Reference answer / explanation the user is trying to reconstruct. */
  answer: string;
  /** Optional excerpt from the book that grounds the concept. */
  source?: string;
  // --- SM-2 scheduling ---
  easeFactor: number; // starts at 2.5
  interval: number; // days until next review
  repetitions: number; // consecutive successful recalls
  lapses: number; // times the card was forgotten
  state: ReviewCardState;
  dueDate: number; // epoch ms
  lastReviewed: number | null;
  createdAt: number;
}

/** User self-assessment after an active-recall attempt. */
export type RecallRating = "again" | "hard" | "good" | "easy";

/** A relationship between two concepts (nodes = review cards) in the concept graph.
 *  Making semantic connections explicit deepens encoding (Craik & Lockhart 1972). */
export interface ConceptLink {
  id: string;
  sourceId: string;
  targetId: string;
  /** Denormalized titles so the graph renders even if a card is deleted. */
  sourceConcept: string;
  targetConcept: string;
  /** Short human description of how the two concepts relate. */
  relationship: string;
  createdAt: number;
}

/** A node in an automatically generated mind map. Externalizing hierarchical
 *  structure reduces working-memory load (Sweller, cognitive load theory). */
export interface MindMapNode {
  label: string;
  children?: MindMapNode[];
}

export interface MindMap {
  bookId: string;
  root: MindMapNode;
  generatedAt: number;
}

/** Progressive summarization in layers (Forte): each layer distills further,
 *  forcing active re-elaboration rather than passive copying. */
export interface ProgressiveSummary {
  bookId: string;
  /** Layer 1 — AI-generated summary. */
  aiSummary: string;
  /** Layer 2 — key points (AI-seeded, user-editable). */
  keyPoints: string[];
  /** Layer 3 — the user's own synthesis in their own words. */
  synthesis: string;
  updatedAt: number;
}

/** Comprehension-oriented learning metrics, derived from review cards + concept links.
 *  Rewards consolidated retention rather than reading time/speed (what gets measured
 *  gets optimized). */
export interface LearningMetrics {
  totalConcepts: number;
  /** Concepts consolidated into long-term memory. */
  mastered: number;
  /** In review state but not yet mastered. */
  consolidating: number;
  /** New or still in the learning phase. */
  learning: number;
  /** Due now — at risk of being forgotten. */
  atRisk: number;
  /** Number of explicit concept connections. */
  connections: number;
  /** 0..100 — successful recalls over total recall attempts. */
  retentionRate: number;
  /** Average SM-2 ease factor (memory-strength proxy). */
  avgEase: number;
  /** Consecutive days with review activity. */
  streak: number;
  /** Reviews completed today. */
  reviewsToday: number;
  /** Mastery level derived from consolidated concepts (reoriented gamification). */
  masteryLevel: number;
}

export interface DailyLearningGoal {
  id: string;
  label: string;
  done: boolean;
  /** 0..100. */
  progress: number;
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
  /** Estilo de lectura activo (RSVP / Guía / Página). */
  method: ReadingMethod;
  /** Resalta las primeras letras de cada palabra (ancla de fijación) en modo Página. */
  bionicEnabled: boolean;
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
  method: "rsvp",
  bionicEnabled: true,
};
