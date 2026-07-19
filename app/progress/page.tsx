"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Sparkles } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { LearningDashboard } from "@/components/LearningDashboard";
import { Card, CardContent } from "@/components/ui/card";
import { getAllReviewCards, getAllConceptLinks } from "@/lib/storage";
import {
  computeLearningMetrics,
  computeDailyGoals,
} from "@/lib/learning-metrics";
import type { LearningMetrics, DailyLearningGoal } from "@/types";

export default function ProgressPage() {
  const [loaded, setLoaded] = useState(false);
  const [metrics, setMetrics] = useState<LearningMetrics | null>(null);
  const [goals, setGoals] = useState<DailyLearningGoal[]>([]);

  useEffect(() => {
    Promise.all([getAllReviewCards(), getAllConceptLinks()]).then(
      ([cards, links]) => {
        const m = computeLearningMetrics(cards, links);
        setMetrics(m);
        setGoals(computeDailyGoals(cards, m));
        setLoaded(true);
      }
    );
  }, []);

  return (
    <div className="min-h-screen">
      <AppNav />
      <main className="mx-auto max-w-3xl px-4 py-8 pb-24 md:pb-8">
        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <TrendingUp className="size-6 text-primary" />
            Progreso
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            No medimos cuánto lees ni a qué velocidad, sino cuánto comprendes y
            retienes de verdad. Lo que se mide se optimiza: aquí verás tu
            conocimiento consolidándose en memoria de largo plazo.
          </p>
        </div>

        {!loaded ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : !metrics || metrics.totalConcepts === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
              <Sparkles className="size-8" />
              <p>
                Aún no tienes conceptos que medir. Genera tarjetas de repaso o
                usa el Tutor para empezar a construir tu conocimiento.
              </p>
            </CardContent>
          </Card>
        ) : (
          <LearningDashboard metrics={metrics} goals={goals} />
        )}
      </main>
    </div>
  );
}
