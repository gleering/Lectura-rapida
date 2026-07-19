---
tags: [readflow, seguridad, claves, api]
updated: 2026-07-19
---

# 05 · Seguridad y Claves

⬅️ Volver a [[00 - ReadFlow (Inicio)]]

## Principio
El navegador **jamás ve una clave**. Toda la IA pasa por el proxy de servidor.

## Cómo funciona la IA segura
- Clave: `GEMINI_API_KEY` (SIN prefijo `NEXT_PUBLIC_`) → solo existe en el servidor.
- Ruta `app/api/gemini/route.ts`:
  - recibe `{ prompt }` del cliente y llama a `gemini-flash-latest` (el modelo `1.5-flash` fue retirado por Google — ya migrado).
  - valida cuerpo y tipo; **límite de 60.000 caracteres** por prompt (anti-abuso/costos).
  - responde 503 si la clave no está configurada (la app degrada al proveedor local offline).
  - no registra prompts ni respuestas (privacidad del lector).
- El bundle del navegador no contiene ni la clave ni el endpoint de Google (verificado).

## Manejo de la clave
- Local: `.env.local` (en `.gitignore`); plantilla en `.env.example`.
- Producción: variable de entorno del contenedor, inyectada en runtime (`GEMINI_API_KEY=... docker compose up -d`). Nunca en la imagen ni en el repo.
- Recomendación pendiente: restringir la clave por dominio/API en Google AI Studio.

## Datos del usuario
- Libros, progreso, tarjetas y estadísticas viven en **IndexedDB local** — nada sale del dispositivo (hasta que llegue [[07 - Sincronización Multidispositivo (Plan)]], que usará RLS de Supabase).
- Cuando llegue Supabase: la `anon key` es pública por diseño (protegida por RLS y puede ir en `NEXT_PUBLIC_`); la `service_role` jamás al cliente.
