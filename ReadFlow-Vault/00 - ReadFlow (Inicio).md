---
tags: [readflow, moc, inicio]
updated: 2026-07-19
---

# 📖 ReadFlow — Bóveda de contexto

> **Para la IA / para mí mañana:** leé esta nota primero. Es el mapa de todo el
> proyecto. Cada enlace lleva a una nota corta y densa. Con esto tenés el
> contexto completo sin re-explorar el código.

## Qué es ReadFlow
App web (PWA) de lectura que **rehabilita la atención** para volver a leer
libros reales. No es "leer rápido": es reentrenar foco, resistencia y
comprensión. Público: ADHD, estudiantes, autodidactas.
👉 Detalle en [[01 - Visión y Producto]]

## Mapa de la bóveda
- [[01 - Visión y Producto]] — la misión, el "rehabilitador", el público.
- [[02 - Arquitectura Técnica]] — stack, estructura de carpetas, cómo se guarda todo.
- [[03 - Modos de Lectura]] — la escalera: RSVP → Guía → Página (y cómo funciona cada una hoy).
- [[04 - Deploy e Infraestructura]] — VPS, Traefik, contenedor Docker aislado.
- [[05 - Seguridad y Claves]] — cómo se protege la API de IA.
- [[06 - Estado Actual y Pendientes]] — qué está hecho y qué sigue.
- [[07 - Sincronización Multidispositivo (Plan)]] — la próxima feature + decisiones abiertas.
- [[08 - Repo y Comandos Útiles]] — git, ssh, deploy, atajos.
- [[09 - Glosario]] — términos y conceptos clave.
- [[10 - Sesión 2026-07-19 — Mejora profunda de modos de lectura]] — auditoría, 9 bugs corregidos y mejoras grandes de los 3 modos.

## Estado en una línea
✅ App en vivo en **https://readflow.gleering.com.ar** · ✅ 3 modos de lectura
**mejorados a fondo el 19-07** (ORP nítido, Guía estable, Página con párrafos
reales, posición compartida entre modos) · ✅ IA (Gemini) segura vía proxy ·
🔜 **Sincronización entre dispositivos** (ver [[07 - Sincronización Multidispositivo (Plan)]]).

## Lo primero que hay que decidir
Ver [[07 - Sincronización Multidispositivo (Plan)]] → **2 decisiones pendientes**
(método de login + proyecto Supabase) antes de programar la sincronización.
