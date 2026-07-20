"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Stats } from "@/components/Stats";
import { listBooks, getComprehensionScores } from "@/lib/storage";
import type { BookMeta } from "@/types";
import type { ComprehensionScore } from "@/lib/comprehension-service";

// recharts es pesado: se carga solo al abrir el panel por libro (no en el
// primer render de /stats).
const RetentionDashboard = dynamic(
  () => import("@/components/RetentionDashboard").then((m) => m.RetentionDashboard),
  {
    ssr: false,
    loading: () => (
      <div className="flex justify-center py-16 text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
      </div>
    ),
  }
);

export default function StatsPage() {
  const [books, setBooks] = useState<BookMeta[]>([]);
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [scores, setScores] = useState<ComprehensionScore[]>([]);

  useEffect(() => {
    listBooks().then(setBooks);
  }, []);

  useEffect(() => {
    if (selectedBook) {
      getComprehensionScores(selectedBook).then((s) => {
        setScores(
          s.map((score) => ({
            ...score,
            difficulty: score.difficulty as 1 | 2 | 3,
          }))
        );
      });
    }
  }, [selectedBook]);

  return (
    <PageShell maxWidth="2xl">
      {/* Encabezado */}
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1
              className="text-3xl font-bold tracking-tight font-display"
            >
              Panel de Estadísticas
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Monitorea tu evolución cognitiva y hábitos de lectura.
            </p>
          </div>
        </div>

        {/* Selector de libro */}
        <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedBook(null)}
            className={
              "shrink-0 rounded-full px-5 py-2 text-sm font-medium transition " +
              (selectedBook === null
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-muted-foreground hover:bg-muted")
            }
          >
            General
          </button>
          {books.map((book) => (
            <button
              key={book.id}
              onClick={() => setSelectedBook(book.id)}
              className={
                "shrink-0 whitespace-nowrap rounded-full px-5 py-2 text-sm font-medium transition " +
                (selectedBook === book.id
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-muted-foreground hover:bg-muted")
              }
            >
              {book.title}
            </button>
          ))}
        </div>

        {selectedBook ? (
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2
              className="mb-4 text-lg font-bold font-display"
            >
              Comprensión y Retención
            </h2>
            <RetentionDashboard
              scores={scores}
              bookTitle={
                books.find((b) => b.id === selectedBook)?.title ||
                "Libro desconocido"
              }
            />
          </div>
        ) : (
          <Stats />
        )}
    </PageShell>
  );
}
