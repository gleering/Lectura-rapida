import { AppNav } from "@/components/AppNav";
import { cn } from "@/lib/utils";

const MAX_WIDTHS = {
  md: "max-w-2xl",
  lg: "max-w-3xl",
  xl: "max-w-4xl",
  "2xl": "max-w-5xl",
  full: "max-w-[1280px]",
} as const;

interface PageShellProps {
  children: React.ReactNode;
  /** Ancho máximo del contenido (por defecto la grilla completa de 1280px). */
  maxWidth?: keyof typeof MAX_WIDTHS;
  className?: string;
}

/**
 * Marco estándar de todas las pantallas internas: fondo tokenizado, AppNav y
 * un <main> centrado con padding inferior que despeja la tab bar móvil.
 */
export function PageShell({
  children,
  maxWidth = "full",
  className,
}: PageShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppNav />
      <main
        className={cn(
          "mx-auto px-4 py-8 pb-28 md:pb-10",
          MAX_WIDTHS[maxWidth],
          className
        )}
      >
        {children}
      </main>
    </div>
  );
}
