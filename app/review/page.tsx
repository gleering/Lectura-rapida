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
import { toast } from "@/store/useToastStore";
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
      if (!content) {
        toast.error("No se encontró el contenido del libro.");
        return;
      }
      const text = content.words.join(" ");
      const concepts = await extractReviewConcepts(book.title, text);
      if (!concepts || concepts.length === 0) {
        toast.error(
          "No se pudieron generar tarjetas. La IA no está disponible ahora mismo."
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
      toast.success(
        `${cards.length} tarjeta${cards.length === 1 ? "" : "s"} de “${book.title}” creada${cards.length === 1 ? "" : "s"}.`
      );
    } catch {
      toast.error("Ocurrió un error al generar las tarjetas.");
    } finally {
      setGeneratingBook(null);
    }
  };

  const queue = summarizeQueue(allCards);
  const estMinutes = Math.max(1, Math.round((dueCards.length * 30) / 60));

  if (sessionActive) {
    return (
      <div className="min-h-screen bg-background text-foreground">
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
    <div className="min-h-screen bg-background text-foreground">
      <AppNav />
      <main className="mx-auto max-w-3xl px-4 py-8 pb-24 md:pb-8">
        {!loaded ? (
          <div className="flex justify-center py-20 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Encabezado */}
            <div className="text-center">
              <h1
                className="text-3xl font-bold tracking-tight font-display"
              >
                Cola de Repaso
              </h1>
              <p className="mt-2 text-muted-foreground">
                Mantén tu curva de olvido bajo control.
              </p>
            </div>

            {/* Bento de estadísticas */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-border bg-card p-5 text-center">
                <p className="text-3xl font-bold text-primary">{queue.due}</p>
                <p className="mt-1 text-xs font-medium text-muted-foreground">
                  Pendientes
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-5 text-center">
                <p className="text-3xl font-bold text-success">
                  {queue.learning}
                </p>
                <p className="mt-1 text-xs font-medium text-muted-foreground">
                  Aprendiendo
                </p>
              </div>
              <div className="rounded-2xl border-2 border-primary-bright bg-accent p-5 text-center">
                <p className="text-3xl font-bold text-foreground">{queue.total}</p>
                <p className="mt-1 text-xs font-medium text-muted-foreground">Totales</p>
              </div>
            </div>

            {/* CTA principal */}
            <div className="flex flex-col items-center gap-3 pt-2">
              <button
                disabled={dueCards.length === 0}
                onClick={() => setSessionActive(true)}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-12 py-5 text-lg font-semibold text-primary-foreground shadow-sm transition active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-border disabled:text-muted-foreground"
              >
                <Play className="size-5 fill-current" />
                {dueCards.length > 0
                  ? `Comenzar repaso (${dueCards.length})`
                  : "Nada por repasar ahora"}
              </button>
              {dueCards.length > 0 && (
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Timer className="size-4" />
                  Tiempo estimado: {estMinutes} minuto
                  {estMinutes === 1 ? "" : "s"}
                </p>
              )}
            </div>

            {/* Generar tarjetas por libro */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
                <Sparkles className="size-5 text-warning-soft-foreground" />
                Crear tarjetas desde tus libros
              </h2>
              <div className="space-y-3">
                {books.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Sube un libro en la Biblioteca para generar tarjetas de repaso.
                  </p>
                ) : (
                  books.map((book) => (
                    <div
                      key={book.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {book.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {cardCountByBook[book.id] || 0} tarjeta
                          {(cardCountByBook[book.id] || 0) === 1 ? "" : "s"}
                        </p>
                      </div>
                      <button
                        disabled={generatingBook !== null}
                        onClick={() => handleGenerate(book)}
                        className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary px-4 py-2 text-sm font-medium text-primary transition hover:bg-secondary disabled:opacity-50"
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
