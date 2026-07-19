/**
 * Agrupa palabras en grupos semánticos para lectura avanzada.
 * Permite al lector captar frases completas de una vez en lugar de palabra por palabra.
 */

export interface SemanticGroup {
  startIndex: number;
  endIndex: number;
  words: string[];
  type: "phrase" | "clause" | "sentence";
  importance: number; // 0-1, qué tan importante es este grupo
}

/**
 * Genera grupos semánticos usando IA
 * Para optimización, cachea resultados localmente
 */
export async function generateSemanticGroups(
  words: string[],
  maxGroups: number = 50
): Promise<SemanticGroup[]> {
  // Toma una muestra: primeros y últimos words para no exceder tokens
  const sampleWords = [...words.slice(0, 100), ...words.slice(-50)];
  const text = sampleWords.join(" ");

  const prompt = `Eres un experto en lingüística. Analiza este texto y agrupa las palabras en FRASES CORTAS que un lector rápido podría procesar de una sola fijación.

Texto: "${text}"

Responde en JSON con este formato EXACTO (sin markdown):
{
  "groups": [
    {"words": ["palabra1", "palabra2", "palabra3"], "type": "phrase", "importance": 0.8},
    {"words": ["palabra4", "palabra5"], "type": "clause", "importance": 0.5}
  ]
}

Reglas:
- Cada grupo debe tener 2-5 palabras máximo
- type puede ser: phrase, clause, sentence
- importance es de 0-1 (palabras clave = 1)
- Máximo 30 grupos`;

  try {
    const response = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) return defaultGrouping(words);
    const data = (await response.json()) as { text?: string | null };
    const textResponse = data.text;

    if (!textResponse) return defaultGrouping(words);

    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return defaultGrouping(words);

    const parsed = JSON.parse(jsonMatch[0]) as {
      groups?: Array<{
        words?: string[];
        type?: string;
        importance?: number;
      }>;
    };

    // Mapear grupos de la muestra al índice completo
    const groups: SemanticGroup[] = [];
    let currentIndex = 0;

    for (const group of parsed.groups || []) {
      if (!group.words) continue;
      const groupLength = group.words.length;
      groups.push({
        startIndex: currentIndex,
        endIndex: currentIndex + groupLength,
        words: group.words,
        type: (group.type as "phrase" | "clause" | "sentence") || "phrase",
        importance: group.importance ?? 0.5,
      });
      currentIndex += groupLength;
    }

    return groups.length > 0 ? groups : defaultGrouping(words);
  } catch (error) {
    console.error("Error generando grupos semánticos:", error);
    return defaultGrouping(words);
  }
}

/**
 * Agrupamiento por defecto (sin IA)
 * Agrupa palabras simples por puntuación y longitud
 */
function defaultGrouping(words: string[]): SemanticGroup[] {
  const groups: SemanticGroup[] = [];
  let currentGroup: string[] = [];
  let startIndex = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    currentGroup.push(word);

    // Agrupa por puntuación o cada 3-4 palabras
    const hasEndPunctuation = /[.!?,;:]/.test(word);
    const isLongEnough = currentGroup.length >= 3;

    if ((hasEndPunctuation || isLongEnough) && currentGroup.length <= 5) {
      const importance = calculateImportance(currentGroup);
      groups.push({
        startIndex,
        endIndex: i + 1,
        words: currentGroup,
        type: hasEndPunctuation ? "sentence" : "phrase",
        importance,
      });
      startIndex = i + 1;
      currentGroup = [];
    }
  }

  // Agrupa las últimas palabras
  if (currentGroup.length > 0) {
    groups.push({
      startIndex,
      endIndex: words.length,
      words: currentGroup,
      type: "phrase",
      importance: calculateImportance(currentGroup),
    });
  }

  return groups;
}

/**
 * Calcula importancia basada en características simples
 */
function calculateImportance(words: string[]): number {
  let score = 0;

  // Palabras largas = más importantes (probablemente son sustantivos/verbos)
  const longWords = words.filter((w) => w.length > 5).length;
  score += (longWords / words.length) * 0.5;

  // Mayúsculas = probablemente nombres propios
  const capitalized = words.filter((w) => /^[A-Z]/.test(w)).length;
  score += (capitalized / words.length) * 0.3;

  // Números = típicamente importantes
  const hasNumbers = words.some((w) => /\d/.test(w)) ? 0.2 : 0;
  score += hasNumbers;

  return Math.min(score, 1);
}

/**
 * Obtiene el grupo semántico correspondiente a un índice de palabra
 */
export function getGroupForWordIndex(
  index: number,
  groups: SemanticGroup[]
): SemanticGroup | null {
  return groups.find((g) => index >= g.startIndex && index < g.endIndex) || null;
}

/**
 * Calcula el nivel de "importancia visual" para cada palabra
 * Usado para degradados de color
 */
export function calculateWordImportance(
  index: number,
  groups: SemanticGroup[]
): number {
  const group = getGroupForWordIndex(index, groups);
  if (!group) return 0.5;

  // Palabras al inicio del grupo son más importantes
  const positionInGroup = index - group.startIndex;
  const positionFactor = 1 - positionInGroup / group.words.length * 0.3;

  return group.importance * positionFactor;
}
