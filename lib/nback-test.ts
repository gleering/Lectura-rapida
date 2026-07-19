/**
 * N-Back Test - Ejercicio científico para entrenamiento de memoria de trabajo
 * Comprobado mejorar velocidad de lectura y comprensión
 */

export interface NBackScore {
  level: number; // 1-back, 2-back, 3-back
  accuracy: number; // 0-1
  responseTime: number; // ms promedio
  totalTrials: number;
  correctResponses: number;
  timestamp: number;
}

export interface NBackTrial {
  stimulus: string; // letra o número
  isMatch: boolean; // si coincide con n-posiciones atrás
  userResponse: boolean | null;
  responseTime: number | null;
}

export interface NBackGameState {
  level: number; // 1, 2 o 3
  trials: NBackTrial[];
  currentTrialIndex: number;
  sequence: string[];
  startTime: number;
  endTime: number | null;
}

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const TRIAL_DURATION = 2000; // 2 segundos por stimulus

/**
 * Genera una secuencia con N-back matches
 */
export function generateNBackSequence(
  level: number,
  length: number = 20
): NBackGameState {
  const sequence: string[] = [];
  const trials: NBackTrial[] = [];

  // Generar secuencia inicial aleatoria
  for (let i = 0; i < level; i++) {
    sequence.push(LETTERS[Math.floor(Math.random() * LETTERS.length)]);
  }

  // Generar resto de la secuencia
  for (let i = level; i < length; i++) {
    let stimulus: string;
    const isMatch = Math.random() < 0.3; // 30% chance de match

    if (isMatch && i >= level) {
      stimulus = sequence[i - level];
    } else {
      stimulus = LETTERS[Math.floor(Math.random() * LETTERS.length)];
    }

    sequence.push(stimulus);
  }

  // Crear trials
  for (let i = 0; i < sequence.length; i++) {
    trials.push({
      stimulus: sequence[i],
      isMatch: i >= level && sequence[i] === sequence[i - level],
      userResponse: null,
      responseTime: null,
    });
  }

  return {
    level,
    trials,
    currentTrialIndex: 0,
    sequence,
    startTime: Date.now(),
    endTime: null,
  };
}

/**
 * Registra la respuesta del usuario
 */
export function recordResponse(
  state: NBackGameState,
  isMatch: boolean,
  responseTimeMs: number
): void {
  const trial = state.trials[state.currentTrialIndex];
  trial.userResponse = isMatch;
  trial.responseTime = responseTimeMs;

  state.currentTrialIndex++;

  if (state.currentTrialIndex >= state.trials.length) {
    state.endTime = Date.now();
  }
}

/**
 * Calcula el score del N-Back
 */
export function calculateNBackScore(state: NBackGameState): NBackScore {
  let correctResponses = 0;
  let totalResponseTime = 0;
  let responsesWithTime = 0;

  for (const trial of state.trials) {
    if (trial.userResponse === null) continue;

    const isCorrect = trial.userResponse === trial.isMatch;
    if (isCorrect) correctResponses++;

    if (trial.responseTime !== null) {
      totalResponseTime += trial.responseTime;
      responsesWithTime++;
    }
  }

  const accuracy = correctResponses / state.trials.length;
  const responseTime = responsesWithTime > 0 ? totalResponseTime / responsesWithTime : 0;

  return {
    level: state.level,
    accuracy,
    responseTime: Math.round(responseTime),
    totalTrials: state.trials.length,
    correctResponses,
    timestamp: Date.now(),
  };
}

/**
 * Determina el siguiente nivel
 */
export function adaptNBackLevel(score: NBackScore): number {
  if (score.accuracy >= 0.85 && score.responseTime < 1000) {
    return Math.min(score.level + 1, 3); // Max 3-back
  }
  if (score.accuracy <= 0.5) {
    return Math.max(score.level - 1, 1); // Min 1-back
  }
  return score.level;
}

/**
 * Calcula progreso general
 */
export function calculateNBackProgress(scores: NBackScore[]): {
  avgAccuracy: number;
  avgResponseTime: number;
  maxLevel: number;
  totalSessions: number;
} {
  if (scores.length === 0) {
    return {
      avgAccuracy: 0,
      avgResponseTime: 0,
      maxLevel: 1,
      totalSessions: 0,
    };
  }

  const avgAccuracy =
    (scores.reduce((sum, s) => sum + s.accuracy, 0) / scores.length) * 100;
  const avgResponseTime = Math.round(
    scores.reduce((sum, s) => sum + s.responseTime, 0) / scores.length
  );
  const maxLevel = Math.max(...scores.map((s) => s.level));

  return {
    avgAccuracy: Math.round(avgAccuracy),
    avgResponseTime,
    maxLevel,
    totalSessions: scores.length,
  };
}
