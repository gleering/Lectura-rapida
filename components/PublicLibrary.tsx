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
              className="flex items-center gap-1.5 rounded-lg border border-[#c3c6d7] px-3 py-1.5 text-sm font-medium text-[#004ac6] transition-colors hover:bg-[#eaedff]"
            >
              <ShieldCheck className="size-4" /> Admin
            </Link>
          )}
          {user && (
            <button
              onClick={() => signOut()}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-[#434655] transition-colors hover:bg-[#eaedff]"
            >
              Salir
            </button>
          )}
        </div>
      )}

      {!user ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#c3c6d7] py-12 text-center text-[#434655]">
          <Library className="size-8 text-[#004ac6]/40" />
          <p>Inicia sesión para ver el catálogo compartido de libros.</p>
          <Link
            href="/login?next=/library"
            className="flex items-center gap-1.5 rounded-lg bg-[#004ac6] px-4 py-2 text-sm font-bold text-white transition-transform active:scale-95"
          >
            <LogIn className="size-4" /> Iniciar sesión
          </Link>
        </div>
      ) : !canAccess ? (
        <Paywall feature="La biblioteca pública" />
      ) : loading ? (
        <p className="text-sm text-[#434655]">Cargando catálogo…</p>
      ) : error ? (
        <p className="text-sm text-[#ba1a1a]">{error}</p>
      ) : books.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#c3c6d7] py-12 text-center text-[#434655]">
          Todavía no hay libros públicos.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {books.map((b) => {
            const imported = localIds.has(`pub_${b.id}`);
            return (
              <div
                key={b.id}
                className="group overflow-hidden rounded-2xl border border-[#c3c6d7] bg-white"
              >
                <div className="relative aspect-[3/4] overflow-hidden bg-[#eaedff]">
                  {b.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={b.cover}
                      alt={`Portada de ${b.title}`}
                      className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center">
                      <Library className="size-8 text-[#004ac6]/40" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h4 className="line-clamp-1 text-sm font-bold text-[#131b2e]">
                    {b.title}
                  </h4>
                  <p className="mb-3 line-clamp-1 text-[11px] text-[#434655]">
                    {b.author || `${formatNumber(b.totalWords)} palabras`}
                  </p>
                  {imported ? (
                    <Link
                      href={`/reader/pub_${b.id}`}
                      className="flex w-full items-center justify-center gap-1 rounded-lg bg-[#004ac6] py-2 text-xs font-bold text-white transition-transform active:scale-95"
                    >
                      <Play className="size-4" fill="currentColor" /> Leer
                    </Link>
                  ) : (
                    <button
                      onClick={() => importBook(b)}
                      disabled={busyId === b.id}
                      className="flex w-full items-center justify-center gap-1 rounded-lg bg-[#10B981] py-2 text-xs font-bold text-white transition-transform active:scale-95 disabled:opacity-60"
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
