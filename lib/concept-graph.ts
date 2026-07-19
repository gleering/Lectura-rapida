/**
 * Grafo de conceptos — detección de conexiones con IA (Google Gemini).
 *
 * Fundamento científico:
 * - Elaboración / profundidad de procesamiento (Craik & Lockhart 1972): relacionar una
 *   idea nueva con otras existentes la codifica más profundamente y la hace más recuperable.
 * - Memoria semántica en red: hacer explícitas las conexiones entre conceptos (sobre todo
 *   entre libros distintos) construye una red de conocimiento y potencia el pensamiento crítico.
 */

import type { ConceptLink } from "@/types";

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

export interface ConceptInput {
  id: string;
  concept: string;
  bookTitle?: string;
  answer?: string;
}

interface RawLink {
  a: number;
  b: number;
  relationship: string;
}

/**
 * Detecta relaciones significativas entre los conceptos de la biblioteca.
 * Usa índices 1..N (robusto) y los mapea a ids reales.
 * Prioriza conexiones entre libros distintos (mayor valor de elaboración).
 */
export async function findConnections(
  concepts: ConceptInput[]
): Promise<ConceptLink[] | null> {
  if (concepts.length < 2) return [];

  // Limitar para no exceder tokens.
  const limited = concepts.slice(0, 40);
  const list = limited
    .map(
      (c, i) =>
        `${i + 1}. "${c.concept}"${c.bookTitle ? ` [${c.bookTitle}]` : ""}${
          c.answer ? ` — ${c.answer.slice(0, 120)}` : ""
        }`
    )
    .join("\n");

  const prompt = `Eres un experto en aprendizaje que construye redes de conocimiento. A continuación hay conceptos (numerados) que un usuario está aprendiendo de sus libros.

Identifica las relaciones SIGNIFICATIVAS entre pares de conceptos (máximo 20). Prioriza conexiones entre conceptos de LIBROS DISTINTOS, porque conectar ideas de fuentes diferentes es lo más valioso para comprender en profundidad. Evita relaciones triviales o forzadas.

Conceptos:
${list}

Para cada relación indica los números de los dos conceptos y una descripción breve (una frase) de CÓMO se relacionan.

IMPORTANTE: responde SOLO con JSON válido, sin markdown.

Formato exacto:
[
  { "a": 1, "b": 5, "relationship": "descripción breve de la conexión" }
]`;

  const raw = await callGemini(prompt);
  if (!raw) return null;

  const parsed = extractJson<RawLink[]>(raw);
  if (!parsed || !Array.isArray(parsed)) return null;

  const now = Date.now();
  const links: ConceptLink[] = [];
  const seen = new Set<string>();

  for (const r of parsed) {
    const ai = Number(r.a) - 1;
    const bi = Number(r.b) - 1;
    if (
      !Number.isInteger(ai) ||
      !Number.isInteger(bi) ||
      ai < 0 ||
      bi < 0 ||
      ai >= limited.length ||
      bi >= limited.length ||
      ai === bi ||
      !r.relationship
    ) {
      continue;
    }
    const source = limited[ai];
    const target = limited[bi];
    // Dedup sin importar el orden del par.
    const key = [source.id, target.id].sort().join("__");
    if (seen.has(key)) continue;
    seen.add(key);

    links.push({
      id: `link_${source.id}_${target.id}`,
      sourceId: source.id,
      targetId: target.id,
      sourceConcept: source.concept,
      targetConcept: target.concept,
      relationship: String(r.relationship),
      createdAt: now,
    });
  }

  return links;
}

/** Construye adyacencia por concepto para renderizar el mapa. */
export function groupByConcept(
  links: ConceptLink[]
): Map<string, { concept: string; related: { concept: string; relationship: string }[] }> {
  const map = new Map<
    string,
    { concept: string; related: { concept: string; relationship: string }[] }
  >();

  const add = (
    id: string,
    concept: string,
    relatedConcept: string,
    relationship: string
  ) => {
    const entry = map.get(id) ?? { concept, related: [] };
    entry.related.push({ concept: relatedConcept, relationship });
    map.set(id, entry);
  };

  for (const link of links) {
    add(link.sourceId, link.sourceConcept, link.targetConcept, link.relationship);
    add(link.targetId, link.targetConcept, link.sourceConcept, link.relationship);
  }

  return map;
}
