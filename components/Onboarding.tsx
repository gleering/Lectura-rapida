"use client";

import Link from "next/link";
import { Upload, BookOpenCheck, Brain, ArrowRight, Library } from "lucide-react";
import { UploadButton } from "@/components/UploadButton";
import { isSupabaseConfigured } from "@/lib/supabase";

const STEPS = [
  {
    icon: Upload,
    title: "Elige tu primer libro",
    desc: "Sube un PDF o texto propio, o descarga uno de la biblioteca pública. Todo queda en este dispositivo y funciona sin conexión.",
  },
  {
    icon: BookOpenCheck,
    title: "Haz tu primera sesión",
    desc: "Empieza con RSVP: las palabras vienen solas para reconstruir tu foco, sin exigirte de golpe.",
  },
  {
    icon: Brain,
    title: "Consolida lo aprendido",
    desc: "Al terminar, convierte la lectura en tarjetas de repaso. Aquí no medimos velocidad, sino cuánto recuerdas.",
  },
];

/**
 * Bienvenida para usuarios sin libros. Explica la promesa del producto
 * (rehabilitar la atención → comprender y retener) y ofrece los dos caminos
 * para empezar: subir un libro propio o tomar uno de la biblioteca pública.
 */
export function Onboarding() {
  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-card">
      <div className="bg-gradient-to-br from-primary to-primary-bright px-6 py-10 text-center text-primary-foreground md:px-10 md:py-12">
        <h2 className="font-display text-2xl font-bold md:text-3xl">
          Bienvenido a ReadFlow
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-primary-foreground/85 md:text-base">
          No es un lector veloz: es un entrenamiento para recuperar tu atención y
          volver a disfrutar de leer libros de verdad, comprendiendo y recordando.
        </p>
      </div>

      <div className="grid gap-4 p-6 md:grid-cols-3 md:p-8">
        {STEPS.map((s, i) => (
          <div
            key={s.title}
            className="relative rounded-2xl border border-border bg-background p-5"
          >
            <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
              <s.icon className="size-5" />
            </div>
            <div className="mb-1 flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Paso {i + 1}
              </span>
              {i < STEPS.length - 1 && (
                <ArrowRight className="hidden size-3.5 text-border md:block" />
              )}
            </div>
            <h3 className="font-semibold text-foreground">{s.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-3 border-t border-border px-6 py-6 text-center">
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <UploadButton
            label="Subir mi primer libro"
            className="rounded-xl bg-primary px-8 py-3 text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
          />
          {isSupabaseConfigured && (
            <Link
              href="/library?tab=public"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card px-8 py-3 font-medium text-foreground transition-colors hover:bg-secondary"
            >
              <Library className="size-4 text-primary" />
              Explorar biblioteca pública
            </Link>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {isSupabaseConfigured
            ? "¿No tienes un PDF a mano? Descarga un libro de nuestro catálogo y empieza en segundos."
            : "Formatos: PDF, TXT y Markdown · Todo se procesa en tu dispositivo"}
        </p>
      </div>
    </section>
  );
}
