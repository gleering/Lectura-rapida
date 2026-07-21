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
import { Onboarding } from "@/components/Onboarding";
import { StatTile } from "@/components/StatTile";
import { EmptyState } from "@/components/EmptyState";
import { BookCover } from "@/components/BookCover";
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
  const continuePct = continueBook
    ? Math.min(
        100,
        ((continueBook.progressIndex + 1) / continueBook.totalWords) * 100
      )
    : 0;
  const recent = books.slice(0, 8);
  const hasLearning = metrics && metrics.totalConcepts > 0;

  // Usuario nuevo: sin libros ni conceptos → flujo guiado de arranque.
  if (loaded && books.length === 0 && !hasLearning) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <AppNav />
        <main className="mx-auto max-w-[1280px] px-4 py-8 pb-28 md:pb-10">
          <Onboarding />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppNav />
      <main className="mx-auto max-w-[1280px] space-y-8 px-4 py-8 pb-28 md:pb-10">
        {/* Hero */}
        <section className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <h2
              className="text-2xl font-bold tracking-tight text-foreground sm:text-[32px] font-display"
            >
              Hola, lector. ¿Qué vamos a entrenar hoy?
            </h2>
            <p className="mt-1 text-muted-foreground">
              Tu mente está lista para un nuevo desafío de enfoque.
            </p>
          </div>
          <UploadButton
            label="Subir libro"
            className="shrink-0 rounded-xl bg-primary px-6 py-3 text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
          />
        </section>

        {/* Bento: stats + alerta de riesgo */}
        {hasLearning && metrics && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <div className="grid grid-cols-3 gap-4 md:col-span-8">
              <StatTile
                icon={<Trophy className="size-6 text-warning-soft-foreground" />}
                label="Nivel"
                value={`${metrics.masteryLevel}`}
                sub={`${metrics.mastered} dominado${metrics.mastered === 1 ? "" : "s"}`}
              />
              <StatTile
                icon={<Flame className="size-6 text-destructive" />}
                label="Racha"
                value={`${metrics.streak}`}
                sub={`día${metrics.streak === 1 ? "" : "s"}`}
              />
              <StatTile
                icon={<Repeat className="size-6 text-success" />}
                label="Repasos"
                value={`${metrics.reviewsToday}`}
                sub="hoy"
              />
            </div>

            {metrics.atRisk > 0 ? (
              <Link
                href="/review"
                className="group flex items-center justify-between rounded-2xl border border-destructive/10 bg-destructive-soft p-5 transition-transform active:scale-[0.98] md:col-span-4"
              >
                <div className="flex items-center gap-4">
                  <div className="rounded-xl bg-destructive p-2 text-destructive-foreground">
                    <Brain className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-destructive-soft-foreground">
                      {metrics.atRisk} concepto{metrics.atRisk === 1 ? "" : "s"} en riesgo
                    </p>
                    <p className="text-xs text-destructive-soft-foreground/80">¡Repásalos ahora!</p>
                  </div>
                </div>
                <ChevronRight className="size-5 text-destructive-soft-foreground transition-transform group-hover:translate-x-1" />
              </Link>
            ) : (
              <Link
                href="/review"
                className="group flex items-center justify-between rounded-2xl border border-success/15 bg-success-soft/40 p-5 transition-transform active:scale-[0.98] md:col-span-4"
              >
                <div className="flex items-center gap-4">
                  <div className="rounded-xl bg-success p-2 text-success-foreground">
                    <Check className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-success-soft-foreground">Todo al día</p>
                    <p className="text-xs text-success-soft-foreground/80">
                      Sin conceptos en riesgo.
                    </p>
                  </div>
                </div>
                <ChevronRight className="size-5 text-success-soft-foreground transition-transform group-hover:translate-x-1" />
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
                <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <ListChecks className="size-4" /> Metas del día
                </h3>
                <div className="space-y-4 rounded-2xl border border-border bg-muted p-4">
                  {goals.map((g) => (
                    <div key={g.id} className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-md border-2",
                          g.done
                            ? "border-success bg-success text-success-foreground"
                            : "border-border"
                        )}
                      >
                        {g.done && <Check className="size-3.5" strokeWidth={3} />}
                      </div>
                      <div className="flex-1">
                        <div className="mb-1 flex items-center justify-between">
                          <span
                            className={cn(
                              "text-sm text-foreground",
                              g.done && "line-through opacity-50"
                            )}
                          >
                            {g.label}
                          </span>
                          <span
                            className={cn(
                              "text-[10px] font-bold",
                              g.done ? "text-success" : "text-muted-foreground"
                            )}
                          >
                            {Math.round(g.progress)}%
                          </span>
                        </div>
                        <div className="h-1 overflow-hidden rounded-full bg-border">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              g.done ? "bg-success" : "bg-primary"
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
                <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <PlayCircle className="size-4" /> Continuar lectura
                </h3>
                <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm sm:flex-row">
                  <div className="relative h-48 w-full shrink-0 bg-secondary sm:h-auto sm:w-40">
                    <BookCover
                      title={continueBook.title}
                      author={continueBook.author}
                      cover={continueBook.cover}
                    />
                    <div className="absolute left-3 top-3 rounded-full bg-success px-2 py-0.5 text-[10px] font-bold text-success-foreground">
                      ACTIVO
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col justify-between p-6">
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="min-w-0">
                          <h4 className="truncate text-xl font-semibold text-foreground">
                            {continueBook.title}
                          </h4>
                          {continueBook.author && (
                            <p className="truncate text-muted-foreground">
                              {continueBook.author}
                            </p>
                          )}
                        </div>
                        <Bookmark className="size-5 shrink-0 text-primary" />
                      </div>
                      <div className="mt-6">
                        <div className="mb-2 flex justify-between text-xs font-bold uppercase tracking-tight text-muted-foreground">
                          <span>Progreso de lectura</span>
                          <span>{continuePct.toFixed(0)}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-accent">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${continuePct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 flex justify-end">
                      <Link
                        href={`/reader/${continueBook.id}`}
                        className="flex items-center gap-2 rounded-lg bg-primary-soft px-6 py-2 text-sm font-medium text-primary transition-all hover:bg-primary hover:text-primary-foreground"
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
            <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <History className="size-4" /> Últimos libros
            </h3>
            {books.length > 0 && (
              <Link
                href="/library"
                className="text-sm font-medium text-primary hover:underline"
              >
                Ver biblioteca
              </Link>
            )}
          </div>

          {!loaded ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : recent.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-12 text-center text-muted-foreground">
              <BookOpen className="size-8 text-primary/40" />
              <p>Todavía no subiste ningún libro.</p>
              <UploadButton
                label="Subir tu primer libro"
                className="rounded-xl bg-primary px-6 py-3 text-primary-foreground hover:bg-primary/90"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {recent.map((b) => {
                const pct =
                  b.totalWords > 0
                    ? Math.min(100, ((b.progressIndex + 1) / b.totalWords) * 100)
                    : 0;
                return (
                  <Link key={b.id} href={`/reader/${b.id}`} className="group space-y-3">
                    <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-border bg-secondary shadow-sm transition-transform duration-300 group-hover:-translate-y-1">
                      <BookCover title={b.title} author={b.author} cover={b.cover} />
                      <div className="absolute bottom-0 left-0 h-1 w-full bg-accent">
                        <div
                          className={cn(
                            "h-full",
                            b.finished ? "bg-success" : "bg-primary"
                          )}
                          style={{ width: `${b.finished ? 100 : pct}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <p className="truncate text-sm text-foreground">{b.title}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
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
