"use client";

import { useState } from "react";
import { Loader2, Brain, Lightbulb, CheckCircle2, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { evaluateRecall, type RecallEvaluation } from "@/lib/active-recall";
import { scheduleCard, gradeFromRating } from "@/lib/spaced-repetition";
import { saveReviewCard } from "@/lib/storage";
import type { ReviewCard, RecallRating } from "@/types";

interface ReviewSessionProps {
  cards: ReviewCard[];
  onFinished?: () => void;
}

type Phase = "recall" | "evaluating" | "feedback";

const RATING_LABELS: Record<RecallRating, string> = {
  again: "Otra vez",
  hard: "Difícil",
  good: "Bien",
  easy: "Fácil",
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
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <CheckCircle2 className="size-10 text-green-500" />
          <h2 className="text-lg font-semibold">Repaso completado</h2>
          <p className="text-sm text-muted-foreground">
            Repasaste {reviewedCount} concepto{reviewedCount === 1 ? "" : "s"}. Cada
            recuperación fortalece tu memoria a largo plazo.
          </p>
          {onFinished && (
            <Button onClick={onFinished} className="mt-2">
              Volver
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const progress = (index / cards.length) * 100;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            Tarjeta {index + 1} de {cards.length}
          </span>
          <span>{card.concept}</span>
        </div>
        <Progress value={progress} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="size-5 text-primary" />
            Recupera de memoria
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="font-medium">{card.prompt}</p>

          {phase === "recall" && (
            <>
              <textarea
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="Explica el concepto con tus propias palabras, sin mirar el libro…"
                rows={5}
                autoFocus
                className="w-full resize-none rounded-lg border border-input bg-background p-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
              />
              <p className="text-xs text-muted-foreground">
                Escribir la respuesta de memoria (recuperación activa) fortalece el
                recuerdo mucho más que releer.
              </p>
              <Button
                onClick={handleSubmit}
                disabled={!explanation.trim()}
                className="w-full"
              >
                Comprobar comprensión
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </>
          )}

          {phase === "evaluating" && (
            <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              <span className="text-sm">Evaluando tu explicación…</span>
            </div>
          )}

          {phase === "feedback" && (
            <div className="space-y-4">
              {/* Tu explicación */}
              <div className="rounded-lg border bg-secondary/40 p-3">
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  Tu explicación
                </p>
                <p className="whitespace-pre-wrap text-sm">{explanation}</p>
              </div>

              {/* Evaluación IA (si está disponible) */}
              {evaluation ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Comprensión</span>
                    <span className="font-mono font-bold">
                      {evaluation.score}%
                    </span>
                  </div>
                  <Progress value={evaluation.score} />

                  {evaluation.gap && (
                    <div className="flex gap-2 rounded-lg border border-orange-500/40 bg-orange-500/5 p-3">
                      <Lightbulb className="mt-0.5 size-4 flex-shrink-0 text-orange-500" />
                      <div className="text-sm">
                        <p className="font-medium">Hueco detectado</p>
                        <p className="text-muted-foreground">{evaluation.gap}</p>
                      </div>
                    </div>
                  )}

                  {evaluation.feedback && (
                    <p className="text-sm text-muted-foreground">
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
              <div className="rounded-lg border border-green-500/40 bg-green-500/5 p-3">
                <p className="mb-1 text-xs font-medium text-green-600 dark:text-green-400">
                  Respuesta de referencia
                </p>
                <p className="text-sm">{card.answer}</p>
                {card.source && (
                  <p className="mt-2 border-l-2 border-green-500/40 pl-2 text-xs italic text-muted-foreground">
                    &ldquo;{card.source}&rdquo;
                  </p>
                )}
              </div>

              {/* Autorating → programación SM-2 */}
              <div>
                <p className="mb-2 text-xs text-muted-foreground">
                  ¿Qué tan bien lo recordaste? Esto ajusta cuándo lo volverás a ver.
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {(["again", "hard", "good", "easy"] as RecallRating[]).map(
                    (rating) => (
                      <Button
                        key={rating}
                        variant={
                          evaluation?.suggestedRating === rating
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() => handleRate(rating)}
                      >
                        {RATING_LABELS[rating]}
                      </Button>
                    )
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
