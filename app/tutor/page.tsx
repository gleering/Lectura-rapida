"use client";

import { useEffect, useState } from "react";
import { GraduationCap, ArrowLeft, BookOpen } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { AITutor } from "@/components/AITutor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { listBooks, getBookContent } from "@/lib/storage";
import type { TutorLevel } from "@/lib/ai-tutor";
import type { BookMeta } from "@/types";

const LEVELS: { value: TutorLevel; label: string; hint: string }[] = [
  { value: "principiante", label: "Principiante", hint: "Desde cero, sin jerga" },
  { value: "intermedio", label: "Intermedio", hint: "Con base previa" },
  { value: "avanzado", label: "Avanzado", hint: "Profundiza y matiza" },
];

interface SessionConfig {
  concept: string;
  sourceText?: string;
  level: TutorLevel;
  bookId: string;
}

export default function TutorPage() {
  const [books, setBooks] = useState<BookMeta[]>([]);
  const [concept, setConcept] = useState("");
  const [level, setLevel] = useState<TutorLevel>("intermedio");
  const [selectedBook, setSelectedBook] = useState<string>("");
  const [session, setSession] = useState<SessionConfig | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    listBooks().then(setBooks);
  }, []);

  const start = async () => {
    if (!concept.trim()) return;
    setStarting(true);
    try {
      let sourceText: string | undefined;
      let bookId = "tutor-sessions";
      if (selectedBook) {
        const content = await getBookContent(selectedBook);
        sourceText = content?.words.join(" ");
        bookId = selectedBook;
      }
      setSession({ concept: concept.trim(), sourceText, level, bookId });
    } finally {
      setStarting(false);
    }
  };

  if (session) {
    return (
      <div className="min-h-screen">
        <AppNav />
        <main className="mx-auto max-w-2xl px-4 py-8 pb-24 md:pb-8">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Aprendiendo</p>
              <h1 className="text-lg font-semibold">{session.concept}</h1>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSession(null)}
            >
              <ArrowLeft className="mr-1 size-4" />
              Nuevo tema
            </Button>
          </div>
          <AITutor
            concept={session.concept}
            sourceText={session.sourceText}
            level={session.level}
            bookId={session.bookId}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AppNav />
      <main className="mx-auto max-w-2xl px-4 py-8 pb-24 md:pb-8">
        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <GraduationCap className="size-6 text-primary" />
            Tutor de comprensión
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            No memorices: comprende. El tutor te explica, detecta lo que no entiendes
            y reformula hasta que lo domines.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">¿Qué quieres entender?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium">Concepto o tema</label>
              <textarea
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                placeholder="Ej. El interés compuesto, la teoría de la relatividad, qué es una API…"
                rows={2}
                className="w-full resize-none rounded-lg border border-input bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tu nivel</label>
              <div className="grid grid-cols-3 gap-2">
                {LEVELS.map((l) => (
                  <button
                    key={l.value}
                    onClick={() => setLevel(l.value)}
                    className={`rounded-lg border-2 p-3 text-left transition-colors ${
                      level === l.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-secondary/60"
                    }`}
                  >
                    <p className="text-sm font-medium">{l.label}</p>
                    <p className="text-xs text-muted-foreground">{l.hint}</p>
                  </button>
                ))}
              </div>
            </div>

            {books.length > 0 && (
              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-sm font-medium">
                  <BookOpen className="size-4" />
                  Contexto de un libro (opcional)
                </label>
                <p className="text-xs text-muted-foreground">
                  El tutor usará el texto del libro como base de verdad.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedBook("")}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      selectedBook === ""
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-secondary/60"
                    }`}
                  >
                    Sin libro
                  </button>
                  {books.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setSelectedBook(b.id)}
                      className={`max-w-[200px] truncate rounded-full border px-3 py-1 text-xs transition-colors ${
                        selectedBook === b.id
                          ? "border-primary bg-primary/10"
                          : "border-border hover:bg-secondary/60"
                      }`}
                    >
                      {b.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Button
              className="w-full"
              size="lg"
              disabled={!concept.trim() || starting}
              onClick={start}
            >
              {starting ? "Preparando…" : "Empezar a aprender"}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
