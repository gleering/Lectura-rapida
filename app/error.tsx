"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Pantalla de error de la app (App Router). Los datos del usuario viven en
 * IndexedDB, así que un fallo de render nunca pierde su progreso — se lo
 * decimos explícitamente para bajar la ansiedad.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log local para diagnóstico; nunca se envía a un servidor.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-card p-8 text-center">
        <AlertTriangle className="mx-auto size-10 text-warning" />
        <h1 className="font-display text-xl font-bold">Algo salió mal</h1>
        <p className="text-sm text-muted-foreground">
          Ocurrió un error inesperado en esta pantalla. Tu progreso y tus libros
          están guardados en este dispositivo y no se perdieron.
        </p>
        <div className="flex flex-col justify-center gap-2 sm:flex-row">
          <Button onClick={reset}>
            <RotateCcw /> Reintentar
          </Button>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Home className="size-4" /> Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
