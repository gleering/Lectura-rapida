/**
 * Sistema de Planes Personalizados Adaptativos
 * Genera rutinas diarias basadas en diagnóstico del usuario
 */

import type { DiagnosticResult } from "./diagnostic-test";

export interface TrainingActivity {
  name: string;
  type: "reading" | "schulte" | "nback" | "comprehension" | "rest";
  duration: number; // minutos
  description: string;
  targetLevel?: number;
  targetAccuracy?: number;
  notes?: string;
}

export interface PersonalizedPlan {
  userId?: string;
  diagnosticResult: DiagnosticResult;
  weeklyPlan: {
    day: string;
    activities: TrainingActivity[];
    totalDuration: number;
    focus: string;
  }[];
  dailyRoutine: TrainingActivity[]; // Rutina estándar del día
  adjustmentTriggers: {
    condition: string;
    adjustment: string;
  }[];
  monthlyGoals: {
    metric: string;
    current: number;
    target: number;
    targetDate: string;
  }[];
  createdAt: number;
  version: number;
}

/**
 * Genera un plan personalizado basado en el diagnóstico
 */
export function generatePersonalizedPlan(diagnostic: DiagnosticResult): PersonalizedPlan {
  const weeklyPlan = generateWeeklyPlan(diagnostic);
  const dailyRoutine = generateDailyRoutine(diagnostic);
  const adjustmentTriggers = generateAdjustmentTriggers(diagnostic);
  const monthlyGoals = generateMonthlyGoals(diagnostic);

  return {
    diagnosticResult: diagnostic,
    weeklyPlan,
    dailyRoutine,
    adjustmentTriggers,
    monthlyGoals,
    createdAt: Date.now(),
    version: 1,
  };
}

/**
 * Genera plan semanal personalizado
 */
function generateWeeklyPlan(
  diagnostic: DiagnosticResult
): PersonalizedPlan["weeklyPlan"] {
  const baseIntensity = calculateBaseIntensity(diagnostic);

  return [
    {
      day: "Lunes",
      focus: "Lectura + Comprensión",
      activities: [
        {
          name: "Lectura",
          type: "reading",
          duration: 40,
          description: "Lee con RSVP, objetivo: 500 palabras",
        },
        {
          name: "Tests de Comprensión",
          type: "comprehension",
          duration: 10,
          description: "2-3 tests de comprensión",
          targetAccuracy: 80,
        },
        {
          name: "Descanso",
          type: "rest",
          duration: 5,
          description: "Estira y respira",
        },
        {
          name: "Tabla de Schulte",
          type: "schulte",
          duration: 10,
          description: "Entrena visión periférica",
          targetLevel: Math.ceil(diagnostic.peripheralVision / 20),
        },
      ],
      totalDuration: 65,
    },
    {
      day: "Martes",
      focus: "Memoria + Velocidad",
      activities: [
        {
          name: "N-Back Test",
          type: "nback",
          duration: 10,
          description: "Entrena memoria de trabajo",
          targetLevel: Math.ceil(diagnostic.workingMemory / 33),
          targetAccuracy: 75,
        },
        {
          name: "Lectura Rápida",
          type: "reading",
          duration: 35,
          description: "Enfócate en velocidad, comprensión secundaria",
        },
        {
          name: "Descanso",
          type: "rest",
          duration: 5,
          description: "Estira y respira",
        },
        {
          name: "Tabla de Schulte",
          type: "schulte",
          duration: 10,
          description: "Expande visión periférica",
        },
      ],
      totalDuration: 60,
    },
    {
      day: "Miércoles",
      focus: "Día de Descanso Activo",
      activities: [
        {
          name: "Lectura Ligera",
          type: "reading",
          duration: 30,
          description: "Lee algo que disfrutes",
        },
        {
          name: "Tabla de Schulte",
          type: "schulte",
          duration: 15,
          description: "Sesión relajada",
        },
      ],
      totalDuration: 45,
    },
    {
      day: "Jueves",
      focus: "Enfoque Balanceado",
      activities: [
        {
          name: "Lectura",
          type: "reading",
          duration: 40,
          description: "Velocidad normal",
        },
        {
          name: "Tests de Comprensión",
          type: "comprehension",
          duration: 10,
          description: "Evalúa retención",
          targetAccuracy: 80,
        },
        {
          name: "Descanso",
          type: "rest",
          duration: 5,
          description: "Estira",
        },
        {
          name: "N-Back Test",
          type: "nback",
          duration: 10,
          description: "Memoria de trabajo",
        },
      ],
      totalDuration: 65,
    },
    {
      day: "Viernes",
      focus: "Prueba de Progreso",
      activities: [
        {
          name: "Lectura de Desafío",
          type: "reading",
          duration: 50,
          description: "Texto más difícil, mide velocidad y comprensión",
        },
        {
          name: "Tests Exhaustivos",
          type: "comprehension",
          duration: 15,
          description: "3-4 preguntas difíciles",
        },
      ],
      totalDuration: 65,
    },
    {
      day: "Sábado",
      focus: "Entrenamiento Intenso",
      activities: [
        {
          name: "Lectura Larga",
          type: "reading",
          duration: 60,
          description: "Libro completo o capítulo largo",
        },
        {
          name: "Schulte Intenso",
          type: "schulte",
          duration: 20,
          description: "2-3 niveles nuevos",
        },
      ],
      totalDuration: 80,
    },
    {
      day: "Domingo",
      focus: "Descanso Completo",
      activities: [
        {
          name: "Lectura Recreativa",
          type: "reading",
          duration: 30,
          description: "Lee algo que ames, sin presión",
        },
      ],
      totalDuration: 30,
    },
  ];
}

/**
 * Genera rutina diaria estándar
 */
function generateDailyRoutine(diagnostic: DiagnosticResult): TrainingActivity[] {
  return [
    {
      name: "Calentamiento (Lectura)",
      type: "reading",
      duration: 15,
      description: "Comienza con algo fácil",
    },
    {
      name: "Lectura Principal",
      type: "reading",
      duration: 30,
      description: "Contenido del día",
    },
    {
      name: "Test de Comprensión",
      type: "comprehension",
      duration: 5,
      description: "Verifica entendimiento",
    },
    {
      name: "Descanso",
      type: "rest",
      duration: 5,
      description: "Pausa mental",
    },
    {
      name: "Tabla de Schulte",
      type: "schulte",
      duration: 10,
      description: "Entrena visión periférica",
    },
    {
      name: "N-Back o Extensión",
      type: "nback",
      duration: 10,
      description: "Última actividad cognitiva",
    },
  ];
}

/**
 * Genera triggers para ajustar el plan automáticamente
 */
function generateAdjustmentTriggers(diagnostic: DiagnosticResult) {
  return [
    {
      condition: "Velocidad +20%",
      adjustment: "Aumenta dificultad en tests de comprensión",
    },
    {
      condition: "Comprensión <60%",
      adjustment: "Reduce velocidad de lectura, aumenta tests de comprensión",
    },
    {
      condition: "N-Back Level +1",
      adjustment: "Aumenta complejidad en comprensión",
    },
    {
      condition: "Schulte Level +1",
      adjustment: "Aumenta velocidad objetivo de lectura",
    },
    {
      condition: "3+ días consecutivos >80% accuracy",
      adjustment: "Sube al siguiente nivel de dificultad",
    },
    {
      condition: "Streak roto",
      adjustment: "Reduce intensidad, regresa a nivel anterior",
    },
  ];
}

/**
 * Genera objetivos mensuales personalizados
 */
function generateMonthlyGoals(diagnostic: DiagnosticResult) {
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  return [
    {
      metric: "Velocidad de Lectura",
      current: diagnostic.readingSpeed,
      target: Math.round(diagnostic.readingSpeed * 1.3), // +30%
      targetDate: nextMonth.toISOString().split("T")[0],
    },
    {
      metric: "Comprensión",
      current: diagnostic.comprehension,
      target: Math.min(95, diagnostic.comprehension + 20),
      targetDate: nextMonth.toISOString().split("T")[0],
    },
    {
      metric: "Visión Periférica (Schulte)",
      current: diagnostic.peripheralVision,
      target: Math.min(100, diagnostic.peripheralVision + 30),
      targetDate: nextMonth.toISOString().split("T")[0],
    },
    {
      metric: "Memoria de Trabajo (N-Back)",
      current: diagnostic.workingMemory,
      target: Math.min(100, diagnostic.workingMemory + 25),
      targetDate: nextMonth.toISOString().split("T")[0],
    },
  ];
}

/**
 * Calcula intensidad base según diagnóstico
 */
function calculateBaseIntensity(diagnostic: DiagnosticResult): "light" | "moderate" | "intense" {
  const avgScore =
    (diagnostic.readingSpeed / 800 +
      diagnostic.comprehension / 100 +
      diagnostic.focusLevel / 100) /
    3;

  if (avgScore > 0.75) return "intense";
  if (avgScore > 0.5) return "moderate";
  return "light";
}

/**
 * Adapta el plan basado en progreso actual
 */
export function adaptPlan(
  currentPlan: PersonalizedPlan,
  progressData: {
    avgSpeed?: number;
    avgAccuracy?: number;
    currentSchulteLevel?: number;
    currentNBackLevel?: number;
  }
): PersonalizedPlan {
  const adapted = { ...currentPlan, version: currentPlan.version + 1 };

  // Si el usuario está progresando bien, aumenta intensidad
  if (progressData.avgAccuracy && progressData.avgAccuracy > 0.8) {
    adapted.dailyRoutine = adapted.dailyRoutine.map((a) => ({
      ...a,
      duration: Math.ceil(a.duration * 1.1),
    }));
  }

  // Si va lento, reduce intensidad
  if (progressData.avgAccuracy && progressData.avgAccuracy < 0.5) {
    adapted.dailyRoutine = adapted.dailyRoutine.map((a) => ({
      ...a,
      duration: Math.ceil(a.duration * 0.9),
    }));
  }

  return adapted;
}
