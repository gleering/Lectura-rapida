// Estructura del texto a partir del arreglo plano de palabras.
//
// Los tres modos de lectura necesitan saber dónde terminan las oraciones y los
// párrafos: RSVP para no cortar chunks a mitad de oración y respirar entre
// párrafos, Guía para armar bloques estables que no salten, y Página para
// paginar en límites de oración y renderizar párrafos de verdad.

/** Abreviaturas frecuentes en español que terminan en punto sin cerrar oración. */
const ABBREVIATIONS = new Set([
  "sr.", "sra.", "srta.", "dr.", "dra.", "lic.", "ing.", "prof.", "gral.",
  "cap.", "av.", "pág.", "pag.", "p.", "pp.", "art.", "núm.", "num.", "no.",
  "etc.", "ej.", "vol.", "ed.", "sig.", "ss.", "cf.", "op.", "cit.", "aprox.",
  "mr.", "mrs.", "ms.", "st.", "jr.", "vs.", "a.m.", "p.m.", "a.c.", "d.c.",
]);

/** Cierra oración: termina en . ! ? … seguido opcionalmente de comillas/paréntesis. */
const SENTENCE_END_RE = /[.!?…][)\]"'”»›]*$/;

/**
 * ¿La palabra en `index` cierra una oración? Además del patrón de puntuación,
 * descarta abreviaturas comunes e iniciales ("J."), y —cuando existe— exige que
 * la palabra siguiente arranque como oración nueva (mayúscula, ¿¡, comillas o
 * dígito), lo que elimina la mayoría de falsos positivos.
 */
export function isSentenceEnd(words: string[], index: number): boolean {
  const word = words[index];
  if (!word || !SENTENCE_END_RE.test(word)) return false;

  const lower = word.toLowerCase().replace(/[)\]"'”»›]+$/, "");
  if (ABBREVIATIONS.has(lower)) return false;
  // Inicial de nombre: una sola letra + punto ("J.", "M.").
  if (/^[(\["'“«‹]?\p{Lu}\.$/u.test(word)) return false;

  const next = words[index + 1];
  if (next === undefined) return true;
  return /^[(\["'“«‹¿¡]*[\p{Lu}\p{N}]/u.test(next);
}

/** Índices (inclusive) de la última palabra de cada oración. */
export function sentenceEnds(words: string[]): number[] {
  const ends: number[] = [];
  for (let i = 0; i < words.length; i++) {
    if (isSentenceEnd(words, i)) ends.push(i);
  }
  if (words.length > 0 && ends[ends.length - 1] !== words.length - 1) {
    ends.push(words.length - 1);
  }
  return ends;
}

/**
 * Rango [start, end] (inclusive) de la oración que contiene `index`.
 * `cap` limita el barrido para oraciones patológicamente largas.
 */
export function sentenceRange(
  words: string[],
  index: number,
  cap = 60
): { start: number; end: number } {
  const i = Math.max(0, Math.min(index, words.length - 1));
  let start = i;
  for (let k = i - 1; k >= 0 && i - k <= cap; k--) {
    if (isSentenceEnd(words, k)) break;
    start = k;
  }
  let end = i;
  for (let k = i; k < words.length && k - i <= cap; k++) {
    end = k;
    if (isSentenceEnd(words, k)) break;
  }
  return { start, end };
}

/**
 * Divide el libro en segmentos que terminan en límite de oración, buscando un
 * tamaño cercano a `target` palabras (nunca menos de `min`, con tope duro para
 * texto sin puntuación). Devuelve los índices de inicio de cada segmento.
 * Es la base de los bloques del modo Guía y de las páginas del modo Página.
 */
export function buildSegments(
  words: string[],
  target: number,
  opts: { min?: number; max?: number; breakpoints?: number[] } = {}
): number[] {
  const min = opts.min ?? Math.floor(target * 0.5);
  const max = opts.max ?? Math.ceil(target * 1.6);
  const starts: number[] = [];
  // Preferir cortes en `breakpoints` (p. ej. fin de párrafo) cercanos al target.
  const prefer = new Set(opts.breakpoints ?? []);

  let start = 0;
  while (start < words.length) {
    starts.push(start);
    const idealEnd = Math.min(start + target - 1, words.length - 1);
    const hardMax = Math.min(start + max - 1, words.length - 1);

    let cut = -1;
    let preferredCut = -1;
    // Barrer alrededor del ideal: primero hacia adelante hasta el máximo,
    // luego hacia atrás hasta el mínimo. El primer límite válido gana su fase.
    for (let k = idealEnd; k <= hardMax; k++) {
      if (prefer.has(k + 1) && preferredCut < 0) preferredCut = k;
      if (isSentenceEnd(words, k)) {
        cut = k;
        break;
      }
    }
    if (cut < 0) {
      for (let k = idealEnd - 1; k >= start + min - 1; k--) {
        if (prefer.has(k + 1) && preferredCut < 0) preferredCut = k;
        if (isSentenceEnd(words, k)) {
          cut = k;
          break;
        }
      }
    }
    if (preferredCut >= 0) cut = preferredCut;
    if (cut < 0) cut = hardMax; // sin puntuación a la vista: corte duro
    start = cut + 1;
  }
  return starts;
}

/**
 * Índice del segmento (bloque/página) que contiene `wordIndex`, dado el
 * arreglo ordenado de inicios. Búsqueda binaria: O(log n).
 */
export function segmentIndexFor(starts: number[], wordIndex: number): number {
  if (starts.length === 0) return 0;
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (starts[mid] <= wordIndex) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/**
 * Párrafos aproximados para libros guardados sin `paraStarts` (o PDFs cuyo
 * layout no dejó señal): agrupa oraciones consecutivas hasta ~`target`
 * palabras. No es la división original del autor, pero convierte el muro de
 * texto en párrafos legibles.
 */
export function approximateParagraphStarts(
  words: string[],
  target = 70
): number[] {
  const starts: number[] = [0];
  let count = 0;
  for (let i = 0; i < words.length; i++) {
    count++;
    if (count >= target && isSentenceEnd(words, i) && i + 1 < words.length) {
      starts.push(i + 1);
      count = 0;
    }
  }
  return starts;
}

/**
 * Normaliza una lista de inicios de párrafo: ordenada, sin duplicados, siempre
 * arrancando en 0 y sin párrafos absurdamente largos (los parte con la
 * aproximación por oraciones).
 */
export function normalizeParagraphStarts(
  words: string[],
  raw: number[] | undefined,
  maxLen = 220
): number[] {
  if (!raw || raw.length === 0) return approximateParagraphStarts(words);
  const sorted = [...new Set([0, ...raw])]
    .filter((n) => n >= 0 && n < words.length)
    .sort((a, b) => a - b);

  const out: number[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const start = sorted[i];
    const end = (sorted[i + 1] ?? words.length) - 1;
    out.push(start);
    if (end - start + 1 > maxLen) {
      // Párrafo gigante (probablemente señal perdida): subdividir.
      const sub = approximateParagraphStarts(
        words.slice(start, end + 1),
        Math.floor(maxLen * 0.5)
      );
      for (const s of sub) if (s > 0) out.push(start + s);
    }
  }
  return [...new Set(out)].sort((a, b) => a - b);
}
