import type { ReaderMode } from "@/types";

/**
 * Base display time for a single word at a given words-per-minute rate.
 */
export function baseDelayMs(wpm: number): number {
  return 60000 / wpm;
}

/**
 * Compute how long a chunk should stay on screen. We start from the base
 * per-word delay multiplied by the number of words in the chunk, then add
 * small, natural pauses:
 *   - longer words get a little extra time,
 *   - words ending in sentence punctuation get a comprehension pause.
 * These heuristics keep fast speeds readable without changing the nominal WPM.
 */
export function chunkDelayMs(
  chunkText: string,
  span: number,
  wpm: number
): number {
  const base = baseDelayMs(wpm) * span;
  let factor = 1;

  const longest = chunkText
    .split(" ")
    .reduce((m, w) => Math.max(m, w.length), 0);
  if (longest > 8) factor += 0.25;
  if (longest > 12) factor += 0.25;

  const last = chunkText.trimEnd().slice(-1);
  if (".!?".includes(last)) factor += 0.9;
  else if (",;:".includes(last)) factor += 0.4;

  return base * factor;
}

export type EngineListener = (index: number) => void;

/**
 * Drives the RSVP loop with a self-correcting timer built on
 * requestAnimationFrame. Using RAF (instead of a fixed setInterval) keeps the
 * cadence smooth at 60 FPS and avoids drift when the tab is throttled.
 */
export class ReaderEngine {
  private words: string[];
  private mode: ReaderMode;
  private wpm: number;
  private rafId: number | null = null;
  private nextTickAt = 0;
  private running = false;
  private onTick: EngineListener;
  private onFinish: () => void;
  index: number;

  constructor(opts: {
    words: string[];
    startIndex: number;
    mode: ReaderMode;
    wpm: number;
    onTick: EngineListener;
    onFinish: () => void;
  }) {
    this.words = opts.words;
    this.index = opts.startIndex;
    this.mode = opts.mode;
    this.wpm = opts.wpm;
    this.onTick = opts.onTick;
    this.onFinish = opts.onFinish;
  }

  setSpeed(wpm: number) {
    this.wpm = wpm;
  }

  setMode(mode: ReaderMode) {
    this.mode = mode;
  }

  get isRunning() {
    return this.running;
  }

  private currentChunkDelay(): number {
    const span = Math.min(this.mode, this.words.length - this.index);
    const text = this.words.slice(this.index, this.index + span).join(" ");
    return chunkDelayMs(text, Math.max(span, 1), this.wpm);
  }

  play() {
    if (this.running) return;
    if (this.index >= this.words.length) return;
    this.running = true;
    this.nextTickAt = performance.now() + this.currentChunkDelay();
    // Emit the current frame immediately so play resumes on the right word.
    this.onTick(this.index);
    const loop = (now: number) => {
      if (!this.running) return;
      if (now >= this.nextTickAt) {
        const span = Math.min(this.mode, this.words.length - this.index);
        this.index += span;
        if (this.index >= this.words.length) {
          this.index = this.words.length;
          this.running = false;
          this.onFinish();
          return;
        }
        this.onTick(this.index);
        this.nextTickAt = now + this.currentChunkDelay();
      }
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  pause() {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  seek(index: number) {
    this.index = Math.max(0, Math.min(index, this.words.length));
    this.nextTickAt = performance.now() + this.currentChunkDelay();
    this.onTick(this.index);
  }

  destroy() {
    this.pause();
  }
}
