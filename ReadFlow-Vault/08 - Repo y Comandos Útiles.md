---
tags: [readflow, repo, comandos, git]
updated: 2026-07-19
---

# 08 · Repo y Comandos Útiles

⬅️ Volver a [[00 - ReadFlow (Inicio)]]

## Repo
- **GitHub**: `https://github.com/gleering/Lectura-rapida.git` (rama `main`).
- Local: `~/Lecturas_mental/Lectura-rapida-claude-readflow-rsvp-reader-90a94u`.
- `gh` CLI autenticado como `gleering`.

## Desarrollo local
```bash
npm install        # una vez
npm run dev        # http://localhost:3000
npm run build      # build de producción (verificar SIEMPRE antes de deployar)
npm start          # servir el build
npm run lint
```
- Si el puerto 3000 está ocupado: `PORT=3001 npm start` (Next respeta `PORT`).
- Preview desde Claude Code: `.claude/launch.json` ya configurado (autoPort).

## VPS y deploy
```bash
ssh vps-gleering                      # root@..., puerto 2244 (alias en ~/.ssh/config)
# dentro del VPS, en el checkout del repo:
git pull
GEMINI_API_KEY=$(cat .env | grep GEMINI | cut -d= -f2) docker compose up -d --build
docker logs -f readflow               # ver arranque
```
- Detalle del enrutamiento HTTPS/Traefik en [[04 - Deploy e Infraestructura]].
- Al deployar cambios de UI: bump de `CACHE = "readflow-vN"` en `public/sw.js`.

## Chequeos rápidos
```bash
curl -sI https://readflow.gleering.com.ar | head -3   # ¿responde 200?
docker ps --filter name=readflow                       # ¿contenedor arriba?
```

## Convenciones
- Commits en español, imperativo corto (`Add`, `Fix`, estilo del historial).
- La bóveda `ReadFlow-Vault/` vive DENTRO del repo y se commitea — es la memoria del proyecto.
