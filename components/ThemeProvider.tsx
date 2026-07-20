"use client";

import { useEffect } from "react";
import { MotionConfig } from "framer-motion";
import { useSettingsStore } from "@/store/useSettingsStore";

/**
 * Carga los ajustes persistidos y refleja el tema en <html>.
 * - "system" sigue prefers-color-scheme en vivo.
 * - MotionConfig hace que framer-motion respete prefers-reduced-motion
 *   (crítico para usuarios sensibles al movimiento; el RSVP solo anima
 *   cuando el usuario pulsa play).
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const load = useSettingsStore((s) => s.load);
  const theme = useSettingsStore((s) => s.settings.theme);
  const loaded = useSettingsStore((s) => s.loaded);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!loaded) return;
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && media.matches);
      root.classList.toggle("dark", dark);
    };
    apply();
    if (theme !== "system") return;
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme, loaded]);

  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
