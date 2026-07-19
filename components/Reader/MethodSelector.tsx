"use client";

import { cn } from "@/lib/utils";
import { READING_METHODS, type ReadingMethod } from "@/types";

interface MethodSelectorProps {
  method: ReadingMethod;
  onMethod: (m: ReadingMethod) => void;
  /** true cuando el fondo es oscuro (modo RSVP) — ajusta los colores. */
  dark?: boolean;
  /** Muestra la frase de ayuda del método activo debajo del selector. */
  showTagline?: boolean;
  className?: string;
}

/**
 * Selector de estilo de lectura presentado como la escalera de rehabilitación:
 * RSVP → Guía → Página. Cambiarlo intercambia la vista del lector en vivo.
 */
export function MethodSelector({
  method,
  onMethod,
  dark = true,
  showTagline = true,
  className,
}: MethodSelectorProps) {
  const active = READING_METHODS.find((m) => m.id === method);

  return (
    <div className={cn("flex flex-col items-center gap-1.5", className)}>
      <div
        className={cn(
          "flex overflow-hidden rounded-full border",
          dark ? "border-white/20" : "border-black/15"
        )}
        role="radiogroup"
        aria-label="Estilo de lectura"
      >
        {READING_METHODS.map((m) => {
          const on = m.id === method;
          return (
            <button
              key={m.id}
              role="radio"
              aria-checked={on}
              onClick={() => onMethod(m.id)}
              className={cn(
                "px-3.5 py-1.5 text-sm font-medium transition-colors",
                on
                  ? dark
                    ? "bg-white text-black"
                    : "bg-black text-white"
                  : dark
                    ? "text-white/60 hover:bg-white/10 hover:text-white"
                    : "text-black/50 hover:bg-black/10 hover:text-black"
              )}
              title={m.tagline}
            >
              {m.label}
            </button>
          );
        })}
      </div>
      {showTagline && active && (
        <p
          className={cn(
            "px-2 text-center text-xs",
            dark ? "text-white/45" : "text-black/45"
          )}
        >
          Escalón {active.step} · {active.tagline}
        </p>
      )}
    </div>
  );
}
