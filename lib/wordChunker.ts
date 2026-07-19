import type { ReaderMode } from "@/types";

/**
 * Group consecutive words into a chunk starting at `index` for the given mode
 * (1, 2 or 3 words). Returns the joined chunk text and how many words it spans
 * so the engine can advance the cursor correctly.
 */
export function getChunk(
  words: string[],
  index: number,
  mode: ReaderMode
): { text: string; span: number; pivotWord: string } {
  const span = Math.min(mode, words.length - index);
  const slice = words.slice(index, index + span);
  return {
    text: slice.join(" "),
    span,
    // ORP pivots on the first (usually longest-leading) word of the chunk.
    pivotWord: slice[0] ?? "",
  };
}
