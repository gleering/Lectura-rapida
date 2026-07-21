"use client";

import { useEffect } from "react";

/**
 * Registra el service worker y garantiza que el usuario SIEMPRE termine en la
 * última versión desplegada, sin tener que borrar caché ni saber nada de PWAs:
 *
 *  1. Si la página ya está controlada por un SW (no es la primera visita) y un
 *     SW nuevo toma el control tras un deploy, se recarga automáticamente una
 *     sola vez. En la primera visita `controller` es null, así que no recarga.
 *  2. Se comprueba activamente si hay una versión nueva al cargar, al volver a
 *     la pestaña y cada 30 min — así una pestaña abierta durante un deploy se
 *     entera sola en vez de quedar servida por el bundle viejo.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    let refreshing = false;
    // Solo enganchamos la recarga si YA hay un SW controlando la página: así la
    // primera instalación (cuando el SW reclama el control por primera vez) no
    // dispara una recarga innecesaria.
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
    }

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          // Chequeo proactivo de versiones nuevas.
          const check = () => void reg.update().catch(() => {});
          check();
          const interval = setInterval(check, 30 * 60 * 1000);
          const onVisible = () => {
            if (document.visibilityState === "visible") check();
          };
          document.addEventListener("visibilitychange", onVisible);
          // Limpieza si el componente se desmonta (SPA nav).
          return () => {
            clearInterval(interval);
            document.removeEventListener("visibilitychange", onVisible);
          };
        })
        .catch(() => {
          /* registro fallido: la app sigue funcionando sin offline */
        });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
