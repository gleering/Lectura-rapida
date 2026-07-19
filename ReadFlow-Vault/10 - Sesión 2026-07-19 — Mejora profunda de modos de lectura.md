---
tags: [readflow, sesion, modos, mejoras, bugs]
updated: 2026-07-19
---

# 10 · Sesión 2026-07-19 — Mejora profunda de modos de lectura

⬅️ Volver a [[00 - ReadFlow (Inicio)]] · Estado post-sesión en [[03 - Modos de Lectura]]

**Pedido**: analizar la app, encontrar mejoras, mejorar en gran manera los
modos de lectura, documentar y deployar.

## 🐛 Bugs reales encontrados (auditoría de código)
1. **ORP apagado (RSVP)** — `WordDisplay` pintaba la letra pivote con `textColor` al 60 % de opacidad (resto de un sistema de "importancia semántica" a medio hacer), en vez del color ORP configurado. La letra guía se veía MÁS tenue que el resto. Además cambiaba su tamaño por palabra y tenía transición de 200 ms → borroso a velocidad.
2. **Guía temblaba** — la "ventana teleprompter" avanzaba 1 palabra por tick con texto centrado: TODO el bloque se reacomodaba en cada tick. El texto se movía; los ojos no entrenaban nada.
3. **Página reanudaba una página adelante** — al entrar a una página se marcaba leída hasta su final → `progressIndex` = inicio de la siguiente → al volver, la app retomaba en la página siguiente a la que estabas leyendo.
4. **Página inflaba estadísticas** — registraba la velocidad RSVP configurada (p. ej. 1200 ppm) como muestra y récord (`maxSpeed`) aunque leyeras a tu ritmo.
5. **`booksFinished` se multiplicaba** — cada autoguardado (uno cada 5 s) con el diálogo de fin abierto volvía a contar el libro como terminado (`meta.finished` viejo en el closure). Se verificó en vivo: 1 libro → contador 3.
6. **Chunks 2–3 cruzaban oraciones** — "fin. La" aparecía como un solo chunk.
7. **Motor y UI podían desincronizarse** — el avance del índice y el chunk pintado se calculaban por separado.
8. **Cambiar de modo perdía la posición** — volvía al punto donde se ABRIÓ el libro, no donde ibas.
9. Menores: pausar no daba contexto (una palabra suelta), sin párrafos en ningún modo (el parser aplanaba todo), pantalla se apagaba en móvil, cambio de velocidad recién aplicaba al chunk siguiente.

## ✨ Mejoras implementadas
- **`lib/textStructure.ts` (nuevo)** — detección de fin de oración (con abreviaturas españolas e iniciales), rangos de oración, segmentación en bloques/páginas alineada a oraciones (con preferencia por fin de párrafo), párrafos aproximados para libros viejos, búsqueda binaria de segmento.
- **Parser** — ahora detecta **párrafos** desde el layout del PDF (línea termina en puntuación de cierre + la siguiente arranca como oración nueva) y los guarda como `paraStarts` en IndexedDB (retrocompatible).
- **Motor RSVP** — warm-up (8 chunks, 1.6×→1×), respiro en inicio de párrafo (1.35×), avance vía `getChunk` compartido con la UI (única fuente de verdad), velocidad aplicada al chunk en curso.
- **RSVP** — ORP clásico nítido (pivote SIEMPRE en `orpColor`, sin jitter ni transiciones); chunks 2–3 centrados con anclas de fijación; **oración de contexto al pausar** (se ve también al reabrir el libro).
- **Guía** — reescrito: bloque QUIETO de ~48 palabras cortado en fin de oración; el realce barre; el bloque solo se reemplaza al completarse. Leído al 35 %, próximo al 85 %, alineado a la izquierda.
- **Página** — paginado por oraciones (~230 palabras, prefiere fin de párrafo); párrafos reales con sangría; reanudación a la MISMA página; palabras contadas solo al pasar página; sin velocidad falsa en stats; scroll al tope en cada página nueva.
- **Transversal** — índice vivo compartido en `ReaderContainer` (cambiar de modo conserva la posición exacta); `useWakeLock` en los tres modos; `finishRecorded` corta la inflación de contadores; bump `sw.js` → `readflow-v2`.

## ✅ Verificación (evidencia, no fe)
- `npm run build` limpio (3 veces durante la sesión).
- **Asserts de Node** sobre la lógica pura (23 aserciones): fin de oración (abreviaturas, iniciales, comillas, "3.5"), rangos, segmentos que cubren todo sin huecos y cortan en oración, texto sin puntuación no cuelga, chunker que no cruza puntuación, y que sumar spans aterriza EXACTO en el final del libro.
- **Prueba en navegador real** (PDF de prueba de 222 palabras, 5 párrafos, generado con LibreOffice): subida → parser detectó `paraStarts [0,50,96,146,176,185]` ✓ · RSVP muestra ORP y al pausar aparece la oración de contexto ✓ · Guía muestra bloque estable con realce ✓ · cambio de modo conserva palabra 31 ✓ · Página renderiza 6 párrafos con sangría y bionic ✓ · Terminar + 15 s de autoguardados → `booksFinished = 1` ✓, sin muestras de velocidad falsas ✓.
- Limitación del entorno: el pane del navegador corre oculto → `requestAnimationFrame` no dispara, así que la cadencia (warm-up/respiros) se validó por lógica y no "a ojo". El motor RAF es el mismo patrón ya probado en producción.

## 📦 Archivos tocados
`lib/textStructure.ts`* · `lib/pdfParser.ts` · `lib/readerEngine.ts` ·
`lib/wordChunker.ts` · `lib/stats.ts` · `lib/storage.ts` ·
`hooks/useReaderEngine.ts` · `hooks/useWakeLock.ts`* ·
`components/Reader/{WordDisplay, ReaderScreen, PacerReader, PageReader, ReaderContainer}.tsx` ·
`components/UploadButton.tsx` · `app/reader/[id]/page.tsx` · `types/index.ts` ·
`public/sw.js` (* = nuevos)

## Ideas que quedaron para después
Ver backlog en [[06 - Estado Actual y Pendientes]] (EPUB con párrafos reales
gratis, TTS sincronizado con Guía, sync multidispositivo primero).
