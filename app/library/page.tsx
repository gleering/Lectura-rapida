"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trash2, Play, BookOpen } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { UploadButton } from "@/components/UploadButton";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { listBooks, deleteBook } from "@/lib/storage";
import { formatDuration, formatNumber } from "@/lib/utils";
import type { BookMeta } from "@/types";

export default function LibraryPage() {
  const [books, setBooks] = useState<BookMeta[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = () =>
    listBooks().then((b) => {
      setBooks(b);
      setLoaded(true);
    });

  useEffect(() => {
    refresh();
  }, []);

  const remove = async (id: string) => {
    await deleteBook(id);
    refresh();
  };

  return (
    <div className="min-h-screen">
      <AppNav />
      <main className="mx-auto max-w-5xl px-4 py-8">
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
              return (
                <Card key={b.id}>
                  <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
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
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(b.id)}
                        aria-label="Eliminar libro"
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
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
