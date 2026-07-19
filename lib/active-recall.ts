/**
 * Active Recall — Recuperación activa con IA (Google Gemini).
 *
 * Fundamento científico:
 * - Testing effect (Roediger & Karpicke 2006): recuperar información de la memoria
 *   la fortalece mucho más que releerla. Genera hasta ~50% más retención a largo plazo.
 * - Self-explanation effect / técnica Feynman (Chi et al. 1994): explicar un concepto
 *   con palabras propias revela los huecos de comprensión que el multiple-choice oculta.
 *
 * Este módulo:
 *  1) extrae conceptos clave de un libro y los convierte en preguntas de recuperación,
 *  2) evalúa la explicación libre del usuario detectando el hueco concreto.
 */

async function callGemini(prompt: string): Promise<string | null> {
  try {
    const res = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { text?: string | null };
    return data.text ?? null;
  } catch {
    return null;
  }
}

/** Extrae el primer bloque JSON de una respuesta de texto. */
function extractJson<T>(text: string): T | null {
  const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}

export interface ExtractedConcept {
  concept: string;
  prompt: string;
  answer: string;
  source?: string;
}

/**
 * Extrae 5-8 conceptos clave del texto y genera, por cada uno, una pregunta abierta
 * de recuperación y una respuesta de referencia.
 */
export async function extractReviewConcepts(
  bookTitle: string,
  text: string
): Promise<ExtractedConcept[] | null> {
  const words = text.split(/\s+/).slice(0, 8000).join(" ");

  const prompt = `Eres un experto en ciencia del aprendizaje. A partir del siguiente texto del libro "${bookTitle}", identifica entre 5 y 8 CONCEPTOS CLAVE que valga la pena recordar a largo plazo (ideas centrales, no detalles triviales).

Para cada concepto genera:
- "concept": título corto (2-6 palabras).
- "prompt": una pregunta ABIERTA de recuperación que obligue a explicar con palabras propias (no de opción múltiple, no de sí/no).
- "answer": la respuesta de referencia, clara y concisa (2-4 frases).
- "source": una frase textual breve del texto que respalde el concepto (si existe).

IMPORTANTE: responde SOLO con JSON válido, sin markdown ni texto adicional.

Texto:
${words}

Formato exacto:
[
  { "concept": "...", "prompt": "...", "answer": "...", "source": "..." }
]`;

  const raw = await callGemini(prompt);
  if (!raw) return null;

  const parsed = extractJson<ExtractedConcept[]>(raw);
  if (!parsed || !Array.isArray(parsed)) return null;

  return parsed
    .filter((c) => c && c.concept && c.prompt && c.answer)
    .map((c) => ({
      concept: String(c.concept).slice(0, 120),
      prompt: String(c.prompt),
      answer: String(c.answer),
      source: c.source ? String(c.source) : undefined,
    }));
}

export interface RecallEvaluation {
  /** 0..100 — qué tan completa/correcta fue la explicación del usuario. */
  score: number;
  /** El hueco concreto de comprensión detectado (vacío si no hay). */
  gap: string;
  /** Feedback breve y accionable, en segunda persona. */
  feedback: string;
  /** Autorating sugerido para la programación SM-2. */
  suggestedRating: "again" | "hard" | "good" | "easy";
}

/**
 * Evalúa la explicación LIBRE del usuario frente a la respuesta de referencia.
 * Aplica la lógica Feynman: detecta el hueco específico, no solo correcto/incorrecto.
 */
export async function evaluateRecall(
  questionPrompt: string,
  referenceAnswer: string,
  userExplanation: string
): Promise<RecallEvaluation | null> {
  const prompt = `Eres un tutor experto que evalúa la comprensión mediante recuperación activa (técnica Feynman).

Pregunta: ${questionPrompt}
Respuesta de referencia: ${referenceAnswer}
Explicación del usuario: ${userExplanation}

Evalúa qué tan bien el usuario RECUPERÓ y COMPRENDIÓ el concepto (no penalices el estilo, sí la sustancia). Detecta el hueco concreto si lo hay.

IMPORTANTE: responde SOLO con JSON válido, sin markdown.

Formato exacto:
{
  "score": 0,
  "gap": "el hueco de comprensión concreto, o cadena vacía si no hay",
  "feedback": "1-2 frases accionables dirigidas al usuario (tú)",
  "suggestedRating": "again | hard | good | easy"
}

Guía de rating: again = no recordó / muy incompleto; hard = incompleto pero con la idea; good = correcto; easy = correcto y completo.`;

  const raw = await callGemini(prompt);
  if (!raw) return null;

  const parsed = extractJson<RecallEvaluation>(raw);
  if (!parsed) return null;

  const validRatings = ["again", "hard", "good", "easy"] as const;
  const rating = validRatings.includes(parsed.suggestedRating)
    ? parsed.suggestedRating
    : "good";

  return {
    score: Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0))),
    gap: parsed.gap ? String(parsed.gap) : "",
    feedback: parsed.feedback ? String(parsed.feedback) : "",
    suggestedRating: rating,
  };
}
