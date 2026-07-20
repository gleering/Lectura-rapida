"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  className?: string;
  /** When false the backdrop click is ignored (e.g. blocking modals). */
  dismissible?: boolean;
}

/** Minimal animated modal — overlay + centered card. */
export function Dialog({
  open,
  onClose,
  children,
  className,
  dismissible = true,
}: DialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] overflow-y-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
          {/* min-h-full + items-center: centra en pantallas altas y permite
              scroll (sin recorte) cuando el teclado virtual o una pantalla baja
              dejan el diálogo más alto que el viewport. El clic fuera de la
              tarjeta cierra (si es dismissible); la tarjeta frena la propagación. */}
          <div
            className="safe-top safe-bottom flex min-h-full items-center justify-center px-4"
            onClick={() => dismissible && onClose?.()}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className={cn(
                "relative z-10 my-auto w-full max-w-md rounded-2xl border bg-card p-6 text-card-foreground shadow-2xl",
                className
              )}
            >
              {children}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
