"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Home, Library, BarChart3, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/library", label: "Biblioteca", icon: Library },
  { href: "/stats", label: "Estadísticas", icon: BarChart3 },
  { href: "/settings", label: "Ajustes", icon: Settings },
];

export function AppNav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <BookOpen className="size-5" />
          <span>ReadFlow AI</span>
        </Link>
        <nav className="flex items-center gap-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-secondary/60"
                )}
              >
                <Icon className="size-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
