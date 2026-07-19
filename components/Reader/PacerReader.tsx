"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { useSettingsStore } from "@/store/useSettingsStore";
import { SpeedSelector } from "./SpeedSelector";
import { MethodSelector } from "./MethodSelector";
import { FinishedDialog } from "./FinishedDialog";
import { SummaryOverlay } from "./SummaryOverlay";
import { ProgressBar } from "./ProgressBar";
import { Button } from "@/components/ui/button";
import { activeProvider } from "@/lib/ai";
import { cn } from "@/lib/utils";
import type { BookMeta, ReadingMethod, Speed } from "@/types";

/** Ventana de palabras visibles alrededor de la palabra activa. */
const WINDOW = 60;
/** Cuántas palabras ya leídas se muestran antes de la activa (la ancla queda fija). */
const LEAD = 12;

const ctrlBtn = "text-white/80 hover:text-white hover:bg-white/10 bg-transparent";

interface PacerReaderProps {
  meta: BookMeta;
  words: string[];
  onMethod: (m: ReadingMethod) => void;
}

/**
 * Modo Guía (escalón 2): el texto se ve en contexto y un realce barre a ritmo
 * fijo, guiando la mirada palabra por palabra. Es el puente entre "que me den
 * las palabras" (RSVP) y "yo recorro la página" (Página).
 *
 * Reutiliza el motor RSVP —misma cadencia, mismo guardado de progreso y
 * estadísticas— pero pinta el texto completo con la palabra activa resaltada.
 */
export function PacerReader({ meta, words, onMethod }: PacerReaderProps) {
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
    onFinish: () => setFinished(true),
  });

  const span = engine.chunk.span;
  const index = engine.index;

  // Ventana estable: la palabra activa queda siempre en el mismo lugar y el
  // texto fluye por detrás (efecto teleprompter, sin saltos).
  const winStart = Math.max(0, index - LEAD);
  const winEnd = Math.min(words.length, winStart + WINDOW);
  const windowWords = useMemo(
    () => words.slice(winStart, winEnd),
    [words, winStart, winEnd]
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

  const highlight = settings.orpEnabled ? settings.orpColor : "#3b82f6";

  return (
    <div
      className="relative flex h-screen w-screen flex-col overflow-hidden"
      style={{ backgroundColor: settings.backgroundColor }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3">
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
        <button
          onClick={openSummary}
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white mix-blend-difference"
        >
          <Sparkles className="size-4" /> Resumen
        </button>
      </div>

      {/* Reading stage — texto en contexto con realce guía. */}
      <div className="flex flex-1 items-center justify-center overflow-hidden px-6">
        <p
          className="max-w-3xl select-none text-center"
          style={{
            fontFamily: settings.fontFamily,
            fontSize: `clamp(20px, ${Math.max(22, settings.fontSize * 0.42)}px, 34px)`,
            color: settings.textColor,
            letterSpacing: `${settings.letterSpacing}em`,
            lineHeight: 1.9,
          }}
        >
          {windowWords.map((w, i) => {
            const globalIdx = winStart + i;
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
                    : { opacity: isRead ? 0.3 : 0.72 }
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
