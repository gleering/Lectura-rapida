/**
 * Métricas de aprendizaje — capa de comprensión derivada (sin IA).
 *
 * Fundamento científico:
 * - "Lo que se mide se optimiza": premiar retención consolidada (no tiempo/velocidad de
 *   lectura) entrena memoria duradera en lugar de ilusión de fluidez.
 * - Teoría de la autodeterminación (Deci & Ryan): mostrar competencia (progreso real) y
 *   metas propias alimenta la motivación intrínseca. Por eso las métricas hablan de
 *   "conceptos dominados / en riesgo" y las metas son de dominio, no recompensas vacías.
 *
 * Todo se deriva de las tarjetas de repaso y las conexiones ya almacenadas.
 */

import type {
  ReviewCard,
  ConceptLink,
  LearningMetrics,
  DailyLearningGoal,
} from "@/types";

/** Un concepto se considera "dominado" cuando ha entrado en memoria de largo plazo. */
const MASTERED_INTERVAL_DAYS = 21;
const MASTERED_REPETITIONS = 4;

function isMastered(card: ReviewCard): boolean {
  return (
    card.state === "review" &&
    (card.interval >= MASTERED_INTERVAL_DAYS ||
      card.repetitions >= MASTERED_REPETITIONS)
  );
}

/** Clave de día local (YYYY-MM-DD) a partir de un epoch ms. */
function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Racha de días consecutivos con actividad de repaso (deriva de lastReviewed). */
function computeStreak(cards: ReviewCard[], now: number): number {
  const days = new Set<string>();
  for (const c of cards) {
    if (c.lastReviewed) days.add(dayKey(c.lastReviewed));
  }
  if (days.size === 0) return 0;

  const oneDay = 24 * 60 * 60 * 1000;
  const today = dayKey(now);
  const yesterday = dayKey(now - oneDay);

  // La racha solo cuenta si hubo repaso hoy o ayer.
  if (!days.has(today) && !days.has(yesterday)) return 0;

  let streak = 0;
  let cursor = days.has(today) ? now : now - oneDay;
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor -= oneDay;
  }
  return streak;
}

export function computeLearningMetrics(
  cards: ReviewCard[],
  links: ConceptLink[],
  now: number = Date.now()
): LearningMetrics {
  let mastered = 0;
  let consolidating = 0;
  let learning = 0;
  let atRisk = 0;
  let easeSum = 0;
  let attempts = 0;
  let lapses = 0;
  let reviewsToday = 0;
  const today = dayKey(now);

  for (const c of cards) {
    if (isMastered(c)) mastered++;
    else if (c.state === "review") consolidating++;
    else learning++;

    if (c.dueDate <= now) atRisk++;

    easeSum += c.easeFactor;
    attempts += c.repetitions + c.lapses;
    lapses += c.lapses;

    if (c.lastReviewed && dayKey(c.lastReviewed) === today) reviewsToday++;
  }

  const total = cards.length;
  const retentionRate =
    attempts > 0 ? Math.round(((attempts - lapses) / attempts) * 100) : 0;
  const avgEase = total > 0 ? easeSum / total : 0;

  // Nivel de dominio: crece con conceptos consolidados (gamificación reorientada).
  const masteryLevel = Math.floor(Math.sqrt(mastered)) + 1;

  return {
    totalConcepts: total,
    mastered,
    consolidating,
    learning,
    atRisk,
    connections: links.length,
    retentionRate,
    avgEase: Math.round(avgEase * 100) / 100,
    streak: computeStreak(cards, now),
    reviewsToday,
    masteryLevel,
  };
}

/** Metas del día, enmarcadas como progreso de dominio (competencia + autonomía). */
export function computeDailyGoals(
  cards: ReviewCard[],
  metrics: LearningMetrics,
  now: number = Date.now()
): DailyLearningGoal[] {
  const today = new Date(now);
  const isToday = (ts: number) => {
    const d = new Date(ts);
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  };

  const newToday = cards.filter((c) => isToday(c.createdAt)).length;

  // Meta 1: repasar lo pendiente.
  const reviewTotal = metrics.reviewsToday + metrics.atRisk;
  const reviewGoal: DailyLearningGoal = {
    id: "review",
    label:
      metrics.atRisk > 0
        ? `Repasa tus ${metrics.atRisk} concepto${metrics.atRisk === 1 ? "" : "s"} en riesgo`
        : "Repaso del día completado",
    done: metrics.atRisk === 0 && metrics.reviewsToday > 0,
    progress:
      reviewTotal > 0
        ? Math.round((metrics.reviewsToday / reviewTotal) * 100)
        : metrics.reviewsToday > 0
          ? 100
          : 0,
  };

  // Meta 2: comprender algo nuevo.
  const learnGoal: DailyLearningGoal = {
    id: "learn",
    label: "Comprende un concepto nuevo (Tutor o Repaso)",
    done: newToday > 0,
    progress: newToday > 0 ? 100 : 0,
  };

  // Meta 3: conectar ideas.
  const connectGoal: DailyLearningGoal = {
    id: "connect",
    label: "Conecta ideas entre tus libros",
    done: metrics.connections > 0,
    progress: metrics.connections > 0 ? 100 : 0,
  };

  return [reviewGoal, learnGoal, connectGoal];
}
