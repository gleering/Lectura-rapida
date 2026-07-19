/**
 * Servicio de Comprensión Mejorado con IA
 * Genera preguntas inteligentes y evalúa la retención
 */

export interface ComprehensionTest {
  question: string;
  options: string[];
  correctIndex: number;
  type: "multiple-choice" | "true-false" | "detail";
  difficulty: 1 | 2 | 3; // 1=fácil, 2=medio, 3=difícil
}

export interface ComprehensionScore {
  questionId: string;
  correct: boolean;
  timeToAnswer: number;
  difficulty: number;
  timestamp: number;
}

export async function generateComprehensionQuestion(
  text: string,
  difficulty: 1 | 2 | 3 = 2
): Promise<ComprehensionTest | null> {
  // Limitar el texto
  const words = text.split(/\s+/).slice(0, 1000);
  const limitedText = words.join(" ");

  const difficultyGuide = {
    1: "muy fácil y directa, sobre hechos explícitos",
    2: "moderadamente difícil, requiere inferencia",
    3: "muy difícil, requiere análisis profundo",
  };

  const prompt = `Eres un experto en evaluación de comprensión lectora. Basándote en este texto, genera UNA pregunta de opción múltiple que sea ${difficultyGuide[difficulty]}.

IMPORTANTE: Responde SOLO en JSON, sin texto adicional.

Texto:
${limitedText}

Formato JSON exacto (sin markdown):
{
  "question": "La pregunta aquí",
  "options": ["Opción A", "Opción B", "Opción C"],
  "correctIndex": 0,
  "type": "multiple-choice"
}

Nota: correctIndex debe ser 0, 1 o 2`;

  try {
    const response = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) return null;
    const data = (await response.json()) as { text?: string | null };
    const textResponse = data.text;

    if (!textResponse) return null;

    // Extraer JSON de la respuesta
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]) as {
      question?: string;
      options?: string[];
      correctIndex?: number;
      type?: string;
    };
    return {
      question: parsed.question || "Pregunta no disponible",
      options: parsed.options || [],
      correctIndex: parsed.correctIndex ?? 0,
      type: "multiple-choice",
      difficulty,
    };
  } catch (error) {
    console.error("Error generando pregunta:", error);
    return null;
  }
}

/**
 * Calcula score de retención basado en:
 * - Respuestas correctas
 * - Tiempo de respuesta
 * - Dificultad de la pregunta
 */
export function calculateRetentionScore(scores: ComprehensionScore[]): {
  accuracy: number;
  avgTime: number;
  difficultyBonus: number;
  retentionIndex: number;
} {
  if (scores.length === 0) {
    return { accuracy: 0, avgTime: 0, difficultyBonus: 0, retentionIndex: 0 };
  }

  const accuracy =
    (scores.filter((s) => s.correct).length / scores.length) * 100;
  const avgTime = scores.reduce((sum, s) => sum + s.timeToAnswer, 0) / scores.length;
  const difficultyBonus = (
    scores.reduce((sum, s) => sum + s.difficulty, 0) / scores.length
  );

  // Índice de retención: combina exactitud, velocidad y dificultad
  const retentionIndex =
    accuracy * 0.6 + (1 - Math.min(avgTime / 30, 1)) * 30 + difficultyBonus * 10;

  return {
    accuracy: Math.round(accuracy),
    avgTime: Math.round(avgTime),
    difficultyBonus: Math.round(difficultyBonus * 10) / 10,
    retentionIndex: Math.round(retentionIndex),
  };
}

/**
 * Determina la dificultad de la siguiente pregunta basada en desempeño
 */
export function adaptDifficulty(scores: ComprehensionScore[]): 1 | 2 | 3 {
  if (scores.length < 2) return 2; // Comienza con dificultad media

  const recent = scores.slice(-3);
  const correctRate = recent.filter((s) => s.correct).length / recent.length;

  if (correctRate >= 0.8) return 3; // Muy bien, aumenta dificultad
  if (correctRate <= 0.4) return 1; // Mal, reduce dificultad
  return 2; // En el medio, mantén igual
}
