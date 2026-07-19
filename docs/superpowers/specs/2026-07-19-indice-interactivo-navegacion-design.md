# Índice interactivo y navegación por capítulos — Diseño

**Fecha:** 2026-07-19
**Estado:** Aprobado (pendiente de revisión final del usuario)
**Alcance elegido:** "Navegar por índice" (capa 1 de 3)

---

## 1. Objetivo

Hoy ReadFlow trata cada libro como un flujo continuo de palabras del principio al
fin. No hay forma de ver la estructura del libro ni de empezar a leer desde un
punto que no sea donde quedaste. Este trabajo agrega una **capa de estructura**:
un índice interactivo, detectado automáticamente de cualquier PDF, que permite
saltar a cualquier sección y empezar a leer ahí en cualquiera de los 3 modos.

## 2. Principio rector (no negociable)

Todo se **suma encima** de lo existente. Quedan **intactos**:

- La lectura lineal y el motor (`ReaderEngine`, `useReaderEngine`).
- El guardado de progreso (`progressIndex` único por libro) y estadísticas.
- Los 3 modos (RSVP, Guía, Página) y su UI de controles.
- La IA (resúmenes, comprensión, consolidación) y su comportamiento actual.

Si un libro no tiene índice detectable, **el lector se comporta exactamente como
hoy**. El índice es una capa opcional: si el usuario no lo abre, nada cambia.
Todos los campos de datos nuevos son **opcionales**: un libro guardado sin ellos
sigue funcionando y se recalcula bajo demanda.

## 3. Alcance

### Entra (v1)

- Detección automática del índice de cualquier PDF (estrategia híbrida, §5).
- Panel de índice accesible desde la barra superior de los 3 modos.
- Árbol jerárquico: portada, prólogo, prefacio, introducción, partes, capítulos,
  subcapítulos, anexos/apéndices, bibliografía y cualquier encabezado detectado.
- Expandir/contraer partes y capítulos con hijos.
- Búsqueda por nombre (filtra el árbol, insensible a mayúsculas y acentos).
- Duración estimada por sección (a la velocidad de lectura actual del usuario).
- Estado visual por sección derivado del progreso global: pendiente / actual /
  ya pasado, con barra de avance en la sección actual.
- Saltar a una sección posiciona la lectura en su primera palabra, en el modo
  activo, y cierra el panel.
- Los libros ya cargados ganan navegación vía detección heurística bajo demanda.

### No entra (queda para capas futuras)

- **Progreso guardado independiente por capítulo.** El progreso sigue siendo un
  único puntero lineal. Consecuencia conocida: si el usuario salta al capítulo 5
  y lee, los capítulos 1–4 se muestran como "ya pasaste". El seguimiento real por
  capítulo es la capa 2.
- **Aislar la IA a la sección elegida.** Resúmenes, preguntas y consolidación
  siguen operando sobre lo últimamente leído o el libro entero (capa 3).
- **Editor manual de secciones** (crear/renombrar/reordenar/borrar). El fallback
  automático garantiza que siempre haya al menos una sección; un editor manual
  es una extensión futura.

## 4. Modelo de datos (aditivo)

En `types/index.ts`:

```ts
export type SectionKind =
  | "cover"        // portada / inicio (a menudo sintética)
  | "prologue"     // prólogo
  | "preface"      // prefacio
  | "introduction" // introducción
  | "part"         // parte / libro / tomo (nivel superior)
  | "chapter"      // capítulo
  | "subchapter"   // subcapítulo / subsección
  | "epilogue"     // epílogo / conclusión
  | "appendix"     // anexo / apéndice
  | "bibliography" // bibliografía / referencias
  | "other";       // encabezado detectado sin categoría clara

export interface BookSection {
  id: string;
  title: string;
  /** 0 = nivel superior (parte), 1 = capítulo, 2 = subcapítulo… */
  level: number;
  kind: SectionKind;
  /** Índice de palabra donde empieza la sección. El fin se deriva del inicio
   *  de la siguiente sección en orden, o del fin del libro. */
  startWord: number;
}
```

`BookContent` se extiende con dos campos **opcionales**:

```ts
export interface BookContent {
  id: string;
  words: string[];
  paraStarts?: number[];
  /** Secciones detectadas (índice). Ausente en libros previos → se recalcula. */
  sections?: BookSection[];
  /** Índice de palabra donde arranca cada página FÍSICA del PDF. Necesario para
   *  mapear el índice embebido (getOutline) a posiciones de palabra. No confundir
   *  con la paginación de lectura que PageReader calcula por su cuenta. */
  pdfPageStarts?: number[];
}
```

Las secciones se guardan **planas y ordenadas por `startWord`**; la jerarquía para
expandir/contraer se reconstruye en la UI a partir de `level`. El fin de una
sección es el `startWord` de la siguiente (a cualquier nivel) o `words.length`.

## 5. Detección del índice (estrategia híbrida)

Nuevo módulo `lib/tableOfContents.ts`. Orden de preferencia:

1. **Índice embebido del PDF** (`pdf.getOutline()`), cuando existe. Máxima calidad
   y jerarquía real del autor. Corre en el parser, que ya tiene el objeto `pdf`
   y puede calcular `pdfPageStarts`.
2. **Heurística sobre las líneas del PDF** (libros nuevos sin outline). El parser
   ya agrupa el texto en líneas con su coordenada; se detectan encabezados por
   patrón de texto y se registra su `startWord`.
3. **Heurística sobre el texto plano** (libros ya cargados, que solo conservan el
   arreglo `words`). Detecta encabezados con palabra clave en el flujo.
4. **Fallback:** si nada produce secciones, se genera **una sola sección** que
   cubre el libro entero (`kind: "cover"`, `startWord: 0`). El lector funciona
   como hoy y el panel indica que no se detectó índice.

### Resolución del outline embebido

- `pdf.getOutline()` devuelve un árbol de `{ title, dest, items }`.
- Para cada entrada se resuelve `dest` → índice de página:
  - `dest` es array → el primer elemento es una referencia → `pdf.getPageIndex(ref)`.
  - `dest` es string (destino con nombre) → `pdf.getDestination(dest)` y luego
    `getPageIndex`.
- índice de página → `startWord = pdfPageStarts[pageIndex]`.
- `level` = profundidad de anidación; `kind` = `classifyKind(title)`.
- Si una entrada no se puede resolver, se **omite**; si **todas** fallan (o el
  outline viene vacío), se cae al paso 2/3.

### Heurística de encabezados

Patrones (español primero, algo de inglés), aplicados a una línea (paso 2) o a
secuencias del flujo (paso 3):

- `capítulo|cap.|chapter` + número (arábigo/romano/ordinal) → `chapter`.
- `parte|part|libro|tomo` + número → `part` (nivel 0).
- `introducción|introduction` → `introduction`.
- `prólogo|prologue` → `prologue`; `prefacio|preface` → `preface`.
- `epílogo|epilogue|conclusión|conclusion` → `epilogue`.
- `anexo|apéndice|appendix` → `appendix`.
- `bibliografía|referencias|bibliography|references` → `bibliography`.
- Número romano o arábigo aislado en línea corta → `chapter` (paso 2).

`classifyKind(title)` centraliza esta clasificación y se comparte entre el
resolvedor de outline y las heurísticas.

### Portada sintética

Si la primera sección detectada no arranca en la palabra 0, se **inserta** al
frente una sección `{ kind: "cover", title: "Portada", level: 0, startWord: 0 }`
que cubre el material inicial. Así el usuario siempre puede volver al comienzo y
"Portada" aparece en el índice.

### Normalización

Las secciones resultantes se **ordenan por `startWord`**, se **deduplican**
inicios repetidos, se **descartan** `startWord` fuera de `[0, words.length)`, y se
garantiza **al menos una** sección.

## 6. Persistencia

En `lib/storage.ts`:

- `saveBook` acepta y guarda `sections` y `pdfPageStarts` dentro de `BookContent`
  (aditivo, sin cambio de versión de IndexedDB: solo se agregan campos al valor).
- Nuevo helper `updateBookSections(id, sections)` para cachear la detección
  heurística que se corre bajo demanda al abrir un libro viejo.

No se sube `DB_VERSION` porque no se crean object stores ni índices nuevos.

## 7. Detección bajo demanda para libros ya cargados

En `app/reader/[id]/page.tsx`, al cargar el contenido:

- Si `content.sections` existe → se usa tal cual.
- Si no existe → se ejecuta `detectSectionsFromWords(words)` (heurística de texto
  plano, paso 3), se **persiste** con `updateBookSections`, y se usa.

Resultado: la biblioteca existente gana navegación sin re-subir nada. La detección
por texto plano es más limitada que el outline embebido, pero suficiente para los
encabezados con palabra clave.

## 8. UI — componente `ChapterNav`

Nuevo `components/Reader/ChapterNav.tsx`: un botón + un panel deslizante (overlay).

**Props:**

```ts
interface ChapterNavProps {
  sections: BookSection[];
  totalWords: number;
  /** Posición de lectura actual (palabra), para estado y resaltado. */
  currentWord: number;
  /** Velocidad actual (WPM) para estimar duración. */
  wpm: number;
  /** Salta a una palabra. Cada modo pasa su implementación. */
  onSeek: (word: number) => void;
  /** Estilo de la barra (claro/oscuro) para integrarse con el fondo. */
  dark?: boolean;
}
```

**Botón:** ícono de índice (lucide `List`/`ListTree`), en la barra superior a la
**izquierda, junto a "Volver"**, en los 3 modos.

**Panel:**

- Encabezado: título "Índice" + campo de búsqueda + botón cerrar.
- Árbol: una fila por sección, con sangría según `level`, ícono según `kind`,
  título (truncado si es largo), duración estimada (`~N min`) e indicador de
  estado. Filas con hijos muestran un chevron para expandir/contraer.
- Sección actual resaltada; barra de avance solo en ella. Al abrir, auto-scroll a
  la sección actual.
- Tocar una fila → `onSeek(section.startWord)` + cerrar panel.
- Búsqueda: filtra por título (normalizado sin acentos/mayúsculas); al filtrar,
  se expande todo para mostrar coincidencias en cualquier nivel.
- Estado vacío: si solo hay la sección de portada (sin índice real), el panel lo
  informa y ofrece "Ir al inicio".

**Estados y métricas (derivados, sin nuevo guardado):**

- fin de sección `endWord` = `startWord` de la siguiente, o `totalWords`.
- `ya pasaste`: `currentWord >= endWord`.
- `actual`: `startWord <= currentWord < endWord`.
- `pendiente`: `currentWord < startWord`.
- avance de la sección actual: `clamp((currentWord - startWord) / (endWord - startWord), 0, 1)`.
- duración: `ceil((endWord - startWord) / wpm)` minutos.

## 9. Integración con los 3 modos

`ChapterNav` es el mismo componente en los tres; cada modo le pasa su forma de
saltar y su posición actual:

- **RSVP** (`ReaderScreen.tsx`): `currentWord={engine.index}`, `onSeek={engine.seekTo}`.
- **Guía** (`PacerReader.tsx`): `currentWord={engine.index}`, `onSeek={engine.seekTo}`.
- **Página** (`PageReader.tsx`): usa su **paginación de lectura local**
  (`pageStarts` de `buildSegments`, distinta de `pdfPageStarts`):
  `currentWord={pageStarts[page]}`, `onSeek={(w) => setPage(segmentIndexFor(pageStarts, w))}`.

Las `sections` fluyen `reader/[id]/page.tsx` → `ReaderContainer` → cada modo como
prop nueva (aditiva).

## 10. Archivos afectados

| Archivo | Cambio |
|---|---|
| `types/index.ts` | `SectionKind`, `BookSection`; extender `BookContent`. |
| `lib/tableOfContents.ts` | **Nuevo.** Clasificación, resolución de outline, heurísticas, ensamblado/normalización, helpers de rango/estado/duración. |
| `lib/pdfParser.ts` | Capturar `pdfPageStarts`; detectar secciones (outline → líneas); devolver `sections` y `pdfPageStarts` en `ParsedBook`. |
| `lib/storage.ts` | Persistir/leer `sections` y `pdfPageStarts`; `updateBookSections`. |
| `components/UploadButton.tsx` | Pasar `sections`/`pdfPageStarts` a `saveBook`. |
| `app/reader/[id]/page.tsx` | Cargar `sections`; detectar bajo demanda si faltan; pasarlas a `ReaderContainer`. |
| `components/Reader/ReaderContainer.tsx` | Recibir y propagar `sections` a los 3 modos. |
| `components/Reader/ChapterNav.tsx` | **Nuevo.** Botón + panel del índice. |
| `components/Reader/ReaderScreen.tsx` | Insertar `<ChapterNav>` en la barra superior. |
| `components/Reader/PacerReader.tsx` | Insertar `<ChapterNav>` en la barra superior. |
| `components/Reader/PageReader.tsx` | Insertar `<ChapterNav>` en la barra superior. |
| `__tests__/tableOfContents.test.ts` | **Nuevo.** Pruebas de detección/clasificación/estado. |

## 11. Casos borde y manejo de errores

- Outline con `dest` nulo o irresoluble → se omite la entrada; si todas fallan,
  heurística.
- `pdfPageStarts` vacío o página fuera de rango → no se mapea esa entrada; heurística.
- Cero secciones detectadas → una sección de portada = libro entero.
- Títulos muy largos → truncar en la UI (el dato se guarda completo).
- Secciones desordenadas o duplicadas en el outline → ordenar y deduplicar.
- `startWord` fuera de `[0, words.length)` → descartar.
- Libro viejo sin `pdfPageStarts` ni outline → heurística de texto plano.
- Saltar a una sección durante la reproducción → se comporta como cualquier
  `seek`/cambio de página existente (pausa/continúa según el modo).

## 12. Plan de pruebas

**Unitarias (`lib/tableOfContents.ts`):**

- `classifyKind` mapea títulos representativos (es/en) al `kind` correcto.
- Ensamblado desde un outline simulado → árbol con niveles y `startWord` correctos.
- Heurística de texto plano detecta "Capítulo N", "Introducción", "Bibliografía".
- Inserción de portada sintética cuando la primera sección no arranca en 0.
- Normalización: orden, deduplicación, descarte de fuera de rango, mínimo una.
- Helpers de estado/duración: pendiente/actual/pasado y minutos.

**Manuales / integración:**

- PDF **con** índice embebido → árbol jerárquico correcto; saltar posiciona bien
  en los 3 modos.
- PDF **sin** índice embebido pero con encabezados → heurística produce índice
  usable.
- Libro **ya cargado** (sin `sections`) → detección bajo demanda + persistencia.
- Libro **sin estructura** → una sola sección; lectura idéntica a hoy.
- Búsqueda filtra; expandir/contraer funciona; duración y estados coherentes.

## 13. Límite conocido (resumen)

Con progreso lineal único, el estado por sección refleja el punto más avanzado del
puntero, no lectura real por capítulo. Es la consecuencia esperada del alcance
elegido y el gancho natural hacia la capa 2 (progreso independiente por capítulo).
