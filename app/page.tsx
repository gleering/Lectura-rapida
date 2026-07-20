"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Play,
  Trophy,
  Flame,
  Repeat,
  ChevronRight,
  Loader2,
  Brain,
  ListChecks,
  PlayCircle,
  History,
  Check,
  Bookmark,
} from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { Landing } from "@/components/Landing";
import { useAuth } from "@/lib/auth";
import { UploadButton } from "@/components/UploadButton";
import {
  listBooks,
  getAllReviewCards,
  getAllConceptLinks,
} from "@/lib/storage";
import {
  computeLearningMetrics,
  computeDailyGoals,
} from "@/lib/learning-metrics";
import { cn } from "@/lib/utils";
import type { BookMeta, LearningMetrics, DailyLearningGoal } from "@/types";

export default function HomePage() {
  const { ready, user, configured } = useAuth();
  const [books, setBooks] = useState<BookMeta[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [metrics, setMetrics] = useState<LearningMetrics | null>(null);
  const [goals, setGoals] = useState<DailyLearningGoal[]>([]);

  useEffect(() => {
    Promise.all([listBooks(), getAllReviewCards(), getAllConceptLinks()]).then(
      ([b, cards, links]) => {
        setBooks(b);
        const m = computeLearningMetrics(cards, links);
        setMetrics(m);
        setGoals(computeDailyGoals(cards, m));
        setLoaded(true);
      }
    );
  }, []);

  // Modelo cliente-final: si hay auth configurada y el visitante no inició
  // sesión, ve la landing (propuesta de valor + registro). Los usuarios
  // logueados —y los builds locales sin Supabase— entran directo a la app.
  if (configured && !ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (configured && !user) {
    return <Landing />;
  }

  const continueBook = books.find((b) => !b.finished && b.progressIndex > 0);
  const recent = books.slice(0, 8);
  const hasLearning = metrics && metrics.totalConcepts > 0;

  return (
    <div className="min-h-screen bg-[#faf8ff] text-[#131b2e]">
      <AppNav />
      <main className="mx-auto max-w-[1280px] space-y-8 px-4 py-8 pb-28 md:pb-10">
        {/* Hero */}
        <section className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <h2
              className="text-2xl font-bold tracking-tight text-[#131b2e] sm:text-[32px]"
              style={{ fontFamily: "var(--font-hanken, inherit)" }}
            >
              Hola, lector. ¿Qué vamos a entrenar hoy?
            </h2>
            <p className="mt-1 text-[#434655]">
              Tu mente está lista para un nuevo desafío de enfoque.
            </p>
          </div>
          <UploadButton
            label="Subir libro"
            className="shrink-0 rounded-xl bg-[#004ac6] px-6 py-3 text-white shadow-lg shadow-[#004ac6]/20 hover:bg-[#003ea8]"
          />
        </section>

        {/* Bento: stats + alerta de riesgo */}
        {hasLearning && metrics && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <div className="grid grid-cols-3 gap-4 md:col-span-8">
              <StatCard
                icon={<Trophy className="size-6 text-[#784b00]" />}
                label="Nivel"
                value={`${metrics.masteryLevel}`}
                sub={`${metrics.mastered} dominado${metrics.mastered === 1 ? "" : "s"}`}
              />
              <StatCard
                icon={<Flame className="size-6 text-[#ba1a1a]" />}
                label="Racha"
                value={`${metrics.streak}`}
                sub={`día${metrics.streak === 1 ? "" : "s"}`}
              />
              <StatCard
                icon={<Repeat className="size-6 text-[#006c49]" />}
                label="Repasos"
                value={`${metrics.reviewsToday}`}
                sub="hoy"
              />
            </div>

            {metrics.atRisk > 0 ? (
              <Link
                href="/review"
                className="group flex items-center justify-between rounded-2xl border border-[#ba1a1a]/10 bg-[#ffdad6] p-5 transition-transform active:scale-[0.98] md:col-span-4"
              >
                <div className="flex items-center gap-4">
                  <div className="rounded-xl bg-[#ba1a1a] p-2 text-white">
                    <Brain className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#93000a]">
                      {metrics.atRisk} concepto{metrics.atRisk === 1 ? "" : "s"} en riesgo
                    </p>
                    <p className="text-xs text-[#93000a]/80">¡Repásalos ahora!</p>
                  </div>
                </div>
                <ChevronRight className="size-5 text-[#93000a] transition-transform group-hover:translate-x-1" />
              </Link>
            ) : (
              <Link
                href="/review"
                className="group flex items-center justify-between rounded-2xl border border-[#006c49]/15 bg-[#6cf8bb]/40 p-5 transition-transform active:scale-[0.98] md:col-span-4"
              >
                <div className="flex items-center gap-4">
                  <div className="rounded-xl bg-[#006c49] p-2 text-white">
                    <Check className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#00714d]">Todo al día</p>
                    <p className="text-xs text-[#00714d]/80">
                      Sin conceptos en riesgo.
                    </p>
                  </div>
                </div>
                <ChevronRight className="size-5 text-[#00714d] transition-transform group-hover:translate-x-1" />
              </Link>
            )}
          </div>
        )}

        {/* Metas del día + Continuar lectura */}
        {(goals.length > 0 || continueBook) && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
            {/* Metas del día */}
            {goals.length > 0 && (
              <div className="space-y-4 md:col-span-4">
                <h3 className="flex items-center gap-2 text-sm font-medium text-[#434655]">
                  <ListChecks className="size-4" /> Metas del día
                </h3>
                <div className="space-y-4 rounded-2xl border border-[#c3c6d7] bg-[#f2f3ff] p-4">
                  {goals.map((g) => (
                    <div key={g.id} className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-md border-2",
                          g.done
                            ? "border-[#006c49] bg-[#006c49] text-white"
                            : "border-[#c3c6d7]"
                        )}
                      >
                        {g.done && <Check className="size-3.5" strokeWidth={3} />}
                      </div>
                      <div className="flex-1">
                        <div className="mb-1 flex items-center justify-between">
                          <span
                            className={cn(
                              "text-sm text-[#131b2e]",
                              g.done && "line-through opacity-50"
                            )}
                          >
                            {g.label}
                          </span>
                          <span
                            className={cn(
                              "text-[10px] font-bold",
                              g.done ? "text-[#006c49]" : "text-[#434655]"
                            )}
                          >
                            {Math.round(g.progress)}%
                          </span>
                        </div>
                        <div className="h-1 overflow-hidden rounded-full bg-[#c3c6d7]">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              g.done ? "bg-[#006c49]" : "bg-[#004ac6]"
                            )}
                            style={{ width: `${g.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Continuar lectura */}
            {continueBook && (
              <div
                className={cn(
                  "space-y-4",
                  goals.length > 0 ? "md:col-span-8" : "md:col-span-12"
                )}
              >
                <h3 className="flex items-center gap-2 text-sm font-medium text-[#434655]">
                  <PlayCircle className="size-4" /> Continuar lectura
                </h3>
                <div className="flex flex-col overflow-hidden rounded-2xl border border-[#c3c6d7] bg-white shadow-sm sm:flex-row">
                  <div className="relative h-48 w-full shrink-0 bg-[#eaedff] sm:h-auto sm:w-40">
                    {continueBook.cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={continueBook.cover}
                        alt={`Portada de ${continueBook.title}`}
                        className="absolute inset-0 size-full object-cover"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center">
                        <BookOpen className="size-10 text-[#004ac6]/40" />
                      </div>
                    )}
                    <div className="absolute left-3 top-3 rounded-full bg-[#006c49] px-2 py-0.5 text-[10px] font-bold text-white">
                      ACTIVO
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col justify-between p-6">
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="min-w-0">
                          <h4 className="truncate text-xl font-semibold text-[#131b2e]">
                            {continueBook.title}
                          </h4>
                          {continueBook.author && (
                            <p className="truncate text-[#434655]">
                              {continueBook.author}
                            </p>
                          )}
                        </div>
                        <Bookmark className="size-5 shrink-0 text-[#004ac6]" />
                      </div>
                      <div className="mt-6">
                        <div className="mb-2 flex justify-between text-xs font-bold uppercase tracking-tight text-[#434655]">
                          <span>Progreso de lectura</span>
                          <span>
                            {(
                              ((continueBook.progressIndex + 1) /
                                continueBook.totalWords) *
                              100
                            ).toFixed(0)}
                            %
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[#e2e7ff]">
                          <div
                            className="h-full rounded-full bg-[#004ac6]"
                            style={{
                              width: `${
                                ((continueBook.progressIndex + 1) /
                                  continueBook.totalWords) *
                                100
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 flex justify-end">
                      <Link
                        href={`/reader/${continueBook.id}`}
                        className="flex items-center gap-2 rounded-lg bg-[#dae2fd] px-6 py-2 text-sm font-medium text-[#004ac6] transition-all hover:bg-[#004ac6] hover:text-white"
                      >
                        Continuar <Play className="size-4" fill="currentColor" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Últimos libros */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-medium text-[#434655]">
              <History className="size-4" /> Últimos libros
            </h3>
            {books.length > 0 && (
              <Link
                href="/library"
                className="text-sm font-medium text-[#004ac6] hover:underline"
              >
                Ver biblioteca
              </Link>
            )}
          </div>

          {!loaded ? (
            <p className="text-sm text-[#434655]">Cargando…</p>
          ) : recent.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#c3c6d7] py-12 text-center text-[#434655]">
              <BookOpen className="size-8 text-[#004ac6]/40" />
              <p>Todavía no subiste ningún libro.</p>
              <UploadButton
                label="Subir tu primer libro"
                className="rounded-xl bg-[#004ac6] px-6 py-3 text-white hover:bg-[#003ea8]"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {recent.map((b) => {
                const pct =
                  b.totalWords > 0
                    ? ((b.progressIndex + 1) / b.totalWords) * 100
                    : 0;
                return (
                  <Link key={b.id} href={`/reader/${b.id}`} className="group space-y-3">
                    <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-[#c3c6d7] bg-[#eaedff] shadow-sm transition-transform duration-300 group-hover:-translate-y-1">
                      {b.cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={b.cover}
                          alt={`Portada de ${b.title}`}
                          className="absolute inset-0 size-full object-cover"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center">
                          <BookOpen className="size-8 text-[#004ac6]/40" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 h-1 w-full bg-[#e2e7ff]">
                        <div
                          className={cn(
                            "h-full",
                            b.finished ? "bg-[#006c49]" : "bg-[#004ac6]"
                          )}
                          style={{ width: `${b.finished ? 100 : pct}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <p className="truncate text-sm text-[#131b2e]">{b.title}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#434655]">
                        {b.finished
                          ? "Completado"
                          : `${pct.toFixed(0)}% completado`}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-[#c3c6d7] bg-white p-4 text-center transition-transform active:scale-[0.98]">
      <div className="mb-2">{icon}</div>
      <p className="text-[11px] uppercase tracking-wider text-[#434655]">
        {label}
      </p>
      <p className="text-lg font-bold leading-tight text-[#131b2e]">{value}</p>
      <p className="text-[11px] text-[#434655]">{sub}</p>
    </div>
  );
}
