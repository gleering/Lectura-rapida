"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Trash2,
  Play,
  BookOpen,
  Loader2,
  Sparkles,
  Search,
} from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { UploadButton } from "@/components/UploadButton";
import { PublicLibrary } from "@/components/PublicLibrary";
import { EmptyState } from "@/components/EmptyState";
import { BookCover } from "@/components/BookCover";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { listBooks, deleteBook, getSummary } from "@/lib/storage";
import { toast } from "@/store/useToastStore";
import { cn } from "@/lib/utils";
import type { BookMeta } from "@/types";

interface BookWithSummary extends BookMeta {
  summaryText?: string;
  loadingSummary?: boolean;
}

type Tab = "mine" | "public";
type StatusFilter = "all" | "reading" | "finished";

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "reading", label: "En progreso" },
  { id: "finished", label: "Terminados" },
];

export default function LibraryPage() {
  const [books, setBooks] = useState<BookWithSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [expandedBook, setExpandedBook] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("mine");

  // Permite abrir directo el catálogo público con /library?tab=public
  // (usado por el onboarding). Se lee del cliente para no forzar Suspense.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("tab") === "public") {
      setTab("public");
    }
  }, []);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [pendingDelete, setPendingDelete] = useState<BookMeta | null>(null);

  const refresh = () =>
    listBooks().then((b) => {
      setBooks(b as BookWithSummary[]);
      setLoaded(true);
    });

  useEffect(() => {
    refresh();
  }, []);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const title = pendingDelete.title;
    await deleteBook(pendingDelete.id);
    setPendingDelete(null);
    await refresh();
    toast.success(`“${title}” se eliminó de tu biblioteca.`);
  };

  const toggleSummary = async (bookId: string) => {
    if (expandedBook === bookId) {
      setExpandedBook(null);
      return;
    }

    const book = books.find((b) => b.id === bookId);
    if (!book?.summaryText && !book?.loadingSummary) {
      setBooks((prevBooks) =>
        prevBooks.map((b) =>
          b.id === bookId ? { ...b, loadingSummary: true } : b
        )
      );

      const summary = await getSummary(bookId);
      setBooks((prevBooks) =>
        prevBooks.map((b) =>
          b.id === bookId
            ? { ...b, summaryText: summary || undefined, loadingSummary: false }
            : b
        )
      );
    }

    setExpandedBook(bookId);
  };

  // Búsqueda por título/autor + filtro por estado de lectura (todo local).
  const visibleBooks = useMemo(() => {
    const q = query.trim().toLowerCase();
    return books.filter((b) => {
      if (status === "finished" && !b.finished) return false;
      if (status === "reading" && b.finished) return false;
      if (!q) return true;
      return (
        b.title.toLowerCase().includes(q) ||
        (b.author?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [books, query, status]);

  const hasBooks = books.length > 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppNav />
      <main className="mx-auto max-w-[1280px] px-4 py-6 pb-28 md:pb-10">
        {/* Header & Tabs */}
        <div className="mb-8">
          <h2 className="mb-6 font-display text-[28px] font-bold tracking-tight text-foreground">
            Mi Biblioteca
          </h2>
          <div className="flex border-b border-border" role="tablist">
            <TabButton active={tab === "mine"} onClick={() => setTab("mine")}>
              Mis Libros
            </TabButton>
            <TabButton active={tab === "public"} onClick={() => setTab("public")}>
              Biblioteca Pública
            </TabButton>
          </div>
        </div>

        {/* Mis Libros */}
        {tab === "mine" && (
          <section className="space-y-4">
            {/* Buscador + filtros (solo si hay libros que filtrar) */}
            {hasBooks && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar por título o autor…"
                    aria-label="Buscar en mi biblioteca"
                    className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
                  />
                </div>
                <div
                  className="flex gap-1.5"
                  role="group"
                  aria-label="Filtrar por estado"
                >
                  {STATUS_FILTERS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setStatus(f.id)}
                      aria-pressed={status === f.id}
                      className={cn(
                        "rounded-full px-4 py-2 text-sm font-medium transition",
                        status === f.id
                          ? "bg-primary text-primary-foreground"
                          : "border border-border bg-card text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!loaded ? (
              <p className="text-sm text-muted-foreground">Cargando…</p>
            ) : !hasBooks ? (
              <EmptyState
                icon={<BookOpen className="size-8 text-primary/40" />}
                action={
                  <UploadButton
                    label="Subir tu primer libro"
                    className="rounded-xl bg-primary px-6 py-3 text-primary-foreground hover:bg-primary/90"
                  />
                }
              >
                Tu biblioteca está vacía. Sube un PDF o un archivo de texto para
                empezar.
              </EmptyState>
            ) : visibleBooks.length === 0 ? (
              <EmptyState icon={<Search className="size-8 text-primary/40" />}>
                Ningún libro coincide con tu búsqueda.
              </EmptyState>
            ) : (
              visibleBooks.map((b) => {
                const pct =
                  b.totalWords > 0
                    ? ((b.progressIndex + 1) / b.totalWords) * 100
                    : 0;
                const isExpanded = expandedBook === b.id;
                return (
                  <div
                    key={b.id}
                    className={cn(
                      "overflow-hidden rounded-2xl border bg-card transition-all",
                      isExpanded
                        ? "border-primary/20 shadow-sm ring-1 ring-primary/5"
                        : "border-border hover:border-primary/30"
                    )}
                  >
                    <div className="flex items-center gap-4 p-4">
                      <div className="h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-secondary">
                        <BookCover title={b.title} author={b.author} cover={b.cover} />
                      </div>

                      <div className="min-w-0 flex-grow">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-sm font-bold text-foreground">
                            {b.title}
                          </h3>
                          {b.finished && (
                            <span className="shrink-0 rounded-full bg-success-soft/50 px-2 py-0.5 text-[10px] font-bold text-success-soft-foreground">
                              Leído
                            </span>
                          )}
                        </div>
                        {b.author && (
                          <p className="truncate text-xs text-muted-foreground">
                            {b.author}
                          </p>
                        )}
                        <div className="mt-2 flex items-center gap-3">
                          <div className="h-1.5 flex-grow overflow-hidden rounded-full bg-accent">
                            <div
                              className="h-full rounded-full bg-success"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-bold text-success">
                            {pct.toFixed(0)}%
                          </span>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5">
                        <Link
                          href={`/reader/${b.id}`}
                          className="flex min-h-11 items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-transform active:scale-95"
                        >
                          <Play className="size-4" fill="currentColor" />
                          <span className="hidden sm:inline">
                            {b.progressIndex > 0 && !b.finished
                              ? "Continuar"
                              : "Leer"}
                          </span>
                        </Link>
                        <button
                          onClick={() => toggleSummary(b.id)}
                          aria-label="Ver resumen IA"
                          aria-expanded={isExpanded}
                          className={cn(
                            "flex size-11 items-center justify-center rounded-lg transition-colors",
                            isExpanded
                              ? "bg-secondary text-primary"
                              : "text-muted-foreground hover:bg-secondary hover:text-primary"
                          )}
                        >
                          <Sparkles className="size-4" />
                        </button>
                        <button
                          onClick={() => setPendingDelete(b)}
                          aria-label={`Eliminar ${b.title}`}
                          className="flex size-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive-soft hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mx-4 mb-4 rounded-xl border-l-4 border-primary bg-muted p-4">
                        <div className="mb-2 flex items-center gap-2">
                          <Sparkles className="size-4 text-primary" />
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                            Resumen IA
                          </span>
                        </div>
                        {b.loadingSummary ? (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="size-4 animate-spin" />
                            <p className="text-sm">Generando resumen…</p>
                          </div>
                        ) : b.summaryText ? (
                          <p className="whitespace-pre-wrap text-sm italic leading-relaxed text-muted-foreground">
                            {b.summaryText}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Aún no hay resumen. Se genera automáticamente al subir
                            el libro si la IA está disponible.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </section>
        )}

        {/* Biblioteca Pública */}
        {tab === "public" && <PublicLibrary onImported={refresh} />}
      </main>

      {/* FAB: Subir libro (solo en Mis Libros con libros ya cargados) */}
      {tab === "mine" && hasBooks && (
        <UploadButton
          label="Subir libro"
          className="fixed bottom-24 right-6 z-30 h-14 rounded-full bg-primary px-6 text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 md:bottom-8"
        />
      )}

      {/* Confirmación de borrado — acción destructiva */}
      <Dialog open={!!pendingDelete} onClose={() => setPendingDelete(null)}>
        {pendingDelete && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-destructive-soft text-destructive">
                <Trash2 className="size-5" />
              </div>
              <h2 className="font-display text-lg font-semibold">
                ¿Eliminar este libro?
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Se eliminará “{pendingDelete.title}” y todo su progreso de lectura
              de este dispositivo. Las tarjetas de repaso ya creadas no se
              borran. Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPendingDelete(null)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                Eliminar
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "relative min-h-11 px-6 py-3 text-sm font-medium transition-all",
        active
          ? "font-bold text-primary after:absolute after:inset-x-0 after:-bottom-px after:h-[3px] after:rounded-t after:bg-primary"
          : "text-muted-foreground hover:text-primary"
      )}
    >
      {children}
    </button>
  );
}
