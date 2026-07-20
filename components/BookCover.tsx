import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface BookCoverProps {
  title: string;
  author?: string | null;
  /** Miniatura real (dataURL) si el libro la tiene. */
  cover?: string | null;
  className?: string;
}

// Degradados de respaldo (tokens Focus Blue). El libro elige uno de forma
// determinística por su título, así su "portada" es estable entre renders.
const FALLBACK_GRADIENTS = [
  "from-primary to-primary-bright",
  "from-primary-bright to-primary",
  "from-success to-primary",
  "from-primary to-warning",
  "from-warning-soft-foreground to-primary",
  "from-primary-bright to-success",
];

function gradientFor(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = (hash * 31 + title.charCodeAt(i)) | 0;
  return FALLBACK_GRADIENTS[Math.abs(hash) % FALLBACK_GRADIENTS.length];
}

/**
 * Portada de un libro: usa la miniatura real si existe; si no, genera una
 * portada tipográfica (degradado + título) para que la biblioteca nunca muestre
 * huecos vacíos. Pensado para ir dentro de un contenedor con proporción fija.
 */
export function BookCover({ title, author, cover, className }: BookCoverProps) {
  if (cover) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={cover}
        alt={`Portada de ${title}`}
        loading="lazy"
        decoding="async"
        className={cn("size-full object-cover", className)}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={`Portada de ${title}`}
      className={cn(
        "flex size-full flex-col justify-between bg-gradient-to-br p-3 text-primary-foreground",
        gradientFor(title),
        className
      )}
    >
      <BookOpen className="size-5 opacity-70" strokeWidth={2} />
      <div className="min-h-0">
        <p className="line-clamp-4 text-sm font-bold leading-tight [text-wrap:balance]">
          {title}
        </p>
        {author && (
          <p className="mt-1 line-clamp-1 text-[11px] font-medium opacity-80">
            {author}
          </p>
        )}
      </div>
    </div>
  );
}
