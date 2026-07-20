import { cn } from "@/lib/utils";

interface StatTileProps {
  /** Ícono opcional (lucide) ya coloreado por el llamador. */
  icon?: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  /** Color del valor (p. ej. "text-primary"); por defecto foreground. */
  valueClassName?: string;
  className?: string;
}

/** Tarjeta de métrica centrada — compartida por Inicio, Repaso y paneles. */
export function StatTile({
  icon,
  label,
  value,
  sub,
  valueClassName,
  className,
}: StatTileProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-4 text-center transition-transform active:scale-[0.98]",
        className
      )}
    >
      {icon && <div className="mb-2">{icon}</div>}
      <p
        className={cn(
          "order-2 text-lg font-bold leading-tight",
          valueClassName ?? "text-foreground"
        )}
      >
        {value}
      </p>
      <p className="order-1 text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      {sub && (
        <p className="order-3 text-[11px] text-muted-foreground">{sub}</p>
      )}
    </div>
  );
}
