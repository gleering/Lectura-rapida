/**
 * Tutor IA de comprensión (Google Gemini).
 *
 * Fundamento científico:
 * - Técnica Feynman + self-explanation effect (Chi et al. 1994): explicar con palabras
 *   propias revela los huecos de comprensión; el tutor responde al hueco concreto.
 * - Método socrático: preguntar activa procesamiento profundo más que solo exponer.
 * - Zona de desarrollo próximo (Vygotsky): la explicación se calibra al nivel declarado.
 * - Doble codificación (Paivio): analogías/ejemplos concretos anclan lo abstracto.
 *
 * A diferencia del repaso (recuperar lo aprendido), el tutor busca la COMPRENSIÓN INICIAL:
 * reformula con ángulos nuevos hasta que exista entendimiento real.
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

function extractJson<T>(text: string): T | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}

export type TutorLevel = "principiante" | "intermedio" | "avanzado";

export type Comprehension = "unknown" | "partial" | "understood";

export interface TutorMessage {
  role: "user" | "tutor";
  content: string;
}

export interface TutorTurn {
  /** Explicación conversacional adaptada al nivel. */
  message: string;
  /** Analogía o ejemplo concreto (vacío si no aplica). */
  analogy: string;
  /** Una pregunta socrática de chequeo (vacío si ya comprendió). */
  checkQuestion: string;
  /** El hueco concreto detectado en el último mensaje del usuario (vacío si no hay). */
  detectedGap: string;
  /** Señal de comprensión inferida. */
  comprehension: Comprehension;
}

const LEVEL_GUIDE: Record<TutorLevel, string> = {
  principiante:
    "sin jerga; parte de cero, usa lenguaje cotidiano y ejemplos muy concretos",
  intermedio:
    "asume conocimientos básicos; puedes usar términos técnicos explicándolos",
  avanzado:
    "puedes profundizar, matizar y conectar con ideas más complejas",
};

function renderHistory(history: TutorMessage[]): string {
  if (history.length === 0) return "(aún no hay conversación)";
  return history
    .map((m) => `${m.role === "user" ? "Usuario" : "Tutor"}: ${m.content}`)
    .join("\n");
}

/**
 * Genera el siguiente turno del tutor. Evalúa el último mensaje del usuario,
 * detecta el hueco, reexplica con un ángulo nuevo si hace falta y hace UNA
 * pregunta de chequeo. En el primer turno (sin mensajes de usuario) da una
 * explicación inicial + pregunta.
 */
export async function tutorRespond(params: {
  concept: string;
  sourceText?: string;
  level: TutorLevel;
  history: TutorMessage[];
}): Promise<TutorTurn | null> {
  const { concept, sourceText, level, history } = params;
  const source = sourceText
    ? `\nTexto de referencia del libro (úsalo como base de verdad):\n"""${sourceText
        .split(/\s+/)
        .slice(0, 2000)
        .join(" ")}"""\n`
    : "";

  const prompt = `Eres un tutor experto en enseñar para la COMPRENSIÓN REAL, no para memorizar. Enseñas con la técnica Feynman y el método socrático. Nivel del usuario: ${level} (${LEVEL_GUIDE[level]}).

Concepto a enseñar: ${concept}
${source}
Conversación hasta ahora:
${renderHistory(history)}

Tu tarea en este turno:
1) Si el usuario acaba de responder, EVALÚA su comprensión y detecta el hueco concreto (si lo hay).
2) Si hay un hueco, NO repitas la misma explicación: reexplica con un ÁNGULO NUEVO (analogía distinta, ejemplo concreto o lenguaje más simple).
3) Haz UNA sola pregunta de chequeo que obligue al usuario a explicar con sus palabras (no de sí/no).
4) Si el usuario ya demostró comprensión sólida, felicítalo brevemente y no hagas más preguntas.
Adapta todo al nivel ${level}. Sé cálido y breve.

IMPORTANTE: responde SOLO con JSON válido, sin markdown.

Formato exacto:
{
  "message": "tu explicación/respuesta conversacional",
  "analogy": "una analogía o ejemplo concreto, o cadena vacía",
  "checkQuestion": "una pregunta de chequeo, o cadena vacía si ya comprendió",
  "detectedGap": "el hueco concreto del usuario, o cadena vacía",
  "comprehension": "unknown | partial | understood"
}`;

  const raw = await callGemini(prompt);
  if (!raw) return null;

  const parsed = extractJson<TutorTurn>(raw);
  if (!parsed) return null;

  const valid: Comprehension[] = ["unknown", "partial", "understood"];
  return {
    message: parsed.message ? String(parsed.message) : "",
    analogy: parsed.analogy ? String(parsed.analogy) : "",
    checkQuestion: parsed.checkQuestion ? String(parsed.checkQuestion) : "",
    detectedGap: parsed.detectedGap ? String(parsed.detectedGap) : "",
    comprehension: valid.includes(parsed.comprehension)
      ? parsed.comprehension
      : "unknown",
  };
}

/**
 * Destila la conversación en una tarjeta de repaso (pregunta abierta + respuesta
 * de referencia) para consolidar lo comprendido vía repetición espaciada.
 */
export async function distillToCard(
  concept: string,
  history: TutorMessage[]
): Promise<{ prompt: string; answer: string } | null> {
  const prompt = `A partir de esta conversación de tutoría sobre "${concept}", crea una tarjeta de repaso para consolidar lo aprendido.

Conversación:
${renderHistory(history)}

Genera:
- "prompt": una pregunta ABIERTA de recuperación (obliga a explicar con palabras propias).
- "answer": la respuesta de referencia, concisa y correcta (2-4 frases).

IMPORTANTE: responde SOLO con JSON válido, sin markdown.

Formato exacto:
{ "prompt": "...", "answer": "..." }`;

  const raw = await callGemini(prompt);
  if (!raw) return null;

  const parsed = extractJson<{ prompt?: string; answer?: string }>(raw);
  if (!parsed || !parsed.prompt || !parsed.answer) return null;

  return {
    prompt: String(parsed.prompt),
    answer: String(parsed.answer),
  };
}
