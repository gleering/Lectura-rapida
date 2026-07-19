"use client";

import { useEffect, useState, useCallback } from "react";
import { CheckCircle, XCircle, Loader2, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  generateSchulteTable,
  checkNumber,
  calculateSchulteScore,
  adaptLevel,
  type SchulteTableState,
  type SchulteScore,
} from "@/lib/schulte-table";
import { cn } from "@/lib/utils";

interface SchulteTableProps {
  onComplete?: (score: SchulteScore) => void;
  initialLevel?: number;
}

export function SchulteTableGame({
  onComplete,
  initialLevel = 1,
}: SchulteTableProps) {
  const [state, setState] = useState<SchulteTableState | null>(null);
  const [score, setScore] = useState<SchulteScore | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [nextLevel, setNextLevel] = useState(initialLevel);
  const [errors, setErrors] = useState(0);

  // Inicializar tabla
  useEffect(() => {
    const newState = generateSchulteTable(nextLevel);
    setState(newState);
    setScore(null);
    setErrors(0);
    setElapsedTime(0);
  }, [nextLevel]);

  // Cronómetro
  useEffect(() => {
    if (!state || state.endTime) return;

    const interval = setInterval(() => {
      setElapsedTime(Math.round((Date.now() - state.startTime) / 1000));
    }, 100);

    return () => clearInterval(interval);
  }, [state]);

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (!state || state.endTime) return;

      const result = checkNumber(state, row, col);

      if (!result.correct) {
        setErrors((prev) => prev + 1);
      }

      if (result.completed) {
        const finalScore = calculateSchulteScore(state);
        setScore(finalScore);
        setNextLevel(adaptLevel(finalScore));
        onComplete?.(finalScore);
      }

      setState({ ...state });
    },
    [state, onComplete]
  );

  if (!state) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="size-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const gridSize = state.grid.length;
  const totalNumbers = gridSize * gridSize;
  const progress = (state.clickedNumbers.size / totalNumbers) * 100;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Tabla de Schulte</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Nivel {state.level} ({gridSize}×{gridSize})
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold tabular-nums">{elapsedTime}s</p>
            <p className="text-xs text-muted-foreground">Errores: {errors}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Instrucciones */}
        <p className="text-sm text-muted-foreground">
          Haz click en los números del 1 al {totalNumbers} en orden. Mantén la vista en el centro.
        </p>

        {/* Progreso */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span>Progreso</span>
            <span className="font-medium">
              {state.clickedNumbers.size}/{totalNumbers}
            </span>
          </div>
          <Progress value={progress} />
        </div>

        {/* Grid */}
        <div className="flex justify-center">
          <div
            className="gap-2 p-4 bg-secondary/50 rounded-lg"
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
              width: "fit-content",
            }}
          >
            {state.grid.map((row, rowIndex) =>
              row.map((number, colIndex) => {
                const isClicked = state.clickedNumbers.has(number);
                const isNext = number === state.nextNumber;

                return (
                  <button
                    key={`${rowIndex}-${colIndex}`}
                    onClick={() => handleCellClick(rowIndex, colIndex)}
                    disabled={state.endTime !== null || isClicked}
                    className={cn(
                      "h-12 w-12 font-bold rounded transition-all text-sm",
                      isClicked && "bg-green-500/20 text-green-600 cursor-default",
                      isNext && !isClicked && "ring-2 ring-primary ring-offset-2",
                      !isClicked &&
                        !isNext &&
                        "bg-background border border-border hover:border-primary"
                    )}
                  >
                    {isClicked ? <CheckCircle className="size-5 mx-auto" /> : number}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Resultado */}
        {score && (
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Tiempo:</span>
              <span className="font-mono">{(score.completionTime / 1000).toFixed(2)}s</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Precisión:</span>
              <span className="font-mono">
                {Math.round(score.accuracy * 100)}%
              </span>
            </div>

            {score.accuracy === 1 && score.completionTime < 30000 && (
              <div className="bg-green-500/10 border border-green-500 rounded p-2 text-xs text-green-600">
                ✓ ¡Excelente! Pasaste al nivel {nextLevel + 1}
              </div>
            )}

            {(score.completionTime > 60000 || score.accuracy < 0.8) && (
              <div className="bg-orange-500/10 border border-orange-500 rounded p-2 text-xs text-orange-600">
                ⚠ Intenta de nuevo. Regresaste al nivel {nextLevel - 1}
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
