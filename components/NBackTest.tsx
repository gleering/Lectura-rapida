"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { RotateCcw, Volume2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  generateNBackSequence,
  recordResponse,
  calculateNBackScore,
  adaptNBackLevel,
  type NBackGameState,
  type NBackScore,
} from "@/lib/nback-test";

interface NBackTestProps {
  onComplete?: (score: NBackScore) => void;
  initialLevel?: number;
}

export function NBackTest({ onComplete, initialLevel = 1 }: NBackTestProps) {
  const [state, setState] = useState<NBackGameState | null>(null);
  const [score, setScore] = useState<NBackScore | null>(null);
  const [nextLevel, setNextLevel] = useState(initialLevel);
  const [currentStimulus, setCurrentStimulus] = useState<string>("");
  const [isShowingStimulus, setIsShowingStimulus] = useState(false);
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);
  const stimulusTimeRef = useRef<number>(0);

  // Inicializar
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const newState = generateNBackSequence(nextLevel, 20);
    setState(newState);
    setScore(null);
    setFeedback(null);
    playNextTrial(newState, 0);
  }, [nextLevel]);

  const playNextTrial = useCallback(
    (gameState: NBackGameState, index: number) => {
      if (index >= gameState.trials.length) return;

      const trial = gameState.trials[index];
      setCurrentStimulus(trial.stimulus);
      setIsShowingStimulus(true);
      setFeedback(null);
      stimulusTimeRef.current = Date.now();

      setTimeout(() => {
        setIsShowingStimulus(false);
      }, 1500); // Mostrar stimulus por 1.5s
    },
    []
  );

  const handleResponse = useCallback(
    (isMatch: boolean) => {
      if (!state || !isShowingStimulus) return;

      const trial = state.trials[state.currentTrialIndex];
      const responseTimeMs = Date.now() - stimulusTimeRef.current;
      const isCorrect = isMatch === trial.isMatch;

      setFeedback(isCorrect ? "correct" : "incorrect");
      recordResponse(state, isMatch, responseTimeMs);

      // Próximo trial
      setTimeout(() => {
        if (state.currentTrialIndex < state.trials.length) {
          playNextTrial(state, state.currentTrialIndex);
        } else {
          const finalScore = calculateNBackScore(state);
          setScore(finalScore);
          setNextLevel(adaptNBackLevel(finalScore));
          onComplete?.(finalScore);
        }
        setState({ ...state });
      }, 500);
    },
    [state, isShowingStimulus, onComplete, playNextTrial]
  );

  if (!state) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-muted-foreground">Cargando...</p>
        </CardContent>
      </Card>
    );
  }

  const progress = (state.currentTrialIndex / state.trials.length) * 100;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">N-Back Test</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {state.level}-Back (Memoria de {state.level} pasos atrás)
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">
              {state.currentTrialIndex}/{state.trials.length}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Instrucciones */}
        <p className="text-sm text-muted-foreground">
          Presiona &quot;Sí&quot; si la letra coincide con la de hace {state.level} paso
          {state.level > 1 ? "s" : ""}, de lo contrario presiona &quot;No&quot;.
        </p>

        {/* Progreso */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span>Progreso</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} />
        </div>

        {/* Stimulus Grande */}
        <div className="flex items-center justify-center min-h-32">
          {isShowingStimulus && currentStimulus ? (
            <div
              className={`text-8xl font-bold transition-all ${
                feedback === "correct"
                  ? "text-green-600"
                  : feedback === "incorrect"
                    ? "text-red-600"
                    : "text-primary"
              }`}
            >
              {currentStimulus}
            </div>
          ) : feedback ? (
            <div
              className={`text-center space-y-2 ${
                feedback === "correct" ? "text-green-600" : "text-red-600"
              }`}
            >
              <p className="text-lg font-bold">
                {feedback === "correct" ? "✓ Correcto" : "✗ Incorrecto"}
              </p>
              <p className="text-sm opacity-70">Esperando siguiente...</p>
            </div>
          ) : (
            <p className="text-muted-foreground">Preparado...</p>
          )}
        </div>

        {/* Botones de Respuesta */}
        {isShowingStimulus && !score && (
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => handleResponse(false)}
              variant="outline"
              size="lg"
              className="font-semibold"
            >
              No
            </Button>
            <Button
              onClick={() => handleResponse(true)}
              size="lg"
              className="font-semibold"
            >
              Sí
            </Button>
          </div>
        )}

        {/* Resultado */}
        {score && (
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Precisión:</span>
              <span className="font-mono font-bold">
                {Math.round(score.accuracy * 100)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Tiempo Promedio:</span>
              <span className="font-mono">{score.responseTime}ms</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Respuestas Correctas:</span>
              <span className="font-mono">
                {score.correctResponses}/{score.totalTrials}
              </span>
            </div>

            {score.accuracy >= 0.85 && score.responseTime < 1000 && (
              <div className="bg-green-500/10 border border-green-500 rounded p-2 text-xs text-green-600">
                ✓ ¡Excelente! Nivel {nextLevel + 1} desbloqueado
              </div>
            )}

            {score.accuracy <= 0.5 && (
              <div className="bg-orange-500/10 border border-orange-500 rounded p-2 text-xs text-orange-600">
                ⚠ Intenta nuevamente. Practicando nivel {nextLevel - 1}
              </div>
            )}

            <Button
              onClick={() => setNextLevel(nextLevel)}
              className="w-full"
              size="sm"
            >
              <RotateCcw className="size-4 mr-2" />
              Intentar de Nuevo
            </Button>

            {nextLevel !== state.level && (
              <Button
                onClick={() => setNextLevel(nextLevel)}
                variant="outline"
                className="w-full"
                size="sm"
              >
                {nextLevel > state.level ? "Siguiente Nivel" : "Nivel Anterior"}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
