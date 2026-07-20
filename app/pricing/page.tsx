"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Sparkles, Loader2, BadgeCheck, LogIn } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

// Links de checkout hosted de Lemon Squeezy (Merchant of Record). Se completan
// como build args públicos; el checkout resuelve impuestos y pagos globales.
const CHECKOUT_MONTHLY = process.env.NEXT_PUBLIC_LS_CHECKOUT_MONTHLY;
const CHECKOUT_YEARLY = process.env.NEXT_PUBLIC_LS_CHECKOUT_YEARLY;

const PERKS = [
  "Biblioteca pública curada (crece cada semana)",
  "Módulos de rehabilitación: Schulte, N-Back, diagnóstico y plan personalizado",
  "Seguimiento de progreso y certificados",
  "Sincronización del catálogo entre dispositivos",
];

/** Agrega el email del usuario al link de checkout para prellenarlo. */
function withEmail(url: string, email: string | undefined): string {
  if (!email) return url;
  const sep = url.includes("?") ? "&" : "?";
  const q = new URLSearchParams({
    "checkout[email]": email,
    "checkout[custom][user_email]": email,
  });
  return `${url}${sep}${q.toString()}`;
}

export default function PricingPage() {
  const router = useRouter();
  const { ready, user, configured, hasActiveSub, subscription, refreshSubscription } =
    useAuth();
  const [going, setGoing] = useState<"monthly" | "yearly" | null>(null);

  // Al volver del checkout, Lemon Squeezy redirige acá; refrescamos la membresía
  // (el webhook puede tardar unos segundos en impactar).
  useEffect(() => {
    if (ready && user) void refreshSubscription();
  }, [ready, user, refreshSubscription]);

  const email = user?.email;

  const go = (plan: "monthly" | "yearly") => {
    const base = plan === "monthly" ? CHECKOUT_MONTHLY : CHECKOUT_YEARLY;
    if (!base) return;
    setGoing(plan);
    window.location.href = withEmail(base, email);
  };

  return (
    <div className="min-h-screen">
      <AppNav />
      <main className="mx-auto max-w-4xl px-4 py-10 pb-24 md:pb-10">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            <Sparkles className="size-4" /> Membresía ReadFlow
          </span>
          <h1 className="mt-4 text-3xl font-bold sm:text-4xl">
            Entrená tu atención. Volvé a leer libros de verdad.
          </h1>
          <p className="mt-3 text-muted-foreground">
            La app y tu lector siguen siendo <strong>gratis</strong>. La
            membresía desbloquea la biblioteca curada y los módulos de
            rehabilitación cognitiva.
          </p>
        </div>

        {hasActiveSub ? (
          <Card className="mx-auto max-w-md border-primary/40">
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <BadgeCheck className="size-10 text-primary" />
              <h2 className="text-xl font-bold">Ya sos miembro</h2>
              <p className="text-sm text-muted-foreground">
                Tu membresía{" "}
                <strong>
                  {subscription?.source === "comp"
                    ? "de cortesía"
                    : subscription?.plan === "yearly"
                      ? "anual"
                      : "mensual"}
                </strong>{" "}
                está activa. Disfrutá de todo el contenido premium.
              </p>
              <Link href="/library" className={buttonVariants({ className: "gap-2" })}>
                Ir a la biblioteca
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {/* Mensual */}
            <Card>
              <CardContent className="flex flex-col gap-5 p-7">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Mensual
                  </p>
                  <p className="mt-1 flex items-baseline gap-1">
                    <span className="text-4xl font-bold">$3</span>
                    <span className="text-muted-foreground">USD / mes</span>
                  </p>
                </div>
                <ul className="space-y-2 text-sm">
                  {PERKS.map((p) => (
                    <li key={p} className="flex gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
                <PlanCta
                  configured={configured}
                  user={!!user}
                  available={!!CHECKOUT_MONTHLY}
                  loading={going === "monthly"}
                  label="Suscribirme mensual"
                  onClick={() => go("monthly")}
                  onLogin={() => router.push("/login?next=/pricing")}
                />
              </CardContent>
            </Card>

            {/* Anual — destacado */}
            <Card className="relative border-primary/50 shadow-lg">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                Ahorrás 44%
              </span>
              <CardContent className="flex flex-col gap-5 p-7">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Anual
                  </p>
                  <p className="mt-1 flex items-baseline gap-1">
                    <span className="text-4xl font-bold">$20</span>
                    <span className="text-muted-foreground">USD / año</span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Equivale a $1,67 / mes
                  </p>
                </div>
                <ul className="space-y-2 text-sm">
                  {PERKS.map((p) => (
                    <li key={p} className="flex gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
                <PlanCta
                  configured={configured}
                  user={!!user}
                  available={!!CHECKOUT_YEARLY}
                  loading={going === "yearly"}
                  label="Suscribirme anual"
                  onClick={() => go("yearly")}
                  onLogin={() => router.push("/login?next=/pricing")}
                />
              </CardContent>
            </Card>
          </div>
        )}

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Pagos procesados de forma segura por Lemon Squeezy. Cancelás cuando
          quieras.
        </p>
      </main>
    </div>
  );
}

function PlanCta({
  configured,
  user,
  available,
  loading,
  label,
  onClick,
  onLogin,
}: {
  configured: boolean;
  user: boolean;
  available: boolean;
  loading: boolean;
  label: string;
  onClick: () => void;
  onLogin: () => void;
}) {
  if (!configured || !available) {
    return (
      <Button disabled className="w-full">
        Checkout no disponible
      </Button>
    );
  }
  if (!user) {
    return (
      <Button onClick={onLogin} className="w-full gap-2">
        <LogIn className="size-4" /> Iniciar sesión
      </Button>
    );
  }
  return (
    <Button onClick={onClick} disabled={loading} className="w-full gap-2">
      {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
      {label}
    </Button>
  );
}
