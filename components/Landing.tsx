"use client";

import Link from "next/link";
import {
  BookOpen,
  Brain,
  GraduationCap,
  Repeat,
  Library,
  Gauge,
  Upload,
  Sparkles,
  ArrowRight,
  Check,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

const FEATURES = [
  {
    icon: Gauge,
    title: "Lectura RSVP",
    desc: "Leé palabra por palabra a tu ritmo. Entrená la velocidad sin perder comprensión.",
  },
  {
    icon: GraduationCap,
    title: "Tutor con IA",
    desc: "Preguntas de comprensión y explicaciones que consolidan lo que leés.",
  },
  {
    icon: Repeat,
    title: "Repaso espaciado",
    desc: "Los conceptos clave vuelven en el momento justo para no olvidarlos.",
  },
  {
    icon: Brain,
    title: "Centro de entrenamiento",
    desc: "Tabla de Schulte, N-Back y un plan personalizado para tu atención y memoria.",
  },
  {
    icon: Library,
    title: "Biblioteca curada",
    desc: "Descargá libros seleccionados listos para leer, o subí los tuyos.",
  },
  {
    icon: Upload,
    title: "Tus propios PDFs",
    desc: "Subí cualquier libro en PDF y transformalo en una sesión de lectura activa.",
  },
];

const STEPS = [
  "Creá tu cuenta gratis en segundos",
  "Subí un PDF o elegí un libro de la biblioteca",
  "Leé, entrená y consolidá lo que aprendés",
];

/**
 * Landing pública: se muestra en "/" a los visitantes sin sesión (cuando
 * Supabase está configurado). Enseña la propuesta de valor y lleva a
 * registrarse. Los usuarios logueados ven directamente la app.
 */
export function Landing() {
  return (
    <div className="min-h-screen">
      {/* Top bar simple */}
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-2 font-bold">
            <BookOpen className="size-5" />
            <span>ReadFlow AI</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              Iniciar sesión
            </Link>
            <Link
              href="/login?mode=up"
              className={buttonVariants({ size: "sm" })}
            >
              Crear cuenta
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4">
        {/* Hero */}
        <section className="flex flex-col items-center gap-6 py-20 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            <Sparkles className="size-4" /> Entrená tu mente para leer mejor
          </span>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            Comprende lo que lees. De verdad.
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            ReadFlow no es solo leer rápido: es entrenar tu atención, comprensión
            y memoria. Subí tus libros o elegí de nuestra biblioteca y
            transformá la lectura en conocimiento que se queda.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login?mode=up"
              className={buttonVariants({ size: "lg", className: "gap-2" })}
            >
              Crear cuenta gratis <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/login"
              className={buttonVariants({
                variant: "outline",
                size: "lg",
              })}
            >
              Ya tengo cuenta
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="py-8">
          <h2 className="mb-8 text-center text-2xl font-bold">
            Todo lo que necesitás para leer mejor
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <Card key={title} className="h-full">
                <CardContent className="space-y-3 p-6">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-6" />
                  </div>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Cómo funciona */}
        <section className="py-16">
          <h2 className="mb-8 text-center text-2xl font-bold">
            Empezá en 3 pasos
          </h2>
          <div className="mx-auto flex max-w-2xl flex-col gap-3">
            {STEPS.map((step, i) => (
              <div
                key={step}
                className="flex items-center gap-4 rounded-xl border p-4"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {i + 1}
                </div>
                <p className="text-sm font-medium">{step}</p>
                <Check className="ml-auto size-5 text-primary/60" />
              </div>
            ))}
          </div>
        </section>

        {/* CTA final */}
        <section className="pb-24">
          <Card className="border-primary/40 bg-gradient-to-br from-primary/10 to-transparent">
            <CardContent className="flex flex-col items-center gap-5 py-14 text-center">
              <h2 className="max-w-lg text-2xl font-bold sm:text-3xl">
                Convertí tu tiempo de lectura en aprendizaje real
              </h2>
              <p className="max-w-md text-muted-foreground">
                Registrate gratis y empezá a leer con propósito hoy mismo.
              </p>
              <Link
                href="/login?mode=up"
                className={buttonVariants({ size: "lg", className: "gap-2" })}
              >
                Crear mi cuenta <ArrowRight className="size-4" />
              </Link>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
