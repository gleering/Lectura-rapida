/**
 * Test de Diagnóstico Inicial
 * Identifica fortalezas, debilidades y tipo de lector del usuario
 */

export type LearnerType = "visual" | "auditory" | "kinesthetic" | "reading-writing";
export type ReaderProfile = "slow-careful" | "fast-skimmer" | "balanced" | "speed-focused";

export interface DiagnosticResult {
  readingSpeed: number; // WPM
  comprehension: number; // 0-100
  focusLevel: number; // 0-100, how well they stay focused
  peripheralVision: number; // 0-100, detected from Schulte performance
  workingMemory: number; // 0-100, detected from N-Back
  learnerType: LearnerType;
  readerProfile: ReaderProfile;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  createdAt: number;
}

export interface DiagnosticQuestions {
  readingHabits: number; // 1-5 scale
  concentration: number; // 1-5
  visualFocus: number; // 1-5
  memoryRetention: number; // 1-5
  learningPreference: LearnerType;
}

/**
 * Test diagnostico inicial del usuario
 * Toma ~5 minutos
 */
export function runDiagnosticTest(
  answers: DiagnosticQuestions,
  historicalData?: {
    avgSpeed?: number;
    avgComprehension?: number;
    schulteMaxLevel?: number;
    nbackMaxLevel?: number;
  }
): DiagnosticResult {
  // Calcular velocidad base (estimada)
  const estimatedBaseSpeed = 200 + answers.readingHabits * 100; // 300-700 WPM

  // Calcular comprensión base
  const estimatedComprehension = 50 + answers.concentration * 10; // 60-100%

  // Calcular nivel de enfoque
  const focusLevel = (answers.concentration / 5) * 100;

  // Estimar visión periférica basada en Schulte (si disponible)
  const peripheralVision = historicalData?.schulteMaxLevel
    ? (historicalData.schulteMaxLevel / 5) * 100
    : (answers.visualFocus / 5) * 100;

  // Estimar memoria de trabajo basada en N-Back (si disponible)
  const workingMemory = historicalData?.nbackMaxLevel
    ? (historicalData.nbackMaxLevel / 3) * 100
    : (answers.memoryRetention / 5) * 100;

  // Determinar perfil de lector
  const readerProfile = determineReaderProfile(
    estimatedBaseSpeed,
    estimatedComprehension,
    focusLevel
  );

  // Identificar fortalezas y debilidades
  const { strengths, weaknesses } = identifyStrengthsWeaknesses({
    readingSpeed: estimatedBaseSpeed,
    comprehension: estimatedComprehension,
    focusLevel,
    peripheralVision,
    workingMemory,
  });

  // Generar recomendaciones personalizadas
  const recommendations = generateRecommendations(
    readerProfile,
    weaknesses,
    answers.learningPreference
  );

  return {
    readingSpeed: Math.round(estimatedBaseSpeed),
    comprehension: Math.round(estimatedComprehension),
    focusLevel: Math.round(focusLevel),
    peripheralVision: Math.round(peripheralVision),
    workingMemory: Math.round(workingMemory),
    learnerType: answers.learningPreference,
    readerProfile,
    strengths,
    weaknesses,
    recommendations,
    createdAt: Date.now(),
  };
}

function determineReaderProfile(
  speed: number,
  comprehension: number,
  focus: number
): ReaderProfile {
  const speedNorm = speed / 600; // Normalizar a 600 WPM
  const compNorm = comprehension / 100;

  if (speedNorm > 1.2 && compNorm > 0.7) return "speed-focused"; // Rápido y entiende
  if (speedNorm > 1.5 && compNorm < 0.6) return "fast-skimmer"; // Muy rápido, comprende poco
  if (speedNorm < 0.8 && compNorm > 0.8) return "slow-careful"; // Lento pero entiende bien
  return "balanced"; // Equilibrado
}

function identifyStrengthsWeaknesses(metrics: {
  readingSpeed: number;
  comprehension: number;
  focusLevel: number;
  peripheralVision: number;
  workingMemory: number;
}): { strengths: string[]; weaknesses: string[] } {
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (metrics.readingSpeed > 500) strengths.push("Velocidad de lectura natural");
  else if (metrics.readingSpeed < 300) weaknesses.push("Velocidad de lectura lenta");

  if (metrics.comprehension > 80) strengths.push("Comprensión excelente");
  else if (metrics.comprehension < 60) weaknesses.push("Comprensión deficiente");

  if (metrics.focusLevel > 80) strengths.push("Excelente concentración");
  else if (metrics.focusLevel < 50) weaknesses.push("Dificultad de concentración");

  if (metrics.peripheralVision > 70) strengths.push("Visión periférica desarrollada");
  else if (metrics.peripheralVision < 40) weaknesses.push("Visión periférica limitada");

  if (metrics.workingMemory > 70) strengths.push("Memoria de trabajo fuerte");
  else if (metrics.workingMemory < 40) weaknesses.push("Memoria de trabajo débil");

  return { strengths, weaknesses };
}

function generateRecommendations(
  profile: ReaderProfile,
  weaknesses: string[],
  learnerType: LearnerType
): string[] {
  const recommendations: string[] = [];

  // Recomendaciones por perfil
  if (profile === "speed-focused") {
    recommendations.push(
      "Manén tu velocidad actual, enfócate en mantener comprensión"
    );
  } else if (profile === "fast-skimmer") {
    recommendations.push("Reduce velocidad para mejorar comprensión");
    recommendations.push("Practica tests de comprensión después de cada lectura");
  } else if (profile === "slow-careful") {
    recommendations.push("Usa Tabla de Schulte para expandir visión periférica");
    recommendations.push("Aumenta gradualmente tu velocidad sin sacrificar comprensión");
  } else {
    recommendations.push("Mantén tu estilo equilibrado");
    recommendations.push("Elige un área para mejorar: velocidad o comprensión");
  }

  // Recomendaciones por debilidades
  if (
    weaknesses.includes("Visión periférica limitada") ||
    weaknesses.includes("Velocidad de lectura lenta")
  ) {
    recommendations.push("Practica Tabla de Schulte 15 min/día");
  }

  if (weaknesses.includes("Memoria de trabajo débil")) {
    recommendations.push("Practica N-Back Test 10 min/día");
  }

  if (
    weaknesses.includes("Dificultad de concentración") ||
    weaknesses.includes("Comprensión deficiente")
  ) {
    recommendations.push("Realiza tests de comprensión cada 500 palabras");
    recommendations.push("Toma descansos de 5 min cada 30 min de lectura");
  }

  // Recomendaciones por tipo de aprendizaje
  if (learnerType === "auditory") {
    recommendations.push("Considera leer en voz alta o usar text-to-speech");
  } else if (learnerType === "kinesthetic") {
    recommendations.push("Toma notas mientras lees para mejor retención");
  }

  return recommendations;
}

/**
 * Calcula similitud entre diagnósticos para tracking de progreso
 */
export function compareDiagnostics(
  before: DiagnosticResult,
  after: DiagnosticResult
): {
  speedImprovement: number; // % change
  comprehensionImprovement: number;
  focusImprovement: number;
  peripheralVisionImprovement: number;
  workingMemoryImprovement: number;
  overallProgress: number;
} {
  const speedChange = ((after.readingSpeed - before.readingSpeed) / before.readingSpeed) * 100;
  const compChange =
    ((after.comprehension - before.comprehension) / before.comprehension) * 100;
  const focusChange = ((after.focusLevel - before.focusLevel) / before.focusLevel) * 100;
  const pvChange =
    ((after.peripheralVision - before.peripheralVision) / before.peripheralVision) * 100;
  const wmChange = ((after.workingMemory - before.workingMemory) / before.workingMemory) * 100;

  const overall = (speedChange + compChange + focusChange + pvChange + wmChange) / 5;

  return {
    speedImprovement: Math.round(speedChange * 10) / 10,
    comprehensionImprovement: Math.round(compChange * 10) / 10,
    focusImprovement: Math.round(focusChange * 10) / 10,
    peripheralVisionImprovement: Math.round(pvChange * 10) / 10,
    workingMemoryImprovement: Math.round(wmChange * 10) / 10,
    overallProgress: Math.round(overall * 10) / 10,
  };
}
