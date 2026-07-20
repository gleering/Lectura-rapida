"use client";

import { useEffect, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { Stats } from "@/components/Stats";
import { RetentionDashboard } from "@/components/RetentionDashboard";
import { listBooks, getComprehensionScores } from "@/lib/storage";
import type { BookMeta } from "@/types";
import type { ComprehensionScore } from "@/lib/comprehension-service";

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
    <div className="min-h-screen bg-[#faf8ff] text-[#131b2e]">
      <AppNav />
      <main className="mx-auto max-w-5xl px-4 py-8 pb-24 md:pb-8">
        {/* Encabezado */}
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1
              className="text-3xl font-bold tracking-tight"
              style={{ fontFamily: "var(--font-hanken, inherit)" }}
            >
              Panel de Estadísticas
            </h1>
            <p className="mt-1 text-sm text-[#434655]">
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
                ? "bg-[#004ac6] text-white"
                : "border border-[#c3c6d7] bg-white text-[#434655] hover:bg-[#f2f3ff]")
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
                  ? "bg-[#004ac6] text-white"
                  : "border border-[#c3c6d7] bg-white text-[#434655] hover:bg-[#f2f3ff]")
              }
            >
              {book.title}
            </button>
          ))}
        </div>

        {selectedBook ? (
          <div className="rounded-2xl border border-[#c3c6d7] bg-white p-6">
            <h2
              className="mb-4 text-lg font-bold"
              style={{ fontFamily: "var(--font-hanken, inherit)" }}
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
      </main>
    </div>
  );
}
