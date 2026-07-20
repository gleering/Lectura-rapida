"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Library,
  Play,
  Download,
  Loader2,
  LogIn,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { BookCover } from "@/components/BookCover";
import {
  listPublicBooks,
  importToDevice,
  type PublicBook,
} from "@/lib/publicLibrary";
import { listBooks } from "@/lib/storage";
import { Paywall } from "@/components/Paywall";
import { MEMBERSHIP_ENABLED } from "@/lib/features";
import { formatNumber } from "@/lib/utils";

/**
 * Sección de biblioteca pública dentro de /library. Muestra el catálogo
 * compartido; cada libro se puede importar al dispositivo (se descarga y guarda
 * en IndexedDB) y luego se lee con el lector normal. Si Supabase no está
 * configurado, no renderiza nada (la app local sigue igual).
 */
export function PublicLibrary({ onImported }: { onImported?: () => void }) {
  const router = useRouter();
  const { ready, user, isAdmin, configured, hasActiveSub, signOut } = useAuth();
  // Con el paywall desactivado, cualquier usuario logueado accede. Con paywall
  // activo, hace falta membresía (el admin siempre entra).
  const canAccess = !MEMBERSHIP_ENABLED || isAdmin || hasActiveSub;

  const [books, setBooks] = useState<PublicBook[]>([]);
  const [localIds, setLocalIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user || !canAccess) return;
    setLoading(true);
    setError(null);
    try {
      const [pub, local] = await Promise.all([listPublicBooks(), listBooks()]);
      setBooks(pub);
      setLocalIds(new Set(local.map((b) => b.id)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar el catálogo.");
    } finally {
      setLoading(false);
    }
  }, [user, canAccess]);

  useEffect(() => {
    if (ready && user && canAccess) void load();
  }, [ready, user, canAccess, load]);

  const importBook = async (book: PublicBook) => {
    setBusyId(book.id);
    setError(null);
    try {
      const localId = await importToDevice(book);
      setLocalIds((s) => new Set(s).add(localId));
      onImported?.();
      router.push(`/reader/${localId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo importar.");
    } finally {
      setBusyId(null);
    }
  };

  if (!configured) return null;

  return (
    <section>
      {(isAdmin || user) && (
        <div className="mb-4 flex items-center justify-end gap-2">
          {isAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-secondary"
            >
              <ShieldCheck className="size-4" /> Admin
            </Link>
          )}
          {user && (
            <button
              onClick={() => signOut()}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary"
            >
              Salir
            </button>
          )}
        </div>
      )}

      {!user ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-12 text-center text-muted-foreground">
          <Library className="size-8 text-primary/40" />
          <p>Inicia sesión para ver el catálogo compartido de libros.</p>
          <Link
            href="/login?next=/library"
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-transform active:scale-95"
          >
            <LogIn className="size-4" /> Iniciar sesión
          </Link>
        </div>
      ) : !canAccess ? (
        <Paywall feature="La biblioteca pública" />
      ) : loading ? (
        <p className="text-sm text-muted-foreground">Cargando catálogo…</p>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : books.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-12 text-center text-muted-foreground">
          Todavía no hay libros públicos.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {books.map((b) => {
            const imported = localIds.has(`pub_${b.id}`);
            return (
              <div
                key={b.id}
                className="group overflow-hidden rounded-2xl border border-border bg-card"
              >
                <div className="relative aspect-[3/4] overflow-hidden bg-secondary transition-transform duration-500 group-hover:scale-105">
                  <BookCover title={b.title} author={b.author} cover={b.cover} />
                </div>
                <div className="p-3">
                  <h4 className="line-clamp-1 text-sm font-bold text-foreground">
                    {b.title}
                  </h4>
                  <p className="mb-3 line-clamp-1 text-[11px] text-muted-foreground">
                    {b.author || `${formatNumber(b.totalWords)} palabras`}
                  </p>
                  {imported ? (
                    <Link
                      href={`/reader/pub_${b.id}`}
                      className="flex w-full items-center justify-center gap-1 rounded-lg bg-primary py-2 text-xs font-bold text-primary-foreground transition-transform active:scale-95"
                    >
                      <Play className="size-4" fill="currentColor" /> Leer
                    </Link>
                  ) : (
                    <button
                      onClick={() => importBook(b)}
                      disabled={busyId === b.id}
                      className="flex w-full items-center justify-center gap-1 rounded-lg bg-success py-2 text-xs font-bold text-success-foreground transition-transform active:scale-95 disabled:opacity-60"
                    >
                      {busyId === b.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Download className="size-4" />
                      )}
                      Importar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
