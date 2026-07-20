"use client";

import { useEffect, useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { AppNav } from "@/components/AppNav";
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
    <div className="min-h-screen bg-[#faf8ff] text-[#131b2e]">
      <AppNav />
      <main className="mx-auto max-w-4xl px-4 py-8 pb-24 md:pb-8">
        <div className="mb-6">
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-hanken, inherit)" }}
          >
            Progreso
          </h1>
          <p className="mt-1 text-sm text-[#434655]">
            No medimos cuánto lees ni a qué velocidad, sino cuánto comprendes y
            retienes de verdad. Lo que se mide se optimiza: aquí verás tu
            conocimiento consolidándose en memoria de largo plazo.
          </p>
        </div>

        {!loaded ? (
          <div className="flex justify-center py-20 text-[#434655]">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : !metrics || metrics.totalConcepts === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#c3c6d7] bg-white">
            <div className="flex flex-col items-center gap-3 px-4 py-16 text-center text-[#434655]">
              <Sparkles className="size-8 text-[#784b00]" />
              <p className="max-w-sm">
                Aún no tienes conceptos que medir. Genera tarjetas de repaso o
                usa el Tutor para empezar a construir tu conocimiento.
              </p>
            </div>
          </div>
        ) : (
          <LearningDashboard metrics={metrics} goals={goals} />
        )}
      </main>
    </div>
  );
}
