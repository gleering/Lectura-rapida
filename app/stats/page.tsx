"use client";

import { AppNav } from "@/components/AppNav";
import { Stats } from "@/components/Stats";

export default function StatsPage() {
  return (
    <div className="min-h-screen">
      <AppNav />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold">Estadísticas</h1>
        <Stats />
      </main>
    </div>
  );
}
