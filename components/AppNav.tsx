"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  Home,
  Library,
  BarChart3,
  Settings,
  Brain,
  Repeat,
  GraduationCap,
  Network,
  BookMarked,
  TrendingUp,
  Sparkles,
  MoreHorizontal,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MEMBERSHIP_ENABLED } from "@/lib/features";

const links = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/library", label: "Biblioteca", icon: Library },
  { href: "/tutor", label: "Tutor", icon: GraduationCap },
  { href: "/study", label: "Estudiar", icon: BookMarked },
  { href: "/review", label: "Repaso", icon: Repeat },
  { href: "/connections", label: "Conexiones", icon: Network },
  { href: "/progress", label: "Progreso", icon: TrendingUp },
  { href: "/training", label: "Entrenamiento", icon: Brain },
  // El enlace a la membresía solo aparece cuando el paywall está activo.
  ...(MEMBERSHIP_ENABLED
    ? [{ href: "/pricing", label: "Membresía", icon: Sparkles }]
    : []),
  { href: "/stats", label: "Estadísticas", icon: BarChart3 },
  { href: "/settings", label: "Ajustes", icon: Settings },
];

/** Destinos del bucle de aprendizaje priorizados para la barra inferior móvil
 *  (zona del pulgar). El resto viven en el menú "Más". */
const PRIMARY_HREFS = ["/", "/library", "/review", "/progress"];

function useIsActive() {
  const pathname = usePathname();
  return (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function AppNav() {
  const isActive = useIsActive();
  const [moreOpen, setMoreOpen] = useState(false);

  const primaryLinks = PRIMARY_HREFS.map(
    (h) => links.find((l) => l.href === h)!
  );
  const secondaryLinks = links.filter((l) => !PRIMARY_HREFS.includes(l.href));
  const moreActive = secondaryLinks.some((l) => isActive(l.href));

  return (
    <>
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-2 px-4">
          <Link href="/" className="flex shrink-0 items-center gap-2 font-bold">
            <BookOpen className="size-5" />
            <span className="whitespace-nowrap">ReadFlow AI</span>
          </Link>

          {/* Desktop nav — full set. Las etiquetas solo aparecen cuando hay
              ancho de sobra (xl); en laptops medianas se muestran solo íconos
              para que ningún ítem (p. ej. "Ajustes") quede cortado. */}
          <nav className="hidden min-w-0 items-center gap-0.5 md:flex xl:gap-1">
            {links.map(({ href, label, icon: Icon }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  title={label}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors xl:px-3",
                    active
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:bg-secondary/60"
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="hidden xl:inline">{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Mobile bottom tab bar — thumb-reachable, always visible */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Navegación principal"
      >
        <div className="mx-auto flex max-w-md items-stretch justify-around">
          {primaryLinks.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex min-h-[3.5rem] flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="size-5" />
                <span>{label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setMoreOpen(true)}
            className={cn(
              "flex min-h-[3.5rem] flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[11px] font-medium transition-colors",
              moreActive ? "text-primary" : "text-muted-foreground"
            )}
            aria-label="Más secciones"
          >
            <MoreHorizontal className="size-5" />
            <span>Más</span>
          </button>
        </div>
      </nav>

      {/* "Más" sheet */}
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            className="fixed inset-0 z-50 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t bg-background p-4"
              style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 340, damping: 32 }}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold">Más secciones</span>
                <button
                  onClick={() => setMoreOpen(false)}
                  className="rounded-md p-1 text-muted-foreground hover:bg-secondary/60"
                  aria-label="Cerrar"
                >
                  <X className="size-5" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {secondaryLinks.map(({ href, label, icon: Icon }) => {
                  const active = isActive(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMoreOpen(false)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center text-xs font-medium transition-colors",
                        active
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border text-muted-foreground hover:bg-secondary/60"
                      )}
                    >
                      <Icon className="size-5" />
                      <span>{label}</span>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
