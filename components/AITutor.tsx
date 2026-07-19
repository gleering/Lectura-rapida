"use client";

import { useEffect, useRef, useState } from "react";
import {
  Loader2,
  GraduationCap,
  Lightbulb,
  Send,
  CheckCircle2,
  Save,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  tutorRespond,
  distillToCard,
  type TutorLevel,
  type TutorMessage,
  type TutorTurn,
} from "@/lib/ai-tutor";
import { createReviewCard } from "@/lib/spaced-repetition";
import { saveReviewCard } from "@/lib/storage";

interface AITutorProps {
  concept: string;
  sourceText?: string;
  level: TutorLevel;
  /** Book id to attach the resulting review card to (or a pseudo id). */
  bookId: string;
}

export function AITutor({ concept, sourceText, level, bookId }: AITutorProps) {
  const [history, setHistory] = useState<TutorMessage[]>([]);
  const [lastTurn, setLastTurn] = useState<TutorTurn | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Primer turno: el tutor abre con una explicación inicial.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const turn = await tutorRespond({ concept, sourceText, level, history: [] });
      if (cancelled) return;
      if (turn) {
        setLastTurn(turn);
        setHistory([{ role: "tutor", content: turn.message }]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, loading]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg: TutorMessage = { role: "user", content: input.trim() };
    const newHistory = [...history, userMsg];
    setHistory(newHistory);
    setInput("");
    setLoading(true);

    const turn = await tutorRespond({
      concept,
      sourceText,
      level,
      history: newHistory,
    });
    if (turn) {
      setLastTurn(turn);
      setHistory([...newHistory, { role: "tutor", content: turn.message }]);
    }
    setLoading(false);
  };

  const saveCard = async () => {
    setSaving(true);
    try {
      const distilled = await distillToCard(concept, history);
      const now = Date.now();
      const card = createReviewCard({
        id: `${bookId}_tutor_${now}`,
        bookId,
        concept,
        prompt: distilled?.prompt || `Explica con tus palabras: ${concept}`,
        answer: distilled?.answer || history.filter((m) => m.role === "tutor").at(-1)?.content || "",
        now,
      });
      await saveReviewCard(card);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const understood = lastTurn?.comprehension === "understood";

  return (
    <div className="space-y-4">
      {/* Conversación */}
      <div className="space-y-3">
        {history.map((m, i) => (
          <div
            key={i}
            className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary"
              }`}
            >
              {m.role === "tutor" && (
                <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <GraduationCap className="size-3.5" />
                  Tutor
                </div>
              )}
              <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl bg-secondary px-4 py-2.5 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Pensando…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Señales del último turno */}
      {lastTurn && !loading && (
        <div className="space-y-2">
          {lastTurn.analogy && (
            <Card className="border-blue-500/40 bg-blue-500/5">
              <CardContent className="flex gap-2 p-3">
                <Lightbulb className="mt-0.5 size-4 flex-shrink-0 text-blue-500" />
                <div className="text-sm">
                  <p className="font-medium">Analogía</p>
                  <p className="text-muted-foreground">{lastTurn.analogy}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {lastTurn.detectedGap && (
            <Card className="border-orange-500/40 bg-orange-500/5">
              <CardContent className="flex gap-2 p-3">
                <Lightbulb className="mt-0.5 size-4 flex-shrink-0 text-orange-500" />
                <div className="text-sm">
                  <p className="font-medium">Hueco a cerrar</p>
                  <p className="text-muted-foreground">{lastTurn.detectedGap}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {lastTurn.checkQuestion && (
            <Card className="border-primary/40 bg-primary/5">
              <CardContent className="p-3 text-sm">
                <p className="font-medium">Pregunta para ti</p>
                <p className="text-muted-foreground">{lastTurn.checkQuestion}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Comprensión lograda → guardar tarjeta */}
      {understood && (
        <Card className="border-green-500/50 bg-green-500/5">
          <CardContent className="flex flex-col items-center gap-3 p-4 text-center">
            <CheckCircle2 className="size-8 text-green-500" />
            <p className="text-sm font-medium">
              ¡Comprensión lograda! Consolídalo con repaso espaciado.
            </p>
            {saved ? (
              <p className="text-xs text-green-600 dark:text-green-400">
                Guardado en tu cola de repaso ✓
              </p>
            ) : (
              <Button onClick={saveCard} disabled={saving} size="sm">
                {saving ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Guardando…
                  </>
                ) : (
                  <>
                    <Save className="mr-2 size-4" />
                    Guardar como tarjeta de repaso
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Input */}
      <div className="flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Responde o pregunta lo que no entiendas…"
          rows={2}
          disabled={loading}
          className="flex-1 resize-none rounded-lg border border-input bg-background p-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        />
        <Button onClick={send} disabled={!input.trim() || loading} size="icon">
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  );
}
