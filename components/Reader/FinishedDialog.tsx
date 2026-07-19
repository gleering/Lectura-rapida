"use client";

import { useRouter } from "next/navigation";
import { PartyPopper, Brain, Loader2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useConsolidate } from "@/hooks/useConsolidate";
import type { BookMeta } from "@/types";

interface FinishedDialogProps {
  open: boolean;
  meta: BookMeta;
  words: string[];
  onClose: () => void;
  onReadAgain: () => void;
}

/**
 * Diálogo de fin de libro compartido por los modos Guía y Página. Empuja la
 * consolidación (leer no es recordar) con el mismo bucle que RSVP.
 */
export function FinishedDialog({
  open,
  meta,
  words,
  onClose,
  onReadAgain,
}: FinishedDialogProps) {
  const router = useRouter();
  const { consolidate, consolidating, error } = useConsolidate(meta, words);

  return (
    <Dialog open={open} onClose={onClose}>
      <div className="space-y-4 text-center">
        <PartyPopper className="mx-auto size-12 text-primary" />
        <h2 className="text-xl font-bold">¡Libro terminado!</h2>
        <p className="text-muted-foreground">
          Completaste “{meta.title}”. Ahora consolídalo: leer no es recordar.
          Convierte lo que acabas de leer en repaso activo para que pase a tu
          memoria de largo plazo.
        </p>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          className="w-full"
          size="lg"
          disabled={consolidating}
          onClick={consolidate}
        >
          {consolidating ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Creando tarjetas…
            </>
          ) : (
            <>
              <Brain className="mr-2 size-4" />
              Consolidar en tarjetas de repaso
            </>
          )}
        </Button>

        <div className="flex justify-center gap-3">
          <Button variant="outline" disabled={consolidating} onClick={onReadAgain}>
            Leer de nuevo
          </Button>
          <Button
            variant="outline"
            disabled={consolidating}
            onClick={() => router.push("/stats")}
          >
            Ver estadísticas
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
