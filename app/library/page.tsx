"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trash2, Play, BookOpen, Loader2 } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { UploadButton } from "@/components/UploadButton";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { listBooks, deleteBook, getSummary } from "@/lib/storage";
import { formatDuration, formatNumber } from "@/lib/utils";
import type { BookMeta } from "@/types";

interface BookWithSummary extends BookMeta {
  summaryText?: string;
  loadingSummary?: boolean;
}

export default function LibraryPage() {
  const [books, setBooks] = useState<BookWithSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [expandedBook, setExpandedBook] = useState<string | null>(null);

  const refresh = () =>
    listBooks().then((b) => {
      setBooks(b as BookWithSummary[]);
      setLoaded(true);
    });

  useEffect(() => {
    refresh();
  }, []);

  const remove = async (id: string) => {
    await deleteBook(id);
    refresh();
  };

  const toggleSummary = async (bookId: string) => {
    if (expandedBook === bookId) {
      setExpandedBook(null);
      return;
    }

    const book = books.find((b) => b.id === bookId);
    if (!book?.summaryText && !book?.loadingSummary) {
      setBooks((prevBooks) =>
        prevBooks.map((b) =>
          b.id === bookId ? { ...b, loadingSummary: true } : b
        )
      );

      const summary = await getSummary(bookId);
      setBooks((prevBooks) =>
        prevBooks.map((b) =>
          b.id === bookId
            ? { ...b, summaryText: summary || undefined, loadingSummary: false }
            : b
        )
      );
    }

    setExpandedBook(bookId);
  };

  return (
    <div className="min-h-screen">
      <AppNav />
      <main className="mx-auto max-w-5xl px-4 py-8 pb-24 md:pb-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Biblioteca</h1>
          <UploadButton label="Subir PDF" size="default" />
        </div>

        {!loaded ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : books.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
              <BookOpen className="size-8" />
              <p>Tu biblioteca está vacía. Sube tu primer PDF.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {books.map((b) => {
              const pct =
                b.totalWords > 0
                  ? ((b.progressIndex + 1) / b.totalWords) * 100
                  : 0;
              const isExpanded = expandedBook === b.id;
              return (
                <Card key={b.id}>
                  <CardContent className="flex flex-col gap-4 p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-medium">{b.title}</p>
                          {b.finished && (
                            <span className="shrink-0 rounded-full bg-green-500/15 px-2 py-0.5 text-xs text-green-600 dark:text-green-400">
                              Leído
                            </span>
                          )}
                        </div>
                        {b.author && (
                          <p className="truncate text-sm text-muted-foreground">
                            {b.author}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatNumber(b.totalWords)} palabras · {b.totalPages}{" "}
                          pág. · {formatDuration(b.timeReadMs)} leído
                        </p>
                        <div className="mt-2 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/reader/${b.id}`}
                          className={buttonVariants({ size: "sm" })}
                        >
                          <Play className="size-4" />
                          {b.progressIndex > 0 && !b.finished
                            ? "Continuar"
                            : "Leer"}
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleSummary(b.id)}
                          className="text-xs"
                        >
                          {isExpanded ? "Ocultar" : "Resumen"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(b.id)}
                          aria-label="Eliminar libro"
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t pt-4">
                        {b.loadingSummary ? (
                          <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
                            <Loader2 className="size-4 animate-spin" />
                            <p className="text-sm">Generando resumen…</p>
                          </div>
                        ) : b.summaryText ? (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">
                              Resumen IA:
                            </p>
                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                              {b.summaryText}
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No hay resumen disponible.
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
