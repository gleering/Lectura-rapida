"use client";

import { useEffect, useMemo, useState } from "react";
import {
  List,
  X,
  Search,
  ChevronRight,
  BookMarked,
  FileText,
  Bookmark,
  Library,
  CheckCircle2,
  Circle,
  Dot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  buildSectionTree,
  filterSectionsByQuery,
  sectionRanges,
  sectionStatus,
  estimateMinutes,
  type SectionStatus,
  type SectionTreeNode,
} from "@/lib/tableOfContents";
import type { BookSection, SectionKind } from "@/types";

interface ChapterNavProps {
  sections: BookSection[];
  totalWords: number;
  /** Posición de lectura actual (palabra), para estado y resaltado. */
  currentWord: number;
  /** Velocidad actual (WPM) para estimar duración. */
  wpm: number;
  /** Salta a una palabra. Cada modo pasa su implementación. */
  onSeek: (word: number) => void;
  /** Estilo de la barra (claro/oscuro) para integrarse con el fondo. */
  dark?: boolean;
}

const KIND_ICON: Record<SectionKind, typeof FileText> = {
  cover: BookMarked,
  prologue: FileText,
  preface: FileText,
  introduction: FileText,
  part: Library,
  chapter: FileText,
  subchapter: Dot,
  epilogue: FileText,
  appendix: Bookmark,
  bibliography: Bookmark,
  other: FileText,
};

export function ChapterNav({
  sections,
  totalWords,
  currentWord,
  wpm,
  onSeek,
  dark = true,
}: ChapterNavProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  // Con el panel abierto, bloquear el scroll del fondo (evita el "scroll
  // fantasma" del reader detrás del índice) y cerrar con Escape.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // start (palabra) -> {end} para pintar estado/duración por sección.
  const endByStart = useMemo(() => {
    const map = new Map<number, number>();
    for (const r of sectionRanges(sections, totalWords)) {
      map.set(r.section.startWord, r.end);
    }
    return map;
  }, [sections, totalWords]);

  const filtered = useMemo(
    () => filterSectionsByQuery(sections, query),
    [sections, query]
  );
  const tree = useMemo(() => buildSectionTree(filtered), [filtered]);

  const hasIndex = sections.length > 1;

  const handleSeek = (word: number) => {
    onSeek(word);
    setOpen(false);
  };

  const btn = dark
    ? "text-white/70 hover:bg-white/10 hover:text-white"
    : "text-black/60 hover:bg-black/10 hover:text-black";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
          btn
        )}
        aria-label="Abrir índice"
        title="Índice del libro"
      >
        <List className="size-4" />
        <span className="hidden sm:inline">Índice</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          <button
            className="absolute inset-0 bg-black/60"
            aria-label="Cerrar índice"
            onClick={() => setOpen(false)}
          />
          <div className="relative flex h-full w-[86vw] max-w-sm flex-col bg-background text-foreground shadow-xl">
            <div className="safe-top flex items-center justify-between border-b px-4 pb-3">
              <h2 className="text-base font-semibold">Índice</h2>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary"
                aria-label="Cerrar"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="border-b px-4 py-2">
              <div className="flex items-center gap-2 rounded-md bg-secondary px-2.5 py-1.5">
                <Search className="size-4 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar capítulo…"
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
            </div>

            <div className="safe-bottom flex-1 overflow-y-auto p-2">
              {!hasIndex ? (
                <div className="p-4 text-sm text-muted-foreground">
                  <p>No se detectó un índice en este libro.</p>
                  <button
                    onClick={() => handleSeek(0)}
                    className="mt-3 text-primary hover:underline"
                  >
                    Ir al inicio
                  </button>
                </div>
              ) : filtered.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">
                  Sin resultados para “{query}”.
                </p>
              ) : (
                <ul className="space-y-0.5">
                  {tree.map((node) => (
                    <TreeRow
                      key={node.section.id}
                      node={node}
                      depth={0}
                      currentWord={currentWord}
                      wpm={wpm}
                      endByStart={endByStart}
                      onSeek={handleSeek}
                    />
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

interface TreeRowProps {
  node: SectionTreeNode;
  depth: number;
  currentWord: number;
  wpm: number;
  endByStart: Map<number, number>;
  onSeek: (word: number) => void;
}

function TreeRow({
  node,
  depth,
  currentWord,
  wpm,
  endByStart,
  onSeek,
}: TreeRowProps) {
  const { section, children } = node;
  const hasChildren = children.length > 0;
  const [expanded, setExpanded] = useState(true);

  const end = endByStart.get(section.startWord) ?? section.startWord;
  const status = sectionStatus(currentWord, section.startWord, end);
  const minutes = estimateMinutes(section.startWord, end, wpm);
  const Icon = KIND_ICON[section.kind];

  return (
    <li>
      <div
        className={cn(
          "group flex items-center gap-1 rounded-md pr-2 transition-colors hover:bg-secondary",
          status === "current" && "bg-primary/10"
        )}
        style={{ paddingLeft: `${depth * 14 + 4}px` }}
      >
        {hasChildren ? (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-1 text-muted-foreground"
            aria-label={expanded ? "Contraer" : "Expandir"}
          >
            <ChevronRight
              className={cn("size-4 transition-transform", expanded && "rotate-90")}
            />
          </button>
        ) : (
          <span className="w-6" />
        )}

        <button
          onClick={() => onSeek(section.startWord)}
          className="flex min-w-0 flex-1 items-center gap-2 py-2 text-left"
        >
          <StatusIcon status={status} />
          <Icon className="size-4 shrink-0 text-muted-foreground" />
          <span
            className={cn(
              "truncate text-sm",
              section.level === 0 && "font-semibold",
              status === "done" && "text-muted-foreground"
            )}
          >
            {section.title}
          </span>
          {minutes > 0 && (
            <span className="ml-auto shrink-0 text-xs text-muted-foreground">
              {minutes} min
            </span>
          )}
        </button>
      </div>

      {hasChildren && expanded && (
        <ul className="space-y-0.5">
          {children.map((child) => (
            <TreeRow
              key={child.section.id}
              node={child}
              depth={depth + 1}
              currentWord={currentWord}
              wpm={wpm}
              endByStart={endByStart}
              onSeek={onSeek}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function StatusIcon({ status }: { status: SectionStatus }) {
  if (status === "done")
    return <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />;
  if (status === "current")
    return <Dot className="size-4 shrink-0 text-primary" />;
  return <Circle className="size-4 shrink-0 text-muted-foreground/40" />;
}
