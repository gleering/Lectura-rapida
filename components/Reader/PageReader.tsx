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
import { MethodSelector } from "./MethodSelector";
import { FinishedDialog } from "./FinishedDialog";
import { SummaryOverlay } from "./SummaryOverlay";
import { Button } from "@/components/ui/button";
import { activeProvider } from "@/lib/ai";
import { bionicSplit } from "@/lib/bionic";
import { updateBookMeta } from "@/lib/storage";
import { recordSession } from "@/lib/stats";
import { cn } from "@/lib/utils";
import type { BookMeta, ReadingMethod } from "@/types";

/** Palabras por página. ~un párrafo-página cómodo, como un libro de bolsillo. */
const PAGE_WORDS = 230;

interface PageReaderProps {
  meta: BookMeta;
  words: string[];
  onMethod: (m: ReadingMethod) => void;
}

/**
 * Modo Página (escalón 3, la graduación): el libro tal cual, paginado, a tu
 * propio ritmo — sin temporizador ni palabras que huyen. Es leer como en un
 * libro real, con el andamiaje mínimo (opcional: anclaje bionic de fijación).
 *
 * Persiste progreso, tiempo y palabras leídas igual que los demás modos, para
 * que las estadísticas y la resistencia lectora sigan creciendo.
 */
export function PageReader({ meta, words, onMethod }: PageReaderProps) {
  const router = useRouter();
  const { settings, update } = useSettingsStore();

  const totalPages = Math.max(1, Math.ceil(words.length / PAGE_WORDS));
  const [page, setPage] = useState(() =>
    Math.min(totalPages - 1, Math.floor(meta.progressIndex / PAGE_WORDS))
  );
  const [finished, setFinished] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const pageWords = useMemo(
    () => words.slice(page * PAGE_WORDS, (page + 1) * PAGE_WORDS),
    [words, page]
  );

  // --- Persistencia de progreso / tiempo / palabras (autopaso) ---
  const enteredAt = useRef(performance.now());
  const mountTime = useRef(0);
  const pendingTime = useRef(0);
  const lastFlushIndex = useRef(meta.progressIndex);
  const maxIndex = useRef(meta.progressIndex);

  const progressThrough = useCallback(
    (p: number) => Math.min(words.length, (p + 1) * PAGE_WORDS),
    [words.length]
  );

  const flush = useCallback(
    async (finishedBook = false) => {
      const now = performance.now();
      const elapsed = now - enteredAt.current;
      enteredAt.current = now;
      pendingTime.current += elapsed;
      mountTime.current += elapsed;

      const wordsDelta = Math.max(0, maxIndex.current - lastFlushIndex.current);
      lastFlushIndex.current = maxIndex.current;

      const done = finishedBook || maxIndex.current >= words.length;
      await updateBookMeta({
        ...meta,
        progressIndex: Math.min(maxIndex.current, words.length),
        timeReadMs: meta.timeReadMs + mountTime.current,
        finished: done || meta.finished,
        updatedAt: Date.now(),
      });
      await recordSession({
        wordsRead: wordsDelta,
        timeReadMs: pendingTime.current,
        speed: settings.speed,
        finishedBook: done && !meta.finished,
      });
      pendingTime.current = 0;
    },
    [meta, words.length, settings.speed]
  );

  // Al entrar a una página, marcar como leído hasta el final de ella.
  useEffect(() => {
    maxIndex.current = Math.max(maxIndex.current, progressThrough(page));
    enteredAt.current = performance.now();
  }, [page, progressThrough]);

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
    void flush();
    setPage((p) => Math.max(0, p - 1));
  }, [flush]);

  const goNext = useCallback(() => {
    if (page >= totalPages - 1) {
      maxIndex.current = words.length;
      void flush(true);
      setFinished(true);
      return;
    }
    void flush();
    setPage((p) => Math.min(totalPages - 1, p + 1));
  }, [page, totalPages, words.length, flush]);

  const openSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummary("");
    const upto = progressThrough(page);
    const text = words.slice(Math.max(0, upto - 1500), upto).join(" ");
    setSummary(await activeProvider.summarize(text));
    setSummaryLoading(false);
  }, [words, page, progressThrough]);

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

  const pct = ((page + 1) / totalPages) * 100;
  const fontPx = Math.min(24, Math.max(16, Math.round(settings.fontSize * 0.32)));
  const isLast = page >= totalPages - 1;

  return (
    <div
      className="relative flex h-screen w-screen flex-col overflow-hidden"
      style={{ backgroundColor: settings.backgroundColor }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            void flush();
            router.push("/");
          }}
          className="bg-transparent text-white/70 hover:bg-white/10 hover:text-white mix-blend-difference"
          aria-label="Volver"
        >
          <ArrowLeft />
        </Button>
        <div className="flex items-center gap-1">
          {/* Tamaño de letra */}
          <Button
            variant="ghost"
            size="icon"
            className="bg-transparent text-white/70 hover:bg-white/10 hover:text-white mix-blend-difference"
            onClick={() => update({ fontSize: Math.max(32, settings.fontSize - 6) })}
            aria-label="Reducir letra"
          >
            <span className="text-xs">A</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="bg-transparent text-white/70 hover:bg-white/10 hover:text-white mix-blend-difference"
            onClick={() => update({ fontSize: Math.min(96, settings.fontSize + 6) })}
            aria-label="Aumentar letra"
          >
            <span className="text-lg">A</span>
          </Button>
          {/* Bionic */}
          <button
            onClick={() => update({ bionicEnabled: !settings.bionicEnabled })}
            className={cn(
              "flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm transition-colors mix-blend-difference",
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
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white mix-blend-difference"
          >
            <Sparkles className="size-4" /> Resumen
          </button>
        </div>
      </div>

      {/* Página con zonas de toque para pasar. */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Zona toque anterior */}
        <button
          className="absolute left-0 top-0 z-10 h-full w-1/5"
          onClick={goPrev}
          aria-label="Página anterior"
          tabIndex={-1}
        />
        {/* Zona toque siguiente */}
        <button
          className="absolute right-0 top-0 z-10 h-full w-1/5"
          onClick={goNext}
          aria-label="Página siguiente"
          tabIndex={-1}
        />

        <div className="mx-auto flex w-full max-w-2xl items-start overflow-y-auto px-6 py-4">
          <p
            className="w-full text-justify"
            style={{
              fontFamily: settings.fontFamily,
              fontSize: `${fontPx}px`,
              color: settings.textColor,
              letterSpacing: `${settings.letterSpacing}em`,
              lineHeight: 1.75,
              hyphens: "auto",
            }}
          >
            {pageWords.map((w, i) => {
              if (!settings.bionicEnabled) return <span key={i}>{w} </span>;
              const { head, tail } = bionicSplit(w);
              return (
                <span key={i}>
                  <b style={{ fontWeight: 700 }}>{head}</b>
                  {tail}{" "}
                </span>
              );
            })}
          </p>
        </div>
      </div>

      {/* Bottom controls */}
      <div className="space-y-3 bg-black/60 px-4 pb-5 pt-3 backdrop-blur">
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
          maxIndex.current = 0;
          lastFlushIndex.current = 0;
          setFinished(false);
        }}
      />
    </div>
  );
}
