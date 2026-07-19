---
tags: [readflow, modos, lectura, rsvp, guia, pagina]
updated: 2026-07-19
---

# 03 · Modos de Lectura (la escalera)

⬅️ Volver a [[00 - ReadFlow (Inicio)]] · Mejoras de hoy en [[10 - Sesión 2026-07-19 — Mejora profunda de modos de lectura]]

Los modos NO son opciones sueltas: son una **escalera de rehabilitación** que
retira andamiaje. El selector vive en los tres modos y cambia la vista en vivo
**conservando la posición exacta** (índice vivo en `ReaderContainer`).

## Escalón 1 — RSVP («las palabras vienen solas»)
- Una/dos/tres palabras flashean en el centro. Cero movimiento ocular: reconstruye foco puro.
- **ORP** (Optimal Recognition Point): la letra pivote queda clavada en el centro y pintada con el color guía (`orpColor`). Sin animaciones ni cambios de tamaño — a 600 ppm cualquier transición emborrona.
- **Chunks 2–3 palabras**: centrados con anclas de fijación (inicio de palabra en negrita); nunca cruzan puntuación («fin. La» no existe).
- **Warm-up**: tras cada play/reanudación, los primeros 8 chunks van ~60 % más lentos y aceleran hasta la velocidad objetivo. Elimina el "me perdí al arrancar".
- **Respiro de párrafo**: el primer chunk de cada párrafo dura 1.35×.
- **Contexto al pausar**: al pausar aparece la oración completa alrededor de la palabra actual (atenuada, con la palabra activa en color). Re-ancla antes de reanudar; también se ve al reabrir un libro.
- Pausas naturales ya existentes: palabras largas +25–50 %, fin de oración +90 %, coma +40 %.
- Comprensión intercalada opcional (cada N palabras, configurable).

## Escalón 2 — Guía («un realce recorre el texto; tus ojos lo siguen»)
- Un **bloque de texto QUIETO** (~48 palabras, siempre cortado en fin de oración) y un realce que barre palabra a palabra al ritmo configurado.
- El texto no se mueve — se mueven los ojos. Ese es el entrenamiento: sacadas y fijaciones sobre texto estático con ritmo externo. El bloque solo se reemplaza al completarse (cero reflow durante el barrido).
- Lo ya leído queda al 35 % de opacidad; lo que viene al 85 %.
- Mismo motor que RSVP: warm-up, respiros, velocidad compartida, mismo guardado.
- Sin comprensión intercalada (el foco es reentrenar la mirada).

## Escalón 3 — Página («como un libro real; la graduación»)
- Paginado **alineado a fin de oración** (~230 palabras por página; prefiere cortar en fin de párrafo cercano). Nunca corta una idea a la mitad.
- **Párrafos reales** con sangría, como libro impreso (detectados al parsear; libros viejos usan párrafos aproximados por oraciones).
- **Bionic** opcional: ancla de fijación (inicio de cada palabra en negrita).
- Autopaso puro: sin temporizador. Pasar página = página leída (cuenta honesta).
- La reanudación vuelve a la MISMA página. El modo autopaso **no** registra velocidad en estadísticas (no hay ppm que registrar).
- Controles: zonas de toque laterales, flechas, tamaño de letra, resumen IA.

## Transversal a los tres
- **Wake lock**: la pantalla no se apaga mientras se lee (móvil).
- Progreso, tiempo y palabras comparten el mismo esquema → estadísticas y racha crecen igual desde cualquier escalón.
- Al terminar en cualquier modo: diálogo de consolidación → tarjetas de repaso SM-2 (leer no es recordar).

## Parámetros técnicos (para tocar con criterio)
| Cosa | Valor | Archivo |
|---|---|---|
| Warm-up | 8 chunks, factor 1.6→1 | `lib/readerEngine.ts` |
| Respiro párrafo | 1.35× | `hooks/useReaderEngine.ts` |
| Bloque Guía | ~48 palabras (20–90) | `components/Reader/PacerReader.tsx` |
| Página | ~230 palabras (120–330) | `components/Reader/PageReader.tsx` |
| Fin de oración | puntuación + abreviaturas ES + mayúscula siguiente | `lib/textStructure.ts` |
