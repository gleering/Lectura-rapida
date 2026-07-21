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
    ];
  },
};

export default nextConfig;
