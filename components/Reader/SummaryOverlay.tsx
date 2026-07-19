"use client";

import { Sparkles, Loader2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface SummaryOverlayProps {
  open: boolean;
  loading: boolean;
  summary: string | null;
  onClose: () => void;
}

/** Resumen de lo leído hasta el punto actual. Compartido entre modos. */
export function SummaryOverlay({
  open,
  loading,
  summary,
  onClose,
}: SummaryOverlayProps) {
  return (
    <Dialog open={open} onClose={onClose}>
      <div className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Sparkles className="size-5" /> Resumen de lo leído
        </h2>
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Generando resumen…
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {summary}
          </p>
        )}
        <Button variant="outline" className="w-full" onClick={onClose}>
          Cerrar
        </Button>
      </div>
    </Dialog>
  );
}
