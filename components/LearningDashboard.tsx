"use client";

import {
  CheckCircle2,
  Sprout,
  Brain,
  AlertTriangle,
  Network,
  Target,
  Flame,
  Repeat,
  TrendingUp,
  Sparkles,
} from "lucide-react";
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
  // Progreso dentro del nivel actual: masteryLevel = floor(sqrt(mastered)) + 1
  // Nivel L requiere mastered ≥ (L-1)²; el siguiente requiere ≥ L².
  const L = metrics.masteryLevel;
  const floor = (L - 1) * (L - 1);
  const ceil = L * L;
  const span = ceil - floor || 1;
  const levelProgress = Math.min(
    100,
    Math.max(0, Math.round(((metrics.mastered - floor) / span) * 100))
  );
  const toNextLevel = Math.max(0, ceil - metrics.mastered);

  // Anillo de progreso
  const R = 58;
  const circumference = 2 * Math.PI * R;
  const dashOffset = circumference * (1 - levelProgress / 100);

  const conceptStates = [
    {
      label: "Dominados",
      value: metrics.mastered,
      icon: CheckCircle2,
      iconBg: "bg-[#6cf8bb]/30 text-[#006c49]",
      hoverBorder: "hover:border-[#006c49]",
      hint: "En memoria de largo plazo",
    },
    {
      label: "Consolidando",
      value: metrics.consolidating,
      icon: Sprout,
      iconBg: "bg-[#2563eb]/10 text-[#004ac6]",
      hoverBorder: "hover:border-[#004ac6]",
      hint: "En camino a dominarse",
    },
    {
      label: "Aprendiendo",
      value: metrics.learning,
      icon: Brain,
      iconBg: "bg-[#996100]/10 text-[#784b00]",
      hoverBorder: "hover:border-[#784b00]",
      hint: "Recién comprendidos",
    },
    {
      label: "En riesgo",
      value: metrics.atRisk,
      icon: AlertTriangle,
      iconBg: "bg-[#ffdad6] text-[#ba1a1a]",
      hoverBorder: "hover:border-[#ba1a1a]",
      hint: "Toca repasarlos hoy",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Nivel de dominio — gamificación reorientada a comprensión */}
      <section>
        <div className="relative flex flex-col items-center justify-between gap-6 overflow-hidden rounded-2xl bg-gradient-to-br from-[#004ac6] to-[#2563eb] p-6 text-white shadow-lg md:flex-row md:p-8">
          <div className="z-10 space-y-3 text-center md:text-left">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 backdrop-blur-md">
              <Sparkles className="size-4" />
              <span className="text-sm font-medium">Estado actual</span>
            </div>
            <h2
              className="text-2xl font-bold md:text-3xl"
              style={{ fontFamily: "var(--font-hanken, inherit)" }}
            >
              Nivel {metrics.masteryLevel}
            </h2>
            <p className="max-w-md text-sm text-white/80">
              {metrics.mastered} concepto
              {metrics.mastered === 1 ? "" : "s"} en memoria de largo plazo.
              {toNextLevel > 0
                ? ` Te faltan ${toNextLevel} para el siguiente nivel.`
                : " ¡Sigue así!"}
            </p>
          </div>
          <div className="relative z-10 flex items-center justify-center">
            <svg className="h-32 w-32 md:h-40 md:w-40">
              <circle
                className="text-white/10"
                cx="50%"
                cy="50%"
                fill="transparent"
                r={R}
                stroke="currentColor"
                strokeWidth="12"
              />
              <circle
                className="text-[#6cf8bb] transition-[stroke-dashoffset] duration-500"
                cx="50%"
                cy="50%"
                fill="transparent"
                r={R}
                stroke="currentColor"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                strokeWidth="12"
                style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold md:text-4xl">
                {levelProgress}%
              </span>
              <span className="text-xs uppercase tracking-wider text-white/70">
                Progreso
              </span>
            </div>
          </div>
          {/* Adornos de racha / repasos */}
          <div className="z-10 flex gap-4 md:flex-col">
            <MiniStat icon={Flame} value={metrics.streak} label="racha" />
            <MiniStat icon={Repeat} value={metrics.reviewsToday} label="hoy" />
          </div>
        </div>
      </section>

      {/* Estado de conceptos */}
      <section className="space-y-4">
        <h3
          className="text-xl font-bold"
          style={{ fontFamily: "var(--font-hanken, inherit)" }}
        >
          Estado de conceptos
        </h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {conceptStates.map((s) => (
            <div
              key={s.label}
              className={
                "group rounded-2xl border border-[#c3c6d7] bg-white p-4 transition-colors " +
                s.hoverBorder
              }
            >
              <div className={"mb-2 inline-flex rounded-lg p-2 " + s.iconBg}>
                <s.icon className="size-5" />
              </div>
              <p className="text-2xl font-bold text-[#131b2e]">{s.value}</p>
              <p className="text-sm font-medium text-[#131b2e]">{s.label}</p>
              <p className="mt-0.5 text-[11px] leading-tight text-[#434655]">
                {s.hint}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Indicadores de memoria */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Retención */}
        <div className="rounded-2xl border border-[#c3c6d7] bg-white p-6">
          <p className="text-sm font-medium text-[#434655]">Retención</p>
          <p className="mb-4 text-2xl font-bold text-[#131b2e]">
            {metrics.retentionRate}%{" "}
            <span className="text-sm font-normal text-[#006c49]">promedio</span>
          </p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#eaedff]">
            <div
              className="h-full rounded-full bg-[#004ac6]"
              style={{ width: `${metrics.retentionRate}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-[#434655]">
            Recuerdos exitosos sobre el total de intentos.
          </p>
        </div>

        {/* Fuerza de memoria */}
        <div className="rounded-2xl border border-[#c3c6d7] bg-white p-6">
          <p className="text-sm font-medium text-[#434655]">Fuerza de memoria</p>
          <p className="mb-1 flex items-center gap-1 text-2xl font-bold text-[#131b2e]">
            {metrics.avgEase.toFixed(2)}
            <TrendingUp className="size-5 text-[#006c49]" />
          </p>
          <p className="text-[11px] text-[#434655]">
            Facilidad media (SM-2): cuánto se resisten al olvido.
          </p>
        </div>

        {/* Conexiones */}
        <div className="rounded-2xl border border-[#c3c6d7] bg-white p-6">
          <div className="mb-1 inline-flex rounded-lg bg-[#2563eb]/10 p-2 text-[#004ac6]">
            <Network className="size-5" />
          </div>
          <p className="text-2xl font-bold text-[#131b2e]">
            {metrics.connections}
          </p>
          <p className="text-sm font-medium text-[#131b2e]">Conexiones</p>
          <p className="mt-0.5 text-[11px] text-[#434655]">
            Ideas enlazadas entre libros: comprensión en red.
          </p>
        </div>
      </section>

      {/* Metas del día */}
      <section className="space-y-4">
        <h3
          className="flex items-center gap-2 text-xl font-bold"
          style={{ fontFamily: "var(--font-hanken, inherit)" }}
        >
          <Target className="size-5 text-[#004ac6]" />
          Metas de hoy
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {goals.map((g) => (
            <div
              key={g.id}
              className={
                "flex items-center gap-4 rounded-xl border p-4 " +
                (g.done
                  ? "border-[#006c49]/40 bg-[#6cf8bb]/15"
                  : "border-[#c3c6d7] bg-[#eaedff]")
              }
            >
              <CheckCircle2
                className={
                  "size-6 flex-shrink-0 " +
                  (g.done ? "text-[#006c49]" : "text-[#737686]")
                }
              />
              <div className="min-w-0 flex-1">
                <p
                  className={
                    "text-sm font-medium " +
                    (g.done
                      ? "text-[#434655] line-through"
                      : "text-[#131b2e]")
                  }
                >
                  {g.label}
                </p>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/70">
                  <div
                    className="h-full rounded-full bg-[#006c49]"
                    style={{ width: `${g.progress}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl bg-white/15 px-3 py-2 backdrop-blur-md">
      <Icon className="size-5 text-white" />
      <span className="text-lg font-bold leading-tight text-white">{value}</span>
      <span className="text-[11px] text-white/70">{label}</span>
    </div>
  );
}
