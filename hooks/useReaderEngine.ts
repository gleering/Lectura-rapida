"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BookMeta, ReaderMode, Speed } from "@/types";
import { ReaderEngine } from "@/lib/readerEngine";
import { getChunk } from "@/lib/wordChunker";
import { updateBookMeta } from "@/lib/storage";
import { recordSession } from "@/lib/stats";

interface UseReaderEngineOpts {
  words: string[];
  meta: BookMeta;
  mode: ReaderMode;
  speed: Speed;
  /** Fire every `comprehensionInterval` words (0 disables). */
  comprehensionInterval: number;
  /**
   * Índices de inicio de párrafo: el primer chunk de cada párrafo se muestra
   * un poco más — un respiro que marca la transición, como el ojo al saltar
   * de párrafo en un libro real.
   */
  paraStarts?: number[];
  onComprehension?: (index: number) => void;
  onFinish?: () => void;
}

export interface ReaderEngineApi {
  index: number;
  isPlaying: boolean;
  chunk: { text: string; span: number; pivotWord: string };
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seekTo: (index: number) => void;
  step: (delta: number) => void;
  toStart: () => void;
  toEnd: () => void;
  /** Persist progress + stats immediately (called on unmount/route change). */
  flush: () => Promise<void>;
}

export function useReaderEngine(opts: UseReaderEngineOpts): ReaderEngineApi {
  const {
    words,
    meta,
    mode,
    speed,
    comprehensionInterval,
    paraStarts,
    onComprehension,
    onFinish,
  } = opts;

  const [index, setIndex] = useState(meta.progressIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  const engineRef = useRef<ReaderEngine | null>(null);

  // Pending deltas since the last flush — consumed by recordSession, then reset.
  const pendingWords = useRef(0);
  const pendingTime = useRef(0);
  // "Libro terminado" se registra UNA sola vez: sin esto, cada flush posterior
  // (autoguardado, unmount) lo volvía a contar porque `meta.finished` del
  // closure queda desactualizado.
  const finishRecorded = useRef(meta.finished);
  // Running totals for this mount — never reset, so book meta stays accurate
  // across repeated autosaves within a single reading session.
  const mountTime = useRef(0);
  const playStartedAt = useRef<number | null>(null);
  const lastComprehension = useRef(meta.progressIndex);
  const currentIndex = useRef(meta.progressIndex);

  // Keep the latest callbacks without re-creating the engine.
  const onComprehensionRef = useRef(onComprehension);
  const onFinishRef = useRef(onFinish);
  onComprehensionRef.current = onComprehension;
  onFinishRef.current = onFinish;

  // Fold in-flight play time into the accumulators and stop the clock.
  // Used by pause / finish / comprehension pause.
  const accumulateTime = useCallback(() => {
    if (playStartedAt.current !== null) {
      const delta = performance.now() - playStartedAt.current;
      pendingTime.current += delta;
      mountTime.current += delta;
      playStartedAt.current = null;
    }
  }, []);

  const flush = useCallback(async () => {
    // Fold any in-flight play time into the accumulators first. Keep the clock
    // running if playback is still active so an autosave doesn't drop time.
    if (playStartedAt.current !== null) {
      const delta = performance.now() - playStartedAt.current;
      pendingTime.current += delta;
      mountTime.current += delta;
      playStartedAt.current = engineRef.current?.isRunning
        ? performance.now()
        : null;
    }
    const finished = currentIndex.current >= words.length;
    await updateBookMeta({
      ...meta,
      progressIndex: Math.min(currentIndex.current, words.length),
      // Running total for this mount added to the persisted base — never drifts.
      timeReadMs: meta.timeReadMs + mountTime.current,
      finished: finished || meta.finished,
      updatedAt: Date.now(),
    });
    await recordSession({
      wordsRead: pendingWords.current,
      timeReadMs: pendingTime.current,
      speed,
      finishedBook: finished && !finishRecorded.current,
    });
    if (finished) finishRecorded.current = true;
    pendingWords.current = 0;
    pendingTime.current = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta, words.length, speed]);

  // Set de inicios de párrafo para el respiro de transición (lookup O(1)).
  const paraStartSet = useRef<Set<number> | null>(null);
  useEffect(() => {
    paraStartSet.current =
      paraStarts && paraStarts.length > 0 ? new Set(paraStarts) : null;
  }, [paraStarts]);

  // Build the engine once per book. Speed/mode are pushed in imperatively.
  useEffect(() => {
    const engine = new ReaderEngine({
      words,
      startIndex: currentIndex.current,
      mode,
      wpm: speed,
      extraDelayAt: (i) => (paraStartSet.current?.has(i) ? 1.35 : 1),
      onTick: (i) => {
        const prev = currentIndex.current;
        if (i > prev) pendingWords.current += i - prev;
        currentIndex.current = i;
        setIndex(i);

        if (
          comprehensionInterval > 0 &&
          i - lastComprehension.current >= comprehensionInterval
        ) {
          lastComprehension.current = i;
          engine.pause();
          accumulateTime();
          setIsPlaying(false);
          onComprehensionRef.current?.(i);
        }
      },
      onFinish: () => {
        accumulateTime();
        setIsPlaying(false);
        onFinishRef.current?.();
        void flush();
      },
    });
    engineRef.current = engine;
    return () => {
      engine.destroy();
    };
    // Rebuild only when the book (word array identity) changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words]);

  // Instant speed / mode changes without interrupting playback.
  useEffect(() => {
    engineRef.current?.setSpeed(speed);
  }, [speed]);
  useEffect(() => {
    engineRef.current?.setMode(mode);
  }, [mode]);

  // Periodic autosave every 5s while reading.
  useEffect(() => {
    const id = setInterval(() => {
      if (playStartedAt.current !== null) void flush();
    }, 5000);
    return () => clearInterval(id);
  }, [flush]);

  // Persist on tab close / navigation away.
  useEffect(() => {
    const handler = () => void flush();
    window.addEventListener("pagehide", handler);
    return () => {
      window.removeEventListener("pagehide", handler);
      void flush();
    };
  }, [flush]);

  const play = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (currentIndex.current >= words.length) return;
    playStartedAt.current = performance.now();
    lastComprehension.current = currentIndex.current;
    engine.play();
    setIsPlaying(true);
  }, [words.length]);

  const pause = useCallback(() => {
    engineRef.current?.pause();
    accumulateTime();
    setIsPlaying(false);
    void flush();
  }, [accumulateTime, flush]);

  const toggle = useCallback(() => {
    if (isPlaying) pause();
    else play();
  }, [isPlaying, play, pause]);

  const seekTo = useCallback(
    (i: number) => {
      const engine = engineRef.current;
      if (!engine) return;
      const clamped = Math.max(0, Math.min(i, words.length - 1));
      currentIndex.current = clamped;
      lastComprehension.current = clamped;
      engine.seek(clamped);
      setIndex(clamped);
    },
    [words.length]
  );

  const step = useCallback(
    (delta: number) => seekTo(currentIndex.current + delta),
    [seekTo]
  );
  const toStart = useCallback(() => seekTo(0), [seekTo]);
  const toEnd = useCallback(
    () => seekTo(words.length - 1),
    [seekTo, words.length]
  );

  const chunk = getChunk(words, Math.min(index, words.length - 1), mode);

  return {
    index,
    isPlaying,
    chunk,
    play,
    pause,
    toggle,
    seekTo,
    step,
    toStart,
    toEnd,
    flush,
  };
}
