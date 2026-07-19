import type { ReaderMode } from "@/types";

/** Puntuación que cierra una unidad de sentido — el chunk no debe cruzarla. */
const CLAUSE_END_RE = /[.!?…;:,][)\]"'”»›]*$/;

/**
 * Group consecutive words into a chunk starting at `index` for the given mode
 * (1, 2 or 3 words). Returns the joined chunk text and how many words it spans
 * so the engine can advance the cursor correctly.
 *
 * En modos 2–3 el chunk se corta antes si una palabra termina en puntuación:
 * "fin. La casa" nunca aparece junto — la puntuación marca el límite natural
 * de la unidad de sentido y cruzarla rompe la comprensión.
 */
export function getChunk(
  words: string[],
  index: number,
  mode: ReaderMode
): { text: string; span: number; pivotWord: string } {
  const maxSpan = Math.min(mode, words.length - index);
  let span = Math.max(1, maxSpan);
  for (let k = 0; k < maxSpan - 1; k++) {
    if (CLAUSE_END_RE.test(words[index + k])) {
      span = k + 1;
      break;
    }
  }
  const slice = words.slice(index, index + span);
  return {
    text: slice.join(" "),
    span,
    // ORP pivots on the first (usually longest-leading) word of the chunk.
    pivotWord: slice[0] ?? "",
  };
}
