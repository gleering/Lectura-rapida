"use client";

import { useState } from "react";
import {
  Loader2,
  Brain,
  Lightbulb,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { evaluateRecall, type RecallEvaluation } from "@/lib/active-recall";
import { scheduleCard, gradeFromRating } from "@/lib/spaced-repetition";
import { saveReviewCard } from "@/lib/storage";
import type { ReviewCard, RecallRating } from "@/types";

interface ReviewSessionProps {
  cards: ReviewCard[];
  onFinished?: () => void;
}

type Phase = "recall" | "evaluating" | "feedback";

const RATING_META: Record<
  RecallRating,
  { label: string; interval: string }
> = {
  again: { label: "Otra vez", interval: "1 min" },
  hard: { label: "Difícil", interval: "2 días" },
  good: { label: "Bien", interval: "4 días" },
  easy: { label: "Fácil", interval: "7 días" },
};

export function ReviewSession({ cards, onFinished }: ReviewSessionProps) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("recall");
  const [explanation, setExplanation] = useState("");
  const [evaluation, setEvaluation] = useState<RecallEvaluation | null>(null);
  const [reviewedCount, setReviewedCount] = useState(0);

  const card = cards[index];
  const done = index >= cards.length;

  const handleSubmit = async () => {
    if (!card || !explanation.trim()) return;
    setPhase("evaluating");
    const result = await evaluateRecall(card.prompt, card.answer, explanation);
    setEvaluation(result);
    setPhase("feedback");
  };

  const handleRate = async (rating: RecallRating) => {
    if (!card) return;
    const updated = scheduleCard(card, gradeFromRating(rating));
    await saveReviewCard(updated);

    setReviewedCount((c) => c + 1);
    setExplanation("");
    setEvaluation(null);
    setPhase("recall");
    setIndex((i) => i + 1);
  };

  if (done) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8">
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <CheckCircle2 className="size-12 text-success" />
          <h2
            className="text-xl font-bold text-foreground font-display"
          >
            Repaso completado
          </h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Repasaste {reviewedCount} concepto{reviewedCount === 1 ? "" : "s"}.
            Cada recuperación fortalece tu memoria a largo plazo.
          </p>
          {onFinished && (
            <button
              onClick={onFinished}
              className="mt-3 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition active:scale-[0.98]"
            >
              Volver
            </button>
          )}
        </div>
      </div>
    );
  }

  const progress = (index / cards.length) * 100;

  return (
    <div className="space-y-5">
      {/* Barra superior: salir + progreso */}
      <div className="flex items-center justify-between gap-4">
        {onFinished ? (
          <button
            onClick={onFinished}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary"
          >
            <ArrowLeft className="size-4" />
            Salir del repaso
          </button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-3">
          <div className="h-2 w-40 overflow-hidden rounded-full bg-primary-soft">
            <div
              className="h-full rounded-full bg-success transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="whitespace-nowrap text-sm font-medium text-muted-foreground">
            {index + 1} / {cards.length}
          </span>
        </div>
      </div>

      {/* Tarjeta */}
      <div className="relative min-h-[400px] overflow-hidden rounded-2xl border border-border bg-card p-8">
        <Brain className="pointer-events-none absolute -right-6 -top-6 size-32 text-secondary" />

        <div className="relative space-y-5">
          {/* Chip de libro */}
          {card.concept && (
            <span className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-xs font-medium text-primary">
              {card.concept}
            </span>
          )}

          {/* Pregunta */}
          <h2
            className="text-2xl font-bold leading-tight text-foreground font-display"
          >
            {card.prompt}
          </h2>

          {phase === "recall" && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Tu explicación
                </label>
                <textarea
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Explica con tus palabras, sin mirar el libro…"
                  rows={5}
                  autoFocus
                  className="w-full resize-none rounded-xl border border-border bg-background p-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Escribir la respuesta de memoria (recuperación activa) fortalece
                el recuerdo mucho más que releer.
              </p>
              <button
                onClick={handleSubmit}
                disabled={!explanation.trim()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary-bright px-6 py-3 text-sm font-semibold text-primary-foreground transition active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-border disabled:text-muted-foreground"
              >
                <Sparkles className="size-4" />
                Comprobar con IA
              </button>
            </>
          )}

          {phase === "evaluating" && (
            <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              <span className="text-sm">Evaluando tu explicación…</span>
            </div>
          )}

          {phase === "feedback" && (
            <div className="space-y-4">
              {/* Tu explicación */}
              <div className="rounded-xl border border-border bg-muted p-3">
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  Tu explicación
                </p>
                <p className="whitespace-pre-wrap text-sm text-foreground">
                  {explanation}
                </p>
              </div>

              {/* Análisis de la IA */}
              {evaluation ? (
                <div className="space-y-3 rounded-xl border border-success-soft bg-success-soft/20 p-4">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-success-soft-foreground">
                      <Sparkles className="size-4" />
                      Análisis de la IA
                    </span>
                    <span className="font-mono text-sm font-bold text-foreground">
                      {evaluation.score}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-card/60">
                    <div
                      className="h-full rounded-full bg-success"
                      style={{ width: `${evaluation.score}%` }}
                    />
                  </div>

                  {evaluation.gap && (
                    <div className="flex gap-2 rounded-lg border border-warning-soft-foreground/30 bg-card/60 p-3">
                      <Lightbulb className="mt-0.5 size-4 flex-shrink-0 text-warning-soft-foreground" />
                      <div className="text-sm">
                        <p className="font-medium text-foreground">
                          Hueco detectado
                        </p>
                        <p className="text-muted-foreground">{evaluation.gap}</p>
                      </div>
                    </div>
                  )}

                  {evaluation.feedback && (
                    <p className="text-sm text-success-soft-foreground">
                      {evaluation.feedback}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Evaluación automática no disponible. Compara con la respuesta de
                  referencia y autoevalúate.
                </p>
              )}

              {/* Respuesta de referencia */}
              <div className="rounded-xl border border-border bg-card p-3">
                <p className="mb-1 text-xs font-medium text-success">
                  Respuesta de referencia
                </p>
                <p className="text-sm text-foreground">{card.answer}</p>
                {card.source && (
                  <p className="mt-2 border-l-2 border-success-soft pl-2 text-xs italic text-muted-foreground">
                    &ldquo;{card.source}&rdquo;
                  </p>
                )}
              </div>

              {/* Autorating → programación SM-2 */}
              <div>
                <p className="mb-2 text-xs text-muted-foreground">
                  ¿Qué tan bien lo recordaste? Esto ajusta cuándo lo volverás a
                  ver.
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(["again", "hard", "good", "easy"] as RecallRating[]).map(
                    (rating) => {
                      const active = evaluation?.suggestedRating === rating;
                      return (
                        <button
                          key={rating}
                          onClick={() => handleRate(rating)}
                          className={
                            "flex flex-col items-center gap-0.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition active:scale-[0.98] " +
                            (active
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-card text-foreground hover:bg-muted")
                          }
                        >
                          <span>{RATING_META[rating].label}</span>
                          <span
                            className={
                              "text-[11px] " +
                              (active ? "text-white/80" : "text-muted-foreground")
                            }
                          >
                            {RATING_META[rating].interval}
                          </span>
                        </button>
                      );
                    }
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
