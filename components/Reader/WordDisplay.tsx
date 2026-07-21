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

/** Respiro mínimo a cada lado para que la palabra nunca toque el borde. */
const SIDE_MARGIN = 20;
/** Nunca achicar por debajo de esto: preferimos recortar antes que ilegible. */
const MIN_FONT = 16;

/**
 * Canvas reutilizable para medir el ancho REAL del texto en píxeles con la
 * fuente y el peso exactos. measureText es preciso y microscópicamente rápido,
 * así que puede correr en cada chunk (incluso a 600 ppm) sin costo perceptible.
 */
let measureCtx: CanvasRenderingContext2D | null = null;
function measureWidth(
  text: string,
  weight: number,
  fontPx: number,
  fontFamily: string,
  letterSpacingEm: number
): number {
  if (typeof document === "undefined") {
    // Fallback SSR: estimación conservadora (nunca subestima el ancho).
    return text.length * fontPx * (0.62 + letterSpacingEm);
  }
  if (!measureCtx) {
    measureCtx = document.createElement("canvas").getContext("2d");
  }
  if (!measureCtx) return text.length * fontPx * (0.62 + letterSpacingEm);
  measureCtx.font = `${weight} ${fontPx}px ${fontFamily}`;
  const base = measureCtx.measureText(text).width;
  // letter-spacing añade ~letterSpacingEm·fontPx de avance por carácter.
  return base + text.length * letterSpacingEm * fontPx;
}

/**
 * Renderiza el chunk actual con auto-ajuste de tamaño para que SIEMPRE entre en
 * pantalla (el escenario recorta a lo ancho del viewport):
 * - 1 palabra: ORP clásico — la letra pivote queda clavada en el centro. El
 *   tamaño se reduce si el lado más largo (normalmente el posterior al pivote)
 *   no cabe en su mitad; así la palabra nunca se sale por la derecha.
 * - 2–3 palabras: el chunk centrado con anclas de fijación (bionic), reducido
 *   si su ancho total supera el disponible.
 * Sin transiciones ni cambios animados: a alta velocidad cualquier animación
 * emborrona.
 */
export const WordDisplay = React.memo(function WordDisplay({
  chunkText,
  pivotWord,
  settings,
}: WordDisplayProps) {
  // Ancho del viewport (límite real de recorte). 0 hasta montar en cliente.
  const [viewportW, setViewportW] = React.useState(0);
  React.useEffect(() => {
    const onResize = () => setViewportW(window.innerWidth);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const isMultiWord = chunkText.includes(" ");
  const ff = settings.fontFamily;
  const ls = settings.letterSpacing;
  const userPx = settings.fontSize;

  // Ancho utilizable a cada lado del pivote (o total para multi-palabra).
  const available = viewportW > 0 ? viewportW - SIDE_MARGIN * 2 : Infinity;

  // Tamaño efectivo: se reduce sólo si hace falta para que entre.
  let fontPx = userPx;

  if (available !== Infinity) {
    if (isMultiWord) {
      // El ancho total del chunk debe caber en el ancho disponible.
      const total = measureWidth(chunkText, 700, userPx, ff, ls);
      if (total > available) {
        fontPx = Math.max(MIN_FONT, userPx * (available / total));
      }
    } else {
      // Con el pivote centrado, cada lado dispone de la mitad. El lado que
      // manda es el más ancho: pivote/2 + max(antes, después) ≤ disponible/2.
      const { before, pivot, after } = splitAtOrp(pivotWord);
      const bw = measureWidth(before, 600, userPx, ff, ls);
      const pw = measureWidth(pivot, 800, userPx, ff, ls);
      const aw = measureWidth(after, 600, userPx, ff, ls);
      const needed = pw / 2 + Math.max(bw, aw);
      const half = available / 2;
      if (needed > half) {
        fontPx = Math.max(MIN_FONT, userPx * (half / needed));
      }
    }
  }

  const style: React.CSSProperties = {
    fontFamily: ff,
    fontSize: `${fontPx}px`,
    color: settings.textColor,
    letterSpacing: `${ls}em`,
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
          mitades valen exactamente la mitad y el pivote queda clavado. */}
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
