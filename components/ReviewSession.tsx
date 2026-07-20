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
      <div className="rounded-2xl border border-[#c3c6d7] bg-white p-8">
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <CheckCircle2 className="size-12 text-[#006c49]" />
          <h2
            className="text-xl font-bold text-[#131b2e]"
            style={{ fontFamily: "var(--font-hanken, inherit)" }}
          >
            Repaso completado
          </h2>
          <p className="max-w-sm text-sm text-[#434655]">
            Repasaste {reviewedCount} concepto{reviewedCount === 1 ? "" : "s"}.
            Cada recuperación fortalece tu memoria a largo plazo.
          </p>
          {onFinished && (
            <button
              onClick={onFinished}
              className="mt-3 rounded-full bg-[#004ac6] px-6 py-2.5 text-sm font-semibold text-white transition active:scale-[0.98]"
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
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#004ac6]"
          >
            <ArrowLeft className="size-4" />
            Salir del repaso
          </button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-3">
          <div className="h-2 w-40 overflow-hidden rounded-full bg-[#dae2fd]">
            <div
              className="h-full rounded-full bg-[#006c49] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="whitespace-nowrap text-sm font-medium text-[#434655]">
            {index + 1} / {cards.length}
          </span>
        </div>
      </div>

      {/* Tarjeta */}
      <div className="relative min-h-[400px] overflow-hidden rounded-2xl border border-[#c3c6d7] bg-white p-8">
        <Brain className="pointer-events-none absolute -right-6 -top-6 size-32 text-[#eaedff]" />

        <div className="relative space-y-5">
          {/* Chip de libro */}
          {card.concept && (
            <span className="inline-flex items-center rounded-full bg-[#eaedff] px-3 py-1 text-xs font-medium text-[#004ac6]">
              {card.concept}
            </span>
          )}

          {/* Pregunta */}
          <h2
            className="text-2xl font-bold leading-tight text-[#131b2e]"
            style={{ fontFamily: "var(--font-hanken, inherit)" }}
          >
            {card.prompt}
          </h2>

          {phase === "recall" && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#434655]">
                  Tu explicación
                </label>
                <textarea
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Explica con tus palabras, sin mirar el libro…"
                  rows={5}
                  autoFocus
                  className="w-full resize-none rounded-xl border border-[#c3c6d7] bg-[#faf8ff] p-3 text-sm text-[#131b2e] outline-none placeholder:text-[#737686] focus-visible:border-[#004ac6] focus-visible:ring-2 focus-visible:ring-[#004ac6]/20"
                />
              </div>
              <p className="text-xs text-[#434655]">
                Escribir la respuesta de memoria (recuperación activa) fortalece
                el recuerdo mucho más que releer.
              </p>
              <button
                onClick={handleSubmit}
                disabled={!explanation.trim()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#2563eb] px-6 py-3 text-sm font-semibold text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[#c3c6d7] disabled:text-[#434655]"
              >
                <Sparkles className="size-4" />
                Comprobar con IA
              </button>
            </>
          )}

          {phase === "evaluating" && (
            <div className="flex items-center justify-center gap-2 py-10 text-[#434655]">
              <Loader2 className="size-5 animate-spin" />
              <span className="text-sm">Evaluando tu explicación…</span>
            </div>
          )}

          {phase === "feedback" && (
            <div className="space-y-4">
              {/* Tu explicación */}
              <div className="rounded-xl border border-[#c3c6d7] bg-[#f2f3ff] p-3">
                <p className="mb-1 text-xs font-medium text-[#434655]">
                  Tu explicación
                </p>
                <p className="whitespace-pre-wrap text-sm text-[#131b2e]">
                  {explanation}
                </p>
              </div>

              {/* Análisis de la IA */}
              {evaluation ? (
                <div className="space-y-3 rounded-xl border border-[#6cf8bb] bg-[#6cf8bb]/20 p-4">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-[#00714d]">
                      <Sparkles className="size-4" />
                      Análisis de la IA
                    </span>
                    <span className="font-mono text-sm font-bold text-[#131b2e]">
                      {evaluation.score}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/60">
                    <div
                      className="h-full rounded-full bg-[#006c49]"
                      style={{ width: `${evaluation.score}%` }}
                    />
                  </div>

                  {evaluation.gap && (
                    <div className="flex gap-2 rounded-lg border border-[#784b00]/30 bg-white/60 p-3">
                      <Lightbulb className="mt-0.5 size-4 flex-shrink-0 text-[#784b00]" />
                      <div className="text-sm">
                        <p className="font-medium text-[#131b2e]">
                          Hueco detectado
                        </p>
                        <p className="text-[#434655]">{evaluation.gap}</p>
                      </div>
                    </div>
                  )}

                  {evaluation.feedback && (
                    <p className="text-sm text-[#00714d]">
                      {evaluation.feedback}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-[#434655]">
                  Evaluación automática no disponible. Compara con la respuesta de
                  referencia y autoevalúate.
                </p>
              )}

              {/* Respuesta de referencia */}
              <div className="rounded-xl border border-[#c3c6d7] bg-white p-3">
                <p className="mb-1 text-xs font-medium text-[#006c49]">
                  Respuesta de referencia
                </p>
                <p className="text-sm text-[#131b2e]">{card.answer}</p>
                {card.source && (
                  <p className="mt-2 border-l-2 border-[#6cf8bb] pl-2 text-xs italic text-[#434655]">
                    &ldquo;{card.source}&rdquo;
                  </p>
                )}
              </div>

              {/* Autorating → programación SM-2 */}
              <div>
                <p className="mb-2 text-xs text-[#434655]">
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
                              ? "border-[#004ac6] bg-[#004ac6] text-white"
                              : "border-[#c3c6d7] bg-white text-[#131b2e] hover:bg-[#f2f3ff]")
                          }
                        >
                          <span>{RATING_META[rating].label}</span>
                          <span
                            className={
                              "text-[11px] " +
                              (active ? "text-white/80" : "text-[#737686]")
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
