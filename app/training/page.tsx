"use client";

import { useState } from "react";
import { Brain, Eye, Zap, BarChart3, Lightbulb, Award, TrendingUp } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { SchulteTableGame } from "@/components/SchulteTable";
import { NBackTest } from "@/components/NBackTest";
import { UserProfile } from "@/components/UserProfile";
import { DiagnosticTest } from "@/components/DiagnosticTest";
import { PersonalizedPlanDisplay } from "@/components/PersonalizedPlanDisplay";
import { CertificateDisplay } from "@/components/CertificateDisplay";
import { ProgressTracker } from "@/components/ProgressTracker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import type { SchulteScore } from "@/lib/schulte-table";
import type { NBackScore } from "@/lib/nback-test";
import type { DiagnosticResult } from "@/lib/diagnostic-test";
import type { PersonalizedPlan } from "@/lib/personalized-plan";
import type { CertificateData } from "@/lib/certificate-generator";
import { generatePersonalizedPlan } from "@/lib/personalized-plan";
import { cn } from "@/lib/utils";

type TrainingMode = "profile" | "diagnostic" | "plan" | "progress" | "schulte" | "nback" | "routine" | "certificates";

export default function TrainingPage() {
  const [mode, setMode] = useState<TrainingMode>("profile");
  const [schulteScores, setSchulteScores] = useState<SchulteScore[]>([]);
  const [nbackScores, setNBackScores] = useState<NBackScore[]>([]);
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null);
  const [personalizePlan, setPersonalizedPlan] = useState<PersonalizedPlan | null>(null);
  const [certificates, setCertificates] = useState<CertificateData[]>([]);

  const handleSchulteComplete = (score: SchulteScore) => {
    setSchulteScores((prev) => [...prev, score]);
  };

  const handleNBackComplete = (score: NBackScore) => {
    setNBackScores((prev) => [...prev, score]);
  };

  const handleDiagnosticComplete = (result: DiagnosticResult) => {
    setDiagnosticResult(result);
    const plan = generatePersonalizedPlan(result);
    setPersonalizedPlan(plan);
    setMode("plan");
  };

  return (
    <div className="min-h-screen">
      <AppNav />
      <main className="mx-auto max-w-6xl px-4 py-8 pb-24 md:pb-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Centro de Entrenamiento</h1>
          <p className="text-muted-foreground">
            Ejercicios científicos para expandir tu visión y mejorar memoria
          </p>
        </div>

        {/* Tabs de navegación */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {[
            {
              id: "profile" as const,
              label: "Perfil",
              icon: <BarChart3 className="size-4" />,
            },
            {
              id: "diagnostic" as const,
              label: "Diagnóstico",
              icon: <Lightbulb className="size-4" />,
            },
            {
              id: "plan" as const,
              label: "Plan Personalizado",
              icon: <Zap className="size-4" />,
              hidden: !personalizePlan,
            },
            {
              id: "progress" as const,
              label: "Progreso",
              icon: <TrendingUp className="size-4" />,
              hidden: !diagnosticResult,
            },
            {
              id: "schulte" as const,
              label: "Tabla de Schulte",
              icon: <Eye className="size-4" />,
            },
            {
              id: "nback" as const,
              label: "N-Back Test",
              icon: <Brain className="size-4" />,
            },
            {
              id: "routine" as const,
              label: "Rutina Diaria",
              icon: <Zap className="size-4" />,
            },
            {
              id: "certificates" as const,
              label: "Certificados",
              icon: <Award className="size-4" />,
              hidden: certificates.length === 0,
            },
          ]
            .filter((tab) => !tab.hidden)
            .map((tab) => (
              <Button
                key={tab.id}
                variant={mode === tab.id ? "default" : "outline"}
                onClick={() => setMode(tab.id)}
                className="gap-2 whitespace-nowrap"
              >
                {tab.icon}
                {tab.label}
              </Button>
            ))}
        </div>

        {/* Contenido */}
        {mode === "profile" && <UserProfile />}

        {mode === "diagnostic" && (
          <DiagnosticTest onComplete={handleDiagnosticComplete} />
        )}

        {mode === "plan" && personalizePlan && (
          <PersonalizedPlanDisplay plan={personalizePlan} />
        )}

        {mode === "progress" && (
          <ProgressTracker current={diagnosticResult || undefined} />
        )}

        {mode === "certificates" && (
          <CertificateDisplay certificates={certificates} />
        )}

        {mode === "schulte" && (
          <div className="space-y-6">
            <SchulteTableGame onComplete={handleSchulteComplete} />

            {schulteScores.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Historial Schulte</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {schulteScores.slice(-5).map((score, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-secondary/50 rounded"
                      >
                        <span className="text-sm">
                          Nivel {score.level} (
                          {score.accuracy === 1 ? "Perfecto" : "Con errores"})
                        </span>
                        <span className="font-mono text-sm">
                          {(score.completionTime / 1000).toFixed(2)}s
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {mode === "nback" && (
          <div className="space-y-6">
            <NBackTest onComplete={handleNBackComplete} />

            {nbackScores.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Historial N-Back</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {nbackScores.slice(-5).map((score, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-secondary/50 rounded"
                      >
                        <span className="text-sm">
                          {score.level}-Back ({score.correctResponses}/
                          {score.totalTrials})
                        </span>
                        <span className="font-mono text-sm">
                          {Math.round(score.accuracy * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {mode === "routine" && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Rutina Diaria Recomendada</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="p-4 bg-blue-500/10 border border-blue-500 rounded-lg">
                    <h3 className="font-semibold text-sm mb-2">
                      📖 1. Lectura (30-45 min)
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Lee con RSVP + tests de comprensión. Objetivo: 500-1000
                      palabras
                    </p>
                  </div>

                  <div className="p-4 bg-purple-500/10 border border-purple-500 rounded-lg">
                    <h3 className="font-semibold text-sm mb-2">
                      👀 2. Tabla de Schulte (5-10 min)
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Entrena visión periférica. Objetivo: Completa 1-2 niveles
                    </p>
                  </div>

                  <div className="p-4 bg-green-500/10 border border-green-500 rounded-lg">
                    <h3 className="font-semibold text-sm mb-2">
                      🧠 3. N-Back Test (5-10 min)
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Entrena memoria de trabajo. Objetivo: 70%+ accuracy
                    </p>
                  </div>

                  <div className="p-4 bg-orange-500/10 border border-orange-500 rounded-lg">
                    <h3 className="font-semibold text-sm mb-2">
                      ⭐ 4. Reflexión (5 min)
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Revisa tu progreso en Perfil. Anota qué mejoró.
                    </p>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-secondary/50 rounded-lg">
                  <p className="text-sm font-semibold mb-2">💡 Beneficios Esperados</p>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    <li>✓ Aumento de 30-50% en velocidad de lectura</li>
                    <li>✓ Mejora de comprensión y retención</li>
                    <li>✓ Visión periférica expandida</li>
                    <li>✓ Mejor enfoque y concentración</li>
                    <li>✓ Memoria de trabajo más fuerte</li>
                  </ul>
                </div>

                <div className="p-4 bg-secondary/50 rounded-lg">
                  <p className="text-sm font-semibold mb-2">📅 Frecuencia Recomendada</p>
                  <p className="text-xs text-muted-foreground">
                    5-6 días por semana. El descanso es importante para consolidar lo
                    aprendido.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
