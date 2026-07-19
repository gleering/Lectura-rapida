/**
 * Motor de Repetición Espaciada (algoritmo SM-2).
 *
 * Fundamento científico:
 * - Efecto de espaciamiento (Ebbinghaus 1885; meta-análisis Cepeda et al. 2006):
 *   repasar en intervalos crecientes, justo antes de olvidar, consolida la memoria
 *   a largo plazo mucho mejor que el repaso masivo (cramming).
 * - SM-2 (Wozniak 1990) calcula el próximo intervalo a partir de la calidad del
 *   recuerdo, ajustando un "factor de facilidad" por tarjeta.
 *
 * quality (0..5): 0 = olvido total; 5 = recuerdo perfecto e inmediato.
 */

import type { ReviewCard, RecallRating } from "@/types";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_EASE = 2.5;
const MIN_EASE = 1.3;

/** Crea una tarjeta nueva lista para su primer repaso (vence hoy). */
export function createReviewCard(params: {
  id: string;
  bookId: string;
  concept: string;
  prompt: string;
  answer: string;
  source?: string;
  now?: number;
}): ReviewCard {
  const now = params.now ?? Date.now();
  return {
    id: params.id,
    bookId: params.bookId,
    concept: params.concept,
    prompt: params.prompt,
    answer: params.answer,
    source: params.source,
    easeFactor: DEFAULT_EASE,
    interval: 0,
    repetitions: 0,
    lapses: 0,
    state: "new",
    dueDate: now, // disponible de inmediato
    lastReviewed: null,
    createdAt: now,
  };
}

/** Mapea la autoevaluación del usuario a la escala de calidad SM-2 (0..5). */
export function gradeFromRating(rating: RecallRating): number {
  switch (rating) {
    case "again":
      return 1; // no lo recordó
    case "hard":
      return 3; // lo recordó con esfuerzo
    case "good":
      return 4; // recuerdo correcto
    case "easy":
      return 5; // recuerdo inmediato y sólido
  }
}

/**
 * Aplica SM-2 y devuelve una NUEVA tarjeta con el próximo intervalo/vencimiento.
 * No muta la tarjeta original.
 */
export function scheduleCard(
  card: ReviewCard,
  quality: number,
  now: number = Date.now()
): ReviewCard {
  const q = Math.max(0, Math.min(5, Math.round(quality)));
  const next: ReviewCard = { ...card, lastReviewed: now };

  if (q < 3) {
    // Fallo: reinicia el ciclo de aprendizaje, penaliza levemente la facilidad.
    next.repetitions = 0;
    next.interval = 0; // vuelve a verse hoy (paso de aprendizaje)
    next.lapses = card.lapses + 1;
    next.state = "learning";
    next.dueDate = now + 10 * 60 * 1000; // reintento en ~10 min
  } else {
    next.repetitions = card.repetitions + 1;

    if (next.repetitions === 1) {
      next.interval = 1;
    } else if (next.repetitions === 2) {
      next.interval = 6;
    } else {
      next.interval = Math.round(card.interval * card.easeFactor);
    }

    next.state = "review";
    next.dueDate = now + next.interval * DAY_MS;
  }

  // Ajuste del factor de facilidad (fórmula SM-2).
  const newEase =
    card.easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  next.easeFactor = Math.max(MIN_EASE, newEase);

  return next;
}

/** ¿La tarjeta está vencida (toca repasarla ya)? */
export function isDue(card: ReviewCard, now: number = Date.now()): boolean {
  return card.dueDate <= now;
}

/** Devuelve las tarjetas vencidas, ordenadas por más atrasada primero. */
export function getDueCards(
  cards: ReviewCard[],
  now: number = Date.now()
): ReviewCard[] {
  return cards
    .filter((c) => isDue(c, now))
    .sort((a, b) => a.dueDate - b.dueDate);
}

/** Resumen para el dashboard de repaso. */
export function summarizeQueue(
  cards: ReviewCard[],
  now: number = Date.now()
): { due: number; newCards: number; learning: number; total: number } {
  const due = cards.filter((c) => isDue(c, now));
  return {
    due: due.length,
    newCards: cards.filter((c) => c.state === "new").length,
    learning: cards.filter((c) => c.state === "learning").length,
    total: cards.length,
  };
}
