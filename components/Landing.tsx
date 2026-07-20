"use client";

import Image from "next/image";
import Link from "next/link";
import { Hanken_Grotesk, Geist } from "next/font/google";
import {
  Gauge,
  GraduationCap,
  Repeat,
  Dumbbell,
  Library,
  Upload,
  BadgeCheck,
  ArrowRight,
  Brain,
} from "lucide-react";

// Fuentes del diseño (Stitch). Scoped a la landing vía variables CSS.
const heading = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-landing-heading",
});
const body = Geist({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-landing-body",
});

// Paleta Focus Blue (solo landing).
const BLUE = "#2563EB";
const BLUE_DARK = "#004AC6";
const INK = "#131b2e";
const MUTED = "#434655";
const SURFACE = "#faf8ff";
const CARD = "#ffffff";
const BORDER = "#c3c6d7";

const FEATURES = [
  {
    icon: Gauge,
    tint: BLUE,
    title: "Lectura RSVP",
    desc: "Entrená tu velocidad sin perder el foco mediante ráfagas visuales rápidas de palabras individuales.",
  },
  {
    icon: GraduationCap,
    tint: "#10B981",
    title: "Tutor con IA",
    desc: "Resolvé dudas y profundizá en tus lecturas con un asistente inteligente disponible 24/7.",
  },
  {
    icon: Repeat,
    tint: "#F59E0B",
    title: "Repaso espaciado",
    desc: "Consolidá lo aprendido en tu memoria de largo plazo con algoritmos de repetición inteligente.",
  },
  {
    icon: Dumbbell,
    tint: BLUE,
    title: "Centro de entrenamiento",
    desc: "Ejercicios diarios para tu mente que mejoran tu campo visual y capacidad de síntesis.",
  },
  {
    icon: Library,
    tint: "#10B981",
    title: "Biblioteca curada",
    desc: "Accedé a libros seleccionados para optimizar tu aprendizaje en diversas áreas, o subí los tuyos.",
  },
  {
    icon: Upload,
    tint: "#F59E0B",
    title: "Tus propios PDFs",
    desc: "Subí tu material de estudio o trabajo y empezá a entrenar con tus propios contenidos.",
  },
];

const STEPS = [
  {
    n: 1,
    title: "Creá tu cuenta gratis",
    desc: "Configurá tu perfil en menos de un minuto y definí tus objetivos de lectura.",
  },
  {
    n: 2,
    title: "Subí un PDF o elegí de la biblioteca",
    desc: "Importá tus documentos o explorá nuestra selección de libros listos para leer.",
  },
  {
    n: 3,
    title: "Leé, entrená y consolidá",
    desc: "Usá el lector dinámico y respondé los desafíos de la IA para asegurar tu comprensión.",
  },
];

/**
 * Landing pública: se muestra en "/" a los visitantes sin sesión (cuando
 * Supabase está configurado). Enseña la propuesta de valor y lleva a
 * registrarse. Los usuarios logueados ven directamente la app.
 *
 * Diseño (Stitch): paleta Focus Blue + Hanken Grotesk / Geist, scoped acá con
 * colores explícitos para verse siempre en modo claro, sin tocar el tema global.
 */
export function Landing() {
  return (
    <div
      className={`${heading.variable} ${body.variable} min-h-screen`}
      style={{
        backgroundColor: SURFACE,
        color: INK,
        fontFamily: "var(--font-landing-body)",
      }}
    >
      {/* Header fijo */}
      <header
        className="fixed top-0 z-50 w-full border-b backdrop-blur-md"
        style={{
          backgroundColor: "rgba(250,248,255,0.8)",
          borderColor: BORDER,
        }}
      >
        <div className="mx-auto flex h-20 max-w-[1280px] items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Image
              src="/landing/logo.png"
              alt="ReadFlow AI"
              width={160}
              height={40}
              priority
              className="h-9 w-auto object-contain"
            />
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium transition-colors hover:text-[#2563EB]"
              style={{ color: MUTED }}
            >
              Iniciar sesión
            </Link>
            <Link
              href="/login?mode=up"
              className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-transform active:scale-95"
              style={{ backgroundColor: BLUE }}
            >
              Crear cuenta
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-20">
        {/* Hero */}
        <section className="relative overflow-hidden pb-24 pt-16 md:pt-24">
          <div
            className="pointer-events-none absolute -left-20 top-0 -z-10 size-96 rounded-full blur-[80px]"
            style={{ backgroundColor: BLUE, opacity: 0.12 }}
          />
          <div
            className="pointer-events-none absolute -right-20 bottom-0 -z-10 size-80 rounded-full blur-[80px]"
            style={{ backgroundColor: "#6cf8bb", opacity: 0.18 }}
          />
          <div className="mx-auto flex max-w-[1280px] flex-col items-center px-6 text-center">
            <span
              className="mb-8 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium"
              style={{
                color: BLUE,
                borderColor: "rgba(37,99,235,0.2)",
                backgroundColor: "rgba(37,99,235,0.06)",
              }}
            >
              <BadgeCheck className="size-4" /> Entrená tu mente para leer mejor
            </span>
            <h1
              className="mb-6 max-w-4xl text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl"
              style={{ fontFamily: "var(--font-landing-heading)" }}
            >
              Comprendé lo que leés.
              <br />
              <span style={{ color: BLUE }}>De verdad.</span>
            </h1>
            <p
              className="mb-12 max-w-2xl text-lg leading-relaxed"
              style={{ color: MUTED }}
            >
              Transformá tus lecturas en aprendizaje real con inteligencia
              artificial y técnicas de entrenamiento cognitivo. Leé más rápido,
              retené más información.
            </p>
            <div className="flex w-full flex-col items-center gap-4 sm:w-auto sm:flex-row">
              <Link
                href="/login?mode=up"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-8 py-4 text-base font-semibold text-white shadow-lg transition-transform hover:-translate-y-0.5 sm:w-auto"
                style={{ backgroundColor: BLUE, boxShadow: `0 10px 30px -10px ${BLUE}` }}
              >
                Crear cuenta gratis <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex w-full items-center justify-center rounded-xl border px-8 py-4 text-base font-medium transition-colors sm:w-auto"
                style={{ backgroundColor: CARD, borderColor: BORDER, color: INK }}
              >
                Ya tengo cuenta
              </Link>
            </div>
          </div>
        </section>

        {/* Preview del lector RSVP */}
        <section className="pb-24">
          <div className="mx-auto max-w-4xl px-6">
            <div className="group relative">
              <div
                className="absolute -inset-1 rounded-[3rem] opacity-25 blur transition duration-700 group-hover:opacity-50"
                style={{
                  background: `linear-gradient(90deg, rgba(37,99,235,0.3), rgba(108,248,187,0.3))`,
                }}
              />
              <div
                className="relative overflow-hidden rounded-[2.5rem] border bg-white p-4 shadow-2xl"
                style={{ borderColor: "rgba(255,255,255,0.4)" }}
              >
                <Image
                  src="/landing/rsvp-mockup.png"
                  alt="Modo de lectura RSVP de ReadFlow"
                  width={1280}
                  height={720}
                  className="h-auto w-full rounded-[2rem] border"
                  style={{ borderColor: "rgba(195,198,215,0.3)" }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Features — bento grid */}
        <section
          className="py-24"
          style={{ backgroundColor: "rgba(242,243,255,0.5)" }}
        >
          <div className="mx-auto max-w-[1280px] px-6">
            <div className="mb-16 text-center">
              <h2
                className="mb-4 text-3xl font-semibold tracking-tight"
                style={{ fontFamily: "var(--font-landing-heading)" }}
              >
                Potenciá tu lectura
              </h2>
              <p style={{ color: MUTED }}>
                Herramientas diseñadas para maximizar tu capacidad cognitiva.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, tint, title, desc }) => (
                <div
                  key={title}
                  className="rounded-2xl border p-8 transition-transform duration-200 hover:-translate-y-1"
                  style={{ backgroundColor: CARD, borderColor: BORDER }}
                >
                  <div
                    className="mb-6 flex size-12 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${tint}1a`, color: tint }}
                  >
                    <Icon className="size-7" />
                  </div>
                  <h3
                    className="mb-2 text-xl font-semibold"
                    style={{ fontFamily: "var(--font-landing-heading)" }}
                  >
                    {title}
                  </h3>
                  <p style={{ color: MUTED }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Cómo funciona */}
        <section className="py-24">
          <div className="mx-auto max-w-[1280px] px-6">
            <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
              <div>
                <h2
                  className="mb-8 text-3xl font-semibold tracking-tight"
                  style={{ fontFamily: "var(--font-landing-heading)" }}
                >
                  El camino hacia la maestría lectora
                </h2>
                <div className="space-y-12">
                  {STEPS.map((step) => (
                    <div key={step.n} className="flex gap-6">
                      <div
                        className="flex size-12 flex-shrink-0 items-center justify-center rounded-full text-xl font-bold text-white shadow-md"
                        style={{
                          backgroundColor: step.n === 1 ? BLUE : "rgba(37,99,235,0.2)",
                          color: step.n === 1 ? "#fff" : BLUE,
                        }}
                      >
                        {step.n}
                      </div>
                      <div>
                        <p
                          className="mb-1 text-sm font-semibold uppercase tracking-wider"
                          style={{ color: BLUE }}
                        >
                          Paso {step.n}
                        </p>
                        <h3
                          className="mb-2 text-xl font-semibold"
                          style={{ fontFamily: "var(--font-landing-heading)" }}
                        >
                          {step.title}
                        </h3>
                        <p style={{ color: MUTED }}>{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Visual: bloque decorativo (placeholder de la ilustración 3D) */}
              <div className="relative">
                <div
                  className="flex aspect-square items-center justify-center rounded-3xl p-12"
                  style={{ backgroundColor: "rgba(37,99,235,0.05)" }}
                >
                  <div className="relative flex size-full items-center justify-center">
                    <div
                      className="absolute size-48 rounded-full blur-3xl"
                      style={{ backgroundColor: BLUE, opacity: 0.25 }}
                    />
                    <div
                      className="relative flex size-40 items-center justify-center rounded-full text-white shadow-2xl"
                      style={{
                        background: `linear-gradient(135deg, ${BLUE}, ${BLUE_DARK})`,
                      }}
                    >
                      <Brain className="size-20" strokeWidth={1.5} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="px-6 py-24">
          <div
            className="relative mx-auto max-w-4xl overflow-hidden rounded-[2.5rem] p-12 text-center text-white md:p-20"
            style={{ backgroundColor: BLUE }}
          >
            <div className="absolute -right-24 -top-24 size-64 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 size-64 rounded-full bg-[#6cf8bb]/20 blur-3xl" />
            <div className="relative z-10">
              <h2
                className="mb-8 text-3xl font-bold leading-tight sm:text-4xl md:text-5xl"
                style={{ fontFamily: "var(--font-landing-heading)" }}
              >
                Convertí tu tiempo de lectura en aprendizaje real
              </h2>
              <p className="mx-auto mb-12 max-w-xl text-lg text-white/80">
                Sumate a los profesionales y estudiantes que ya están hackeando
                su aprendizaje.
              </p>
              <Link
                href="/login?mode=up"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-10 py-5 text-lg font-bold shadow-xl transition-transform active:scale-95"
                style={{ color: BLUE }}
              >
                Crear cuenta gratis <ArrowRight className="size-5" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t py-12" style={{ borderColor: BORDER, backgroundColor: CARD }}>
        <div className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-8 px-6 md:flex-row">
          <div className="flex flex-col items-center gap-4 md:items-start">
            <Image
              src="/landing/logo.png"
              alt="ReadFlow AI"
              width={140}
              height={32}
              className="h-8 w-auto object-contain"
            />
            <p className="max-w-xs text-center text-sm md:text-left" style={{ color: MUTED }}>
              Potenciando la lectura inteligente y el enfoque profundo para la
              era digital.
            </p>
          </div>
          <p className="text-sm" style={{ color: MUTED, opacity: 0.7 }}>
            © {new Date().getFullYear()} ReadFlow AI. Entrená tu enfoque.
          </p>
        </div>
      </footer>
    </div>
  );
}
