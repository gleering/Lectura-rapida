"use client";

import {
  Play,
  Pause,
  Rewind,
  FastForward,
  SkipBack,
  SkipForward,
  Maximize,
  Minimize,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SpeedSelector } from "./SpeedSelector";
import type { ReaderMode, Speed } from "@/types";
import { cn } from "@/lib/utils";

interface ControlsProps {
  isPlaying: boolean;
  speed: Speed;
  mode: ReaderMode;
  orpEnabled: boolean;
  isFullscreen: boolean;
  onToggle: () => void;
  onStep: (delta: number) => void;
  onStart: () => void;
  onEnd: () => void;
  onSpeed: (s: Speed) => void;
  onMode: (m: ReaderMode) => void;
  onToggleOrp: (v: boolean) => void;
  onFullscreen: () => void;
}

const ctrlBtn =
  "text-white/80 hover:text-white hover:bg-white/10 bg-transparent";

export function Controls({
  isPlaying,
  speed,
  mode,
  orpEnabled,
  isFullscreen,
  onToggle,
  onStep,
  onStart,
  onEnd,
  onSpeed,
  onMode,
  onToggleOrp,
  onFullscreen,
}: ControlsProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      {/* Transport */}
      <div className="flex items-center gap-1 sm:gap-2">
        <Button
          variant="ghost"
          size="icon"
          className={ctrlBtn}
          onClick={onStart}
          aria-label="Ir al inicio"
        >
          <SkipBack />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={ctrlBtn}
          onClick={() => onStep(-10)}
          aria-label="Retroceder 10 palabras"
        >
          <Rewind />
        </Button>
        <Button
          size="icon"
          onClick={onToggle}
          aria-label={isPlaying ? "Pausar" : "Reproducir"}
          className="h-14 w-14 rounded-full bg-white text-black hover:bg-white/90"
        >
          {isPlaying ? (
            <Pause className="!size-6" />
          ) : (
            <Play className="!size-6 translate-x-0.5" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={ctrlBtn}
          onClick={() => onStep(10)}
          aria-label="Avanzar 10 palabras"
        >
          <FastForward />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={ctrlBtn}
          onClick={onEnd}
          aria-label="Ir al final"
        >
          <SkipForward />
        </Button>
      </div>

      {/* Options row */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <SpeedSelector speed={speed} onChange={onSpeed} />

        {/* Mode: 1 / 2 / 3 words */}
        <div className="flex overflow-hidden rounded-md border border-white/20">
          {([1, 2, 3] as ReaderMode[]).map((m) => (
            <button
              key={m}
              onClick={() => onMode(m)}
              className={cn(
                "px-3 py-2 text-sm font-medium transition-colors",
                mode === m
                  ? "bg-white text-black"
                  : "bg-white/5 text-white/70 hover:bg-white/10"
              )}
              aria-pressed={mode === m}
              aria-label={`Modo ${m} ${m === 1 ? "palabra" : "palabras"}`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* ORP toggle */}
        <button
          onClick={() => onToggleOrp(!orpEnabled)}
          className={cn(
            "rounded-md border px-3 py-2 text-sm font-medium transition-colors",
            orpEnabled
              ? "border-white/20 bg-white/10 text-white"
              : "border-white/20 bg-white/5 text-white/50 hover:bg-white/10"
          )}
          aria-pressed={orpEnabled}
        >
          ORP
        </button>

        <Button
          variant="ghost"
          size="icon"
          className={ctrlBtn}
          onClick={onFullscreen}
          aria-label="Pantalla completa"
        >
          {isFullscreen ? <Minimize /> : <Maximize />}
        </Button>
      </div>
    </div>
  );
}
