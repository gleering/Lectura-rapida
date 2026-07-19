"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Play,
  Pause,
  Rewind,
  FastForward,
  SkipBack,
  SkipForward,
  Sparkles,
} from "lucide-react";
import { useReaderEngine } from "@/hooks/useReaderEngine";
import { useWakeLock } from "@/hooks/useWakeLock";
import { useSettingsStore } from "@/store/useSettingsStore";
import { buildSegments, segmentIndexFor } from "@/lib/textStructure";
import { SpeedSelector } from "./SpeedSelector";
import { MethodSelector } from "./MethodSelector";
import { FinishedDialog } from "./FinishedDialog";
import { SummaryOverlay } from "./SummaryOverlay";
import { ProgressBar } from "./ProgressBar";
import { ChapterNav } from "./ChapterNav";
import { Button } from "@/components/ui/button";
import { activeProvider } from "@/lib/ai";
import type { BookMeta, ReadingMethod, Speed, BookSection } from "@/types";

/** Tamaño objetivo de cada bloque de texto (palabras). ~4–6 líneas en pantalla. */
const BLOCK_TARGET = 48;

const ctrlBtn = "text-white/80 hover:text-white hover:bg-white/10 bg-transparent";

interface PacerReaderProps {
  meta: BookMeta;
  words: string[];
  paraStarts?: number[];
  sections?: BookSection[];
  onMethod: (m: ReadingMethod) => void;
  /** Reporta la posición viva al contenedor (para cambiar de método sin saltos). */
  onProgress?: (index: number) => void;
}

/**
 * Modo Guía (escalón 2): un bloque de texto QUIETO y un realce que barre
 * palabra a palabra. El texto no se mueve — se mueven tus ojos. Ese es el
 * entrenamiento: recorrer texto estático con ritmo externo, el puente entre
 * "las palabras vienen solas" (RSVP) y "yo recorro la página" (Página).
 *
 * Los bloques terminan siempre en fin de oración (~48 palabras) y solo se
 * reemplazan al completarse: cero reflow durante el barrido. (La versión
 * anterior deslizaba una ventana de palabras centrada: TODO el texto se
 * reacomodaba en cada tick.)
 *
 * Reutiliza el motor RSVP — misma cadencia (con calentamiento y respiro de
 * párrafo), mismo guardado de progreso y estadísticas.
 */
export function PacerReader({
  meta,
  words,
  paraStarts,
  sections,
  onMethod,
  onProgress,
}: PacerReaderProps) {
  const router = useRouter();
  const { settings, update } = useSettingsStore();

  const [finished, setFinished] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const engine = useReaderEngine({
    words,
    meta,
    mode: settings.mode,
    speed: settings.speed,
    // La comprensión intercalada vive en RSVP; aquí el foco es reentrenar la
    // mirada. La consolidación al terminar sigue activa.
    comprehensionInterval: 0,
    paraStarts,
    onFinish: () => setFinished(true),
  });

  useWakeLock(engine.isPlaying);

  const span = engine.chunk.span;
  const index = engine.index;

  // Posición viva para el contenedor (cambio de método sin perder el lugar).
  useEffect(() => {
    onProgress?.(index);
  }, [index, onProgress]);

  // Bloques estables: calculados una vez por libro, cortados en fin de oración.
  const blockStarts = useMemo(
    () => buildSegments(words, BLOCK_TARGET, { min: 20, max: 90 }),
    [words]
  );
  const blockIdx = segmentIndexFor(blockStarts, Math.min(index, words.length - 1));
  const blockStart = blockStarts[blockIdx] ?? 0;
  const blockEnd = blockStarts[blockIdx + 1] ?? words.length; // exclusivo
  const blockWords = useMemo(
    () => words.slice(blockStart, blockEnd),
    [words, blockStart, blockEnd]
  );

  const openSummary = useCallback(async () => {
    engine.pause();
    setSummaryLoading(true);
    setSummary("");
    const text = words
      .slice(Math.max(0, index - 1500), Math.max(index, 1))
      .join(" ");
    setSummary(await activeProvider.summarize(text));
    setSummaryLoading(false);
  }, [engine, words, index]);

  // Atajos de teclado (mismos que RSVP).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (summary !== null || finished) return;
      switch (e.key) {
        case " ":
          e.preventDefault();
          engine.toggle();
          break;
        case "ArrowLeft":
          engine.step(-10);
          break;
        case "ArrowRight":
          engine.step(10);
          break;
        case "Home":
          engine.toStart();
          break;
        case "End":
          engine.toEnd();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [engine, summary, finished]);

  const highlight = settings.orpColor;

  return (
    <div
      className="relative flex h-screen w-screen flex-col overflow-hidden"
      style={{ backgroundColor: settings.backgroundColor }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              void engine.flush();
              router.push("/");
            }}
            className="bg-transparent text-white/70 hover:bg-white/10 hover:text-white mix-blend-difference"
            aria-label="Volver"
          >
            <ArrowLeft />
          </Button>
          {sections && sections.length > 0 && (
            <ChapterNav
              sections={sections}
              totalWords={words.length}
              currentWord={engine.index}
              wpm={settings.speed}
              onSeek={engine.seekTo}
              dark
            />
          )}
        </div>
        <button
          onClick={openSummary}
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white mix-blend-difference"
        >
          <Sparkles className="size-4" /> Resumen
        </button>
      </div>

      {/* Escenario: bloque quieto, realce que barre. */}
      <div className="flex flex-1 items-center justify-center overflow-hidden px-6 sm:px-10">
        <p
          className="w-full max-w-2xl select-none text-left"
          style={{
            fontFamily: settings.fontFamily,
            fontSize: `clamp(20px, ${Math.max(22, settings.fontSize * 0.42)}px, 34px)`,
            color: settings.textColor,
            letterSpacing: `${settings.letterSpacing}em`,
            lineHeight: 1.85,
          }}
        >
          {blockWords.map((w, i) => {
            const globalIdx = blockStart + i;
            const isActive = globalIdx >= index && globalIdx < index + span;
            const isRead = globalIdx < index;
            return (
              <span
                key={globalIdx}
                style={
                  isActive
                    ? {
                        backgroundColor: highlight,
                        color: "#ffffff",
                        borderRadius: "0.25rem",
                        padding: "0.05em 0.18em",
                        boxDecorationBreak: "clone",
                        WebkitBoxDecorationBreak: "clone",
                      }
                    : { opacity: isRead ? 0.35 : 0.85 }
                }
              >
                {w}{" "}
              </span>
            );
          })}
        </p>
      </div>

      {/* Bottom controls */}
      <div className="space-y-4 bg-black/60 px-4 pb-5 pt-3 backdrop-blur">
        <ProgressBar
          title={meta.title}
          index={index}
          total={words.length}
          wordsPerPage={meta.wordsPerPage}
          totalPages={meta.totalPages}
          speed={settings.speed}
          onSeek={engine.seekTo}
        />

        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-1 sm:gap-2">
            <Button variant="ghost" size="icon" className={ctrlBtn} onClick={engine.toStart} aria-label="Inicio">
              <SkipBack />
            </Button>
            <Button variant="ghost" size="icon" className={ctrlBtn} onClick={() => engine.step(-10)} aria-label="Retroceder">
              <Rewind />
            </Button>
            <Button
              size="icon"
              onClick={engine.toggle}
              aria-label={engine.isPlaying ? "Pausar" : "Reproducir"}
              className="h-14 w-14 rounded-full bg-white text-black hover:bg-white/90"
            >
              {engine.isPlaying ? (
                <Pause className="!size-6" />
              ) : (
                <Play className="!size-6 translate-x-0.5" />
              )}
            </Button>
            <Button variant="ghost" size="icon" className={ctrlBtn} onClick={() => engine.step(10)} aria-label="Avanzar">
              <FastForward />
            </Button>
            <Button variant="ghost" size="icon" className={ctrlBtn} onClick={engine.toEnd} aria-label="Final">
              <SkipForward />
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <SpeedSelector speed={settings.speed} onChange={(s: Speed) => update({ speed: s })} />
            <MethodSelector method={settings.method} onMethod={onMethod} dark showTagline={false} />
          </div>
        </div>
      </div>

      <SummaryOverlay
        open={summary !== null}
        loading={summaryLoading}
        summary={summary}
        onClose={() => setSummary(null)}
      />
      <FinishedDialog
        open={finished}
        meta={meta}
        words={words}
        onClose={() => setFinished(false)}
        onReadAgain={() => {
          engine.toStart();
          setFinished(false);
        }}
      />
    </div>
  );
}
