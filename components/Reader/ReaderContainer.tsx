"use client";

import { useCallback, useMemo, useRef } from "react";
import { useSettingsStore } from "@/store/useSettingsStore";
import { ReaderScreen } from "./ReaderScreen";
import { PacerReader } from "./PacerReader";
import { PageReader } from "./PageReader";
import type { BookMeta, ReadingMethod, BookSection } from "@/types";

interface ReaderContainerProps {
  meta: BookMeta;
  words: string[];
  /** Inicios de párrafo detectados al parsear (libros nuevos). */
  paraStarts?: number[];
  /** Índice del libro (secciones). Se propaga a los 3 modos. */
  sections?: BookSection[];
}

/**
 * Elige la vista de lectura según el estilo activo (la escalera de
 * rehabilitación): RSVP → Guía → Página. Cambiar de método intercambia la
 * vista en vivo; cada una comparte el mismo guardado de progreso y el cierre
 * de consolidación al terminar.
 *
 * El índice vivo se mantiene acá: al cambiar de método, el nuevo lector
 * continúa EXACTAMENTE donde estaba el anterior (antes volvía a la posición
 * con la que se abrió el libro).
 */
export function ReaderContainer({
  meta,
  words,
  paraStarts,
  sections,
}: ReaderContainerProps) {
  const method = useSettingsStore((s) => s.settings.method);
  const update = useSettingsStore((s) => s.update);

  // Última posición conocida, actualizada por el lector activo.
  const liveIndex = useRef(meta.progressIndex);
  const onProgress = useCallback((i: number) => {
    liveIndex.current = i;
  }, []);

  const onMethod = useCallback(
    (m: ReadingMethod) => update({ method: m }),
    [update]
  );

  // Al cambiar de método, el lector nuevo monta con la posición viva.
  const effectiveMeta = useMemo(
    () => ({ ...meta, progressIndex: liveIndex.current }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [meta, method]
  );

  const common = {
    meta: effectiveMeta,
    words,
    paraStarts,
    sections,
    onMethod,
    onProgress,
  };

  if (method === "pacer") return <PacerReader key="pacer" {...common} />;
  if (method === "page") return <PageReader key="page" {...common} />;
  return <ReaderScreen key="rsvp" {...common} />;
}
