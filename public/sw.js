// Service worker de ReadFlow — cache básico para instalación y uso offline.
// Al subir esta versión, `activate` borra las cachés viejas y (por skipWaiting +
// clients.claim + la recarga automática del cliente) el usuario pasa a la
// versión nueva sin tener que borrar caché a mano.
const CACHE = "readflow-v4";
const OFFLINE_URLS = ["/", "/library", "/review", "/progress"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(OFFLINE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navegación (páginas): red primero, cache como respaldo offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match("/")))
    );
    return;
  }

  // Estáticos con hash de contenido (/_next/static/…) e íconos: cache primero.
  // Es seguro porque cada build genera nombres de archivo nuevos, así que un
  // deploy nunca queda "tapado" por una versión vieja en caché — simplemente se
  // piden las URLs nuevas. El resto (incluido /_next/data) va a la red.
  const isImmutable =
    url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icon");
  if (!isImmutable) return;

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
    )
  );
});
