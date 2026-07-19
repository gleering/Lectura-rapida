"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Clock,
  Play,
  Trophy,
  Flame,
  AlertTriangle,
  CheckCircle2,
  Repeat,
  ArrowRight,
} from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { UploadButton } from "@/components/UploadButton";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { buttonVariants } from "@/components/ui/button";
import {
  listBooks,
  getAllReviewCards,
  getAllConceptLinks,
} from "@/lib/storage";
import {
  computeLearningMetrics,
  computeDailyGoals,
} from "@/lib/learning-metrics";
import { formatNumber, cn } from "@/lib/utils";
import type { BookMeta, LearningMetrics, DailyLearningGoal } from "@/types";

export default function HomePage() {
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

  const continueBook = books.find(
    (b) => !b.finished && b.progressIndex > 0
  );
  const recent = books.slice(0, 6);
  const hasLearning = metrics && metrics.totalConcepts > 0;

  return (
    <div className="min-h-screen">
      <AppNav />
      <main className="mx-auto max-w-5xl px-4 py-10 pb-28 md:pb-10">
        {/* Hero */}
        <section className="flex flex-col items-center gap-6 py-12 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <BookOpen className="size-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Comprende lo que lees. De verdad.
            </h1>
            <p className="mx-auto max-w-xl text-muted-foreground">
              No es solo leer rápido: es entrenar tu mente para entender,
              recordar y aplicar. Sube un libro y transfórmalo en conocimiento
              consolidado con lectura RSVP, tutor, repaso espaciado y más.
            </p>
          </div>
          <UploadButton />
        </section>

        {/* Tu día de aprendizaje — lanzadera al bucle de comprensión */}
        {hasLearning && metrics && (
          <section className="mb-10">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Tu día de aprendizaje</h2>
              <Link
                href="/progress"
                className="flex items-center gap-1 text-sm text-muted-foreground hover:underline"
              >
                Ver progreso <ArrowRight className="size-3.5" />
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {/* Nivel + racha */}
              <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-transparent">
                <CardContent className="flex items-center gap-3 p-4">
                  <Trophy className="size-6 text-primary" />
                  <div>
                    <p className="text-lg font-bold leading-tight">
                      Nivel {metrics.masteryLevel}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {metrics.mastered} dominado
                      {metrics.mastered === 1 ? "" : "s"}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <Flame className="size-6 text-amber-500" />
                  <div>
                    <p className="text-lg font-bold leading-tight">
                      {metrics.streak} día{metrics.streak === 1 ? "" : "s"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      racha de repaso
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <Repeat className="size-6 text-sky-500" />
                  <div>
                    <p className="text-lg font-bold leading-tight">
                      {metrics.reviewsToday}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      repasos hoy
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Conceptos en riesgo — CTA directo al repaso */}
            {metrics.atRisk > 0 && (
              <Link href="/review" className="mt-3 block">
                <Card className="border-rose-500/40 bg-rose-500/5 transition-colors hover:bg-rose-500/10">
                  <CardContent className="flex items-center gap-3 p-4">
                    <AlertTriangle className="size-5 flex-shrink-0 text-rose-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {metrics.atRisk} concepto
                        {metrics.atRisk === 1 ? "" : "s"} en riesgo de olvido
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Repásalos ahora para consolidarlos en memoria.
                      </p>
                    </div>
                    <span className={buttonVariants({ size: "sm" })}>
                      Repasar
                    </span>
                  </CardContent>
                </Card>
              </Link>
            )}

            {/* Metas del día */}
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {goals.map((g) => (
                <Card
                  key={g.id}
                  className={cn(g.done && "border-emerald-500/40")}
                >
                  <CardContent className="p-4">
                    <div className="mb-2 flex items-start gap-2">
                      <CheckCircle2
                        className={cn(
                          "mt-0.5 size-4 flex-shrink-0",
                          g.done
                            ? "text-emerald-500"
                            : "text-muted-foreground/40"
                        )}
                      />
                      <p
                        className={cn(
                          "text-xs font-medium leading-tight",
                          g.done && "text-muted-foreground line-through"
                        )}
                      >
                        {g.label}
                      </p>
                    </div>
                    <Progress value={g.progress} className="h-1.5" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Continue reading */}
        {continueBook && (
          <section className="mb-10">
            <h2 className="mb-3 text-lg font-semibold">Continuar lectura</h2>
            <Card>
              <CardContent className="flex items-center justify-between gap-4 p-5">
                <div className="min-w-0">
                  <p className="truncate font-medium">{continueBook.title}</p>
                  <p className="text-sm text-muted-foreground">
                    Palabra {formatNumber(continueBook.progressIndex + 1)} de{" "}
                    {formatNumber(continueBook.totalWords)} ·{" "}
                    {(
                      ((continueBook.progressIndex + 1) /
                        continueBook.totalWords) *
                      100
                    ).toFixed(0)}
                    %
                  </p>
                </div>
                <Link
                  href={`/reader/${continueBook.id}`}
                  className={buttonVariants({ size: "lg" })}
                >
                  <Play /> Continuar
                </Link>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Recent books */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Últimos libros</h2>
            {books.length > 0 && (
              <Link
                href="/library"
                className="text-sm text-muted-foreground hover:underline"
              >
                Ver biblioteca
              </Link>
            )}
          </div>

          {!loaded ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : recent.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
                <Clock className="size-6" />
                <p>Todavía no subiste ningún libro.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {recent.map((b) => {
                const pct =
                  b.totalWords > 0
                    ? ((b.progressIndex + 1) / b.totalWords) * 100
                    : 0;
                return (
                  <Link key={b.id} href={`/reader/${b.id}`}>
                    <Card className="h-full transition-colors hover:border-primary/40 hover:bg-secondary/40">
                      <CardContent className="space-y-3 p-5">
                        <div className="flex items-start justify-between gap-2">
                          <p className="line-clamp-2 font-medium">{b.title}</p>
                          {b.finished && (
                            <span className="shrink-0 rounded-full bg-green-500/15 px-2 py-0.5 text-xs text-green-600 dark:text-green-400">
                              Leído
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatNumber(b.totalWords)} palabras · {b.totalPages}{" "}
                          pág.
                        </p>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </CardContent>
                    </Card>
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
