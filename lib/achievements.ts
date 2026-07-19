/**
 * Sistema de Niveles, Badges y Logros
 * Gamificación para mantener motivación del usuario
 */

export type BadgeType =
  | "speed-reader" // Leer 1000+ palabras
  | "accuracy-master" // 80%+ comprensión
  | "consistency" // 7 días seguidos
  | "schulte-master" // Level 5 en Schulte
  | "nback-prodigy" // 3-Back accuracy >80%
  | "marathon" // 10000+ palabras totales
  | "comprehension-perfectionist" // 100% en 5 tests
  | "speed-demon" // 1000+ WPM alcanzado
  | "brain-trainer" // 10 sesiones de ejercicios
  | "first-steps"; // Primer PDF completado

export interface Badge {
  id: BadgeType;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: number;
}

export interface UserLevel {
  level: number; // 1-50
  experience: number; // XP total
  title: string;
  requiredXP: number; // XP needed for next level
}

export interface Achievement {
  id: string;
  userId?: string;
  badgeId: BadgeType;
  unlockedAt: number;
  progress?: number; // 0-1
}

// Badges disponibles
export const BADGES: Record<BadgeType, Badge> = {
  "speed-reader": {
    id: "speed-reader",
    name: "Lector Rápido",
    description: "Lee 1000+ palabras en una sesión",
    icon: "⚡",
  },
  "accuracy-master": {
    id: "accuracy-master",
    name: "Maestro de Precisión",
    description: "Alcanza 80%+ de comprensión",
    icon: "🎯",
  },
  consistency: {
    id: "consistency",
    name: "Consistencia",
    description: "Lee 7 días seguidos",
    icon: "🔥",
  },
  "schulte-master": {
    id: "schulte-master",
    name: "Maestro de Schulte",
    description: "Alcanza nivel 5 en Tabla de Schulte",
    icon: "👀",
  },
  "nback-prodigy": {
    id: "nback-prodigy",
    name: "Prodigio N-Back",
    description: "80%+ en 3-Back Test",
    icon: "🧠",
  },
  marathon: {
    id: "marathon",
    name: "Maratón de Lectura",
    description: "Lee 10000+ palabras totales",
    icon: "🏃",
  },
  "comprehension-perfectionist": {
    id: "comprehension-perfectionist",
    name: "Perfeccionista",
    description: "100% en 5 tests de comprensión",
    icon: "⭐",
  },
  "speed-demon": {
    id: "speed-demon",
    name: "Demonio de Velocidad",
    description: "Alcanza 1000+ WPM",
    icon: "🚀",
  },
  "brain-trainer": {
    id: "brain-trainer",
    name: "Entrenador Mental",
    description: "Completa 10 sesiones de ejercicios",
    icon: "💪",
  },
  "first-steps": {
    id: "first-steps",
    name: "Primeros Pasos",
    description: "Completa tu primer PDF",
    icon: "📖",
  },
};

// Tabla de niveles (exp requerida por nivel)
const EXP_PER_LEVEL = 100; // XP base por nivel
const EXP_MULTIPLIER = 1.1; // Aumenta por nivel

export function getRequiredXP(level: number): number {
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += Math.floor(EXP_PER_LEVEL * Math.pow(EXP_MULTIPLIER, i - 1));
  }
  return total;
}

export function calculateLevel(totalXP: number): UserLevel {
  let level = 1;
  while (level <= 50 && getRequiredXP(level + 1) <= totalXP) {
    level++;
  }

  const titles = [
    "Novato",
    "Aprendiz",
    "Competente",
    "Avanzado",
    "Experto",
    "Maestro",
    "Leyenda",
  ];
  const titleIndex = Math.min(Math.floor((level - 1) / 7), titles.length - 1);
  const title = titles[titleIndex];

  return {
    level,
    experience: totalXP,
    title,
    requiredXP: getRequiredXP(level + 1) - totalXP,
  };
}

export function awardXP(baseXP: number, multiplier: number = 1): number {
  return Math.floor(baseXP * multiplier);
}

// XP Awards
export const XP_AWARDS = {
  // Lectura
  WORDS_READ: 1, // 1 XP por palabra leída
  COMPREHENSION_TEST: 50, // Por test completado
  CORRECT_ANSWER: 10,
  WRONG_ANSWER: 2,

  // Ejercicios
  SCHULTE_SESSION: 75,
  NBACK_SESSION: 75,
  SCHULTE_LEVEL_UP: 150,
  NBACK_LEVEL_UP: 150,

  // Logros
  FIRST_BOOK: 200,
  DAILY_STREAK: 100,
};

// Verificar badges desbloqueados
export function checkBadges(stats: {
  totalWordsRead: number;
  avgAccuracy: number;
  consecutiveDays: number;
  schulteMaxLevel: number;
  nbackMaxLevel: number;
  perfectTests: number;
  maxSpeed: number;
  exerciseSessions: number;
}): BadgeType[] {
  const unlocked: BadgeType[] = [];

  if (stats.totalWordsRead >= 1000) unlocked.push("speed-reader");
  if (stats.avgAccuracy >= 0.8) unlocked.push("accuracy-master");
  if (stats.consecutiveDays >= 7) unlocked.push("consistency");
  if (stats.schulteMaxLevel >= 5) unlocked.push("schulte-master");
  if (stats.nbackMaxLevel >= 3 && stats.avgAccuracy >= 0.8)
    unlocked.push("nback-prodigy");
  if (stats.totalWordsRead >= 10000) unlocked.push("marathon");
  if (stats.perfectTests >= 5) unlocked.push("comprehension-perfectionist");
  if (stats.maxSpeed >= 1000) unlocked.push("speed-demon");
  if (stats.exerciseSessions >= 10) unlocked.push("brain-trainer");
  if (stats.totalWordsRead > 0) unlocked.push("first-steps");

  return unlocked;
}

export interface UserStats {
  totalWordsRead: number;
  totalTimeMs: number;
  avgAccuracy: number;
  maxSpeed: number;
  booksFinished: number;
  consecutiveDays: number;
  schulteMaxLevel: number;
  nbackMaxLevel: number;
  perfectTests: number;
  exerciseSessions: number;
}
