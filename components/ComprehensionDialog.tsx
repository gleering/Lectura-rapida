"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ComprehensionTest } from "@/lib/comprehension-service";

interface ComprehensionDialogProps {
  question: ComprehensionTest | null;
  onAnswer: (index: number, timeMs: number) => void;
  loading?: boolean;
  isCorrect?: boolean | null;
}

export function ComprehensionDialog({
  question,
  onAnswer,
  loading = false,
  isCorrect = null,
}: ComprehensionDialogProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (question) {
      startTimeRef.current = Date.now();
      setSelectedIndex(null);
      setElapsedTime(0);
    }
  }, [question]);

  useEffect(() => {
    if (!question || isCorrect !== null) return;

    const interval = setInterval(() => {
      setElapsedTime(Math.round((Date.now() - startTimeRef.current) / 1000));
    }, 100);

    return () => clearInterval(interval);
  }, [question, isCorrect]);

  const handleAnswer = (index: number) => {
    if (isCorrect !== null) return;
    setSelectedIndex(index);
    const timeMs = Date.now() - startTimeRef.current;
    onAnswer(index, timeMs);
  };

  return (
    <Dialog open={question !== null || loading || isCorrect !== null}>
      <div className="min-w-96 space-y-6 p-6">
        {loading && (
          <div className="text-center">
            <Loader2 className="mx-auto mb-3 size-8 animate-spin text-primary" />
            <h2 className="font-semibold">Generando pregunta de comprensión…</h2>
            <p className="text-sm text-muted-foreground">Espera mientras IA prepara tu pregunta</p>
          </div>
        )}

        {!loading && question && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Prueba de Comprensión</h2>
                <p className="text-xs text-muted-foreground">
                  Dificultad:{" "}
                  {question.difficulty === 1 ? "🟢 Fácil" : question.difficulty === 2 ? "🟡 Medio" : "🔴 Difícil"}
                </p>
              </div>
              <div className="text-2xl font-bold tabular-nums text-muted-foreground">
                {elapsedTime}s
              </div>
            </div>

            {/* Pregunta */}
            <div className="space-y-4">
              <p className="font-medium text-foreground">{question.question}</p>

              {/* Opciones */}
              <div className="space-y-2">
                {question.options.map((option, index) => {
                  const isSelected = selectedIndex === index;
                  const isCorrectAnswer = index === question.correctIndex;

                  let bgColor = "hover:bg-secondary/80";
                  let borderColor = "border-border";
                  let icon = null;

                  if (isCorrect !== null) {
                    if (isCorrectAnswer) {
                      bgColor = "bg-green-500/10 hover:bg-green-500/20";
                      borderColor = "border-green-500";
                      icon = <CheckCircle className="size-5 text-green-600" />;
                    } else if (isSelected && isCorrect === false) {
                      bgColor = "bg-red-500/10 hover:bg-red-500/20";
                      borderColor = "border-red-500";
                      icon = <XCircle className="size-5 text-red-600" />;
                    }
                  }

                  return (
                    <button
                      key={index}
                      onClick={() => handleAnswer(index)}
                      disabled={isCorrect !== null}
                      className={`w-full rounded-lg border-2 p-3 text-left transition-all ${bgColor} ${borderColor} ${
                        isSelected && isCorrect === null ? "border-primary" : "border-border"
                      } ${isCorrect !== null ? "cursor-default" : "cursor-pointer"}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{option}</span>
                        {icon}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Feedback */}
              {isCorrect !== null && (
                <Card
                  className={`border-2 p-3 ${
                    isCorrect
                      ? "border-green-500 bg-green-500/5"
                      : "border-orange-500 bg-orange-500/5"
                  }`}
                >
                  <div className="flex gap-3">
                    {isCorrect ? (
                      <CheckCircle className="mt-0.5 size-5 flex-shrink-0 text-green-600" />
                    ) : (
                      <AlertCircle className="mt-0.5 size-5 flex-shrink-0 text-orange-600" />
                    )}
                    <div className="text-sm">
                      <p className="font-medium">
                        {isCorrect ? "¡Correcto!" : "Respuesta incorrecta"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {isCorrect
                          ? "Tu comprensión es sólida. Continúa leyendo."
                          : "No hay problema. Enfócate y continúa."}
                      </p>
                    </div>
                  </div>
                </Card>
              )}
            </div>

            {/* Action Button */}
            {isCorrect !== null && (
              <Button className="w-full" size="lg">
                Continuar leyendo
              </Button>
            )}
          </>
        )}
      </div>
    </Dialog>
  );
}
