"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  Loader2,
  ShieldAlert,
  Trash2,
  CheckCircle2,
  Gift,
  UserPlus,
} from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/lib/auth";
import { parsePdf } from "@/lib/pdfParser";
import { generateSummary } from "@/lib/ai-service";
import {
  listPublicBooks,
  uploadPublicBook,
  deletePublicBook,
  type PublicBook,
} from "@/lib/publicLibrary";
import {
  listAllSubscriptions,
  grantComp,
  revokeSubscription,
  isActive,
  type Subscription,
} from "@/lib/subscription";
import { formatNumber } from "@/lib/utils";

export default function AdminPage() {
  const router = useRouter();
  const { ready, user, isAdmin, configured } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);

  const [books, setBooks] = useState<PublicBook[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Membresías (comps).
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [compEmail, setCompEmail] = useState("");
  const [compBusy, setCompBusy] = useState(false);
  const [compError, setCompError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!isAdmin) return;
    listPublicBooks()
      .then((b) => {
        setBooks(b);
        setLoaded(true);
      })
      .catch((e) => setError(e.message));
    listAllSubscriptions()
      .then(setSubs)
      .catch((e) => setCompError(e.message));
  }, [isAdmin]);

  const handleGrantComp = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = compEmail.trim().toLowerCase();
    if (!email) return;
    setCompBusy(true);
    setCompError(null);
    try {
      await grantComp(email);
      setCompEmail("");
      refresh();
    } catch (err) {
      setCompError(err instanceof Error ? err.message : "No se pudo regalar.");
    } finally {
      setCompBusy(false);
    }
  };

  const handleRevoke = async (sub: Subscription) => {
    if (!confirm(`¿Revocar la membresía de ${sub.email}?`)) return;
    try {
      await revokeSubscription(sub.id);
      refresh();
    } catch (err) {
      setCompError(err instanceof Error ? err.message : "No se pudo revocar.");
    }
  };

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Gate de acceso: sin sesión → a login; sin rol admin → aviso.
  useEffect(() => {
    if (ready && configured && !user) router.replace("/login?next=/admin");
  }, [ready, configured, user, router]);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setStatus(null);
      setFileName(file.name);
      setProgress(0);
      setProcessing(true);
      try {
        const parsed = await parsePdf(file, (r) =>
          setProgress(Math.round(r * 70))
        );
        if (parsed.words.length === 0) {
          throw new Error(
            "No se pudo extraer texto. ¿Es un PDF escaneado (solo imágenes)?"
          );
        }
        const title =
          parsed.title && parsed.title !== "Documento sin título"
            ? parsed.title
            : file.name.replace(/\.pdf$/i, "");

        setStatus("Generando resumen…");
        setProgress(80);
        const summary =
          (await generateSummary(parsed.words.join(" "))) || undefined;

        setStatus("Subiendo al catálogo…");
        setProgress(92);
        await uploadPublicBook({
          title,
          author: parsed.author,
          totalWords: parsed.words.length,
          totalPages: parsed.totalPages,
          wordsPerPage: parsed.wordsPerPage,
          summary,
          cover: parsed.cover,
          content: {
            words: parsed.words,
            paraStarts: parsed.paraStarts,
            sections: parsed.sections,
            pdfPageStarts: parsed.pdfPageStarts,
          },
        });

        setProgress(100);
        setStatus(`"${title}" publicado.`);
        refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al procesar el PDF.");
      } finally {
        setProcessing(false);
      }
    },
    [refresh]
  );

  const remove = async (book: PublicBook) => {
    if (!confirm(`¿Eliminar "${book.title}" del catálogo público?`)) return;
    try {
      await deletePublicBook(book);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar.");
    }
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (configured && user && !isAdmin) {
    return (
      <div className="min-h-screen">
        <AppNav />
        <main className="mx-auto max-w-2xl px-4 py-16 text-center">
          <ShieldAlert className="mx-auto size-10 text-muted-foreground" />
          <h1 className="mt-4 text-xl font-bold">Acceso restringido</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Esta sección es solo para administradores. Pedí que te asignen el rol{" "}
            <code>admin</code> en Supabase.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AppNav />
      <main className="mx-auto max-w-5xl px-4 py-8 pb-24 md:pb-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Panel de administración</h1>
            <p className="text-sm text-muted-foreground">
              Publicá libros al catálogo compartido de todos los usuarios.
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = "";
            }}
          />
          <Button
            onClick={() => inputRef.current?.click()}
            disabled={processing}
          >
            {processing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            Publicar PDF
          </Button>
        </div>

        {processing && (
          <Card className="mb-6">
            <CardContent className="space-y-3 p-5">
              <p className="truncate text-sm text-muted-foreground">
                {fileName}
              </p>
              <Progress value={progress} />
              <p className="text-sm">{status ?? `${progress}%`}</p>
            </CardContent>
          </Card>
        )}

        {status && !processing && (
          <p className="mb-4 flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <CheckCircle2 className="size-4" /> {status}
          </p>
        )}
        {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

        {!loaded ? (
          <p className="text-sm text-muted-foreground">Cargando catálogo…</p>
        ) : books.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center text-muted-foreground">
              El catálogo público está vacío. Publicá tu primer libro.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {books.map((b) => (
              <Card key={b.id}>
                <CardContent className="flex items-center justify-between gap-4 p-5">
                  <div className="flex min-w-0 items-center gap-4">
                    {b.cover && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={b.cover}
                        alt={`Portada de ${b.title}`}
                        className="h-20 w-14 shrink-0 rounded object-cover shadow-sm"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-medium">{b.title}</p>
                      {b.author && (
                        <p className="truncate text-sm text-muted-foreground">
                          {b.author}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatNumber(b.totalWords)} palabras · {b.totalPages}{" "}
                        pág.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(b)}
                    aria-label="Eliminar del catálogo"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Membresías: regalar acceso premium gratis por email. */}
        <div className="mt-12">
          <div className="mb-4 flex items-center gap-2">
            <Gift className="size-5" />
            <h2 className="text-xl font-bold">Membresías de cortesía</h2>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            Regalá acceso premium (biblioteca pública + módulos) a un correo. La
            persona no paga y no vence, hasta que la revoques.
          </p>

          <form
            onSubmit={handleGrantComp}
            className="mb-4 flex flex-col gap-2 sm:flex-row"
          >
            <input
              type="email"
              required
              value={compEmail}
              onChange={(e) => setCompEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              className="flex h-11 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button type="submit" disabled={compBusy} className="gap-2">
              {compBusy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <UserPlus className="size-4" />
              )}
              Regalar membresía
            </Button>
          </form>
          {compError && (
            <p className="mb-4 text-sm text-destructive">{compError}</p>
          )}

          {subs.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center text-muted-foreground">
                Todavía no hay membresías.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {subs.map((s) => (
                <Card key={s.id}>
                  <CardContent className="flex items-center justify-between gap-4 p-5">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{s.email}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="rounded-full bg-secondary px-2 py-0.5">
                          {s.source === "comp" ? "Cortesía" : "Pago"}
                        </span>
                        <span className="rounded-full bg-secondary px-2 py-0.5">
                          {s.plan === "yearly"
                            ? "Anual"
                            : s.plan === "monthly"
                              ? "Mensual"
                              : "Comp"}
                        </span>
                        <span
                          className={
                            isActive(s)
                              ? "text-green-600 dark:text-green-400"
                              : "text-muted-foreground"
                          }
                        >
                          {isActive(s) ? "Activa" : s.status}
                        </span>
                        {s.currentPeriodEnd && (
                          <span>
                            hasta{" "}
                            {new Date(s.currentPeriodEnd).toLocaleDateString()}
                          </span>
                        )}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRevoke(s)}
                      aria-label="Revocar membresía"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
