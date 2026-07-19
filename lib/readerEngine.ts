import type { ReaderMode } from "@/types";
import { getChunk } from "@/lib/wordChunker";

/**
 * Base display time for a single word at a given words-per-minute rate.
 */
export function baseDelayMs(wpm: number): number {
  return 60000 / wpm;
}

/** Chunks que dura la rampa de calentamiento después de cada play/reanudar. */
const WARMUP_CHUNKS = 8;
/** Factor de tiempo extra al arrancar la rampa (decae linealmente hasta 1). */
const WARMUP_START_FACTOR = 1.6;

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
  if (".!?…".includes(last)) factor += 0.9;
  else if (",;:".includes(last)) factor += 0.4;

  return base * factor;
}

export type EngineListener = (index: number) => void;

/**
 * Drives the RSVP loop with a self-correcting timer built on
 * requestAnimationFrame. Using RAF (instead of a fixed setInterval) keeps the
 * cadence smooth at 60 FPS and avoids drift when the tab is throttled.
 *
 * El avance usa `getChunk` — la misma función que pinta la UI — para que el
 * cursor y lo que se ve nunca se desincronicen (los chunks pueden acortarse
 * en límites de puntuación).
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
  /** Multiplicador de pausa extra por posición (p. ej. respiro de párrafo). */
  private extraDelayAt?: (index: number) => number;
  /** Chunks restantes de la rampa de calentamiento (0 = velocidad plena). */
  private warmupLeft = 0;
  index: number;

  constructor(opts: {
    words: string[];
    startIndex: number;
    mode: ReaderMode;
    wpm: number;
    onTick: EngineListener;
    onFinish: () => void;
    extraDelayAt?: (index: number) => number;
  }) {
    this.words = opts.words;
    this.index = opts.startIndex;
    this.mode = opts.mode;
    this.wpm = opts.wpm;
    this.onTick = opts.onTick;
    this.onFinish = opts.onFinish;
    this.extraDelayAt = opts.extraDelayAt;
  }

  setSpeed(wpm: number) {
    this.wpm = wpm;
    // Aplicar también al chunk en curso: sin esto, bajar de 1000 a 200 ppm
    // recién se siente en el chunk siguiente.
    if (this.running) {
      this.nextTickAt = Math.min(
        this.nextTickAt,
        performance.now() + this.currentChunkDelay()
      );
    }
  }

  setMode(mode: ReaderMode) {
    this.mode = mode;
  }

  get isRunning() {
    return this.running;
  }

  private currentSpan(): number {
    if (this.index >= this.words.length) return 1;
    return getChunk(this.words, this.index, this.mode).span;
  }

  private currentChunkDelay(): number {
    if (this.index >= this.words.length) return baseDelayMs(this.wpm);
    const { text, span } = getChunk(this.words, this.index, this.mode);
    let delay = chunkDelayMs(text, Math.max(span, 1), this.wpm);

    // Rampa de calentamiento: los primeros chunks tras cada play van más
    // lentos y aceleran hasta la velocidad objetivo. Re-entrar a la lectura
    // de golpe a 600 ppm es la principal causa de "me perdí al reanudar".
    if (this.warmupLeft > 0) {
      const progress = this.warmupLeft / WARMUP_CHUNKS; // 1 → 0
      delay *= 1 + (WARMUP_START_FACTOR - 1) * progress;
    }

    const extra = this.extraDelayAt?.(this.index) ?? 1;
    return delay * extra;
  }

  play() {
    if (this.running) return;
    if (this.index >= this.words.length) return;
    this.running = true;
    this.warmupLeft = WARMUP_CHUNKS;
    this.nextTickAt = performance.now() + this.currentChunkDelay();
    // Emit the current frame immediately so play resumes on the right word.
    this.onTick(this.index);
    const loop = (now: number) => {
      if (!this.running) return;
      if (now >= this.nextTickAt) {
        this.index += this.currentSpan();
        if (this.warmupLeft > 0) this.warmupLeft--;
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
