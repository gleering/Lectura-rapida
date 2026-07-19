---
tags: [readflow, sync, supabase, plan]
updated: 2026-07-19
---

# 07 · Sincronización Multidispositivo (Plan)

⬅️ Volver a [[00 - ReadFlow (Inicio)]]

## El requisito
Los libros cargados deben **quedar registrados en la nube y aparecer en
cualquier dispositivo** donde se abra la app. Hoy todo vive en IndexedDB
(local, aislado por dispositivo).

## Arquitectura elegida
- **Supabase** (ya conectado por MCP; org `txsmjtxlugzrrbcltspa`).
- **Offline-first**: IndexedDB sigue siendo el caché local de trabajo; Supabase es la fuente de verdad. Sincronización bidireccional (last-write-wins por `updatedAt` para el progreso; los libros son inmutables una vez subidos).
- **Contenido pesado** (arrays de palabras / PDF fuente) → **Supabase Storage**, no columnas Postgres gigantes. En Postgres: metadatos, progreso, tarjetas SM-2, estadísticas.
- **RLS estricto**: cada usuario solo ve sus filas. La `anon key` puede ser `NEXT_PUBLIC_`; la `service_role` jamás al cliente ([[05 - Seguridad y Claves]]).
- Coherente con la filosofía "app aislada": **proyecto Supabase dedicado** a ReadFlow.

## Qué sincronizar (orden de valor)
1. Biblioteca (meta + contenido) y **progreso de lectura**.
2. Tarjetas de repaso SM-2 y su scheduling (el repaso debe seguirte al teléfono).
3. Estadísticas/rachas.
4. Ajustes (al final; lo local ya funciona bien).

## ⚠️ Decisiones abiertas (tomarlas ANTES de programar)
1. **Método de login**: ¿magic link por email (sin contraseña, simple) o Google OAuth (un tap, requiere configurar OAuth en Google Cloud)? Propuesta: magic link primero, OAuth después.
2. **Proyecto Supabase**: crear uno nuevo dedicado (`readflow`) en la org — ¿región? (São Paulo `sa-east-1` es lo más cercano a Argentina).

## Bosquejo de esquema
```
profiles(id = auth.uid, created_at)
books(id, user_id, title, author, total_words, total_pages,
      words_per_page, storage_path, created_at)
reading_progress(book_id, user_id, progress_index, time_read_ms,
                 finished, updated_at)   ← upsert por updatedAt
review_cards(id, user_id, book_id, …SM-2 fields…, due_date)
daily_stats(user_id, date, words_read, time_read_ms, max_speed)
```
