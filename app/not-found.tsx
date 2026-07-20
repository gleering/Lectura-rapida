import Link from "next/link";
import { BookX, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-card p-8 text-center">
        <BookX className="mx-auto size-10 text-primary" />
        <h1 className="font-display text-xl font-bold">Página no encontrada</h1>
        <p className="text-sm text-muted-foreground">
          La página que buscas no existe o fue movida.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Home className="size-4" /> Volver al inicio
        </Link>
      </div>
    </div>
  );
}
