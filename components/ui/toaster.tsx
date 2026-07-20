"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { useToastStore, type ToastVariant } from "@/store/useToastStore";
import { cn } from "@/lib/utils";

const VARIANT_META: Record<
  ToastVariant,
  { icon: typeof Info; iconClass: string; borderClass: string }
> = {
  success: {
    icon: CheckCircle2,
    iconClass: "text-success",
    borderClass: "border-success/30",
  },
  error: {
    icon: AlertCircle,
    iconClass: "text-destructive",
    borderClass: "border-destructive/30",
  },
  info: { icon: Info, iconClass: "text-primary", borderClass: "border-border" },
};

/**
 * Notificaciones no bloqueantes (reemplazo de alert()). La región vive siempre
 * montada con aria-live para que los lectores de pantalla anuncien cada toast.
 */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div
      role="status"
      aria-live="polite"
      className="safe-top pointer-events-none fixed inset-x-0 top-0 z-[70] flex flex-col items-center gap-2 px-4"
    >
      <AnimatePresence>
        {toasts.map((t) => {
          const meta = VARIANT_META[t.variant];
          const Icon = meta.icon;
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className={cn(
                "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-card p-3 pr-2 text-sm text-card-foreground shadow-lg",
                meta.borderClass
              )}
            >
              <Icon className={cn("mt-0.5 size-5 shrink-0", meta.iconClass)} />
              <p className="flex-1 py-0.5 leading-snug">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Cerrar aviso"
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
