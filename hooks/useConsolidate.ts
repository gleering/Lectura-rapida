"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { extractReviewConcepts } from "@/lib/active-recall";
import { createReviewCard } from "@/lib/spaced-repetition";
import { getReviewCardsByBook, saveReviewCards } from "@/lib/storage";
import type { BookMeta } from "@/types";

/**
 * Convierte la lectura recién terminada en tarjetas de recuerdo activo y lleva
 * a /review. Es el mismo cierre de bucle que usa el modo RSVP: leer no es
 * recordar; la consolidación pasa lo leído a memoria de largo plazo.
 *
 * Se comparte entre los modos de lectura para que la rehabilitación termine
 * igual sin importar cómo se leyó.
 */
export function useConsolidate(meta: BookMeta, words: string[]) {
  const router = useRouter();
  const [consolidating, setConsolidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const consolidate = useCallback(async () => {
    setConsolidating(true);
    setError(null);
    try {
      const concepts = await extractReviewConcepts(meta.title, words.join(" "));
      if (!concepts || concepts.length === 0) {
        setError(
          "No se pudieron crear tarjetas. Verifica que la IA esté configurada en el servidor (GEMINI_API_KEY)."
        );
        return;
      }
      const existing = await getReviewCardsByBook(meta.id);
      const startIdx = existing.length;
      const now = Date.now();
      const cards = concepts.map((c, i) =>
        createReviewCard({
          id: `${meta.id}_card_${startIdx + i}_${now}`,
          bookId: meta.id,
          concept: c.concept,
          prompt: c.prompt,
          answer: c.answer,
          source: c.source,
          now,
        })
      );
      await saveReviewCards(cards);
      router.push("/review");
    } finally {
      setConsolidating(false);
    }
  }, [meta.id, meta.title, words, router]);

  return { consolidate, consolidating, error };
}
