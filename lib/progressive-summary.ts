/**
 * Resúmenes progresivos con IA (Google Gemini).
 *
 * Fundamento científico:
 * - Resumen progresivo (Tiago Forte; tradición Zettelkasten): condensar en capas sucesivas
 *   obliga a destilar la esencia. Cada capa es una reelaboración activa, no una copia pasiva,
 *   lo que mejora la codificación (elaboración; Craik & Lockhart 1972).
 * - Capa 1: resumen IA. Capa 2: puntos clave (el usuario los edita). Capa 3: síntesis con
 *   palabras propias del usuario (máxima elaboración).
 */

import { generateSummary } from "./ai-service";

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

function extractJson<T>(text: string): T | null {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}

/** Capa 1 — resumen IA (reutiliza el servicio existente). */
export async function generateAISummary(text: string): Promise<string | null> {
  return generateSummary(text);
}

/** Capa 2 (semilla) — extrae 5-8 puntos clave que el usuario luego edita. */
export async function extractKeyPoints(
  text: string
): Promise<string[] | null> {
  const words = text.split(/\s+/).slice(0, 8000).join(" ");

  const prompt = `Extrae los 5-8 PUNTOS CLAVE más importantes del siguiente texto. Cada punto: una frase corta y accionable (no una copia literal, sino la idea destilada).

IMPORTANTE: responde SOLO con un array JSON de strings, sin markdown.

Texto:
${words}

Formato exacto:
["Punto clave 1", "Punto clave 2"]`;

  const raw = await callGemini(prompt);
  if (!raw) return null;

  const parsed = extractJson<string[]>(raw);
  if (!parsed || !Array.isArray(parsed)) return null;

  return parsed
    .filter((p) => typeof p === "string" && p.trim())
    .map((p) => p.trim())
    .slice(0, 8);
}

/** Concepto de repaso derivado de un punto clave del resumen progresivo. */
export interface KeyPointConcept {
  concept: string;
  prompt: string;
  answer: string;
}

const MAX_POINTS_TO_CARDS = 12;

/**
 * Convierte los puntos clave (Capa 2) en conceptos de repaso (recuerdo activo).
 * Una sola llamada por lote: para cada punto genera un título corto, una pregunta
 * de recuerdo abierto y una respuesta de referencia.
 *
 * Puente destilación → recuperación: destilar en puntos clave es elaboración
 * (Craik & Lockhart); recuperarlos de memoria consolida (efecto de test,
 * Roediger & Karpicke).
 */
export async function keyPointsToReviewConcepts(
  bookTitle: string,
  points: string[]
): Promise<KeyPointConcept[] | null> {
  const selected = points
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, MAX_POINTS_TO_CARDS);
  if (selected.length === 0) return [];

  const list = selected.map((p, i) => `${i + 1}. ${p}`).join("\n");

  const prompt = `Eres un experto en aprendizaje. A partir de estos puntos clave del libro "${bookTitle}", crea una tarjeta de RECUERDO ACTIVO para cada uno.

Para cada punto:
- "concept": un título corto (2-6 palabras) que nombre la idea.
- "prompt": una pregunta de recuerdo abierto que obligue a explicar la idea de memoria (no de sí/no).
- "answer": una respuesta de referencia breve y correcta (2-4 frases) para autoevaluarse.

Puntos clave:
${list}

IMPORTANTE: responde SOLO con un array JSON válido, sin markdown. Un objeto por punto, en el mismo orden, con el campo "i" (número del punto).

Formato exacto:
[
  { "i": 1, "concept": "...", "prompt": "¿...?", "answer": "..." }
]`;

  const raw = await callGemini(prompt);
  if (!raw) return null;

  const parsed = extractJson<
    Array<{ i?: number; concept?: unknown; prompt?: unknown; answer?: unknown }>
  >(raw);
  if (!parsed || !Array.isArray(parsed)) return null;

  const concepts: KeyPointConcept[] = [];
  for (const item of parsed) {
    const idx = typeof item.i === "number" ? item.i - 1 : -1;
    const point = selected[idx];
    const conceptText =
      typeof item.concept === "string" ? item.concept.trim() : "";
    const promptText = typeof item.prompt === "string" ? item.prompt.trim() : "";
    const answerText = typeof item.answer === "string" ? item.answer.trim() : "";
    if (!point || !promptText || !answerText) continue;
    concepts.push({
      concept: conceptText || point.slice(0, 60),
      prompt: promptText,
      answer: answerText,
    });
  }

  return concepts;
}
