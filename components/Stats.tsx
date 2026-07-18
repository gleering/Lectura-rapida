"use client";

import { useEffect, useState } from "react";
import {
  Clock,
  Type,
  Gauge,
  Zap,
  BookCheck,
  Timer,
  Flame,
  Target,
  Brain,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  getGlobalStats,
  getDailyStats,
  getGoal,
  saveGoal,
  getComprehension,
  type ComprehensionScore,
} from "@/lib/storage";
import { averageSpeed, computeStreak } from "@/lib/stats";
import { formatDuration, formatNumber } from "@/lib/utils";
import type {
  GlobalStats,
  DailyStat,
  ReadingGoal,
  GoalType,
} from "@/types";
import { cn } from "@/lib/utils";

const GOAL_PRESETS: { type: GoalType; label: string; target: number }[] = [
  { type: "1000", label: "1.000 palabras", target: 1000 },
  { type: "3000", label: "3.000 palabras", target: 3000 },
  { type: "5000", label: "5.000 palabras", target: 5000 },
  { type: "book", label: "Libro completo", target: 0 },
];

interface StatTileProps {
  icon: React.ElementType;
  label: string;
  value: string;
}
function StatTile({ icon: Icon, label, value }: StatTileProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-5">
        <div className="flex size-10 items-center justify-center rounded-lg bg-secondary">
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-xl font-bold leading-tight tabular-nums">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function Stats() {
  const [global, setGlobal] = useState<GlobalStats | null>(null);
  const [daily, setDaily] = useState<DailyStat[]>([]);
  const [goal, setGoal] = useState<ReadingGoal | null>(null);
  const [comp, setComp] = useState<ComprehensionScore>({
    correct: 0,
    total: 0,
  });

  useEffect(() => {
    Promise.all([
      getGlobalStats(),
      getDailyStats(),
      getGoal(),
      getComprehension(),
    ]).then(([g, d, gl, c]) => {
      setGlobal(g);
      setDaily(d);
      setGoal(gl);
      setComp(c);
    });
  }, []);

  const setNewGoal = async (preset: (typeof GOAL_PRESETS)[number]) => {
    const g: ReadingGoal = {
      type: preset.type,
      target: preset.target,
      progress: 0,
      completed: false,
      createdAt: Date.now(),
    };
    setGoal(g);
    await saveGoal(g);
  };

  if (!global) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  const streak = computeStreak(daily);
  const hours = global.totalTimeMs / 3_600_000;
  const compPct =
    comp.total > 0 ? Math.round((comp.correct / comp.total) * 100) : 0;

  // Last 14 days activity for a mini bar chart.
  const recentDays = (() => {
    const map = new Map(daily.map((d) => [d.date, d.wordsRead]));
    const out: { date: string; words: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      out.push({ date: key, words: map.get(key) ?? 0 });
    }
    return out;
  })();
  const maxDay = Math.max(1, ...recentDays.map((d) => d.words));

  return (
    <div className="space-y-8">
      {/* Core stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatTile
          icon={Clock}
          label="Tiempo total leído"
          value={formatDuration(global.totalTimeMs)}
        />
        <StatTile
          icon={Type}
          label="Palabras leídas"
          value={formatNumber(global.totalWordsRead)}
        />
        <StatTile
          icon={Gauge}
          label="Velocidad promedio"
          value={`${formatNumber(averageSpeed(global))} ppm`}
        />
        <StatTile
          icon={Zap}
          label="Velocidad máxima"
          value={`${formatNumber(global.maxSpeed)} ppm`}
        />
        <StatTile
          icon={BookCheck}
          label="Libros terminados"
          value={formatNumber(global.booksFinished)}
        />
        <StatTile
          icon={Timer}
          label="Horas entrenadas"
          value={`${hours.toFixed(1)} h`}
        />
        <StatTile
          icon={Flame}
          label="Racha diaria"
          value={`${streak} día${streak === 1 ? "" : "s"}`}
        />
        <StatTile
          icon={Brain}
          label="Comprensión"
          value={comp.total > 0 ? `${compPct}%` : "—"}
        />
      </div>

      {/* 14-day activity */}
      <Card>
        <CardContent className="p-5">
          <h3 className="mb-4 text-sm font-semibold">Actividad (14 días)</h3>
          <div className="flex h-28 items-end gap-1.5">
            {recentDays.map((d) => (
              <div
                key={d.date}
                className="flex flex-1 flex-col items-center gap-1"
                title={`${d.date}: ${formatNumber(d.words)} palabras`}
              >
                <div
                  className="w-full rounded-t bg-primary/80 transition-all"
                  style={{
                    height: `${(d.words / maxDay) * 100}%`,
                    minHeight: d.words > 0 ? 4 : 0,
                  }}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Goals */}
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center gap-2">
            <Target className="size-5" />
            <h3 className="font-semibold">Objetivo de entrenamiento</h3>
          </div>

          {goal && !goal.completed && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {goal.type === "book"
                    ? "Terminar un libro completo"
                    : `Leer ${formatNumber(goal.target)} palabras`}
                </span>
                {goal.type !== "book" && (
                  <span className="tabular-nums">
                    {formatNumber(goal.progress)} /{" "}
                    {formatNumber(goal.target)}
                  </span>
                )}
              </div>
              {goal.type !== "book" && (
                <Progress value={(goal.progress / goal.target) * 100} />
              )}
            </div>
          )}

          {goal?.completed && (
            <p className="rounded-lg bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400">
              🎉 ¡Objetivo cumplido! Define uno nuevo para seguir entrenando.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {GOAL_PRESETS.map((p) => (
              <Button
                key={p.type}
                variant={
                  goal && !goal.completed && goal.type === p.type
                    ? "default"
                    : "outline"
                }
                size="sm"
                onClick={() => setNewGoal(p)}
                className={cn()}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
