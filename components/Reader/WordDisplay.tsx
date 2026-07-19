"use client";

import * as React from "react";
import { splitAtOrp } from "@/lib/orp";
import type { ReaderSettings } from "@/types";
import type { SemanticGroup } from "@/lib/semantic-groups";

interface WordDisplayProps {
  chunkText: string;
  pivotWord: string;
  settings: ReaderSettings;
  currentWordIndex?: number;
  semanticGroup?: SemanticGroup | null;
  wordImportance?: number;
}

/**
 * Renders the current chunk con soporte para:
 * - RSVP (One word at a time with ORP)
 * - Grupos Semánticos (2-4 palabras con fijación natural)
 * - Degradados dinámicos basados en importancia
 */
export const WordDisplay = React.memo(function WordDisplay({
  chunkText,
  pivotWord,
  settings,
  wordImportance = 0.5,
  semanticGroup,
}: WordDisplayProps) {
  // Calcular colores dinámicos basados en importancia
  const getGradientColor = (importance: number): string => {
    if (importance > 0.7) return settings.orpColor; // Palabras clave: color destacado
    if (importance > 0.5) return settings.textColor; // Normales: color base
    // Palabras menos importantes: un poco más tenues
    return settings.textColor + "99"; // 60% opacity
  };

  const style: React.CSSProperties = {
    fontFamily: settings.fontFamily,
    fontSize: settings.fontSize,
    color: settings.textColor,
    letterSpacing: `${settings.letterSpacing}em`,
    lineHeight: 1.1,
    fontWeight: 600,
  };

  if (!settings.orpEnabled) {
    return (
      <div className="text-center" style={style}>
        {chunkText}
      </div>
    );
  }

  const { before, pivot, after } = splitAtOrp(pivotWord);
  const rest = chunkText.slice(pivotWord.length);

  const pivotColor = getGradientColor(wordImportance);
  const pivotSize = `${settings.fontSize * (0.9 + wordImportance * 0.2)}px`;

  return (
    <div className="relative flex w-full items-baseline justify-center" style={style}>
      {/* Guía visual vertical mejorada */}
      <div
        className="pointer-events-none absolute inset-y-0 w-1 bg-gradient-to-b"
        style={{
          left: "50%",
          transform: "translateX(-50%)",
          background: `linear-gradient(to bottom, ${settings.orpColor}00, ${settings.orpColor}40, ${settings.orpColor}00)`,
          opacity: 0.3,
        }}
      />

      {/* Información del grupo semántico */}
      {semanticGroup && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs text-muted-foreground whitespace-nowrap">
          {semanticGroup.type === "sentence" ? "Oración" : "Frase"} •{" "}
          {Math.round(semanticGroup.importance * 100)}% importante
        </div>
      )}

      {/* Left half */}
      <span className="flex-1 whitespace-pre text-right" style={{ opacity: 0.6 }}>
        {before}
      </span>

      {/* Pivot palabra con énfasis dinámico */}
      <span
        style={{
          color: pivotColor,
          fontSize: pivotSize,
          fontWeight: 700,
          transition: "all 0.2s ease-out",
          textShadow:
            wordImportance > 0.7
              ? `0 0 10px ${settings.orpColor}40`
              : "none",
          whiteSpace: "pre",
        }}
      >
        {pivot}
      </span>

      {/* Right half */}
      <span className="flex-1 whitespace-pre text-left">
        {after}
        {rest}
      </span>
    </div>
  );
});
