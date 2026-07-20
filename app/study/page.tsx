"use client";

import { useEffect, useState } from "react";
import { BookMarked, GitBranch, Layers, BookOpen } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { MindMapView } from "@/components/MindMapView";
import { ProgressiveSummaryView } from "@/components/ProgressiveSummaryView";
import { Card, CardContent } from "@/components/ui/card";
import { listBooks } from "@/lib/storage";
import { cn } from "@/lib/utils";
import type { BookMeta } from "@/types";

type Tool = "mindmap" | "summary";

export default function StudyPage() {
  const [books, setBooks] = useState<BookMeta[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<BookMeta | null>(null);
  const [tool, setTool] = useState<Tool>("mindmap");

  useEffect(() => {
    listBooks().then((b) => {
      setBooks(b);
      setLoaded(true);
    });
  }, []);

  return (
    <div className="min-h-screen">
      <AppNav />
      <main className="mx-auto max-w-3xl px-4 py-8 pb-24 md:pb-8">
        <div className="mb-6">
          <h1 className="font-display flex items-center gap-2 text-2xl font-bold">
            <BookMarked className="size-6 text-primary" />
            Estudiar
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Externaliza la estructura del libro (mapa mental) y destila su esencia
            en capas (resumen progresivo). Menos carga mental, más comprensión.
          </p>
        </div>

        {!loaded ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : books.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
              <BookOpen className="size-8" />
              <p>Sube un libro en la Biblioteca para empezar a estudiar.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Selector de libro */}
            <div className="flex flex-wrap gap-2">
              {books.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setSelected(b)}
                  className={cn(
                    "max-w-[220px] truncate rounded-full border px-3 py-1.5 text-sm transition-colors",
                    selected?.id === b.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-secondary/60"
                  )}
                >
                  {b.title}
                </button>
              ))}
            </div>

            {selected ? (
              <>
                {/* Tabs de herramienta */}
                <div className="flex gap-2 border-b">
                  <button
                    onClick={() => setTool("mindmap")}
                    className={cn(
                      "flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                      tool === "mindmap"
                        ? "border-primary text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <GitBranch className="size-4" />
                    Mapa mental
                  </button>
                  <button
                    onClick={() => setTool("summary")}
                    className={cn(
                      "flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                      tool === "summary"
                        ? "border-primary text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Layers className="size-4" />
                    Resumen progresivo
                  </button>
                </div>

                {tool === "mindmap" ? (
                  <MindMapView bookId={selected.id} bookTitle={selected.title} />
                ) : (
                  <ProgressiveSummaryView
                    bookId={selected.id}
                    bookTitle={selected.title}
                  />
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Elige un libro para estudiarlo.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
