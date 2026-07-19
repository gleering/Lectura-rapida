---
tags: [readflow, estado, roadmap, pendientes]
updated: 2026-07-19
---

# 06 · Estado Actual y Pendientes

⬅️ Volver a [[00 - ReadFlow (Inicio)]]

## ✅ Hecho (en producción o listo para deploy)
- **Núcleo**: subir PDF → lector con 3 modos ([[03 - Modos de Lectura]]) → progreso, estadísticas, rachas, objetivos.
- **Escalera de rehabilitación completa**: RSVP (foco) → Guía (mirada) → Página (graduación), con cambio en vivo **sin perder posición**.
- **Mejora profunda de los 3 modos** (2026-07-19): ORP nítido, warm-up, respiros de párrafo, chunks que respetan puntuación, contexto al pausar, Guía con bloques estables, Página con párrafos reales y paginado por oraciones, wake lock, estadísticas honestas. Detalle: [[10 - Sesión 2026-07-19 — Mejora profunda de modos de lectura]].
- **Bucle de aprendizaje**: comprensión intercalada, consolidación al terminar → tarjetas SM-2 → repaso (`/review`), grafo de conceptos, mapa mental, resumen progresivo, métricas de aprendizaje (`/progress`), tutor IA, entrenamiento (Schulte, N-back, diagnóstico, plan personalizado, certificados).
- **IA segura** vía proxy Gemini ([[05 - Seguridad y Claves]]).
- **PWA** instalable con soporte offline básico.
- **Deploy aislado** en contenedor + Traefik ([[04 - Deploy e Infraestructura]]).

## 🔜 Siguiente gran feature
**Sincronización multidispositivo** — plan y 2 decisiones abiertas en
[[07 - Sincronización Multidispositivo (Plan)]].

## 📋 Backlog (orden sugerido)
1. Sincronización (Supabase) — la biblioteca "te sigue".
2. Importar **EPUB/MOBI** (hoy solo PDF; EPUB trae párrafos reales gratis).
3. PDFs escaneados: aviso claro ya existe; evaluar OCR.
4. Lectura con voz sincronizada (TTS siguiendo el realce de Guía).
5. Flashcards automáticas mejoradas / exportación de notas (→ Obsidian).
6. Desafíos de lectura / retos semanales.
7. Restringir la clave Gemini por dominio en Google AI Studio.

## ⚠️ Deudas conocidas (menores)
- `__tests__/phase3.test.ts` usa sintaxis Jest pero no hay runner instalado (no corre). La lógica nueva de texto se validó con asserts de Node en la sesión del 19-07.
- `README.md` describe el MVP viejo; la app ya tiene mucho más. Actualizar cuando haya un rato.
- Contadores `booksFinished` de usuarios existentes pueden estar inflados por el bug corregido el 19-07 (no hay migración razonable; se corrige solo hacia adelante).
