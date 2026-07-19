"use client";

import { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2, FileWarning } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { parsePdf } from "@/lib/pdfParser";
import { saveBook, saveSummary, updateBookMeta } from "@/lib/storage";
import { generateSummary } from "@/lib/ai-service";
import type { BookMeta } from "@/types";

interface UploadButtonProps {
  label?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
}

function makeId() {
  return `book_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function UploadButton({
  label = "Subir PDF",
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

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setFileName(file.name);
      setProgress(0);
      setProcessing(true);
      try {
        const parsed = await parsePdf(file, (r) =>
          setProgress(Math.round(r * 50))
        );
        if (parsed.words.length === 0) {
          throw new Error(
            "No se pudo extraer texto. ¿Es un PDF escaneado (solo imágenes)?"
          );
        }
        const id = makeId();
        const title =
          parsed.title && parsed.title !== "Documento sin título"
            ? parsed.title
            : file.name.replace(/\.pdf$/i, "");
        const meta: BookMeta = {
          id,
          title,
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
        };
        await saveBook(
          meta,
          parsed.words,
          parsed.paraStarts,
          parsed.sections,
          parsed.pdfPageStarts
        );

        // Generar resumen en background
        setProgress(75);
        const fullText = parsed.words.join(" ");
        const summary = await generateSummary(fullText);

        if (summary) {
          await saveSummary(id, summary);
          meta.summary = summary;
        }
        meta.summaryLoading = false;
        await updateBookMeta(meta);

        setProgress(100);
        router.push(`/reader/${id}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al procesar el PDF.");
      }
    },
    [router]
  );

  return (
    <>
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
            <h2 className="text-lg font-semibold">No se pudo procesar</h2>
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
            <h2 className="text-lg font-semibold">Procesando libro…</h2>
            <p className="truncate text-sm text-muted-foreground">{fileName}</p>
            <Progress value={progress} />
            <p className="text-sm font-medium tabular-nums">{progress}%</p>
          </div>
        )}
      </Dialog>
    </>
  );
}
