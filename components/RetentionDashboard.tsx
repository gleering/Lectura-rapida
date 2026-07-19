"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { calculateRetentionScore } from "@/lib/comprehension-service";
import type { ComprehensionScore } from "@/lib/comprehension-service";
import { TrendingUp, Brain, Zap } from "lucide-react";

interface RetentionDashboardProps {
  scores: ComprehensionScore[];
  bookTitle: string;
}

export function RetentionDashboard({
  scores,
  bookTitle,
}: RetentionDashboardProps) {
  const stats = useMemo(() => calculateRetentionScore(scores), [scores]);

  // Datos para gráfico de progreso
  const progressData = useMemo(() => {
    return scores.map((score, index) => ({
      index: index + 1,
      correct: score.correct ? 100 : 0,
      timeMs: score.timeToAnswer * 1000,
      difficulty: score.difficulty * 33,
    }));
  }, [scores]);

  // Datos para distribución de dificultad
  const difficultyData = useMemo(() => {
    const byDifficulty = { 1: 0, 2: 0, 3: 0 };
    scores.forEach((s) => {
      byDifficulty[s.difficulty as 1 | 2 | 3]++;
    });
    return Object.entries(byDifficulty).map(([level, count]) => ({
      name: level === "1" ? "Fácil" : level === "2" ? "Medio" : "Difícil",
      value: count,
      fill:
        level === "1" ? "#10b981" : level === "2" ? "#f59e0b" : "#ef4444",
    }));
  }, [scores]);

  if (scores.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground">
          <Brain className="size-8 opacity-50" />
          <p>Aún no hay tests de comprensión realizados.</p>
          <p className="text-xs">
            Realiza preguntas de comprensión durante la lectura para ver tu
            progreso.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Métricas principales */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-5">
            <div className="text-sm text-muted-foreground">Precisión</div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-bold">{stats.accuracy}</span>
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            <div className="mt-2 h-1 rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${stats.accuracy}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="text-sm text-muted-foreground">Tiempo Promedio</div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-bold">{stats.avgTime}</span>
              <span className="text-sm text-muted-foreground">seg</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="text-sm text-muted-foreground">Dificultad Promedio</div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-bold">
                {stats.difficultyBonus}
              </span>
              <span className="text-sm text-muted-foreground">/3</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="text-sm text-muted-foreground">Índice Retención</div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-bold">{stats.retentionIndex}</span>
              <span className="text-sm text-muted-foreground">/100</span>
            </div>
            <div className="mt-2 text-xs text-green-600">
              <TrendingUp className="inline size-3" /> {stats.retentionIndex > 70 ? "Excelente" : stats.retentionIndex > 50 ? "Bueno" : "Mejora detectada"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Progreso en tiempo real */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="size-4" />
              Progreso en Tiempo Real
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={progressData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="index" />
                <YAxis />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(0, 0, 0, 0.8)",
                    border: "none",
                    borderRadius: "8px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="correct"
                  stroke="#10b981"
                  isAnimationActive={false}
                  name="Correcto (%)"
                />
                <Line
                  type="monotone"
                  dataKey="timeMs"
                  stroke="#f59e0b"
                  isAnimationActive={false}
                  name="Tiempo (ms)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribución de dificultad */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain className="size-4" />
              Distribución de Dificultad
            </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={difficultyData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {difficultyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col gap-2 text-sm">
              {difficultyData.map((d) => (
                <div key={d.name} className="flex items-center gap-2">
                  <div
                    className="size-2 rounded-full"
                    style={{ backgroundColor: d.fill }}
                  />
                  <span>{d.name}: {d.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Insights Personalizados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {stats.accuracy >= 80 && (
            <p className="text-green-600">
              ✓ Excelente comprensión. Aumenta la velocidad para desafiar tu límite.
            </p>
          )}
          {stats.accuracy < 50 && (
            <p className="text-orange-600">
              ⚠ Comprensión baja. Reduce la velocidad y enfócate en entender mejor.
            </p>
          )}
          {stats.avgTime > 15 && (
            <p className="text-orange-600">
              ⚠ Tiempo de respuesta lento. Practica tomar decisiones más rápido.
            </p>
          )}
          {stats.difficultyBonus > 2.5 && (
            <p className="text-green-600">
              ✓ Manejando dificultades altas. Tu capacidad de análisis es fuerte.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
