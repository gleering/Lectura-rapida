"use client";

import { useEffect, useState, useCallback } from "react";
import { Sparkles, Loader2, Plus, Play, Timer } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { ReviewSession } from "@/components/ReviewSession";
import {
  listBooks,
  getBookContent,
  getAllReviewCards,
  getDueReviewCards,
  getReviewCardsByBook,
  saveReviewCards,
} from "@/lib/storage";
import { extractReviewConcepts } from "@/lib/active-recall";
import { createReviewCard, summarizeQueue } from "@/lib/spaced-repetition";
import { interleaveCards } from "@/lib/interleaving";
import type { BookMeta, ReviewCard } from "@/types";

export default function ReviewPage() {
  const [loaded, setLoaded] = useState(false);
  const [allCards, setAllCards] = useState<ReviewCard[]>([]);
  const [dueCards, setDueCards] = useState<ReviewCard[]>([]);
  const [books, setBooks] = useState<BookMeta[]>([]);
  const [sessionActive, setSessionActive] = useState(false);
  const [generatingBook, setGeneratingBook] = useState<string | null>(null);
  const [cardCountByBook, setCardCountByBook] = useState<Record<string, number>>(
    {}
  );

  const refresh = useCallback(async () => {
    const [all, due, bookList] = await Promise.all([
      getAllReviewCards(),
      getDueReviewCards(),
      listBooks(),
    ]);
    setAllCards(all);
    setDueCards(due);
    setBooks(bookList);

    const counts: Record<string, number> = {};
    for (const c of all) counts[c.bookId] = (counts[c.bookId] || 0) + 1;
    setCardCountByBook(counts);
    setLoaded(true);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleGenerate = async (book: BookMeta) => {
    setGeneratingBook(book.id);
    try {
      const content = await getBookContent(book.id);
      if (!content) return;
      const text = content.words.join(" ");
      const concepts = await extractReviewConcepts(book.title, text);
      if (!concepts || concepts.length === 0) {
        alert(
          "No se pudieron generar tarjetas. Verifica que la IA esté configurada en el servidor (GEMINI_API_KEY)."
        );
        return;
      }
      const existing = await getReviewCardsByBook(book.id);
      const startIdx = existing.length;
      const now = Date.now();
      const cards = concepts.map((c, i) =>
        createReviewCard({
          id: `${book.id}_card_${startIdx + i}_${now}`,
          bookId: book.id,
          concept: c.concept,
          prompt: c.prompt,
          answer: c.answer,
          source: c.source,
          now,
        })
      );
      await saveReviewCards(cards);
      await refresh();
    } finally {
      setGeneratingBook(null);
    }
  };

  const queue = summarizeQueue(allCards);
  const estMinutes = Math.max(1, Math.round((dueCards.length * 30) / 60));

  if (sessionActive) {
    return (
      <div className="min-h-screen bg-[#faf8ff] text-[#131b2e]">
        <AppNav />
        <main className="mx-auto max-w-2xl px-4 py-8 pb-24 md:pb-8">
          <ReviewSession
            cards={interleaveCards(dueCards)}
            onFinished={async () => {
              setSessionActive(false);
              await refresh();
            }}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf8ff] text-[#131b2e]">
      <AppNav />
      <main className="mx-auto max-w-3xl px-4 py-8 pb-24 md:pb-8">
        {!loaded ? (
          <div className="flex justify-center py-20 text-[#434655]">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Encabezado */}
            <div className="text-center">
              <h1
                className="text-3xl font-bold tracking-tight"
                style={{ fontFamily: "var(--font-hanken, inherit)" }}
              >
                Cola de Repaso
              </h1>
              <p className="mt-2 text-[#434655]">
                Mantén tu curva de olvido bajo control.
              </p>
            </div>

            {/* Bento de estadísticas */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-[#c3c6d7] bg-white p-5 text-center">
                <p className="text-3xl font-bold text-[#004ac6]">{queue.due}</p>
                <p className="mt-1 text-xs font-medium text-[#434655]">
                  Pendientes
                </p>
              </div>
              <div className="rounded-2xl border border-[#c3c6d7] bg-white p-5 text-center">
                <p className="text-3xl font-bold text-[#006c49]">
                  {queue.learning}
                </p>
                <p className="mt-1 text-xs font-medium text-[#434655]">
                  Aprendiendo
                </p>
              </div>
              <div className="rounded-2xl border-2 border-[#2563eb] bg-[#e2e7ff] p-5 text-center">
                <p className="text-3xl font-bold text-[#131b2e]">{queue.total}</p>
                <p className="mt-1 text-xs font-medium text-[#434655]">Totales</p>
              </div>
            </div>

            {/* CTA principal */}
            <div className="flex flex-col items-center gap-3 pt-2">
              <button
                disabled={dueCards.length === 0}
                onClick={() => setSessionActive(true)}
                className="inline-flex items-center gap-2 rounded-full bg-[#004ac6] px-12 py-5 text-lg font-semibold text-white shadow-sm transition active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[#c3c6d7] disabled:text-[#434655]"
              >
                <Play className="size-5 fill-current" />
                {dueCards.length > 0
                  ? `Comenzar repaso (${dueCards.length})`
                  : "Nada por repasar ahora"}
              </button>
              {dueCards.length > 0 && (
                <p className="flex items-center gap-1.5 text-sm text-[#434655]">
                  <Timer className="size-4" />
                  Tiempo estimado: {estMinutes} minuto
                  {estMinutes === 1 ? "" : "s"}
                </p>
              )}
            </div>

            {/* Generar tarjetas por libro */}
            <div className="rounded-2xl border border-[#c3c6d7] bg-white p-5">
              <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
                <Sparkles className="size-5 text-[#784b00]" />
                Crear tarjetas desde tus libros
              </h2>
              <div className="space-y-3">
                {books.length === 0 ? (
                  <p className="text-sm text-[#434655]">
                    Sube un libro en la Biblioteca para generar tarjetas de repaso.
                  </p>
                ) : (
                  books.map((book) => (
                    <div
                      key={book.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-[#c3c6d7] bg-[#f2f3ff] p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#131b2e]">
                          {book.title}
                        </p>
                        <p className="text-xs text-[#434655]">
                          {cardCountByBook[book.id] || 0} tarjeta
                          {(cardCountByBook[book.id] || 0) === 1 ? "" : "s"}
                        </p>
                      </div>
                      <button
                        disabled={generatingBook !== null}
                        onClick={() => handleGenerate(book)}
                        className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#004ac6] px-4 py-2 text-sm font-medium text-[#004ac6] transition hover:bg-[#eaedff] disabled:opacity-50"
                      >
                        {generatingBook === book.id ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            Generando…
                          </>
                        ) : (
                          <>
                            <Plus className="size-4" />
                            Generar
                          </>
                        )}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
