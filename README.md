# ReadFlow AI

Aplicación web de **lectura rápida** con la técnica **RSVP** (Rapid Serial
Visual Presentation): subís un PDF, la app lo procesa en segundos y te muestra
una palabra (o pequeños grupos) en el centro de la pantalla para leer de **100
a 2.000 palabras por minuto** sin distracciones.

Todo el procesamiento y el progreso ocurren **en el dispositivo**: no hay
servidor ni base de datos en el MVP.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS** + componentes tipo **shadcn/ui**
- **pdf.js** para extracción de texto (parsing en un Web Worker)
- **Zustand** para estado global (ajustes)
- **IndexedDB** (vía `idb`) para libros, progreso y estadísticas
- **Framer Motion** para las transiciones de los diálogos

## Cómo correr

```bash
npm install
npm run dev
```

Abrí <http://localhost:3000>.

Para una build de producción:

```bash
npm run build && npm start
```

## Funcionalidades del MVP

- **Inicio**: subir PDF, últimos libros y continuar lectura.
- **Procesamiento**: extracción de texto, limpieza de encabezados / números de
  página / espacios duplicados, división en palabras, barra de progreso real.
- **Lector RSVP**: pantalla limpia, una/dos/tres palabras (Modos 1–3), fondo y
  texto configurables, **ORP** (Optimal Recognition Point) con letra central
  resaltada, activable/desactivable.
- **Controles**: play/pausa, ±10 palabras, ir al inicio/final, pantalla
  completa, selector de velocidad con cambio instantáneo, atajos de teclado
  (`espacio`, `←`/`→`, `Home`/`End`, `f`).
- **Barra inferior**: libro, página estimada, palabra actual, total,
  porcentaje y tiempo restante.
- **Progreso**: guardado automático en IndexedDB y diálogo "¿Desea continuar
  desde la palabra N?".
- **Estadísticas**: tiempo total, palabras leídas, velocidad promedio y máxima,
  libros terminados, horas entrenadas, racha diaria, comprensión y actividad de
  los últimos 14 días.
- **Objetivos**: 1.000 / 3.000 / 5.000 palabras o libro completo, con
  felicitación al cumplirlos.
- **Comprensión**: pausas periódicas con una pregunta de opción múltiple.
- **Resumen del capítulo** y **diccionario**: sobre lo ya leído.
- **Ajustes**: modo claro/oscuro, fuente, tamaño, color de texto y fondo,
  espaciado, posición vertical, color e interruptor del ORP.

## Arquitectura

```
app/
  page.tsx            # Inicio
  reader/[id]/        # Lector
  library/            # Biblioteca
  stats/              # Estadísticas
  settings/           # Ajustes
components/
  Reader/             # ReaderScreen, WordDisplay, Controls, ProgressBar, SpeedSelector
  Stats.tsx
  ui/                 # Primitivas tipo shadcn
lib/
  pdfParser.ts        # Extracción y limpieza de PDF
  readerEngine.ts     # Motor RSVP (timing con requestAnimationFrame)
  wordChunker.ts      # Agrupación de palabras por modo
  orp.ts              # Cálculo del punto óptimo de reconocimiento
  storage.ts          # Persistencia en IndexedDB
  stats.ts            # Agregación de estadísticas y rachas
  ai.ts               # Capa de IA (fallback local, lista para un LLM real)
store/
  useSettingsStore.ts
hooks/
  useReaderEngine.ts
types/
  index.ts
```

### Sobre la IA

`lib/ai.ts` define la interfaz `AiProvider` con un proveedor **local** que
funciona sin conexión (preguntas de comprensión tipo cloze, resúmenes
extractivos y diccionario básico). En futuras versiones se puede implementar la
misma interfaz con un LLM real (por ejemplo Claude) y cambiar `activeProvider`
sin tocar el resto de la app.

## Rendimiento

- El parsing de PDF corre en el worker de pdf.js, sin bloquear la UI.
- El motor RSVP usa `requestAnimationFrame` autocorrectivo para mantener una
  cadencia fluida.
- Los metadatos de los libros se guardan aparte del arreglo pesado de palabras
  para que la biblioteca cargue rápido.

## Futuras versiones

Sincronización entre dispositivos, apps nativas, importación de EPUB/MOBI,
lectura con voz sincronizada, explicación de párrafos con IA, flashcards
automáticas, exportación de notas y desafíos de lectura.
