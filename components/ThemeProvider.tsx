"use client";

import { useEffect } from "react";
import { useSettingsStore } from "@/store/useSettingsStore";

/** Loads persisted settings and reflects the theme onto <html>. */
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
    root.classList.toggle("dark", theme === "dark");
  }, [theme, loaded]);

  return <>{children}</>;
}
