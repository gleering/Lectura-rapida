"use client";

import { useEffect, useState } from "react";
import {
  Clock,
  Gauge,
  Brain,
  Target,
  Loader2,
  Medal,
  Gem,
  Flame,
  Cog,
  Library,
  BookOpen,
  Zap,
} from "lucide-react";
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
import type { GlobalStats, DailyStat, ReadingGoal, GoalType } from "@/types";

const GOAL_PRESETS: { type: GoalType; label: string; target: number }[] = [
  { type: "1000", label: "1.000 palabras", target: 1000 },
  { type: "3000", label: "3.000 palabras", target: 3000 },
  { type: "5000", label: "5.000 palabras", target: 5000 },
  { type: "book", label: "Libro completo", target: 0 },
];

export function Stats() {
  const [global, setGlobal] = useState<GlobalStats | null>(null);
  const [daily, setDaily] = useState<DailyStat[]>([]);
  const [goal, setGoal] = useState<ReadingGoal | null>(null);
  const [comp, setComp] = useState<ComprehensionScore>({ correct: 0, total: 0 });

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
    return (
      <div className="flex justify-center py-20 text-[#434655]">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  const streak = computeStreak(daily);
  const hours = global.totalTimeMs / 3_600_000;
  const compPct =
    comp.total > 0 ? Math.round((comp.correct / comp.total) * 100) : 0;
  const avgWpm = averageSpeed(global);

  // Últimos 14 días de actividad para el gráfico de barras.
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

  // Logros derivados de datos reales.
  const achievements = [
    {
      label: "Lector Veloz",
      hint: "Sostuviste 400 PPM",
      icon: Medal,
      color: "bg-[#6cf8bb] text-[#00714d]",
      unlocked: global.maxSpeed >= 400,
    },
    {
      label: "Enfoque Total",
      hint: "2 horas de lectura",
      icon: Gem,
      color: "bg-[#dbe1ff] text-[#004ac6]",
      unlocked: hours >= 2,
    },
    {
      label: "Racha de 7 días",
      hint: "Hábito consolidado",
      icon: Flame,
      color: "bg-[#ffddb8] text-[#784b00]",
      unlocked: streak >= 7,
    },
    {
      label: "Maestro Crítico",
      hint: comp.total > 0 ? "90% de comprensión" : "Próximamente",
      icon: Cog,
      color: "bg-[#eaedff] text-[#004ac6]",
      unlocked: compPct >= 90,
    },
    {
      label: "Bibliotecario",
      hint: "5 libros terminados",
      icon: Library,
      color: "bg-[#eaedff] text-[#004ac6]",
      unlocked: global.booksFinished >= 5,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Bento de métricas clave */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <BentoCard
          label="Tiempo total"
          icon={Clock}
          value={formatDuration(global.totalTimeMs)}
          foot={`${hours.toFixed(1)} h entrenadas`}
        />
        <BentoCard
          label="Libros leídos"
          icon={BookOpen}
          value={formatNumber(global.booksFinished)}
          foot={`${formatNumber(global.totalWordsRead)} palabras leídas`}
        />
        <BentoCard
          label="PPM promedio"
          icon={Gauge}
          value={formatNumber(avgWpm)}
          foot={`Máx: ${formatNumber(global.maxSpeed)} ppm`}
        />
        <BentoCard
          label="Comprensión"
          icon={Brain}
          value={comp.total > 0 ? `${compPct}%` : "—"}
          foot={comp.total > 0 ? "Aciertos en quizzes" : "Aún sin datos"}
          accent={comp.total > 0 && compPct >= 80}
        />
      </section>

      {/* Gráfico de barras: actividad */}
      <section className="rounded-2xl border border-[#c3c6d7] bg-white p-6">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="font-bold text-[#131b2e]">Actividad de lectura</h3>
          <span className="rounded bg-[#eaedff] px-2 py-1 text-xs font-medium text-[#434655]">
            Últimos 14 días
          </span>
        </div>
        <div className="flex h-48 items-end justify-between gap-1.5">
          {recentDays.map((d) => (
            <div
              key={d.date}
              className="flex flex-1 flex-col items-center gap-2"
              title={`${d.date}: ${formatNumber(d.words)} palabras`}
            >
              <div
                className="w-full rounded-t-lg bg-[#2563eb] transition-all hover:opacity-80"
                style={{
                  height: `${(d.words / maxDay) * 100}%`,
                  minHeight: d.words > 0 ? 4 : 0,
                }}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Logros */}
      <section>
        <h3
          className="mb-6 text-xl font-bold"
          style={{ fontFamily: "var(--font-hanken, inherit)" }}
        >
          Logros alcanzados
        </h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
          {achievements.map((a) => (
            <div
              key={a.label}
              className={
                "group flex flex-col items-center rounded-xl border border-[#c3c6d7] bg-[#f2f3ff] p-4 text-center transition-all " +
                (a.unlocked ? "" : "opacity-60")
              }
            >
              <div
                className={
                  "mb-3 flex size-16 items-center justify-center rounded-full transition-transform group-hover:scale-110 " +
                  (a.unlocked
                    ? a.color
                    : "bg-[#eaedff] text-[#737686] grayscale")
                }
              >
                <a.icon className="size-7" />
              </div>
              <span className="text-sm font-bold text-[#131b2e]">{a.label}</span>
              <span className="mt-1 text-[10px] text-[#434655]">
                {a.unlocked ? a.hint : "Próximamente"}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Objetivo de entrenamiento */}
      <section className="rounded-2xl border border-[#c3c6d7] bg-white p-6">
        <div className="mb-4 flex items-center gap-2">
          <Target className="size-5 text-[#004ac6]" />
          <h3 className="font-bold text-[#131b2e]">Objetivo de entrenamiento</h3>
        </div>

        {goal && !goal.completed && (
          <div className="mb-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[#434655]">
                {goal.type === "book"
                  ? "Terminar un libro completo"
                  : `Leer ${formatNumber(goal.target)} palabras`}
              </span>
              {goal.type !== "book" && (
                <span className="tabular-nums text-[#131b2e]">
                  {formatNumber(goal.progress)} / {formatNumber(goal.target)}
                </span>
              )}
            </div>
            {goal.type !== "book" && (
              <div className="h-2 w-full overflow-hidden rounded-full bg-[#eaedff]">
                <div
                  className="h-full rounded-full bg-[#006c49]"
                  style={{
                    width: `${Math.min(100, (goal.progress / goal.target) * 100)}%`,
                  }}
                />
              </div>
            )}
          </div>
        )}

        {goal?.completed && (
          <p className="mb-4 rounded-lg bg-[#6cf8bb]/20 p-3 text-sm text-[#00714d]">
            🎉 ¡Objetivo cumplido! Define uno nuevo para seguir entrenando.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {GOAL_PRESETS.map((p) => {
            const active = goal && !goal.completed && goal.type === p.type;
            return (
              <button
                key={p.type}
                onClick={() => setNewGoal(p)}
                className={
                  "rounded-full px-4 py-2 text-sm font-medium transition " +
                  (active
                    ? "bg-[#004ac6] text-white"
                    : "border border-[#c3c6d7] bg-white text-[#434655] hover:bg-[#f2f3ff]")
                }
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function BentoCard({
  label,
  icon: Icon,
  value,
  foot,
  accent,
}: {
  label: string;
  icon: React.ElementType;
  value: string;
  foot: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-[#c3c6d7] bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-medium text-[#434655]">{label}</span>
        <Icon className="size-5 text-[#004ac6] opacity-60" />
      </div>
      <div>
        <div className="text-3xl font-bold tabular-nums text-[#131b2e]">
          {value}
        </div>
        <div
          className={
            "mt-1 flex items-center gap-1 text-sm " +
            (accent ? "font-medium text-[#006c49]" : "text-[#434655]")
          }
        >
          {accent && <Zap className="size-3.5" />}
          {foot}
        </div>
      </div>
    </div>
  );
}
