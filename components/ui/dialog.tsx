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
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => dismissible && onClose?.()}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className={cn(
              "relative z-10 max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border bg-card p-6 text-card-foreground shadow-2xl",
              className
            )}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
