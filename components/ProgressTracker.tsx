"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, Target, Zap } from "lucide-react";
import type { DiagnosticResult } from "@/lib/diagnostic-test";
import { compareDiagnostics } from "@/lib/diagnostic-test";

interface ProgressTrackerProps {
  initial?: DiagnosticResult;
  current?: DiagnosticResult;
  historicalData?: DiagnosticResult[];
}

export function ProgressTracker({ initial, current, historicalData }: ProgressTrackerProps) {
  if (!current) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            <Zap className="size-12 mx-auto mb-3 opacity-50" />
            <p>Completa el test diagnóstico para ver tu progreso</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const comparison =
    initial && current ? compareDiagnostics(initial, current) : null;

  const progressData = [
    {
      metric: "Velocidad",
      actual: current.readingSpeed,
      objetivo: current.readingSpeed * 1.5,
    },
    {
      metric: "Comprensión",
      actual: current.comprehension,
      objetivo: 95,
    },
    {
      metric: "Enfoque",
      actual: current.focusLevel,
      objetivo: 100,
    },
    {
      metric: "Visión Periférica",
      actual: current.peripheralVision,
      objetivo: 100,
    },
    {
      metric: "Memoria",
      actual: current.workingMemory,
      objetivo: 100,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Resumen de Mejora */}
      {comparison && (
        <Card className="border-green-500/50 bg-green-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="size-5 text-green-600" />
              Tu Progreso Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Velocidad</p>
                <p
                  className={`text-2xl font-bold ${
                    comparison.speedImprovement > 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {comparison.speedImprovement > 0 ? "+" : ""}
                  {comparison.speedImprovement.toFixed(1)}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Comprensión</p>
                <p
                  className={`text-2xl font-bold ${
                    comparison.comprehensionImprovement > 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {comparison.comprehensionImprovement > 0 ? "+" : ""}
                  {comparison.comprehensionImprovement.toFixed(1)}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Enfoque</p>
                <p
                  className={`text-2xl font-bold ${
                    comparison.focusImprovement > 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {comparison.focusImprovement > 0 ? "+" : ""}
                  {comparison.focusImprovement.toFixed(1)}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Visión Periférica</p>
                <p
                  className={`text-2xl font-bold ${
                    comparison.peripheralVisionImprovement > 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {comparison.peripheralVisionImprovement > 0 ? "+" : ""}
                  {comparison.peripheralVisionImprovement.toFixed(1)}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Memoria</p>
                <p
                  className={`text-2xl font-bold ${
                    comparison.workingMemoryImprovement > 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {comparison.workingMemoryImprovement > 0 ? "+" : ""}
                  {comparison.workingMemoryImprovement.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gráfico de Progreso */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="size-5 text-blue-600" />
            Progreso vs Objetivos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={progressData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="metric" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip formatter={(value) => `${Math.round(value as number)}`} />
              <Legend />
              <Bar dataKey="actual" fill="#3b82f6" name="Actual" />
              <Bar dataKey="objetivo" fill="#10b981" name="Objetivo" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detalles Métricos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Métricas Actuales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded">
              <span className="text-sm text-muted-foreground">Velocidad de Lectura</span>
              <span className="font-bold">{current.readingSpeed} WPM</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded">
              <span className="text-sm text-muted-foreground">Comprensión</span>
              <span className="font-bold">{current.comprehension}%</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded">
              <span className="text-sm text-muted-foreground">Nivel de Enfoque</span>
              <span className="font-bold">{current.focusLevel}%</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded">
              <span className="text-sm text-muted-foreground">Visión Periférica</span>
              <span className="font-bold">{current.peripheralVision}%</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded">
              <span className="text-sm text-muted-foreground">Memoria de Trabajo</span>
              <span className="font-bold">{current.workingMemory}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recomendaciones Actuales</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {current.recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <span className="text-yellow-600 mt-1 flex-shrink-0">→</span>
                  <span className="text-muted-foreground">{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
