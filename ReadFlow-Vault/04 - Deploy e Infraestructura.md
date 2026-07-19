---
tags: [readflow, deploy, infraestructura, docker, vps]
updated: 2026-07-19
---

# 04 · Deploy e Infraestructura

⬅️ Volver a [[00 - ReadFlow (Inicio)]] · Comandos en [[08 - Repo y Comandos Útiles]]

## Dónde vive
- **Producción**: https://readflow.gleering.com.ar
- **VPS**: alias SSH `vps-gleering` (root, puerto 2244). El mismo VPS corre Dokploy + Traefik para otros proyectos de Gleering.

## Cómo se despliega (método actual: Docker aislado)
ReadFlow corre en **su propio contenedor**, construido con el `Dockerfile` del
repo (build standalone de Next) y conectado a la red externa `dokploy-network`
para que el **Traefik ya instalado** enrute el dominio con HTTPS automático
(labels en `docker-compose.yml`). No toca ningún otro contenedor.

```bash
# En el VPS, dentro del checkout del repo:
GEMINI_API_KEY=... docker compose up -d --build
```

- La clave se inyecta en runtime (shell o archivo `.env` no commiteado). Nunca queda dentro de la imagen. Ver [[05 - Seguridad y Claves]].
- Flujo completo de actualización: `git pull` → `docker compose up -d --build`.

## Rutas alternativas (legacy, documentadas en DEPLOY.md)
- PM2 + `ecosystem.config.js` escuchando en `localhost:3000`.
- Reverse proxy con Caddy (`deploy/Caddyfile`) o Nginx+certbot (`deploy/nginx-readflow.conf`).
- Hoy NO se usan: el camino es el contenedor + Traefik.

## PWA y caché
- `public/sw.js` — service worker propio: páginas red-primero, estáticos cache-primero.
- La constante `CACHE = "readflow-vN"` se **bumpea en cada deploy con cambios de UI** para purgar cachés viejos (hoy: v2).
- La app es instalable (manifest + iconos); requiere el HTTPS de Traefik.

## Detalles del contenedor
- `next.config.mjs` usa `output: standalone` → la imagen final solo lleva `.next/standalone` + estáticos (imagen chica).
- Next escucha en el puerto 3000 interno; Traefik lo mapea vía label `loadbalancer.server.port`.
- `restart: unless-stopped`.
