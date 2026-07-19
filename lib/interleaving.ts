/**
 * Interleaving — intercalado de tarjetas de repaso.
 *
 * Fundamento científico:
 * - Rohrer & Taylor (2007): mezclar temas distintos durante el estudio/repaso mejora la
 *   discriminación entre conceptos y la transferencia, frente al "bloqueo" (repasar un
 *   tema seguido). Es una "dificultad deseable" (Bjork): cuesta más en el momento pero
 *   produce aprendizaje más duradero y flexible.
 *
 * Estrategia: round-robin por libro/tema para que dos tarjetas consecutivas no vengan
 * de la misma fuente cuando sea posible, respetando la prioridad de vencimiento dentro
 * de cada grupo.
 */

import type { ReviewCard } from "@/types";

/**
 * Reordena las tarjetas intercalando por bookId. Dentro de cada libro mantiene el
 * orden por más vencida primero; entre libros alterna en round-robin.
 */
export function interleaveCards(cards: ReviewCard[]): ReviewCard[] {
  if (cards.length <= 2) return [...cards];

  // Agrupar por libro, preservando prioridad de vencimiento dentro del grupo.
  const groups = new Map<string, ReviewCard[]>();
  for (const card of cards) {
    const list = groups.get(card.bookId);
    if (list) list.push(card);
    else groups.set(card.bookId, [card]);
  }
  for (const list of groups.values()) {
    list.sort((a, b) => a.dueDate - b.dueDate);
  }

  // Round-robin: toma una tarjeta de cada libro por vuelta.
  const queues = Array.from(groups.values());
  const result: ReviewCard[] = [];
  let remaining = cards.length;
  while (remaining > 0) {
    for (const queue of queues) {
      const next = queue.shift();
      if (next) {
        result.push(next);
        remaining--;
      }
    }
  }
  return result;
}
