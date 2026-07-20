"use client";

import { useEffect, useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { EmptyState } from "@/components/EmptyState";
import { LearningDashboard } from "@/components/LearningDashboard";
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
    <PageShell maxWidth="xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Progreso
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          No medimos cuánto lees ni a qué velocidad, sino cuánto comprendes y
          retienes de verdad. Lo que se mide se optimiza: aquí verás tu
          conocimiento consolidándose en memoria de largo plazo.
        </p>
      </div>

      {!loaded ? (
        <div className="flex justify-center py-20 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : !metrics || metrics.totalConcepts === 0 ? (
        <EmptyState
          icon={<Sparkles className="size-8 text-warning-soft-foreground" />}
        >
          Aún no tienes conceptos que medir. Genera tarjetas de repaso o usa el
          Tutor para empezar a construir tu conocimiento.
        </EmptyState>
      ) : (
        <LearningDashboard metrics={metrics} goals={goals} />
      )}
    </PageShell>
  );
}
