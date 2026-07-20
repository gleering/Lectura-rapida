"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  PartyPopper,
  Sparkles,
  Loader2,
  Brain,
  Check,
} from "lucide-react";
import { useReaderEngine } from "@/hooks/useReaderEngine";
import { useWakeLock } from "@/hooks/useWakeLock";
import { useSettingsStore } from "@/store/useSettingsStore";
import { sentenceRange } from "@/lib/textStructure";
import { WordDisplay } from "./WordDisplay";
import { Controls } from "./Controls";
import { ProgressBar } from "./ProgressBar";
import { ChapterNav } from "./ChapterNav";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import {
  activeProvider,
  type ComprehensionQuestion,
  type WordDefinition,
} from "@/lib/ai";
import {
  getGoal,
  saveGoal,
  getComprehension,
  saveComprehension,
  getReviewCardsByBook,
  saveReviewCards,
} from "@/lib/storage";
import { extractReviewConcepts } from "@/lib/active-recall";
import { createReviewCard } from "@/lib/spaced-repetition";
import { cn, formatNumber } from "@/lib/utils";
import type {
  BookMeta,
  ReaderMode,
  ReadingMethod,
  Speed,
  ReadingGoal,
  BookSection,
} from "@/types";

/** Perceived luminance of a hex colour (0–1). */
function isDarkColor(hex: string): boolean {
  const m = hex.replace("#", "");
  if (m.length < 6) return true;
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.5;
}

interface ReaderScreenProps {
  meta: BookMeta;
  words: string[];
  paraStarts?: number[];
  sections?: BookSection[];
  onMethod: (m: ReadingMethod) => void;
  /** Reporta la posición viva al contenedor (para cambiar de método sin saltos). */
  onProgress?: (index: number) => void;
}

export function ReaderScreen({
  meta,
  words,
  paraStarts,
  sections,
  onMethod,
  onProgress,
}: ReaderScreenProps) {
  const router = useRouter();
  const { settings, update } = useSettingsStore();
  const stageRef = useRef<HTMLDivElement>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [finished, setFinished] = useState(false);
  const [consolidating, setConsolidating] = useState(false);
  const [consolidateError, setConsolidateError] = useState<string | null>(null);

  // AI-driven dialogs.
  const [question, setQuestion] = useState<ComprehensionQuestion | null>(null);
  const [answered, setAnswered] = useState<number | null>(null);
  const [qCardSaved, setQCardSaved] = useState(false);
  const [savingQCard, setSavingQCard] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [definition, setDefinition] = useState<WordDefinition | null>(null);

  // Goal tracking.
  const goalRef = useRef<ReadingGoal | null>(null);
  const [goalDone, setGoalDone] = useState<ReadingGoal | null>(null);

  useEffect(() => {
    getGoal().then((g) => {
      goalRef.current = g;
    });
  }, []);

  const textReadSoFar = useCallback(
    (index: number) =>
      words.slice(Math.max(0, index - 1500), Math.max(index, 1)).join(" "),
    [words]
  );

  const handleComprehension = useCallback(
    async (index: number) => {
      const q = await activeProvider.comprehension(textReadSoFar(index));
      setAnswered(null);
      setQCardSaved(false);
      setQuestion(q);
    },
    [textReadSoFar]
  );

  const engine = useReaderEngine({
    words,
    meta,
    mode: settings.mode,
    speed: settings.speed,
    comprehensionInterval: settings.comprehensionInterval,
    paraStarts,
    onComprehension: handleComprehension,
    onFinish: () => setFinished(true),
  });

  // La pantalla no se apaga mientras las palabras fluyen (móvil).
  useWakeLock(engine.isPlaying);

  // Posición viva para el contenedor (cambio de método sin perder el lugar).
  useEffect(() => {
    onProgress?.(engine.index);
  }, [engine.index, onProgress]);

  // Contexto al pausar: la oración completa alrededor de la palabra actual.
  // Pausar RSVP dejaba una palabra suelta y sin contexto — la principal causa
  // de "¿dónde estaba?" al reanudar.
  const pauseContext = useMemo(() => {
    if (engine.isPlaying || finished || engine.index === 0) return null;
    if (words.length === 0) return null;
    const { start, end } = sentenceRange(words, Math.min(engine.index, words.length - 1));
    return { start, end };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine.isPlaying, engine.index, finished, words]);

  // Advance goal progress as words are read.
  const lastGoalIndex = useRef(meta.progressIndex);
  useEffect(() => {
    const goal = goalRef.current;
    if (!goal || goal.completed) return;
    const delta = engine.index - lastGoalIndex.current;
    lastGoalIndex.current = engine.index;
    if (delta <= 0) return;

    if (goal.type === "book") {
      if (engine.index >= words.length - 1) {
        const done = { ...goal, progress: words.length, completed: true };
        goalRef.current = done;
        void saveGoal(done);
        setGoalDone(done);
      }
    } else {
      goal.progress += delta;
      if (goal.progress >= goal.target) {
        goal.completed = true;
        void saveGoal(goal);
        setGoalDone({ ...goal });
      } else {
        void saveGoal(goal);
      }
    }
  }, [engine.index, words.length]);

  // Fullscreen sync.
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void stageRef.current?.requestFullscreen?.();
    }
  }, []);

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (question || summary !== null || definition || goalDone || finished)
        return;
      switch (e.key) {
        case " ":
          e.preventDefault();
          engine.toggle();
          break;
        case "ArrowLeft":
          engine.step(-10);
          break;
        case "ArrowRight":
          engine.step(10);
          break;
        case "Home":
          engine.toStart();
          break;
        case "End":
          engine.toEnd();
          break;
        case "f":
          toggleFullscreen();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    engine,
    toggleFullscreen,
    question,
    summary,
    definition,
    goalDone,
    finished,
  ]);

  const openSummary = useCallback(async () => {
    engine.pause();
    setSummaryLoading(true);
    setSummary("");
    const text = textReadSoFar(engine.index);
    const result = await activeProvider.summarize(text);
    setSummary(result);
    setSummaryLoading(false);
  }, [engine, textReadSoFar]);

  const openDictionary = useCallback(async () => {
    engine.pause();
    const word = engine.chunk.pivotWord;
    if (!word) return;
    const def = await activeProvider.define(word);
    setDefinition(def);
  }, [engine]);

  // Al terminar: convertir la lectura pasiva en recuerdo activo (cierra el bucle).
  const consolidate = useCallback(async () => {
    setConsolidating(true);
    setConsolidateError(null);
    try {
      const concepts = await extractReviewConcepts(meta.title, words.join(" "));
      if (!concepts || concepts.length === 0) {
        setConsolidateError(
          "No se pudieron crear tarjetas. Verifica que la IA esté configurada en el servidor (GEMINI_API_KEY)."
        );
        return;
      }
      const existing = await getReviewCardsByBook(meta.id);
      const startIdx = existing.length;
      const now = Date.now();
      const cards = concepts.map((c, i) =>
        createReviewCard({
          id: `${meta.id}_card_${startIdx + i}_${now}`,
          bookId: meta.id,
          concept: c.concept,
          prompt: c.prompt,
          answer: c.answer,
          source: c.source,
          now,
        })
      );
      await saveReviewCards(cards);
      router.push("/review");
    } finally {
      setConsolidating(false);
    }
  }, [meta.id, meta.title, words, router]);

  const answerQuestion = useCallback(
    async (choice: number) => {
      if (answered !== null || !question) return;
      setAnswered(choice);
      const prev = await getComprehension();
      await saveComprehension({
        correct: prev.correct + (choice === question.correctIndex ? 1 : 0),
        total: prev.total + 1,
      });
    },
    [answered, question]
  );

  // Fallo de comprensión = señal de máxima prioridad para repasar (aprendizaje
  // guiado por error). Programa esa idea como tarjeta de recuerdo activo.
  const saveQuestionCard = useCallback(async () => {
    if (!question || qCardSaved) return;
    setSavingQCard(true);
    try {
      const existing = await getReviewCardsByBook(meta.id);
      const now = Date.now();
      const card = createReviewCard({
        id: `${meta.id}_qcard_${existing.length}_${now}`,
        bookId: meta.id,
        concept: question.question.slice(0, 60),
        prompt: question.question,
        answer: question.options[question.correctIndex] ?? "",
        now,
      });
      await saveReviewCards([card]);
      setQCardSaved(true);
    } finally {
      setSavingQCard(false);
    }
  }, [question, qCardSaved, meta.id]);

  const bgDark = isDarkColor(settings.backgroundColor);
  const controlSurface = bgDark
    ? "bg-black/40 backdrop-blur"
    : "bg-white/50 backdrop-blur";

  return (
    <div
      ref={stageRef}
      className="reader-stage relative flex h-dvh w-screen flex-col overflow-hidden"
      style={{ backgroundColor: settings.backgroundColor }}
    >
      {/* Top bar */}
      <div className="safe-top safe-x flex items-center justify-between pb-3">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              void engine.flush();
              router.push("/");
            }}
            className={cn(
              "bg-transparent",
              bgDark
                ? "text-white/70 hover:bg-white/10 hover:text-white"
                : "text-black/60 hover:bg-black/10 hover:text-black"
            )}
            aria-label="Volver"
          >
            <ArrowLeft />
          </Button>
          {sections && sections.length > 0 && (
            <ChapterNav
              sections={sections}
              totalWords={words.length}
              currentWord={engine.index}
              wpm={settings.speed}
              onSeek={engine.seekTo}
              dark={bgDark}
            />
          )}
        </div>
        <button
          onClick={openSummary}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
            bgDark
              ? "text-white/70 hover:bg-white/10 hover:text-white"
              : "text-black/60 hover:bg-black/10 hover:text-black"
          )}
        >
          <Sparkles className="size-4" /> Resumen del capítulo
        </button>
      </div>

      {/* Reading stage — the flashing word. */}
      <div
        className="relative flex flex-1 flex-col"
        style={{ justifyContent: "flex-start" }}
      >
        <div
          className="flex w-full flex-1 items-start justify-center px-4"
          style={{ paddingTop: `${settings.verticalPosition}vh` }}
        >
          <button
            onClick={openDictionary}
            className="w-full max-w-4xl cursor-pointer select-none"
            aria-label="Ver definición de la palabra"
            title="Toca para ver la definición"
          >
            {/* ORP guide line */}
            {settings.orpEnabled && (
              <div className="pointer-events-none mx-auto mb-1 h-3 w-px bg-current opacity-20" />
            )}
            <WordDisplay
              chunkText={engine.chunk.text}
              pivotWord={engine.chunk.pivotWord}
              settings={settings}
            />
            {settings.orpEnabled && (
              <div className="pointer-events-none mx-auto mt-1 h-3 w-px bg-current opacity-20" />
            )}
          </button>
        </div>

        {/* Oración de contexto al pausar: re-ancla antes de reanudar. */}
        {pauseContext && (
          <div className="pointer-events-none flex justify-center px-8 pb-6">
            <p
              className="max-w-2xl text-center text-base leading-relaxed sm:text-lg"
              style={{
                fontFamily: settings.fontFamily,
                color: settings.textColor,
                opacity: 0.55,
              }}
            >
              {words.slice(pauseContext.start, pauseContext.end + 1).map((w, i) => {
                const idx = pauseContext.start + i;
                const isCurrent =
                  idx >= engine.index && idx < engine.index + engine.chunk.span;
                return (
                  <span
                    key={idx}
                    style={
                      isCurrent
                        ? {
                            color: settings.orpColor,
                            fontWeight: 700,
                            opacity: 1,
                          }
                        : undefined
                    }
                  >
                    {w}{" "}
                  </span>
                );
              })}
            </p>
          </div>
        )}
      </div>

      {/* Bottom controls + progress */}
      <div className={cn("safe-x safe-bottom space-y-4 pt-3", controlSurface)}>
        <ProgressBar
          title={meta.title}
          index={engine.index}
          total={words.length}
          wordsPerPage={meta.wordsPerPage}
          totalPages={meta.totalPages}
          speed={settings.speed}
          onSeek={engine.seekTo}
        />
        <Controls
          isPlaying={engine.isPlaying}
          speed={settings.speed}
          mode={settings.mode}
          method={settings.method}
          orpEnabled={settings.orpEnabled}
          isFullscreen={isFullscreen}
          onToggle={engine.toggle}
          onStep={engine.step}
          onStart={engine.toStart}
          onEnd={engine.toEnd}
          onSpeed={(s: Speed) => update({ speed: s })}
          onMode={(m: ReaderMode) => update({ mode: m })}
          onMethod={onMethod}
          onToggleOrp={(v) => update({ orpEnabled: v })}
          onFullscreen={toggleFullscreen}
        />
      </div>

      {/* Comprehension question */}
      <Dialog open={!!question} dismissible={false}>
        {question && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Pausa de comprensión</h2>
            <p className="text-sm text-muted-foreground">{question.question}</p>
            <div className="space-y-2">
              {question.options.map((opt, i) => {
                const isCorrect = i === question.correctIndex;
                const chosen = answered === i;
                return (
                  <button
                    key={i}
                    disabled={answered !== null}
                    onClick={() => answerQuestion(i)}
                    className={cn(
                      "w-full rounded-lg border p-3 text-left text-sm transition-colors",
                      answered === null && "hover:bg-secondary",
                      answered !== null && isCorrect &&
                        "border-green-500 bg-green-500/10",
                      chosen && !isCorrect && "border-destructive bg-destructive/10"
                    )}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            {answered !== null && (
              <div className="space-y-3">
                {answered !== question.correctIndex && (
                  <p className="text-xs text-muted-foreground">
                    Fallar aquí es una señal valiosa: programa esta idea para
                    repasarla antes de olvidarla.
                  </p>
                )}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    variant="outline"
                    className="flex-1"
                    disabled={qCardSaved || savingQCard}
                    onClick={saveQuestionCard}
                  >
                    {savingQCard ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Guardando…
                      </>
                    ) : qCardSaved ? (
                      <>
                        <Check className="mr-2 size-4" />
                        Guardada para repaso
                      </>
                    ) : (
                      <>
                        <Brain className="mr-2 size-4" />
                        Repasar esto luego
                      </>
                    )}
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => {
                      setQuestion(null);
                      engine.play();
                    }}
                  >
                    Continuar leyendo
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Dialog>

      {/* Chapter summary */}
      <Dialog open={summary !== null} onClose={() => setSummary(null)}>
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Sparkles className="size-5" /> Resumen de lo leído
          </h2>
          {summaryLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Generando resumen…
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {summary}
            </p>
          )}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setSummary(null)}
          >
            Cerrar
          </Button>
        </div>
      </Dialog>

      {/* Dictionary */}
      <Dialog open={!!definition} onClose={() => setDefinition(null)}>
        {definition && (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold">{definition.word}</h2>
            <div>
              <p className="text-xs uppercase text-muted-foreground">
                Definición
              </p>
              <p className="text-sm">{definition.definition}</p>
            </div>
            {definition.synonyms.length > 0 && (
              <div>
                <p className="text-xs uppercase text-muted-foreground">
                  Sinónimos
                </p>
                <p className="text-sm">{definition.synonyms.join(", ")}</p>
              </div>
            )}
            <div>
              <p className="text-xs uppercase text-muted-foreground">
                Explicación sencilla
              </p>
              <p className="text-sm">{definition.simple}</p>
            </div>
            <Button className="w-full" onClick={() => setDefinition(null)}>
              Cerrar
            </Button>
          </div>
        )}
      </Dialog>

      {/* Goal completed */}
      <Dialog open={!!goalDone} onClose={() => setGoalDone(null)}>
        {goalDone && (
          <div className="space-y-4 text-center">
            <PartyPopper className="mx-auto size-12 text-primary" />
            <h2 className="text-xl font-bold">¡Objetivo cumplido! 🎉</h2>
            <p className="text-muted-foreground">
              {goalDone.type === "book"
                ? "Terminaste el libro completo."
                : `Leíste ${formatNumber(goalDone.target)} palabras.`}
            </p>
            <Button className="w-full" onClick={() => setGoalDone(null)}>
              Seguir leyendo
            </Button>
          </div>
        )}
      </Dialog>

      {/* Finished */}
      <Dialog open={finished} onClose={() => setFinished(false)}>
        <div className="space-y-4 text-center">
          <PartyPopper className="mx-auto size-12 text-primary" />
          <h2 className="text-xl font-bold">¡Libro terminado!</h2>
          <p className="text-muted-foreground">
            Completaste “{meta.title}”. Ahora consolídalo: leer no es recordar.
            Convierte lo que acabas de leer en repaso activo para que pase a tu
            memoria de largo plazo.
          </p>

          {consolidateError && (
            <p className="text-sm text-destructive">{consolidateError}</p>
          )}

          <Button
            className="w-full"
            size="lg"
            disabled={consolidating}
            onClick={consolidate}
          >
            {consolidating ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Creando tarjetas…
              </>
            ) : (
              <>
                <Brain className="mr-2 size-4" />
                Consolidar en tarjetas de repaso
              </>
            )}
          </Button>

          <div className="flex justify-center gap-3">
            <Button
              variant="outline"
              disabled={consolidating}
              onClick={() => {
                engine.toStart();
                setFinished(false);
              }}
            >
              Leer de nuevo
            </Button>
            <Button
              variant="outline"
              disabled={consolidating}
              onClick={() => router.push("/stats")}
            >
              Ver estadísticas
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
