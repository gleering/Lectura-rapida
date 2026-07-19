"use client";

import { useEffect, useState, useCallback } from "react";
import { Brain, Sparkles, Loader2, CalendarClock, Plus } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { ReviewSession } from "@/components/ReviewSession";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

  if (sessionActive) {
    return (
      <div className="min-h-screen">
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
    <div className="min-h-screen">
      <AppNav />
      <main className="mx-auto max-w-3xl px-4 py-8 pb-24 md:pb-8">
        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Brain className="size-6 text-primary" />
            Repaso Espaciado
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Recupera de memoria en el momento justo antes de olvidar. Así el
            conocimiento pasa a tu memoria de largo plazo.
          </p>
        </div>

        {!loaded ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : (
          <div className="space-y-6">
            {/* Cola de hoy */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarClock className="size-5" />
                  Para hoy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-2xl font-bold">{queue.due}</p>
                    <p className="text-xs text-muted-foreground">Pendientes</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{queue.learning}</p>
                    <p className="text-xs text-muted-foreground">Aprendiendo</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{queue.total}</p>
                    <p className="text-xs text-muted-foreground">Totales</p>
                  </div>
                </div>
                <Button
                  className="w-full"
                  size="lg"
                  disabled={dueCards.length === 0}
                  onClick={() => setSessionActive(true)}
                >
                  {dueCards.length > 0
                    ? `Comenzar repaso (${dueCards.length})`
                    : "Nada por repasar ahora"}
                </Button>
              </CardContent>
            </Card>

            {/* Generar tarjetas por libro */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="size-5" />
                  Crear tarjetas desde tus libros
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {books.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Sube un libro en la Biblioteca para generar tarjetas de repaso.
                  </p>
                ) : (
                  books.map((book) => (
                    <div
                      key={book.id}
                      className="flex items-center justify-between gap-3 rounded-lg border p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {book.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {cardCountByBook[book.id] || 0} tarjeta
                          {(cardCountByBook[book.id] || 0) === 1 ? "" : "s"}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={generatingBook !== null}
                        onClick={() => handleGenerate(book)}
                      >
                        {generatingBook === book.id ? (
                          <>
                            <Loader2 className="mr-1 size-4 animate-spin" />
                            Generando…
                          </>
                        ) : (
                          <>
                            <Plus className="mr-1 size-4" />
                            Generar
                          </>
                        )}
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
