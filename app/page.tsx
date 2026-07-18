"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Clock, Play } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { UploadButton } from "@/components/UploadButton";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { listBooks } from "@/lib/storage";
import { formatNumber } from "@/lib/utils";
import type { BookMeta } from "@/types";

export default function HomePage() {
  const [books, setBooks] = useState<BookMeta[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    listBooks().then((b) => {
      setBooks(b);
      setLoaded(true);
    });
  }, []);

  const continueBook = books.find(
    (b) => !b.finished && b.progressIndex > 0
  );
  const recent = books.slice(0, 6);

  return (
    <div className="min-h-screen">
      <AppNav />
      <main className="mx-auto max-w-5xl px-4 py-10">
        {/* Hero */}
        <section className="flex flex-col items-center gap-6 py-12 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <BookOpen className="size-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Lee más rápido con RSVP
            </h1>
            <p className="mx-auto max-w-xl text-muted-foreground">
              Sube un PDF y léelo palabra por palabra, de 100 a 2000 palabras
              por minuto. Interfaz mínima, cero distracciones.
            </p>
          </div>
          <UploadButton />
        </section>

        {/* Continue reading */}
        {continueBook && (
          <section className="mb-10">
            <h2 className="mb-3 text-lg font-semibold">Continuar lectura</h2>
            <Card>
              <CardContent className="flex items-center justify-between gap-4 p-5">
                <div className="min-w-0">
                  <p className="truncate font-medium">{continueBook.title}</p>
                  <p className="text-sm text-muted-foreground">
                    Palabra {formatNumber(continueBook.progressIndex + 1)} de{" "}
                    {formatNumber(continueBook.totalWords)} ·{" "}
                    {(
                      ((continueBook.progressIndex + 1) /
                        continueBook.totalWords) *
                      100
                    ).toFixed(0)}
                    %
                  </p>
                </div>
                <Link
                  href={`/reader/${continueBook.id}`}
                  className={buttonVariants({ size: "lg" })}
                >
                  <Play /> Continuar
                </Link>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Recent books */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Últimos libros</h2>
            {books.length > 0 && (
              <Link
                href="/library"
                className="text-sm text-muted-foreground hover:underline"
              >
                Ver biblioteca
              </Link>
            )}
          </div>

          {!loaded ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : recent.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
                <Clock className="size-6" />
                <p>Todavía no subiste ningún libro.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {recent.map((b) => {
                const pct =
                  b.totalWords > 0
                    ? ((b.progressIndex + 1) / b.totalWords) * 100
                    : 0;
                return (
                  <Link key={b.id} href={`/reader/${b.id}`}>
                    <Card className="h-full transition-colors hover:border-primary/40 hover:bg-secondary/40">
                      <CardContent className="space-y-3 p-5">
                        <div className="flex items-start justify-between gap-2">
                          <p className="line-clamp-2 font-medium">{b.title}</p>
                          {b.finished && (
                            <span className="shrink-0 rounded-full bg-green-500/15 px-2 py-0.5 text-xs text-green-600 dark:text-green-400">
                              Leído
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatNumber(b.totalWords)} palabras · {b.totalPages}{" "}
                          pág.
                        </p>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
