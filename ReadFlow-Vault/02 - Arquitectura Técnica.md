---
tags: [readflow, arquitectura, tecnica]
updated: 2026-07-19
---

# 02 · Arquitectura Técnica

⬅️ Volver a [[00 - ReadFlow (Inicio)]]

## Stack
- **Next.js 15** (App Router, `output: standalone`) + **React 19** + **TypeScript**.
- **Tailwind CSS** + primitivas tipo shadcn (`components/ui`).
- **pdf.js** (`pdfjs-dist`) — extracción de texto en Web Worker.
- **Zustand** (`store/useSettingsStore`) — ajustes globales con persistencia debounced.
- **IndexedDB** vía `idb` — todo vive en el dispositivo (sin servidor de datos). Ver [[07 - Sincronización Multidispositivo (Plan)]] para el futuro.
- **IA**: Gemini vía proxy `/api/gemini` (ver [[05 - Seguridad y Claves]]).

## Carpetas clave
```
app/                # Rutas: /, reader/[id], library, stats, settings, review,
                    # study, tutor, training, progress, connections, api/gemini
components/Reader/  # ReaderContainer (elige modo) + ReaderScreen (RSVP)
                    # + PacerReader (Guía) + PageReader (Página) + controles
lib/
  pdfParser.ts      # PDF → words[] + paraStarts[] (detección de párrafos)
  textStructure.ts  # Oraciones, bloques, páginas, párrafos (base de los 3 modos)
  readerEngine.ts   # Motor RSVP: RAF autocorrectivo, warm-up, pausas
  wordChunker.ts    # Chunks 1–3 palabras que NO cruzan puntuación
  storage.ts        # IndexedDB: books / content / kv / reviewCards / conceptLinks
  stats.ts          # Sesiones, rachas, velocidad (solo modos con ritmo)
  spaced-repetition.ts, active-recall.ts, ai*.ts, …  # bucle de aprendizaje
hooks/
  useReaderEngine.ts  # Puente motor↔React: progreso, autosave, comprensión
  useWakeLock.ts      # Pantalla encendida mientras se lee
```

## Datos en IndexedDB (`readflow-ai`, v3)
| Store | Contenido |
|---|---|
| `books` | `BookMeta` liviano (progreso, tiempos, título) |
| `content` | `{ id, words[], paraStarts?[] }` — el arreglo pesado, aparte para que la biblioteca cargue rápido |
| `kv` | settings, globalStats, dailyStats, goal, resúmenes, mindmaps |
| `reviewCards` | tarjetas SM-2 (índices by-due, by-book) |
| `conceptLinks` | grafo de conceptos |

## Flujo de un libro
1. `UploadButton` → `parsePdf` (worker): limpia encabezados/pies repetidos y números de página, produce `words[]` **+ `paraStarts[]`** (línea que termina en puntuación de cierre + siguiente que arranca como oración nueva = párrafo).
2. `saveBook(meta, words, paraStarts)` → IndexedDB.
3. `reader/[id]` carga meta + content y monta `ReaderContainer`, que mantiene el **índice vivo** compartido entre modos (ver [[03 - Modos de Lectura]]).
4. Cada modo persiste progreso/tiempo con autosave (5 s) + flush en `pagehide`/unmount. "Libro terminado" se registra **una sola vez** (ref `finishRecorded`).

## Reglas de diseño del código
- Libros viejos sin `paraStarts` siguen funcionando: `normalizeParagraphStarts` reconstruye párrafos aproximados por oraciones.
- El motor y la UI comparten `getChunk` — una única fuente de verdad del avance.
- Sin dependencias nuevas para features de lectura: todo con lo ya instalado.
