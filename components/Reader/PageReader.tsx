"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Type,
  BookOpenCheck,
} from "lucide-react";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useWakeLock } from "@/hooks/useWakeLock";
import {
  buildSegments,
  normalizeParagraphStarts,
  segmentIndexFor,
} from "@/lib/textStructure";
import { MethodSelector } from "./MethodSelector";
import { FinishedDialog } from "./FinishedDialog";
import { SummaryOverlay } from "./SummaryOverlay";
import { ChapterNav } from "./ChapterNav";
import { Button } from "@/components/ui/button";
import { activeProvider } from "@/lib/ai";
import { bionicSplit } from "@/lib/bionic";
import { updateBookMeta } from "@/lib/storage";
import { recordSession } from "@/lib/stats";
import { cn } from "@/lib/utils";
import type { BookMeta, ReadingMethod, BookSection } from "@/types";

/** Tamaño objetivo de página (palabras). Como un libro de bolsillo. */
const PAGE_TARGET = 230;

interface PageReaderProps {
  meta: BookMeta;
  words: string[];
  paraStarts?: number[];
  sections?: BookSection[];
  onMethod: (m: ReadingMethod) => void;
  /** Reporta la posición viva al contenedor (para cambiar de método sin saltos). */
  onProgress?: (index: number) => void;
}

/**
 * Modo Página (escalón 3, la graduación): el libro tal cual, paginado, a tu
 * propio ritmo — sin temporizador ni palabras que huyen.
 *
 * Mejoras de esta versión:
 * - Las páginas terminan siempre en fin de oración (y de párrafo cuando hay
 *   uno cerca) — nunca cortan una idea a la mitad.
 * - Párrafos reales, con sangría, como un libro impreso (detectados al parsear
 *   el PDF; los libros viejos usan párrafos aproximados por oraciones).
 * - La reanudación vuelve a la MISMA página (antes retomaba una adelante).
 * - Solo cuentan como leídas las páginas que realmente pasaste, y el modo
 *   autopaso ya no registra la velocidad RSVP en las estadísticas.
 */
export function PageReader({
  meta,
  words,
  paraStarts,
  sections,
  onMethod,
  onProgress,
}: PageReaderProps) {
  const router = useRouter();
  const { settings, update } = useSettingsStore();

  // Párrafos (reales o aproximados) y páginas alineadas a oración/párrafo.
  const paragraphs = useMemo(
    () => normalizeParagraphStarts(words, paraStarts),
    [words, paraStarts]
  );
  const pageStarts = useMemo(
    () =>
      buildSegments(words, PAGE_TARGET, {
        min: 120,
        max: 330,
        breakpoints: paragraphs,
      }),
    [words, paragraphs]
  );
  const totalPages = pageStarts.length;

  const [page, setPage] = useState(() =>
    segmentIndexFor(pageStarts, Math.min(meta.progressIndex, words.length - 1))
  );
  const [finished, setFinished] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Nueva página → arrancar desde arriba.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [page]);

  // Posición viva para el contenedor (cambio de método sin perder el lugar).
  useEffect(() => {
    onProgress?.(pageStarts[page] ?? 0);
  }, [page, pageStarts, onProgress]);

  // Mientras el libro está abierto, la pantalla no se apaga.
  useWakeLock(!finished);

  const pageStart = pageStarts[page] ?? 0;
  const pageEnd = pageStarts[page + 1] ?? words.length; // exclusivo

  // Párrafos contenidos en la página actual.
  const pageParagraphs = useMemo(() => {
    const out: { start: number; text: string[] }[] = [];
    let segStart = pageStart;
    for (const ps of paragraphs) {
      if (ps <= pageStart) continue;
      if (ps >= pageEnd) break;
      out.push({ start: segStart, text: words.slice(segStart, ps) });
      segStart = ps;
    }
    out.push({ start: segStart, text: words.slice(segStart, pageEnd) });
    return out;
  }, [words, paragraphs, pageStart, pageEnd]);

  // --- Persistencia de progreso / tiempo / palabras ---
  // completedThrough: fin (exclusivo) de la última página realmente PASADA.
  // progressIndex guardado: inicio de la página actual → reanudar vuelve acá.
  const enteredAt = useRef(performance.now());
  const mountTime = useRef(0);
  const pendingTime = useRef(0);
  const completedThrough = useRef(Math.min(meta.progressIndex, words.length));
  const lastCounted = useRef(Math.min(meta.progressIndex, words.length));
  const pageRef = useRef(page);
  pageRef.current = page;
  // "Libro terminado" se registra UNA sola vez por sesión (ver useReaderEngine).
  const finishRecorded = useRef(meta.finished);

  const flush = useCallback(
    async (opts: { finishedBook?: boolean; atPage?: number } = {}) => {
      const now = performance.now();
      const elapsed = now - enteredAt.current;
      enteredAt.current = now;
      pendingTime.current += elapsed;
      mountTime.current += elapsed;

      const wordsDelta = Math.max(
        0,
        completedThrough.current - lastCounted.current
      );
      lastCounted.current = completedThrough.current;

      const done =
        !!opts.finishedBook || completedThrough.current >= words.length;
      await updateBookMeta({
        ...meta,
        progressIndex: done
          ? words.length
          : (pageStarts[opts.atPage ?? pageRef.current] ?? 0),
        timeReadMs: meta.timeReadMs + mountTime.current,
        finished: done || meta.finished,
        updatedAt: Date.now(),
      });
      await recordSession({
        wordsRead: wordsDelta,
        timeReadMs: pendingTime.current,
        // Sin `speed`: el modo autopaso no debe falsear récords ni promedios.
        finishedBook: done && !finishRecorded.current,
      });
      if (done) finishRecorded.current = true;
      pendingTime.current = 0;
    },
    [meta, words.length, pageStarts]
  );

  // Autoguardado cada 5 s + guardado al salir.
  useEffect(() => {
    const id = setInterval(() => void flush(), 5000);
    const onHide = () => void flush();
    window.addEventListener("pagehide", onHide);
    return () => {
      clearInterval(id);
      window.removeEventListener("pagehide", onHide);
      void flush();
    };
  }, [flush]);

  const goPrev = useCallback(() => {
    const target = Math.max(0, page - 1);
    setPage(target);
    void flush({ atPage: target });
  }, [page, flush]);

  const goNext = useCallback(() => {
    // Pasar una página = esa página quedó leída.
    completedThrough.current = Math.max(completedThrough.current, pageEnd);
    if (page >= totalPages - 1) {
      completedThrough.current = words.length;
      void flush({ finishedBook: true });
      setFinished(true);
      return;
    }
    const target = Math.min(totalPages - 1, page + 1);
    setPage(target);
    void flush({ atPage: target });
  }, [page, totalPages, words.length, pageEnd, flush]);

  const openSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummary("");
    const text = words.slice(Math.max(0, pageEnd - 1500), pageEnd).join(" ");
    setSummary(await activeProvider.summarize(text));
    setSummaryLoading(false);
  }, [words, pageEnd]);

  // Atajos: flechas para pasar página.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (summary !== null || finished) return;
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft") {
        goPrev();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev, summary, finished]);

  const pct = totalPages > 0 ? ((page + 1) / totalPages) * 100 : 0;
  const fontPx = Math.min(24, Math.max(16, Math.round(settings.fontSize * 0.32)));
  const isLast = page >= totalPages - 1;

  return (
    <div
      className="relative flex h-dvh w-screen flex-col overflow-hidden"
      style={{ backgroundColor: settings.backgroundColor }}
    >
      {/* Top bar — superficie sólida translúcida para que los controles se lean
          sobre cualquier color de fondo (antes usaba mix-blend-difference, que
          quedaba con bajo contraste sobre fondos de tono medio). */}
      <div className="safe-top safe-x flex items-center justify-between bg-black/60 pb-3 backdrop-blur">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              void flush();
              router.push("/");
            }}
            className="bg-transparent text-white/70 hover:bg-white/10 hover:text-white"
            aria-label="Volver"
          >
            <ArrowLeft />
          </Button>
          {sections && sections.length > 0 && (
            <ChapterNav
              sections={sections}
              totalWords={words.length}
              currentWord={pageStarts[page] ?? 0}
              wpm={settings.speed}
              onSeek={(w) => setPage(segmentIndexFor(pageStarts, w))}
              dark
            />
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* Tamaño de letra */}
          <Button
            variant="ghost"
            size="icon"
            className="bg-transparent text-white/70 hover:bg-white/10 hover:text-white"
            onClick={() => update({ fontSize: Math.max(32, settings.fontSize - 6) })}
            aria-label="Reducir letra"
          >
            <span className="text-xs">A</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="bg-transparent text-white/70 hover:bg-white/10 hover:text-white"
            onClick={() => update({ fontSize: Math.min(96, settings.fontSize + 6) })}
            aria-label="Aumentar letra"
          >
            <span className="text-lg">A</span>
          </Button>
          {/* Bionic */}
          <button
            onClick={() => update({ bionicEnabled: !settings.bionicEnabled })}
            className={cn(
              "flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm transition-colors",
              settings.bionicEnabled
                ? "bg-white/15 text-white"
                : "text-white/60 hover:bg-white/10 hover:text-white"
            )}
            aria-pressed={settings.bionicEnabled}
            title="Anclaje de fijación (resalta el inicio de cada palabra)"
          >
            <Type className="size-4" /> Bionic
          </button>
          <button
            onClick={openSummary}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Sparkles className="size-4" /> Resumen
          </button>
        </div>
      </div>

      {/* Página con zonas de toque para pasar. */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Zona toque anterior */}
        <button
          className="absolute left-0 top-0 z-10 h-full w-1/4 sm:w-1/6"
          onClick={goPrev}
          aria-label="Página anterior"
          tabIndex={-1}
        />
        {/* Zona toque siguiente */}
        <button
          className="absolute right-0 top-0 z-10 h-full w-1/4 sm:w-1/6"
          onClick={goNext}
          aria-label="Página siguiente"
          tabIndex={-1}
        />

        <div
          ref={scrollRef}
          className="mx-auto w-full max-w-2xl overflow-y-auto px-6 py-4"
        >
          <div
            style={{
              fontFamily: settings.fontFamily,
              fontSize: `${fontPx}px`,
              color: settings.textColor,
              letterSpacing: `${settings.letterSpacing}em`,
              lineHeight: 1.75,
            }}
          >
            {pageParagraphs.map((para, pi) => (
              <p
                key={para.start}
                className="text-justify"
                style={{
                  hyphens: "auto",
                  textIndent: pi === 0 ? 0 : "1.35em",
                  marginBottom: "0.65em",
                }}
              >
                {para.text.map((w, i) => {
                  if (!settings.bionicEnabled)
                    return <span key={i}>{w} </span>;
                  const { head, tail } = bionicSplit(w);
                  return (
                    <span key={i}>
                      <b style={{ fontWeight: 700 }}>{head}</b>
                      {tail}{" "}
                    </span>
                  );
                })}
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom controls */}
      <div className="safe-x safe-bottom space-y-3 bg-black/60 pt-3 backdrop-blur">
        {/* Progreso por páginas */}
        <div className="space-y-1.5 text-white/70">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-white/80 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="max-w-[45%] truncate font-medium text-white/90">
              {meta.title}
            </span>
            <span>
              Página {page + 1} / {totalPages}
            </span>
            <span>{pct.toFixed(0)}%</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-white/80 hover:bg-white/10 hover:text-white bg-transparent disabled:opacity-30"
            onClick={goPrev}
            disabled={page === 0}
            aria-label="Anterior"
          >
            <ChevronLeft />
          </Button>

          <MethodSelector method={settings.method} onMethod={onMethod} dark showTagline={false} />

          {isLast ? (
            <Button
              onClick={goNext}
              className="gap-2 bg-white text-black hover:bg-white/90"
            >
              <BookOpenCheck className="size-4" /> Terminar
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="text-white/80 hover:bg-white/10 hover:text-white bg-transparent"
              onClick={goNext}
              aria-label="Siguiente"
            >
              <ChevronRight />
            </Button>
          )}
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
          setPage(0);
          completedThrough.current = 0;
          lastCounted.current = 0;
          setFinished(false);
        }}
      />
    </div>
  );
}
