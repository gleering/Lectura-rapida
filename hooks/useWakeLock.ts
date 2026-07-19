"use client";

import { useEffect } from "react";

/**
 * Mantiene la pantalla encendida mientras `active` es true (Screen Wake Lock
 * API). En móvil, la lectura RSVP/Guía no toca la pantalla durante minutos y
 * el sistema la apagaría a mitad de sesión. Mejora progresiva: si el navegador
 * no soporta la API, no hace nada.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof navigator === "undefined") return;
    if (!("wakeLock" in navigator)) return;

    let lock: WakeLockSentinel | null = null;
    let cancelled = false;

    const request = async () => {
      try {
        lock = await navigator.wakeLock.request("screen");
      } catch {
        /* denegado (batería baja) o no disponible — seguir sin lock */
      }
    };
    void request();

    // El lock se libera solo al cambiar de pestaña; re-adquirirlo al volver.
    const onVisibility = () => {
      if (document.visibilityState === "visible" && !cancelled) void request();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      void lock?.release().catch(() => {});
    };
  }, [active]);
}
