"use client";

import {
  Play,
  Pause,
  ChevronsRight,
  ChevronsLeft,
  RotateCcw,
  RotateCw,
  Maximize,
  Minimize,
  Minus,
  Plus,
} from "lucide-react";
import { SPEED_OPTIONS, type ReaderMode, type ReadingMethod, type Speed } from "@/types";
import { cn } from "@/lib/utils";

interface ControlsProps {
  isPlaying: boolean;
  speed: Speed;
  mode: ReaderMode;
  method: ReadingMethod;
  orpEnabled: boolean;
  isFullscreen: boolean;
  onToggle: () => void;
  onStep: (delta: number) => void;
  onStart: () => void;
  onEnd: () => void;
  onSpeed: (s: Speed) => void;
  onMode: (m: ReaderMode) => void;
  onMethod: (m: ReadingMethod) => void;
  onToggleOrp: (v: boolean) => void;
  onFullscreen: () => void;
}

const METHOD_TABS: { id: ReadingMethod; label: string }[] = [
  { id: "rsvp", label: "RSVP" },
  { id: "pacer", label: "Guía" },
  { id: "page", label: "Página" },
];

/** Focus-Blue light controls tray — matches the RSVP mockup. */
export function Controls({
  isPlaying,
  speed,
  mode,
  method,
  orpEnabled,
  isFullscreen,
  onToggle,
  onStep,
  onStart,
  onEnd,
  onSpeed,
  onMode,
  onMethod,
  onToggleOrp,
  onFullscreen,
}: ControlsProps) {
  const speedIdx = SPEED_OPTIONS.indexOf(speed);
  const decSpeed = () => {
    if (speedIdx > 0) onSpeed(SPEED_OPTIONS[speedIdx - 1]);
  };
  const incSpeed = () => {
    if (speedIdx < SPEED_OPTIONS.length - 1) onSpeed(SPEED_OPTIONS[speedIdx + 1]);
  };

  const transportBtn =
    "p-2 text-[#434655] transition-colors hover:text-[#2563eb] active:scale-90";

  return (
    <div className="flex flex-col gap-5">
      {/* Method tabs + toggles row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Method selector tabs */}
        <div className="flex rounded-lg bg-[#eaedff] p-1" role="radiogroup" aria-label="Estilo de lectura">
          {METHOD_TABS.map((m) => {
            const on = m.id === method;
            return (
              <button
                key={m.id}
                role="radio"
                aria-checked={on}
                onClick={() => onMethod(m.id)}
                className={cn(
                  "rounded-md px-4 py-2 text-sm transition-all",
                  on
                    ? "bg-[#faf8ff] font-bold text-[#004ac6] shadow-sm"
                    : "font-medium text-[#434655] hover:text-[#131b2e]"
                )}
              >
                {m.label}
              </button>
            );
          })}
        </div>

        {/* Toggles: VISTA (mode) + ORP switch + fullscreen */}
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-[#434655]">
              Vista
            </span>
            <div className="flex overflow-hidden rounded-md bg-[#eaedff]">
              {([1, 2, 3] as ReaderMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => onMode(m)}
                  aria-pressed={mode === m}
                  aria-label={`Modo ${m} ${m === 1 ? "palabra" : "palabras"}`}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center text-xs font-bold transition-colors",
                    mode === m
                      ? "bg-[#2563eb] text-white"
                      : "text-[#434655] hover:bg-[#e2e7ff]"
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-[#434655]">
              ORP
            </span>
            <button
              onClick={() => onToggleOrp(!orpEnabled)}
              aria-pressed={orpEnabled}
              aria-label="Alternar punto óptimo de reconocimiento"
              className={cn(
                "relative h-5 w-10 rounded-full transition-colors",
                orpEnabled ? "bg-[#2563eb]" : "bg-[#c3c6d7]"
              )}
            >
              <span
                className={cn(
                  "absolute top-1 h-3 w-3 rounded-full bg-white transition-all",
                  orpEnabled ? "right-1" : "left-1"
                )}
              />
            </button>
          </div>

          <button
            onClick={onFullscreen}
            aria-label="Pantalla completa"
            className={transportBtn}
          >
            {isFullscreen ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
          </button>
        </div>
      </div>

      {/* Transport + WPM stepper */}
      <div className="grid grid-cols-1 items-center gap-5 md:grid-cols-3">
        {/* Transport */}
        <div className="order-2 flex items-center justify-center gap-3 md:order-1 md:justify-start sm:gap-4">
          <button className={transportBtn} onClick={onStart} aria-label="Ir al inicio">
            <ChevronsLeft className="size-6" />
          </button>
          <button className={transportBtn} onClick={() => onStep(-10)} aria-label="Retroceder 10 palabras">
            <RotateCcw className="size-6" />
          </button>
          <button
            onClick={onToggle}
            aria-label={isPlaying ? "Pausar" : "Reproducir"}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-[#2563eb] text-white shadow-lg shadow-[#2563eb]/20 transition-all hover:bg-[#004ac6] active:scale-95"
          >
            {isPlaying ? (
              <Pause className="!size-8" fill="currentColor" />
            ) : (
              <Play className="!size-8 translate-x-0.5" fill="currentColor" />
            )}
          </button>
          <button className={transportBtn} onClick={() => onStep(10)} aria-label="Avanzar 10 palabras">
            <RotateCw className="size-6" />
          </button>
          <button className={transportBtn} onClick={onEnd} aria-label="Ir al final">
            <ChevronsRight className="size-6" />
          </button>
        </div>

        {/* WPM stepper */}
        <div className="order-1 flex justify-center md:order-2">
          <div className="flex items-center gap-4 rounded-2xl border border-[#c3c6d7]/40 bg-[#f2f3ff] px-6 py-2">
            <button
              onClick={decSpeed}
              disabled={speedIdx <= 0}
              aria-label="Reducir velocidad"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[#737686] text-[#434655] transition-colors hover:bg-[#faf8ff] active:scale-90 disabled:opacity-30"
            >
              <Minus className="size-4" />
            </button>
            <div className="flex min-w-[80px] flex-col items-center">
              <span className="text-2xl font-bold leading-none text-[#004ac6]">
                {speed}
              </span>
              <span className="text-[10px] font-bold uppercase text-[#434655]">
                PPM
              </span>
            </div>
            <button
              onClick={incSpeed}
              disabled={speedIdx >= SPEED_OPTIONS.length - 1}
              aria-label="Aumentar velocidad"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[#737686] text-[#434655] transition-colors hover:bg-[#faf8ff] active:scale-90 disabled:opacity-30"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </div>

        {/* Spacer to balance the grid on desktop */}
        <div className="order-3 hidden md:block" />
      </div>
    </div>
  );
}
