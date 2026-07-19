"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  Sparkles,
  Plus,
  X,
  Save,
  Check,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  generateAISummary,
  extractKeyPoints,
  keyPointsToReviewConcepts,
} from "@/lib/progressive-summary";
import { createReviewCard } from "@/lib/spaced-repetition";
import {
  getProgressiveSummary,
  saveProgressiveSummary,
  getBookContent,
  getReviewCardsByBook,
  saveReviewCards,
} from "@/lib/storage";
import type { ProgressiveSummary } from "@/types";

interface ProgressiveSummaryViewProps {
  bookId: string;
  bookTitle: string;
}

export function ProgressiveSummaryView({
  bookId,
  bookTitle,
}: ProgressiveSummaryViewProps) {
  const [aiSummary, setAiSummary] = useState("");
  const [keyPoints, setKeyPoints] = useState<string[]>([]);
  const [synthesis, setSynthesis] = useState("");
  const [loading, setLoading] = useState(true);
  const [genSummary, setGenSummary] = useState(false);
  const [genPoints, setGenPoints] = useState(false);
  const [saved, setSaved] = useState(false);
  const [creatingCards, setCreatingCards] = useState(false);
  const [createdCount, setCreatedCount] = useState<number | null>(null);
  const [cardError, setCardError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setCreatedCount(null);
    setCardError(null);
    getProgressiveSummary(bookId).then((s) => {
      if (s) {
        setAiSummary(s.aiSummary);
        setKeyPoints(s.keyPoints);
        setSynthesis(s.synthesis);
      }
      setLoading(false);
    });
  }, [bookId]);

  const persist = async (partial?: Partial<ProgressiveSummary>) => {
    const summary: ProgressiveSummary = {
      bookId,
      aiSummary,
      keyPoints,
      synthesis,
      updatedAt: Date.now(),
      ...partial,
    };
    await saveProgressiveSummary(summary);
  };

  const handleGenSummary = async () => {
    setGenSummary(true);
    try {
      const content = await getBookContent(bookId);
      if (!content) return;
      const s = await generateAISummary(content.words.join(" "));
      if (s) {
        setAiSummary(s);
        await persist({ aiSummary: s });
      }
    } finally {
      setGenSummary(false);
    }
  };

  const handleGenPoints = async () => {
    setGenPoints(true);
    try {
      const content = await getBookContent(bookId);
      if (!content) return;
      const points = await extractKeyPoints(content.words.join(" "));
      if (points) {
        setKeyPoints(points);
        await persist({ keyPoints: points });
      }
    } finally {
      setGenPoints(false);
    }
  };

  const createCards = async () => {
    setCreatingCards(true);
    setCardError(null);
    setCreatedCount(null);
    try {
      // Persistir las ediciones actuales antes de convertir.
      await persist();
      const concepts = await keyPointsToReviewConcepts(bookTitle, keyPoints);
      if (!concepts || concepts.length === 0) {
        setCardError(
          "No se pudieron crear tarjetas. Añade puntos clave y verifica que la IA esté configurada en el servidor (GEMINI_API_KEY)."
        );
        return;
      }
      const existing = await getReviewCardsByBook(bookId);
      const startIdx = existing.length;
      const now = Date.now();
      const cards = concepts.map((c, i) =>
        createReviewCard({
          id: `${bookId}_ptcard_${startIdx + i}_${now}`,
          bookId,
          concept: c.concept,
          prompt: c.prompt,
          answer: c.answer,
          now,
        })
      );
      await saveReviewCards(cards);
      setCreatedCount(cards.length);
    } finally {
      setCreatingCards(false);
    }
  };

  const updatePoint = (i: number, value: string) => {
    setKeyPoints((prev) => prev.map((p, idx) => (idx === i ? value : p)));
  };

  const removePoint = (i: number) => {
    setKeyPoints((prev) => prev.filter((_, idx) => idx !== i));
  };

  const addPoint = () => setKeyPoints((prev) => [...prev, ""]);

  const save = async () => {
    await persist();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">Cargando…</p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Destila en capas: de resumen IA → puntos clave que editas → tu propia
        síntesis. Reescribir con tus palabras es lo que graba el conocimiento.
      </p>

      {/* Capa 1: Resumen IA */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">
              Capa 1 · Resumen IA
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGenSummary}
              disabled={genSummary}
            >
              {genSummary ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
            </Button>
          </div>
          {aiSummary ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {aiSummary}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Genera el resumen base con IA.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Capa 2: Puntos clave editables */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">
              Capa 2 · Puntos clave (edítalos)
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGenPoints}
              disabled={genPoints}
            >
              {genPoints ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
            </Button>
          </div>
          <div className="space-y-2">
            {keyPoints.map((point, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-primary">•</span>
                <input
                  value={point}
                  onChange={(e) => updatePoint(i, e.target.value)}
                  className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <button
                  onClick={() => removePoint(i)}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Eliminar punto"
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addPoint}>
              <Plus className="mr-1 size-4" />
              Añadir punto
            </Button>
          </div>

          {/* Puente destilación → recuperación: puntos clave a tarjetas. */}
          {keyPoints.some((p) => p.trim()) && (
            <div className="border-t pt-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <p className="flex-1 text-xs text-muted-foreground">
                  Destilar no basta: convierte estos puntos en repaso activo para
                  recuperarlos de memoria.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={createCards}
                  disabled={creatingCards}
                >
                  {creatingCards ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Creando…
                    </>
                  ) : (
                    <>
                      <Layers className="mr-2 size-4" />
                      Crear tarjetas de repaso
                    </>
                  )}
                </Button>
              </div>

              {cardError && (
                <p className="mt-2 text-xs text-destructive">{cardError}</p>
              )}

              {createdCount !== null && (
                <div className="mt-2 flex flex-col items-start gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-3 sm:flex-row sm:items-center">
                  <div className="flex flex-1 items-center gap-2 text-sm">
                    <CheckCircle2 className="size-5 flex-shrink-0 text-emerald-500" />
                    <span>
                      {createdCount} tarjeta{createdCount === 1 ? "" : "s"} creada
                      {createdCount === 1 ? "" : "s"} desde los puntos clave.
                    </span>
                  </div>
                  <Link
                    href="/review"
                    className={buttonVariants({
                      variant: "outline",
                      size: "sm",
                    })}
                  >
                    Ir a repasar
                  </Link>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Capa 3: Síntesis propia */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">
            Capa 3 · Tu síntesis
          </span>
          <textarea
            value={synthesis}
            onChange={(e) => setSynthesis(e.target.value)}
            placeholder="Explica la idea central del libro con TUS palabras, como si se lo enseñaras a otra persona…"
            rows={5}
            className="w-full resize-none rounded-lg border border-input bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </CardContent>
      </Card>

      <Button onClick={save} className="w-full">
        {saved ? (
          <>
            <Check className="mr-2 size-4" />
            Guardado
          </>
        ) : (
          <>
            <Save className="mr-2 size-4" />
            Guardar resumen progresivo
          </>
        )}
      </Button>
    </div>
  );
}
