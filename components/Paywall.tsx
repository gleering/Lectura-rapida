"use client";

import Link from "next/link";
import { Lock, Sparkles, LogIn } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

interface PaywallProps {
  /** Qué se está bloqueando, para el copy (ej: "la biblioteca pública"). */
  feature: string;
  className?: string;
}

/**
 * Muro de membresía. Se muestra en las secciones premium (biblioteca pública y
 * módulos de entrenamiento) cuando el usuario no tiene una membresía activa.
 * Si Supabase no está configurado no bloquea nada (devuelve null).
 */
export function Paywall({ feature, className }: PaywallProps) {
  const { configured, user } = useAuth();
  if (!configured) return null;

  return (
    <Card className={className}>
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="rounded-full bg-primary/10 p-3 text-primary">
          <Lock className="size-7" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-bold">Función premium</h3>
          <p className="max-w-md text-sm text-muted-foreground">
            {feature} forma parte de la membresía ReadFlow. Suscribite para
            desbloquear el catálogo curado y los módulos de rehabilitación.
          </p>
        </div>

        {user ? (
          <Link
            href="/pricing"
            className={buttonVariants({ size: "lg", className: "gap-2" })}
          >
            <Sparkles className="size-4" /> Ver planes
          </Link>
        ) : (
          <Link
            href="/login?next=/pricing"
            className={buttonVariants({ size: "lg", className: "gap-2" })}
          >
            <LogIn className="size-4" /> Iniciar sesión para suscribirte
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
