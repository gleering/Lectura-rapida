// Configuración de PM2 para ReadFlow en el VPS.
// Uso:
//   pm2 start ecosystem.config.js
//   pm2 save && pm2 startup   (para que arranque solo al reiniciar el VPS)
//
// Requisitos previos en el VPS (una sola vez):
//   npm ci            # instala dependencias exactas
//   npm run build     # compila la app
//   Crear .env.local con GEMINI_API_KEY=...  (NO se commitea)

module.exports = {
  apps: [
    {
      name: "readflow",
      // Ejecuta el binario de Next directamente (más robusto que "npm" bajo PM2).
      script: "./node_modules/next/dist/bin/next",
      args: "start",
      // Ajusta esta ruta a la ubicación real del proyecto en tu VPS:
      cwd: "/var/www/readflow",
      instances: 1,
      autorestart: true,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        // Next respeta la variable PORT. Nginx/Caddy hará proxy a este puerto.
        PORT: 3000,
        // GEMINI_API_KEY se toma de .env.local (no se pone aquí para no commitear el secreto).
      },
    },
  ],
};
