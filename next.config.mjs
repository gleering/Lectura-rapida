/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Genera un servidor autocontenido en .next/standalone para una imagen Docker mínima.
  output: "standalone",
  webpack: (config) => {
    // pdf.js ships an optional canvas dependency only needed on Node; ignore it in the browser bundle.
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };
    return config;
  },
  // El service worker NUNCA debe cachearse en HTTP: el navegador tiene que
  // revalidarlo en cada visita para detectar despliegues nuevos al instante.
  // Sin esto, un sw.js viejo cacheado retrasa las actualizaciones hasta 24 h y
  // el usuario queda "pegado" en una versión antigua.
  async headers() {
    return [
      // El service worker NUNCA debe cachearse en HTTP.
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      // Security headers globales para todas las rutas.
      {
        source: "/:path*",
        headers: [
          // Evita que la app se cargue en un <iframe> (clickjacking).
          { key: "X-Frame-Options", value: "DENY" },
          // Evita MIME-type sniffing.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // No enviar Referer a sitios externos.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Permisos de APIs del navegador (cámara/mic no usados, geolocation no).
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
