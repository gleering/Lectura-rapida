"use client";

import { useEffect, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { Stats } from "@/components/Stats";
import { RetentionDashboard } from "@/components/RetentionDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
    <div className="min-h-screen">
      <AppNav />
      <main className="mx-auto max-w-5xl px-4 py-8 pb-24 md:pb-8">
        <h1 className="mb-6 text-2xl font-bold">Estadísticas</h1>

        <div className="mb-8 space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            <Button
              variant={selectedBook === null ? "default" : "outline"}
              onClick={() => setSelectedBook(null)}
              size="sm"
            >
              General
            </Button>
            {books.map((book) => (
              <Button
                key={book.id}
                variant={selectedBook === book.id ? "default" : "outline"}
                onClick={() => setSelectedBook(book.id)}
                size="sm"
                className="whitespace-nowrap"
              >
                {book.title}
              </Button>
            ))}
          </div>

          {selectedBook && (
            <Card>
              <CardHeader>
                <CardTitle>Comprensión y Retención</CardTitle>
              </CardHeader>
              <CardContent>
                <RetentionDashboard
                  scores={scores}
                  bookTitle={
                    books.find((b) => b.id === selectedBook)?.title ||
                    "Libro desconocido"
                  }
                />
              </CardContent>
            </Card>
          )}
        </div>

        {!selectedBook && <Stats />}
      </main>
    </div>
  );
}
