/**
 * Tablas de Schulte - Clásico ejercicio ruso para expandir visión periférica
 * Usado por lectores rápidos para entrenar la capacidad de fijar la vista en el centro
 * mientras se detectan números distribuidos aleatoriamente.
 */

export interface SchulteScore {
  level: number; // 1-5 (5x5, 6x6, 7x7, 8x8, 9x9)
  completionTime: number; // ms
  accuracy: number; // 0-1
  timestamp: number;
}

export interface SchulteTableState {
  level: number;
  grid: number[][];
  clickedNumbers: Set<number>;
  nextNumber: number;
  startTime: number;
  endTime: number | null;
}

/**
 * Crea una tabla de Schulte con números aleatorios
 * Nivel 1: 5x5 (25 números)
 * Nivel 5: 9x9 (81 números)
 */
export function generateSchulteTable(level: number): SchulteTableState {
  const sizes = [5, 6, 7, 8, 9];
  const size = sizes[Math.min(level - 1, 4)];
  const totalNumbers = size * size;

  // Crear array de números y shufflear
  const numbers = Array.from({ length: totalNumbers }, (_, i) => i + 1);
  shuffleArray(numbers);

  // Crear grid
  const grid: number[][] = [];
  let index = 0;
  for (let i = 0; i < size; i++) {
    const row: number[] = [];
    for (let j = 0; j < size; j++) {
      row.push(numbers[index++]);
    }
    grid.push(row);
  }

  return {
    level,
    grid,
    clickedNumbers: new Set(),
    nextNumber: 1,
    startTime: Date.now(),
    endTime: null,
  };
}

/**
 * Registra un click en la tabla
 * Retorna si el número fue correcto
 */
export function checkNumber(
  state: SchulteTableState,
  row: number,
  col: number
): {
  correct: boolean;
  nextNumber: number;
  completed: boolean;
} {
  const number = state.grid[row][col];
  const correct = number === state.nextNumber;

  if (correct) {
    state.clickedNumbers.add(number);
    const totalNumbers = state.grid.length * state.grid[0].length;
    const completed = state.clickedNumbers.size === totalNumbers;

    if (completed) {
      state.endTime = Date.now();
    }

    return {
      correct: true,
      nextNumber: state.nextNumber + 1,
      completed,
    };
  }

  return {
    correct: false,
    nextNumber: state.nextNumber,
    completed: false,
  };
}

/**
 * Calcula el score de la tabla
 */
export function calculateSchulteScore(state: SchulteTableState): SchulteScore {
  if (!state.endTime) {
    throw new Error("Table not completed");
  }

  const completionTime = state.endTime - state.startTime;
  const totalNumbers = state.grid.length * state.grid[0].length;
  const accuracy = state.clickedNumbers.size / totalNumbers;

  return {
    level: state.level,
    completionTime,
    accuracy,
    timestamp: Date.now(),
  };
}

/**
 * Determina el siguiente nivel basado en desempeño
 * - Si completó en <30s y accuracy=1: siguiente nivel
 * - Si completó en >60s o accuracy<0.8: mismo nivel
 * - Sino: intenta próximo nivel
 */
export function adaptLevel(score: SchulteScore): number {
  if (score.accuracy === 1 && score.completionTime < 30000) {
    return Math.min(score.level + 1, 5); // Max level 5
  }
  if (score.completionTime > 60000 || score.accuracy < 0.8) {
    return Math.max(score.level - 1, 1); // Min level 1
  }
  return score.level;
}

/**
 * Calcula progreso general de Schulte
 */
export function calculateSchulteProgress(scores: SchulteScore[]): {
  avgCompletionTime: number;
  avgAccuracy: number;
  maxLevel: number;
  totalSessions: number;
} {
  if (scores.length === 0) {
    return {
      avgCompletionTime: 0,
      avgAccuracy: 0,
      maxLevel: 1,
      totalSessions: 0,
    };
  }

  const avgCompletionTime =
    scores.reduce((sum, s) => sum + s.completionTime, 0) / scores.length;
  const avgAccuracy =
    scores.reduce((sum, s) => sum + s.accuracy, 0) / scores.length;
  const maxLevel = Math.max(...scores.map((s) => s.level));

  return {
    avgCompletionTime: Math.round(avgCompletionTime),
    avgAccuracy: Math.round(avgAccuracy * 100),
    maxLevel,
    totalSessions: scores.length,
  };
}

// Helper function
function shuffleArray<T>(array: T[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}
