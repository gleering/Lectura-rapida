"use client";

import { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2, FileWarning } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { parsePdf } from "@/lib/pdfParser";
import { parseTextContent } from "@/lib/textImport";
import { saveBook, saveSummary, updateBookMeta } from "@/lib/storage";
import { generateSummary } from "@/lib/ai-service";
import { toast } from "@/store/useToastStore";
import type { BookMeta, BookSection } from "@/types";

interface UploadButtonProps {
  label?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
}

/** Tope defensivo de tamaño de archivo (50 MB) — evita colgar el navegador. */
const MAX_FILE_BYTES = 50 * 1024 * 1024;
/** Estimación de palabras por página para libros de texto plano. */
const TEXT_WORDS_PER_PAGE = 280;

function makeId() {
  return `book_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

interface Parsed {
  title: string;
  author?: string;
  words: string[];
  paraStarts: number[];
  totalPages: number;
  wordsPerPage: number;
  sections: BookSection[];
  pdfPageStarts: number[];
  cover?: string;
}

function isTextFile(file: File) {
  return (
    file.type.startsWith("text/") ||
    /\.(txt|md|markdown)$/i.test(file.name)
  );
}

export function UploadButton({
  label = "Subir libro",
  variant = "default",
  size = "xl",
  className,
}: UploadButtonProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");

  // Resumen IA en segundo plano: no bloquea la primera sesión de lectura.
  const summarizeInBackground = useCallback(
    async (id: string, fullText: string) => {
      try {
        const summary = await generateSummary(fullText);
        if (summary) {
          await saveSummary(id, summary);
          const stored = await import("@/lib/storage").then((m) =>
            m.getBookMeta(id)
          );
          if (stored) {
            await updateBookMeta({
              ...stored,
              summary,
              summaryLoading: false,
            });
          }
          toast.success("Resumen del libro listo en la biblioteca.");
        } else {
          const stored = await import("@/lib/storage").then((m) =>
            m.getBookMeta(id)
          );
          if (stored) {
            await updateBookMeta({ ...stored, summaryLoading: false });
          }
        }
      } catch {
        // La IA es opcional: si falla, el libro ya está guardado y legible.
      }
    },
    []
  );

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setFileName(file.name);
      setProgress(0);
      setProcessing(true);
      try {
        if (file.size > MAX_FILE_BYTES) {
          throw new Error(
            "El archivo supera los 50 MB. Prueba con un archivo más liviano."
          );
        }

        let parsed: Parsed;
        if (isTextFile(file)) {
          const raw = await file.text();
          const t = parseTextContent(raw, file.name);
          if (t.words.length === 0) {
            throw new Error("El archivo de texto está vacío.");
          }
          setProgress(50);
          parsed = {
            title: t.title,
            words: t.words,
            paraStarts: t.paraStarts,
            totalPages: Math.max(1, Math.ceil(t.words.length / TEXT_WORDS_PER_PAGE)),
            wordsPerPage: TEXT_WORDS_PER_PAGE,
            sections: [],
            pdfPageStarts: [],
          };
        } else {
          const p = await parsePdf(file, (r) => setProgress(Math.round(r * 60)));
          if (p.words.length === 0) {
            throw new Error(
              "No se pudo extraer texto. ¿Es un PDF escaneado (solo imágenes)?"
            );
          }
          parsed = {
            title:
              p.title && p.title !== "Documento sin título"
                ? p.title
                : file.name.replace(/\.pdf$/i, ""),
            author: p.author,
            words: p.words,
            paraStarts: p.paraStarts,
            totalPages: p.totalPages,
            wordsPerPage: p.wordsPerPage,
            sections: p.sections,
            pdfPageStarts: p.pdfPageStarts,
            cover: p.cover,
          };
        }

        const id = makeId();
        const meta: BookMeta = {
          id,
          title: parsed.title,
          author: parsed.author,
          totalWords: parsed.words.length,
          totalPages: parsed.totalPages,
          progressIndex: 0,
          timeReadMs: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          finished: false,
          wordsPerPage: parsed.wordsPerPage,
          summaryLoading: true,
          cover: parsed.cover,
        };
        setProgress(90);
        await saveBook(
          meta,
          parsed.words,
          parsed.paraStarts,
          parsed.sections,
          parsed.pdfPageStarts
        );

        setProgress(100);
        // El libro ya está guardado y es legible: entramos al lector sin
        // esperar a la IA. El resumen se genera en segundo plano.
        void summarizeInBackground(id, parsed.words.join(" "));
        toast.success(`“${parsed.title}” está listo para leer.`);
        setProcessing(false);
        router.push(`/reader/${id}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al procesar el archivo.");
      }
    },
    [router, summarizeInBackground]
  );

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf,text/plain,.txt,.md,.markdown"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => inputRef.current?.click()}
      >
        <Upload />
        {label}
      </Button>

      <Dialog open={processing} dismissible={false}>
        {error ? (
          <div className="space-y-4 text-center">
            <FileWarning className="mx-auto size-10 text-destructive" />
            <h2 className="font-display text-lg font-semibold">
              No se pudo procesar
            </h2>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button
              onClick={() => {
                setProcessing(false);
                setError(null);
              }}
            >
              Entendido
            </Button>
          </div>
        ) : (
          <div className="space-y-4 text-center">
            <Loader2 className="mx-auto size-10 animate-spin text-primary" />
            <h2 className="font-display text-lg font-semibold">
              Procesando libro…
            </h2>
            <p className="truncate text-sm text-muted-foreground">{fileName}</p>
            <Progress value={progress} />
            <p className="text-sm font-medium tabular-nums">{progress}%</p>
          </div>
        )}
      </Dialog>
    </>
  );
}
