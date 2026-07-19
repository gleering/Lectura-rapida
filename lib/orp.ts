// Optimal Recognition Point (ORP) calculation.
//
// RSVP research shows the eye recognises a word fastest when it fixates
// slightly left of the word's centre. We compute that pivot letter and split
// the word so the reader can render [before][pivot][after], keeping the pivot
// horizontally aligned across every flash.

export interface OrpSplit {
  before: string;
  pivot: string;
  after: string;
  /** Index of the pivot character within the word. */
  pivotIndex: number;
}

/**
 * Pick the pivot letter index for a word. The mapping below is the de-facto
 * standard used by Spritz-style readers: short words pivot early, long words
 * pivot around the 30–35% mark.
 */
export function getOrpIndex(word: string): number {
  const len = word.length;
  if (len <= 1) return 0;
  if (len <= 5) return 1;
  if (len <= 9) return 2;
  if (len <= 13) return 3;
  return 4;
}

export function splitAtOrp(word: string): OrpSplit {
  const pivotIndex = getOrpIndex(word);
  return {
    before: word.slice(0, pivotIndex),
    pivot: word.slice(pivotIndex, pivotIndex + 1),
    after: word.slice(pivotIndex + 1),
    pivotIndex,
  };
}
