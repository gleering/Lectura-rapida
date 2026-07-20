"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Trash2,
  Play,
  BookOpen,
  Loader2,
  Sparkles,
} from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { UploadButton } from "@/components/UploadButton";
import { PublicLibrary } from "@/components/PublicLibrary";
import { listBooks, deleteBook, getSummary } from "@/lib/storage";
import { cn } from "@/lib/utils";
import type { BookMeta } from "@/types";

interface BookWithSummary extends BookMeta {
  summaryText?: string;
  loadingSummary?: boolean;
}

type Tab = "mine" | "public";

export default function LibraryPage() {
  const [books, setBooks] = useState<BookWithSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [expandedBook, setExpandedBook] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("mine");

  const refresh = () =>
    listBooks().then((b) => {
      setBooks(b as BookWithSummary[]);
      setLoaded(true);
    });

  useEffect(() => {
    refresh();
  }, []);

  const remove = async (id: string) => {
    await deleteBook(id);
    refresh();
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

  return (
    <div className="min-h-screen bg-[#faf8ff] text-[#131b2e]">
      <AppNav />
      <main className="mx-auto max-w-[1280px] px-4 py-6 pb-28 md:pb-10">
        {/* Header & Tabs */}
        <div className="mb-8">
          <h2
            className="mb-6 text-[28px] font-bold tracking-tight text-[#131b2e]"
            style={{ fontFamily: "var(--font-hanken, inherit)" }}
          >
            Mi Biblioteca
          </h2>
          <div className="flex border-b border-[#c3c6d7]">
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
            {!loaded ? (
              <p className="text-sm text-[#434655]">Cargando…</p>
            ) : books.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#c3c6d7] py-16 text-center text-[#434655]">
                <BookOpen className="size-8 text-[#004ac6]/40" />
                <p>Tu biblioteca está vacía. Sube tu primer PDF.</p>
                <UploadButton
                  label="Subir PDF"
                  className="rounded-xl bg-[#004ac6] px-6 py-3 text-white hover:bg-[#003ea8]"
                />
              </div>
            ) : (
              books.map((b) => {
                const pct =
                  b.totalWords > 0
                    ? ((b.progressIndex + 1) / b.totalWords) * 100
                    : 0;
                const isExpanded = expandedBook === b.id;
                return (
                  <div
                    key={b.id}
                    className={cn(
                      "overflow-hidden rounded-2xl border bg-white transition-all",
                      isExpanded
                        ? "border-[#004ac6]/20 shadow-sm ring-1 ring-[#004ac6]/5"
                        : "border-[#c3c6d7] hover:border-[#004ac6]/30"
                    )}
                  >
                    <div className="flex items-center gap-4 p-4">
                      <div className="flex h-20 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#eaedff]">
                        {b.cover ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={b.cover}
                            alt={`Portada de ${b.title}`}
                            className="size-full object-cover"
                          />
                        ) : (
                          <BookOpen className="size-6 text-[#004ac6]/40" />
                        )}
                      </div>

                      <div className="min-w-0 flex-grow">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-sm font-bold text-[#131b2e]">
                            {b.title}
                          </h3>
                          {b.finished && (
                            <span className="shrink-0 rounded-full bg-[#6cf8bb]/50 px-2 py-0.5 text-[10px] font-bold text-[#00714d]">
                              Leído
                            </span>
                          )}
                        </div>
                        {b.author && (
                          <p className="truncate text-xs text-[#434655]">
                            {b.author}
                          </p>
                        )}
                        <div className="mt-2 flex items-center gap-3">
                          <div className="h-1.5 flex-grow overflow-hidden rounded-full bg-[#e2e7ff]">
                            <div
                              className="h-full rounded-full bg-[#006c49]"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-bold text-[#006c49]">
                            {pct.toFixed(0)}%
                          </span>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5">
                        <Link
                          href={`/reader/${b.id}`}
                          className="flex items-center gap-1.5 rounded-lg bg-[#004ac6] px-4 py-2 text-sm font-bold text-white transition-transform active:scale-95"
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
                          className={cn(
                            "flex size-9 items-center justify-center rounded-lg transition-colors",
                            isExpanded
                              ? "bg-[#eaedff] text-[#004ac6]"
                              : "text-[#434655] hover:bg-[#eaedff] hover:text-[#004ac6]"
                          )}
                        >
                          <Sparkles className="size-4" />
                        </button>
                        <button
                          onClick={() => remove(b.id)}
                          aria-label="Eliminar libro"
                          className="flex size-9 items-center justify-center rounded-lg text-[#434655] transition-colors hover:bg-[#ffdad6] hover:text-[#ba1a1a]"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mx-4 mb-4 rounded-xl border-l-4 border-[#004ac6] bg-[#f2f3ff] p-4">
                        <div className="mb-2 flex items-center gap-2">
                          <Sparkles className="size-4 text-[#004ac6]" />
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#004ac6]">
                            Resumen IA
                          </span>
                        </div>
                        {b.loadingSummary ? (
                          <div className="flex items-center gap-2 text-[#434655]">
                            <Loader2 className="size-4 animate-spin" />
                            <p className="text-sm">Generando resumen…</p>
                          </div>
                        ) : b.summaryText ? (
                          <p className="whitespace-pre-wrap text-sm italic leading-relaxed text-[#434655]">
                            {b.summaryText}
                          </p>
                        ) : (
                          <p className="text-sm text-[#434655]">
                            No hay resumen disponible.
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

      {/* FAB: Subir PDF (solo en Mis Libros) */}
      {tab === "mine" && books.length > 0 && (
        <UploadButton
          label="Subir PDF"
          className="fixed bottom-24 right-6 z-30 h-14 rounded-full bg-[#004ac6] px-6 text-white shadow-lg shadow-[#004ac6]/20 hover:bg-[#003ea8] md:bottom-8"
        />
      )}
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
      onClick={onClick}
      className={cn(
        "relative px-6 py-3 text-sm font-medium transition-all",
        active
          ? "font-bold text-[#004ac6] after:absolute after:inset-x-0 after:-bottom-px after:h-[3px] after:rounded-t after:bg-[#004ac6]"
          : "text-[#434655] hover:text-[#004ac6]"
      )}
    >
      {children}
    </button>
  );
}
