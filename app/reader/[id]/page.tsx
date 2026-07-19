"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getBookMeta, getBookContent, updateBookMeta } from "@/lib/storage";
import { formatNumber } from "@/lib/utils";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { BookMeta } from "@/types";
import { ReaderScreen } from "@/components/Reader/ReaderScreen";

export default function ReaderPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [meta, setMeta] = useState<BookMeta | null>(null);
  const [words, setWords] = useState<string[] | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing">(
    "loading"
  );
  const [askResume, setAskResume] = useState(false);
  const [startIndex, setStartIndex] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      const [m, c] = await Promise.all([
        getBookMeta(params.id),
        getBookContent(params.id),
      ]);
      if (!active) return;
      if (!m || !c) {
        setStatus("missing");
        return;
      }
      setMeta(m);
      setWords(c.words);
      setStartIndex(m.progressIndex);
      setStatus("ready");
      // Offer to resume when there is meaningful saved progress.
      if (m.progressIndex > 5 && m.progressIndex < c.words.length - 1) {
        setAskResume(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [params.id]);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-white">
        <Loader2 className="size-8 animate-spin" />
      </div>
    );
  }

  if (status === "missing" || !meta || !words) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-black text-white">
        <p>No se encontró el libro.</p>
        <Button variant="secondary" onClick={() => router.push("/")}>
          Volver al inicio
        </Button>
      </div>
    );
  }

  return (
    <>
      <ReaderScreen
        key={`${meta.id}-${startIndex}`}
        meta={{ ...meta, progressIndex: startIndex }}
        words={words}
      />

      <Dialog open={askResume} dismissible={false}>
        <div className="space-y-4 text-center">
          <h2 className="text-lg font-semibold">Continuar lectura</h2>
          <p className="text-muted-foreground">
            ¿Desea continuar desde la palabra{" "}
            <span className="font-semibold text-foreground">
              {formatNumber(meta.progressIndex + 1)}
            </span>
            ?
          </p>
          <div className="flex justify-center gap-3">
            <Button
              variant="outline"
              onClick={async () => {
                setStartIndex(0);
                await updateBookMeta({ ...meta, progressIndex: 0 });
                setAskResume(false);
              }}
            >
              Desde el inicio
            </Button>
            <Button onClick={() => setAskResume(false)}>Continuar</Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
