/**
 * Generador de mapas mentales con IA (Google Gemini).
 *
 * Fundamento científico:
 * - Teoría de carga cognitiva (Sweller 1988): la memoria de trabajo se satura (~4 elementos).
 *   Externalizar la estructura de un texto en una jerarquía visual descarga la memoria de
 *   trabajo y libera recursos para comprender. Especialmente útil en TDAH/fatiga mental.
 * - Chunking: agrupar ideas en ramas reduce el número de elementos que hay que sostener.
 */

import type { MindMapNode } from "@/types";

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

function extractJsonArray<T>(text: string): T[] | null {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T[];
  } catch {
    return null;
  }
}

const MAX_DEPTH = 4;
const MAX_CHILDREN = 6;

/** Normaliza el árbol crudo: limita profundidad/anchura y sanea labels. */
function normalizeNode(raw: unknown, depth: number): MindMapNode | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as { label?: unknown; children?: unknown };
  const label =
    typeof obj.label === "string" ? obj.label.trim().slice(0, 120) : "";
  if (!label) return null;

  const node: MindMapNode = { label };

  if (depth < MAX_DEPTH && Array.isArray(obj.children)) {
    const children = obj.children
      .slice(0, MAX_CHILDREN)
      .map((c) => normalizeNode(c, depth + 1))
      .filter((c): c is MindMapNode => c !== null);
    if (children.length > 0) node.children = children;
  }

  return node;
}

/**
 * Genera un mapa mental jerárquico del texto: tema central → ramas → sub-ramas.
 */
export async function generateMindMap(
  bookTitle: string,
  text: string
): Promise<MindMapNode | null> {
  const words = text.split(/\s+/).slice(0, 8000).join(" ");

  const prompt = `Eres un experto en organización del conocimiento. Crea un MAPA MENTAL jerárquico del siguiente texto del libro "${bookTitle}".

Estructura:
- Un nodo raíz con el tema central (label = título/tema del libro).
- 3 a 6 ramas principales (las ideas clave).
- Cada rama con 2 a 5 sub-ideas concretas. Máximo 4 niveles de profundidad.
- Labels cortos (2-8 palabras), no frases largas. Agrupa por temas (chunking).

IMPORTANTE: responde SOLO con JSON válido anidado, sin markdown.

Texto:
${words}

Formato exacto:
{
  "label": "Tema central",
  "children": [
    { "label": "Rama 1", "children": [ { "label": "Sub-idea" } ] }
  ]
}`;

  const raw = await callGemini(prompt);
  if (!raw) return null;

  const parsed = extractJson<MindMapNode>(raw);
  if (!parsed) return null;

  return normalizeNode(parsed, 0);
}

/** Una hoja del mapa con su ruta de ramas (contexto jerárquico). */
export interface MindMapLeaf {
  label: string;
  path: string[];
}

/** Concepto de repaso derivado de una hoja del mapa mental. */
export interface MindMapConcept {
  concept: string;
  prompt: string;
  answer: string;
}

const MAX_LEAVES_TO_CARDS = 20;

/**
 * Recorre el árbol y devuelve las hojas (nodos sin hijos) con su ruta de ancestros.
 * Las hojas son las sub-ideas concretas: el mejor material para tarjetas de recuerdo.
 */
export function collectLeafPaths(root: MindMapNode): MindMapLeaf[] {
  const leaves: MindMapLeaf[] = [];
  const walk = (node: MindMapNode, ancestors: string[]) => {
    if (!node.children || node.children.length === 0) {
      // No incluye la raíz suelta (un mapa sin ramas no da tarjetas útiles).
      if (ancestors.length > 0) leaves.push({ label: node.label, path: ancestors });
      return;
    }
    for (const child of node.children) walk(child, [...ancestors, node.label]);
  };
  walk(root, []);
  return leaves;
}

/**
 * Convierte hojas del mapa mental en conceptos de repaso (recuerdo activo).
 * Una sola llamada por lote: para cada concepto genera una pregunta de recuerdo
 * abierto y una respuesta de referencia, usando la ruta de ramas como contexto.
 *
 * Puente estructura → recuperación: el mapa organiza (carga cognitiva, Sweller);
 * las tarjetas fuerzan a recuperar de memoria (efecto de test, Roediger & Karpicke).
 */
export async function mindMapToReviewConcepts(
  bookTitle: string,
  leaves: MindMapLeaf[]
): Promise<MindMapConcept[] | null> {
  const selected = leaves.slice(0, MAX_LEAVES_TO_CARDS);
  if (selected.length === 0) return [];

  const list = selected
    .map(
      (l, i) =>
        `${i + 1}. Concepto: "${l.label}" (rama: ${l.path.join(" > ")})`
    )
    .join("\n");

  const prompt = `Eres un experto en aprendizaje. A partir de estos conceptos extraídos del mapa mental del libro "${bookTitle}", crea una tarjeta de RECUERDO ACTIVO para cada uno.

Para cada concepto:
- "prompt": una pregunta de recuerdo abierto que obligue a explicar la idea de memoria (no de sí/no).
- "answer": una respuesta de referencia breve y correcta (2-4 frases) para autoevaluarse.
- Usa la ruta de ramas como contexto del concepto dentro del libro.

Conceptos:
${list}

IMPORTANTE: responde SOLO con un array JSON válido, sin markdown. Devuelve un objeto por concepto, en el mismo orden, con el campo "i" (número del concepto).

Formato exacto:
[
  { "i": 1, "prompt": "¿...?", "answer": "..." }
]`;

  const raw = await callGemini(prompt);
  if (!raw) return null;

  const parsed = extractJsonArray<{ i?: number; prompt?: unknown; answer?: unknown }>(
    raw
  );
  if (!parsed) return null;

  const concepts: MindMapConcept[] = [];
  for (const item of parsed) {
    const idx = typeof item.i === "number" ? item.i - 1 : -1;
    const leaf = selected[idx];
    const promptText = typeof item.prompt === "string" ? item.prompt.trim() : "";
    const answerText = typeof item.answer === "string" ? item.answer.trim() : "";
    if (!leaf || !promptText || !answerText) continue;
    concepts.push({ concept: leaf.label, prompt: promptText, answer: answerText });
  }

  return concepts;
}
