"use client";

import { useCallback } from "react";
import { useSettingsStore } from "@/store/useSettingsStore";
import { ReaderScreen } from "./ReaderScreen";
import { PacerReader } from "./PacerReader";
import { PageReader } from "./PageReader";
import type { BookMeta, ReadingMethod } from "@/types";

interface ReaderContainerProps {
  meta: BookMeta;
  words: string[];
}

/**
 * Elige la vista de lectura según el estilo activo (la escalera de
 * rehabilitación): RSVP → Guía → Página. Cambiar de método intercambia la
 * vista en vivo; cada una comparte el mismo guardado de progreso y el cierre
 * de consolidación al terminar.
 */
export function ReaderContainer({ meta, words }: ReaderContainerProps) {
  const method = useSettingsStore((s) => s.settings.method);
  const update = useSettingsStore((s) => s.update);

  const onMethod = useCallback(
    (m: ReadingMethod) => update({ method: m }),
    [update]
  );

  if (method === "pacer") {
    return <PacerReader meta={meta} words={words} onMethod={onMethod} />;
  }
  if (method === "page") {
    return <PageReader meta={meta} words={words} onMethod={onMethod} />;
  }
  return <ReaderScreen meta={meta} words={words} onMethod={onMethod} />;
}
