"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Target, TrendingUp, Zap } from "lucide-react";
import type { PersonalizedPlan } from "@/lib/personalized-plan";

interface PersonalizedPlanDisplayProps {
  plan: PersonalizedPlan;
}

export function PersonalizedPlanDisplay({ plan }: PersonalizedPlanDisplayProps) {
  const dayIndex =
    new Date().getDay() === 0
      ? 6
      : new Date().getDay() - 1;

  const todayPlan = plan.weeklyPlan[dayIndex];

  return (
    <div className="space-y-6">
      {/* Plan Resumen */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="size-5 text-yellow-600" />
            Tu Plan Personalizado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="text-center p-3 bg-secondary rounded">
              <p className="text-xs text-muted-foreground">Perfil</p>
              <p className="text-sm font-bold capitalize mt-1">
                {plan.diagnosticResult.readerProfile.replace("-", " ")}
              </p>
            </div>
            <div className="text-center p-3 bg-secondary rounded">
              <p className="text-xs text-muted-foreground">Tipo de Aprendizaje</p>
              <p className="text-sm font-bold capitalize mt-1">
                {plan.diagnosticResult.learnerType}
              </p>
            </div>
            <div className="text-center p-3 bg-secondary rounded">
              <p className="text-xs text-muted-foreground">Duración Rutina</p>
              <p className="text-sm font-bold mt-1">60-75 min</p>
            </div>
            <div className="text-center p-3 bg-secondary rounded">
              <p className="text-xs text-muted-foreground">Frecuencia</p>
              <p className="text-sm font-bold mt-1">5-6 días</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan de Hoy */}
      {todayPlan && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="size-4" />
              Hoy: {todayPlan.day}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 bg-blue-500/10 border border-blue-500 rounded-lg">
              <p className="text-sm font-semibold mb-1">Enfoque del Día</p>
              <p className="text-sm text-muted-foreground">{todayPlan.focus}</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold">Actividades</p>
              {todayPlan.activities.map((activity, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-secondary/50 rounded">
                  <div className="mt-1 size-2 rounded-full bg-primary flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {activity.duration} min • {activity.description}
                    </p>
                    {(activity.targetAccuracy || activity.targetLevel) && (
                      <p className="text-xs text-primary mt-1">
                        {activity.targetAccuracy && `Objetivo: ${activity.targetAccuracy}% accuracy`}
                        {activity.targetLevel && `Objetivo: Nivel ${activity.targetLevel}`}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-secondary/50 rounded">
              <p className="text-xs font-semibold text-muted-foreground">
                Duración Total: {todayPlan.totalDuration} minutos
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Objetivos Mensuales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="size-5 text-green-600" />
            Objetivos Mensuales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {plan.monthlyGoals.map((goal, idx) => (
              <div
                key={idx}
                className="p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg"
              >
                <p className="text-sm font-semibold mb-2">{goal.metric}</p>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-bold text-green-600">{goal.current}</span>
                  <TrendingUp className="size-4 text-green-600" />
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  Meta: <span className="font-semibold text-foreground">{goal.target}</span>
                </p>
                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-600 transition-all"
                    style={{
                      width: `${Math.min(100, (goal.current / goal.target) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Plan Semanal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="size-5 text-blue-600" />
            Plan Semanal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {plan.weeklyPlan.map((dayPlan, idx) => (
              <div
                key={idx}
                className="p-4 border rounded-lg hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm">{dayPlan.day}</h3>
                  <span className="text-xs text-muted-foreground">
                    {dayPlan.totalDuration}m
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{dayPlan.focus}</p>
                <div className="space-y-1">
                  {dayPlan.activities.map((activity, aIdx) => (
                    <p key={aIdx} className="text-xs text-muted-foreground">
                      • {activity.name} ({activity.duration}m)
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Triggers de Ajuste */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ajustes Automáticos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Tu plan se adaptará automáticamente basado en tu progreso:
          </p>
          <div className="space-y-2">
            {plan.adjustmentTriggers.map((trigger, idx) => (
              <div key={idx} className="flex gap-2 p-3 bg-secondary/50 rounded">
                <span className="text-primary font-bold flex-shrink-0">→</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{trigger.condition}</p>
                  <p className="text-xs text-muted-foreground">{trigger.adjustment}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
