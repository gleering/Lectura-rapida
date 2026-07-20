"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  Loader2,
  ShieldAlert,
  Trash2,
  CheckCircle2,
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

  const refresh = useCallback(() => {
    if (!isAdmin) return;
    listPublicBooks()
      .then((b) => {
        setBooks(b);
        setLoaded(true);
      })
      .catch((e) => setError(e.message));
  }, [isAdmin]);

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
      </main>
    </div>
  );
}
