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
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatNumber } from "@/lib/utils";

/**
 * Sección de biblioteca pública dentro de /library. Muestra el catálogo
 * compartido; cada libro se puede importar al dispositivo (se descarga y guarda
 * en IndexedDB) y luego se lee con el lector normal. Si Supabase no está
 * configurado, no renderiza nada (la app local sigue igual).
 */
export function PublicLibrary({ onImported }: { onImported?: () => void }) {
  const router = useRouter();
  const { ready, user, isAdmin, configured, signOut } = useAuth();

  const [books, setBooks] = useState<PublicBook[]>([]);
  const [localIds, setLocalIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
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
  }, [user]);

  useEffect(() => {
    if (ready && user) void load();
  }, [ready, user, load]);

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
    <section className="mb-10">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <Library className="size-5" /> Biblioteca pública
        </h2>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link
              href="/admin"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <ShieldCheck className="size-4" /> Admin
            </Link>
          )}
          {user ? (
            <Button variant="ghost" size="sm" onClick={() => signOut()}>
              Salir
            </Button>
          ) : null}
        </div>
      </div>

      {!user ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
            <Library className="size-8" />
            <p>Inicia sesión para ver el catálogo compartido de libros.</p>
            <Link
              href="/login?next=/library"
              className={buttonVariants({ size: "sm" })}
            >
              <LogIn className="size-4" /> Iniciar sesión
            </Link>
          </CardContent>
        </Card>
      ) : loading ? (
        <p className="text-sm text-muted-foreground">Cargando catálogo…</p>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : books.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            Todavía no hay libros públicos.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {books.map((b) => {
            const imported = localIds.has(`pub_${b.id}`);
            return (
              <Card key={b.id}>
                <CardContent className="flex items-center justify-between gap-4 p-5">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{b.title}</p>
                    {b.author && (
                      <p className="truncate text-sm text-muted-foreground">
                        {b.author}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatNumber(b.totalWords)} palabras · {b.totalPages} pág.
                    </p>
                  </div>
                  {imported ? (
                    <Link
                      href={`/reader/pub_${b.id}`}
                      className={buttonVariants({ size: "sm" })}
                    >
                      <Play className="size-4" /> Leer
                    </Link>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => importBook(b)}
                      disabled={busyId === b.id}
                    >
                      {busyId === b.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Download className="size-4" />
                      )}
                      Importar
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
