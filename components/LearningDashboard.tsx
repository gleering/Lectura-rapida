"use client";

import {
  Trophy,
  Brain,
  CheckCircle2,
  Sprout,
  AlertTriangle,
  Network,
  Target,
  Flame,
  Repeat,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { LearningMetrics, DailyLearningGoal } from "@/types";

/** Panel de comprensión: mide retención consolidada, no tiempo ni velocidad.
 *  "Lo que se mide se optimiza" — por eso el foco visual está en conceptos
 *  dominados / en riesgo y en metas de dominio (Deci & Ryan: competencia + autonomía). */
export function LearningDashboard({
  metrics,
  goals,
}: {
  metrics: LearningMetrics;
  goals: DailyLearningGoal[];
}) {
  const conceptStates = [
    {
      label: "Dominados",
      value: metrics.mastered,
      icon: CheckCircle2,
      color: "text-emerald-500",
      hint: "En memoria de largo plazo",
    },
    {
      label: "Consolidando",
      value: metrics.consolidating,
      icon: Sprout,
      color: "text-sky-500",
      hint: "En camino a dominarse",
    },
    {
      label: "Aprendiendo",
      value: metrics.learning,
      icon: Brain,
      color: "text-amber-500",
      hint: "Recién comprendidos",
    },
    {
      label: "En riesgo",
      value: metrics.atRisk,
      icon: AlertTriangle,
      color: "text-rose-500",
      hint: "Toca repasarlos hoy",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Nivel de dominio — gamificación reorientada a comprensión */}
      <Card className="overflow-hidden border-primary/30 bg-gradient-to-br from-primary/10 to-transparent">
        <CardContent className="flex items-center gap-4 p-5">
          <div className="flex size-14 flex-shrink-0 items-center justify-center rounded-full bg-primary/15">
            <Trophy className="size-7 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Nivel de dominio</p>
            <p className="text-2xl font-bold">Nivel {metrics.masteryLevel}</p>
            <p className="text-xs text-muted-foreground">
              {metrics.mastered} concepto{metrics.mastered === 1 ? "" : "s"} en
              memoria de largo plazo
            </p>
          </div>
          <div className="hidden items-center gap-4 sm:flex">
            <Stat icon={Flame} value={metrics.streak} label="racha" />
            <Stat icon={Repeat} value={metrics.reviewsToday} label="hoy" />
          </div>
        </CardContent>
      </Card>

      {/* Estados de los conceptos */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {conceptStates.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex flex-col gap-1 p-4">
              <s.icon className={cn("size-5", s.color)} />
              <span className="text-2xl font-bold">{s.value}</span>
              <span className="text-xs font-medium">{s.label}</span>
              <span className="text-[11px] leading-tight text-muted-foreground">
                {s.hint}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Indicadores de memoria */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">Retención</span>
              <span className="text-sm font-bold">{metrics.retentionRate}%</span>
            </div>
            <Progress value={metrics.retentionRate} />
            <p className="mt-2 text-[11px] text-muted-foreground">
              Recuerdos exitosos sobre el total de intentos.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1 p-4">
            <span className="text-sm font-medium">Fuerza de memoria</span>
            <span className="text-2xl font-bold">
              {metrics.avgEase.toFixed(2)}
            </span>
            <p className="text-[11px] text-muted-foreground">
              Facilidad media (SM-2): cuánto se resisten al olvido.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1 p-4">
            <Network className="size-5 text-primary" />
            <span className="text-2xl font-bold">{metrics.connections}</span>
            <span className="text-sm font-medium">Conexiones</span>
            <p className="text-[11px] text-muted-foreground">
              Ideas enlazadas entre libros: comprensión en red.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Metas de dominio del día */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <Target className="size-5 text-primary" />
          Metas de hoy
        </h2>
        <div className="space-y-3">
          {goals.map((g) => (
            <Card key={g.id} className={cn(g.done && "border-emerald-500/40")}>
              <CardContent className="flex items-center gap-3 p-4">
                <CheckCircle2
                  className={cn(
                    "size-5 flex-shrink-0",
                    g.done ? "text-emerald-500" : "text-muted-foreground/40"
                  )}
                />
                <div className="flex-1">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      g.done && "text-muted-foreground line-through"
                    )}
                  >
                    {g.label}
                  </p>
                  <Progress value={g.progress} className="mt-2 h-2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center">
      <Icon className="size-5 text-primary" />
      <span className="text-lg font-bold leading-tight">{value}</span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}
