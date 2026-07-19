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
};

export default nextConfig;
