"use client";

import { useEffect, useState, useCallback } from "react";
import { Network, Loader2, Sparkles, Link2 } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  getAllReviewCards,
  getAllConceptLinks,
  saveConceptLinks,
  clearConceptLinks,
  listBooks,
} from "@/lib/storage";
import {
  findConnections,
  groupByConcept,
  type ConceptInput,
} from "@/lib/concept-graph";
import type { ConceptLink, ReviewCard, BookMeta } from "@/types";

export default function ConnectionsPage() {
  const [loaded, setLoaded] = useState(false);
  const [links, setLinks] = useState<ConceptLink[]>([]);
  const [cards, setCards] = useState<ReviewCard[]>([]);
  const [books, setBooks] = useState<BookMeta[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [storedLinks, allCards, bookList] = await Promise.all([
      getAllConceptLinks(),
      getAllReviewCards(),
      listBooks(),
    ]);
    setLinks(storedLinks);
    setCards(allCards);
    setBooks(bookList);
    setLoaded(true);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const analyze = async () => {
    setAnalyzing(true);
    setError(null);
    try {
      const bookTitle = new Map(books.map((b) => [b.id, b.title]));
      const inputs: ConceptInput[] = cards.map((c) => ({
        id: c.id,
        concept: c.concept,
        bookTitle: bookTitle.get(c.bookId),
        answer: c.answer,
      }));
      const found = await findConnections(inputs);
      if (!found) {
        setError(
          "No se pudo analizar. Verifica que la IA esté configurada en el servidor (GEMINI_API_KEY)."
        );
        return;
      }
      await clearConceptLinks();
      await saveConceptLinks(found);
      await refresh();
    } finally {
      setAnalyzing(false);
    }
  };

  const grouped = groupByConcept(links);
  const groupedEntries = Array.from(grouped.values()).sort(
    (a, b) => b.related.length - a.related.length
  );

  return (
    <div className="min-h-screen">
      <AppNav />
      <main className="mx-auto max-w-3xl px-4 py-8 pb-24 md:pb-8">
        <div className="mb-6">
          <h1 className="font-display flex items-center gap-2 text-2xl font-bold">
            <Network className="size-6 text-primary" />
            Conexiones
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            El conocimiento se recuerda mejor en red. Conectar ideas entre libros
            distintos es lo que construye comprensión profunda y pensamiento crítico.
          </p>
        </div>

        {!loaded ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : cards.length < 2 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
              <Link2 className="size-8" />
              <p>
                Necesitas al menos 2 tarjetas de repaso para encontrar conexiones.
                Genera tarjetas desde la sección Repaso.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardContent className="flex flex-col items-center gap-3 p-5 text-center sm:flex-row sm:text-left">
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {cards.length} conceptos en tu biblioteca
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {links.length > 0
                      ? `${links.length} conexiones detectadas`
                      : "Aún no has analizado tus conexiones"}
                  </p>
                </div>
                <Button onClick={analyze} disabled={analyzing}>
                  {analyzing ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Analizando…
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 size-4" />
                      {links.length > 0 ? "Reanalizar" : "Analizar biblioteca"}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {error && (
              <Card className="border-orange-500/40 bg-orange-500/5">
                <CardContent className="p-4 text-sm text-muted-foreground">
                  {error}
                </CardContent>
              </Card>
            )}

            {groupedEntries.length > 0 && (
              <div className="space-y-3">
                {groupedEntries.map((entry, i) => (
                  <Card key={i}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{entry.concept}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {entry.related.map((rel, j) => (
                        <div
                          key={j}
                          className="flex gap-2 rounded-lg border bg-secondary/30 p-2.5 text-sm"
                        >
                          <Link2 className="mt-0.5 size-4 flex-shrink-0 text-primary" />
                          <div>
                            <p className="font-medium">{rel.concept}</p>
                            <p className="text-xs text-muted-foreground">
                              {rel.relationship}
                            </p>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
