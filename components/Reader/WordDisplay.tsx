"use client";

import * as React from "react";
import { splitAtOrp } from "@/lib/orp";
import { bionicSplit } from "@/lib/bionic";
import type { ReaderSettings } from "@/types";

interface WordDisplayProps {
  chunkText: string;
  pivotWord: string;
  settings: ReaderSettings;
}

/**
 * Renderiza el chunk actual:
 * - 1 palabra: ORP clásico — la letra pivote queda clavada en el centro de la
 *   pantalla y pintada con el color ORP. Sin transiciones ni cambios de tamaño:
 *   a 600 ppm cualquier animación emborrona.
 * - 2–3 palabras: el chunk centrado con anclas de fijación (inicio de cada
 *   palabra en negrita) — el ORP de una sola letra no tiene sentido cuando la
 *   mirada debe abarcar un grupo.
 */
export const WordDisplay = React.memo(function WordDisplay({
  chunkText,
  pivotWord,
  settings,
}: WordDisplayProps) {
  const isMultiWord = chunkText.includes(" ");

  const style: React.CSSProperties = {
    fontFamily: settings.fontFamily,
    // La fuente elegida por el usuario, pero acotada al ancho del viewport para
    // que una palabra larga nunca se salga ni se recorte en pantallas chicas.
    // Los chunks de 2–3 palabras necesitan un tope más bajo porque ocupan más
    // ancho; si no, se parten en dos líneas y generan saltos verticales.
    fontSize: `min(${settings.fontSize}px, ${isMultiWord ? "8vw" : "12vw"})`,
    color: settings.textColor,
    letterSpacing: `${settings.letterSpacing}em`,
    lineHeight: 1.1,
    fontWeight: 600,
  };

  if (!settings.orpEnabled || isMultiWord) {
    return (
      <div
        className="mx-auto max-w-full overflow-hidden whitespace-nowrap text-center"
        style={style}
      >
        {isMultiWord
          ? chunkText.split(" ").map((w, i) => {
              const { head, tail } = bionicSplit(w);
              return (
                <span key={i} className="whitespace-pre">
                  <b style={{ fontWeight: 800 }}>{head}</b>
                  {tail}
                  {" "}
                </span>
              );
            })
          : chunkText}
      </div>
    );
  }

  const { before, pivot, after } = splitAtOrp(pivotWord);

  return (
    <div
      className="relative flex w-full items-baseline justify-center"
      style={style}
    >
      {/* Mitad izquierda — termina exactamente en el centro.
          min-w-0 es clave: sin él, flex-1 no puede encogerse por debajo del
          ancho de su texto (min-width:auto), así que en una palabra larga la
          mitad más ancha empuja el pivote fuera del centro. Con min-w-0 ambas
          mitades valen exactamente la mitad y el desborde queda simétrico. */}
      <span
        className="min-w-0 flex-1 whitespace-pre text-right"
        style={{ opacity: 0.85 }}
      >
        {before}
      </span>

      {/* Letra pivote: el punto de reconocimiento óptimo, siempre en el centro
          y siempre en el color guía. */}
      <span
        style={{
          color: settings.orpColor,
          fontWeight: 800,
          whiteSpace: "pre",
        }}
      >
        {pivot}
      </span>

      {/* Mitad derecha. */}
      <span
        className="min-w-0 flex-1 whitespace-pre text-left"
        style={{ opacity: 0.85 }}
      >
        {after}
      </span>
    </div>
  );
});
