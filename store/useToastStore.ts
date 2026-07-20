"use client";

import { create } from "zustand";

export type ToastVariant = "success" | "error" | "info";

export interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastState {
  toasts: Toast[];
  push: (message: string, variant: ToastVariant) => void;
  dismiss: (id: number) => void;
}

const AUTO_DISMISS_MS = 5500;
/** Máximo de toasts visibles a la vez; el más viejo cede el lugar. */
const MAX_VISIBLE = 3;

let nextId = 1;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (message, variant) => {
    const id = nextId++;
    set((s) => ({
      toasts: [...s.toasts.slice(-(MAX_VISIBLE - 1)), { id, message, variant }],
    }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, AUTO_DISMISS_MS);
  },
  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** API imperativa usable desde cualquier módulo cliente (no requiere hook). */
export const toast = {
  success: (message: string) => useToastStore.getState().push(message, "success"),
  error: (message: string) => useToastStore.getState().push(message, "error"),
  info: (message: string) => useToastStore.getState().push(message, "info"),
};
