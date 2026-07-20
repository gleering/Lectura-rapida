import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ReactNode;
  children: React.ReactNode;
  /** Acción principal (botón/enlace) que saca al usuario del estado vacío. */
  action?: React.ReactNode;
  className?: string;
}

/** Estado vacío accionable estándar: borde discontinuo, ícono, texto y CTA. */
export function EmptyState({
  icon,
  children,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card/50 px-4 py-12 text-center text-muted-foreground",
        className
      )}
    >
      {icon}
      <div className="max-w-sm text-sm sm:text-base">{children}</div>
      {action}
    </div>
  );
}
