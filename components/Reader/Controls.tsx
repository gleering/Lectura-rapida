"use client";

import * as React from "react";
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

/**
 * Focus-Blue light controls tray — matches the RSVP mockup.
 *
 * Memoizado: la bandeja no depende del índice de palabra (que cambia en cada
 * tick del RSVP), así que no debe re-renderizarse mientras las palabras fluyen.
 * Requiere que ReaderScreen pase callbacks estables (useCallback).
 */
export const Controls = React.memo(function Controls({
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
    "flex size-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-primary-bright active:scale-90";

  return (
    <div className="flex flex-col gap-3 sm:gap-5">
      {/* Method tabs + toggles row */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        {/* Method selector tabs */}
        <div className="flex rounded-lg bg-secondary p-1" role="radiogroup" aria-label="Estilo de lectura">
          {METHOD_TABS.map((m) => {
            const on = m.id === method;
            return (
              <button
                key={m.id}
                role="radio"
                aria-checked={on}
                onClick={() => onMethod(m.id)}
                className={cn(
                  "rounded-md px-3 py-2 text-sm transition-all sm:px-4",
                  on
                    ? "bg-card font-bold text-primary shadow-sm"
                    : "font-medium text-muted-foreground hover:text-foreground"
                )}
              >
                {m.label}
              </button>
            );
          })}
        </div>

        {/* Toggles: VISTA (mode) + ORP switch + fullscreen */}
        <div className="flex items-center gap-3 sm:gap-5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Vista
            </span>
            <div className="flex overflow-hidden rounded-md bg-secondary">
              {([1, 2, 3] as ReaderMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => onMode(m)}
                  aria-pressed={mode === m}
                  aria-label={`Modo ${m} ${m === 1 ? "palabra" : "palabras"}`}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center text-xs font-bold transition-colors",
                    mode === m
                      ? "bg-primary-bright text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent"
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              ORP
            </span>
            <button
              onClick={() => onToggleOrp(!orpEnabled)}
              aria-pressed={orpEnabled}
              aria-label="Alternar punto óptimo de reconocimiento"
              className={cn(
                "relative h-5 w-10 rounded-full transition-colors",
                orpEnabled ? "bg-primary-bright" : "bg-border"
              )}
            >
              <span
                className={cn(
                  "absolute top-1 h-3 w-3 rounded-full bg-card transition-all",
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
      <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-3 md:gap-5">
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
            className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-bright text-primary-foreground shadow-lg shadow-primary-bright/20 transition-all hover:bg-primary active:scale-95"
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
          <div className="flex items-center gap-4 rounded-2xl border border-border/40 bg-muted px-6 py-2">
            <button
              onClick={decSpeed}
              disabled={speedIdx <= 0}
              aria-label="Reducir velocidad"
              className="flex size-11 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-card active:scale-90 disabled:opacity-30"
            >
              <Minus className="size-4" />
            </button>
            <div className="flex min-w-[80px] flex-col items-center">
              <span className="text-2xl font-bold leading-none text-primary">
                {speed}
              </span>
              <span className="text-[10px] font-bold uppercase text-muted-foreground">
                PPM
              </span>
            </div>
            <button
              onClick={incSpeed}
              disabled={speedIdx >= SPEED_OPTIONS.length - 1}
              aria-label="Aumentar velocidad"
              className="flex size-11 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-card active:scale-90 disabled:opacity-30"
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
});
