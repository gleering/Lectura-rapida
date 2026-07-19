# Índice Interactivo y Navegación por Capítulos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar una capa de estructura (índice) a cada libro que permita ver sus secciones y saltar a cualquier punto de lectura, sin tocar la lectura lineal, el guardado de progreso ni la IA existentes.

**Architecture:** Un módulo de lógica pura (`lib/tableOfContents.ts`) detecta secciones de forma híbrida (índice embebido del PDF → heurística de encabezados → fallback a "libro entero") y expone helpers de estado/duración/árbol. El parser captura los datos que la detección necesita. Un componente `ChapterNav` (botón + panel) se monta en los 3 modos de lectura y usa `seekTo`/`setPage` ya existentes para posicionar la lectura. Todos los campos de datos nuevos son opcionales; un libro sin ellos se recalcula bajo demanda y se lee igual que hoy.

**Tech Stack:** Next.js 15, React 19, TypeScript, Zustand, IndexedDB (`idb`), `pdfjs-dist` v4, Tailwind, lucide-react. Testing nuevo: Vitest (solo dev).

**Spec:** `docs/superpowers/specs/2026-07-19-indice-interactivo-navegacion-design.md`

---

## File Structure

**Nuevos:**
- `lib/tableOfContents.ts` — Lógica pura: clasificación, detección (outline/líneas/texto), normalización, helpers de estado/duración/árbol/búsqueda. Una sola responsabilidad: convertir datos crudos en secciones y derivar métricas de ellas.
- `components/Reader/ChapterNav.tsx` — UI: botón de índice + panel deslizante. Componente delgado que consume los helpers de `tableOfContents`.
- `__tests__/tableOfContents.test.ts` — Tests de la lógica pura.
- `vitest.config.ts` — Config del runner (alias `@/`, entorno node).

**Modificados (aditivo):**
- `types/index.ts` — `SectionKind`, `BookSection`; campos opcionales en `BookContent`.
- `lib/pdfParser.ts` — Capturar `pdfPageStarts` + líneas; producir `sections`.
- `lib/storage.ts` — Persistir/leer los campos nuevos; `updateBookSections`.
- `components/UploadButton.tsx` — Pasar los campos nuevos a `saveBook`.
- `app/reader/[id]/page.tsx` — Cargar `sections`; detectar bajo demanda; pasarlas al contenedor.
- `components/Reader/ReaderContainer.tsx` — Propagar `sections`.
- `components/Reader/ReaderScreen.tsx`, `PacerReader.tsx`, `PageReader.tsx` — Montar `<ChapterNav>`.

---

## Task 0: Infraestructura de test (Vitest)

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`
- Create: `__tests__/smoke.test.ts` (temporal, se borra al final de la tarea)

- [ ] **Step 1: Crear la config de Vitest**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    // Solo los tests nuevos: no arrastramos el legacy __tests__/phase3.test.ts,
    // que importa módulos con dependencias de navegador.
    include: ["__tests__/tableOfContents.test.ts", "__tests__/smoke.test.ts"],
  },
  resolve: {
    // "@/lib/x" -> "<root>/lib/x"
    alias: { "@": root },
  },
});
```

- [ ] **Step 2: Agregar Vitest y el script de test a package.json**

En `package.json`, agregar `"test": "vitest run"` dentro de `"scripts"`, y `"vitest": "^2.1.8"` dentro de `"devDependencies"`. Resultado de `"scripts"`:

```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run"
  },
```

- [ ] **Step 3: Instalar dependencias**

Run: `npm install`
Expected: instala `vitest` sin tocar dependencias de runtime; termina sin errores.

- [ ] **Step 4: Escribir un smoke test**

Create `__tests__/smoke.test.ts`:

```ts
import { describe, it, expect } from "vitest";

describe("vitest setup", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Correr el smoke test**

Run: `npm test`
Expected: PASS — 1 test passed.

- [ ] **Step 6: Borrar el smoke test y actualizar el include**

Delete `__tests__/smoke.test.ts`. En `vitest.config.ts`, dejar `include: ["__tests__/tableOfContents.test.ts"]`.

- [ ] **Step 7: Commit**

```bash
git add vitest.config.ts package.json package-lock.json
git commit -m "chore: add vitest for pure-logic unit tests"
```

---

## Task 1: Tipos de dominio

**Files:**
- Modify: `types/index.ts`

- [ ] **Step 1: Agregar `SectionKind` y `BookSection`**

En `types/index.ts`, después de la definición de `BookContent` (línea ~84), agregar:

```ts
/** Categoría de una sección del índice, para ícono y agrupación en la UI. */
export type SectionKind =
  | "cover"
  | "prologue"
  | "preface"
  | "introduction"
  | "part"
  | "chapter"
  | "subchapter"
  | "epilogue"
  | "appendix"
  | "bibliography"
  | "other";

/** Una sección del índice del libro. El fin de la sección se deriva del
 *  `startWord` de la siguiente sección (en orden) o del fin del libro. */
export interface BookSection {
  id: string;
  title: string;
  /** 0 = nivel superior (parte), 1 = capítulo, 2 = subcapítulo… */
  level: number;
  kind: SectionKind;
  /** Índice de palabra donde empieza la sección. */
  startWord: number;
}
```

- [ ] **Step 2: Extender `BookContent` con campos opcionales**

En `types/index.ts`, modificar la interfaz `BookContent` para agregar dos campos opcionales al final (antes de la llave de cierre):

```ts
export interface BookContent {
  id: string;
  words: string[];
  paraStarts?: number[];
  /** Secciones detectadas (índice). Ausente en libros previos → se recalcula. */
  sections?: BookSection[];
  /** Índice de palabra donde arranca cada página FÍSICA del PDF. Para mapear el
   *  índice embebido (getOutline). No confundir con la paginación de lectura de
   *  PageReader. */
  pdfPageStarts?: number[];
}
```

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos.

- [ ] **Step 4: Commit**

```bash
git add types/index.ts
git commit -m "feat: add BookSection/SectionKind types and optional BookContent fields"
```

---

## Task 2: `classifyKind` y `normalizeForSearch`

**Files:**
- Create: `lib/tableOfContents.ts`
- Create/Modify: `__tests__/tableOfContents.test.ts`

- [ ] **Step 1: Escribir el test**

Create `__tests__/tableOfContents.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { classifyKind, normalizeForSearch } from "@/lib/tableOfContents";

describe("normalizeForSearch", () => {
  it("quita acentos y pasa a minúsculas", () => {
    expect(normalizeForSearch("Introducción")).toBe("introduccion");
    expect(normalizeForSearch("  BIBLIOGRAFÍA ")).toBe("bibliografia");
  });
});

describe("classifyKind", () => {
  it("clasifica títulos comunes en español e inglés", () => {
    expect(classifyKind("Prólogo")).toBe("prologue");
    expect(classifyKind("Prefacio")).toBe("preface");
    expect(classifyKind("Introducción")).toBe("introduction");
    expect(classifyKind("Parte I")).toBe("part");
    expect(classifyKind("Capítulo 3")).toBe("chapter");
    expect(classifyKind("Chapter 5")).toBe("chapter");
    expect(classifyKind("Epílogo")).toBe("epilogue");
    expect(classifyKind("Anexo A")).toBe("appendix");
    expect(classifyKind("Bibliografía")).toBe("bibliography");
    expect(classifyKind("Portada")).toBe("cover");
  });

  it("un numeral aislado es un capítulo", () => {
    expect(classifyKind("IV")).toBe("chapter");
    expect(classifyKind("12")).toBe("chapter");
  });

  it("sin palabra clave, usa el nivel: 2+ = subcapítulo, si no capítulo", () => {
    expect(classifyKind("Sobre el método", 2)).toBe("subchapter");
    expect(classifyKind("Sobre el método", 1)).toBe("chapter");
  });
});
```

- [ ] **Step 2: Correr el test (debe fallar)**

Run: `npm test`
Expected: FAIL — no puede resolver `@/lib/tableOfContents`.

- [ ] **Step 3: Implementar**

Create `lib/tableOfContents.ts`:

```ts
// Detección y modelado del índice (tabla de contenidos) de un libro.
//
// Lógica PURA y testeable: no toca IndexedDB, DOM ni pdf.js directamente (el
// resolvedor de outline recibe un objeto mínimo inyectable). Convierte datos
// crudos (outline embebido, líneas del PDF, o el texto plano) en `BookSection[]`
// y deriva métricas (estado, duración, árbol) para la UI.

import type { BookSection, SectionKind } from "@/types";

/** Minúsculas sin acentos, para clasificar y para búsqueda insensible. */
export function normalizeForSearch(s: string): string {
  // Quita los signos diacríticos combinantes (U+0300–U+036F) que NFD separó.
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Clasifica un título en un `SectionKind`. `level` decide el fallback. */
export function classifyKind(title: string, level = 1): SectionKind {
  const t = normalizeForSearch(title);
  if (/^(portada|cubierta|cover)\b/.test(t)) return "cover";
  if (/^prologo\b/.test(t)) return "prologue";
  if (/^(prefacio|preface)\b/.test(t)) return "preface";
  if (/^(introduccion|introduction|intro)\b/.test(t)) return "introduction";
  if (/^(parte|part|libro|tomo)\b/.test(t)) return "part";
  if (/^(capitulo|chapter|cap)\b/.test(t)) return "chapter";
  if (/^(epilogo|epilogue|conclusion|conclusiones)\b/.test(t)) return "epilogue";
  if (/^(anexo|anexos|apendice|apendices|appendix|appendices)\b/.test(t))
    return "appendix";
  if (/^(bibliografia|referencias|bibliography|references)\b/.test(t))
    return "bibliography";
  if (/^[ivxlcdm]{1,7}$/.test(t) || /^\d{1,3}$/.test(t)) return "chapter";
  return level >= 2 ? "subchapter" : "chapter";
}
```

- [ ] **Step 4: Correr el test (debe pasar)**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/tableOfContents.ts __tests__/tableOfContents.test.ts
git commit -m "feat: add classifyKind and normalizeForSearch to tableOfContents"
```

---

## Task 3: `normalizeSections` (orden, dedup, portada sintética, mínimo)

**Files:**
- Modify: `lib/tableOfContents.ts`
- Modify: `__tests__/tableOfContents.test.ts`

- [ ] **Step 1: Escribir el test**

Agregar a `__tests__/tableOfContents.test.ts`:

```ts
import { normalizeSections } from "@/lib/tableOfContents";
import type { BookSection } from "@/types";

const raw = (startWord: number, title = "X"): BookSection => ({
  id: "x",
  title,
  level: 1,
  kind: "chapter",
  startWord,
});

describe("normalizeSections", () => {
  it("ordena por startWord y reasigna ids únicos", () => {
    const out = normalizeSections(100, [raw(50, "B"), raw(10, "A")]);
    expect(out.map((s) => s.title)).toEqual(["Portada", "A", "B"]);
    expect(new Set(out.map((s) => s.id)).size).toBe(out.length);
  });

  it("inserta Portada sintética si la primera no arranca en 0", () => {
    const out = normalizeSections(100, [raw(10, "A")]);
    expect(out[0]).toMatchObject({ kind: "cover", startWord: 0, title: "Portada" });
  });

  it("no inserta Portada si ya hay una sección en 0", () => {
    const out = normalizeSections(100, [raw(0, "Intro")]);
    expect(out).toHaveLength(1);
    expect(out[0].startWord).toBe(0);
  });

  it("deduplica startWord repetidos y descarta fuera de rango", () => {
    const out = normalizeSections(100, [raw(0, "A"), raw(0, "dup"), raw(200, "fuera")]);
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe("A");
  });

  it("libro sin secciones detectadas → una sola sección Portada = libro entero", () => {
    const out = normalizeSections(100, []);
    expect(out).toEqual([
      { id: "sec_0", title: "Portada", level: 0, kind: "cover", startWord: 0 },
    ]);
  });

  it("libro vacío → sin secciones", () => {
    expect(normalizeSections(0, [])).toEqual([]);
  });
});
```

- [ ] **Step 2: Correr el test (debe fallar)**

Run: `npm test`
Expected: FAIL — `normalizeSections` no existe.

- [ ] **Step 3: Implementar**

Agregar a `lib/tableOfContents.ts`:

```ts
/** Limpia una lista cruda de secciones: descarta fuera de rango, ordena por
 *  posición, deduplica inicios, garantiza una Portada en 0 y reasigna ids. */
export function normalizeSections(
  totalWords: number,
  raw: BookSection[]
): BookSection[] {
  if (totalWords <= 0) return [];

  const cleaned = raw
    .filter(
      (s) =>
        Number.isFinite(s.startWord) &&
        s.startWord >= 0 &&
        s.startWord < totalWords
    )
    .sort((a, b) => a.startWord - b.startWord);

  const dedup: BookSection[] = [];
  const seen = new Set<number>();
  for (const s of cleaned) {
    if (seen.has(s.startWord)) continue;
    seen.add(s.startWord);
    dedup.push(s);
  }

  const out: BookSection[] = [];
  if (dedup.length === 0 || dedup[0].startWord > 0) {
    out.push({
      id: "cover",
      title: "Portada",
      level: 0,
      kind: "cover",
      startWord: 0,
    });
  }
  out.push(...dedup);

  return out.map((s, i) => ({ ...s, id: `sec_${i}` }));
}
```

- [ ] **Step 4: Correr el test (debe pasar)**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/tableOfContents.ts __tests__/tableOfContents.test.ts
git commit -m "feat: add normalizeSections with synthetic cover and dedup"
```

---

## Task 4: Helpers de rango, estado y duración

**Files:**
- Modify: `lib/tableOfContents.ts`
- Modify: `__tests__/tableOfContents.test.ts`

- [ ] **Step 1: Escribir el test**

Agregar a `__tests__/tableOfContents.test.ts`:

```ts
import {
  sectionRanges,
  sectionStatus,
  estimateMinutes,
} from "@/lib/tableOfContents";

describe("sectionRanges", () => {
  it("el fin de cada sección es el inicio de la siguiente, o el total", () => {
    const secs = [raw(0, "A"), raw(40, "B")];
    const r = sectionRanges(secs, 100);
    expect(r[0]).toMatchObject({ start: 0, end: 40 });
    expect(r[1]).toMatchObject({ start: 40, end: 100 });
  });
});

describe("sectionStatus", () => {
  it("pendiente / actual / hecho según la posición global", () => {
    expect(sectionStatus(10, 40, 80)).toBe("pending");
    expect(sectionStatus(40, 40, 80)).toBe("current");
    expect(sectionStatus(79, 40, 80)).toBe("current");
    expect(sectionStatus(80, 40, 80)).toBe("done");
  });
});

describe("estimateMinutes", () => {
  it("redondea a minutos con mínimo 1 para secciones no vacías", () => {
    expect(estimateMinutes(0, 300, 300)).toBe(1);
    expect(estimateMinutes(0, 30, 300)).toBe(1);
    expect(estimateMinutes(0, 3000, 300)).toBe(10);
    expect(estimateMinutes(0, 0, 300)).toBe(0);
  });

  it("usa 300 wpm si la velocidad es inválida", () => {
    expect(estimateMinutes(0, 300, 0)).toBe(1);
  });
});
```

- [ ] **Step 2: Correr el test (debe fallar)**

Run: `npm test`
Expected: FAIL — helpers no existen.

- [ ] **Step 3: Implementar**

Agregar a `lib/tableOfContents.ts`:

```ts
export type SectionStatus = "pending" | "current" | "done";

export interface SectionRange {
  section: BookSection;
  start: number;
  /** Exclusivo. */
  end: number;
}

/** Empareja cada sección con su rango [start, end) de palabras. */
export function sectionRanges(
  sections: BookSection[],
  totalWords: number
): SectionRange[] {
  return sections.map((section, i) => ({
    section,
    start: section.startWord,
    end: i + 1 < sections.length ? sections[i + 1].startWord : totalWords,
  }));
}

/** Estado de una sección respecto de la posición de lectura global. */
export function sectionStatus(
  currentWord: number,
  start: number,
  end: number
): SectionStatus {
  if (currentWord >= end) return "done";
  if (currentWord >= start) return "current";
  return "pending";
}

/** Minutos estimados para leer [start, end) a `wpm` palabras por minuto. */
export function estimateMinutes(
  start: number,
  end: number,
  wpm: number
): number {
  const words = Math.max(0, end - start);
  if (words === 0) return 0;
  const safeWpm = wpm > 0 ? wpm : 300;
  return Math.max(1, Math.round(words / safeWpm));
}
```

- [ ] **Step 4: Correr el test (debe pasar)**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/tableOfContents.ts __tests__/tableOfContents.test.ts
git commit -m "feat: add sectionRanges/sectionStatus/estimateMinutes helpers"
```

---

## Task 5: Árbol y búsqueda (para la UI)

**Files:**
- Modify: `lib/tableOfContents.ts`
- Modify: `__tests__/tableOfContents.test.ts`

- [ ] **Step 1: Escribir el test**

Agregar a `__tests__/tableOfContents.test.ts`:

```ts
import {
  buildSectionTree,
  filterSectionsByQuery,
} from "@/lib/tableOfContents";

const sec = (
  startWord: number,
  level: number,
  title: string
): BookSection => ({ id: `s${startWord}`, title, level, kind: "chapter", startWord });

describe("buildSectionTree", () => {
  it("anida por nivel: los de mayor nivel cuelgan del anterior de menor nivel", () => {
    const tree = buildSectionTree([
      sec(0, 0, "Parte I"),
      sec(10, 1, "Cap 1"),
      sec(20, 2, "Sub 1.1"),
      sec(30, 1, "Cap 2"),
      sec(40, 0, "Parte II"),
    ]);
    expect(tree).toHaveLength(2); // dos partes en la raíz
    expect(tree[0].section.title).toBe("Parte I");
    expect(tree[0].children.map((c) => c.section.title)).toEqual(["Cap 1", "Cap 2"]);
    expect(tree[0].children[0].children[0].section.title).toBe("Sub 1.1");
    expect(tree[1].section.title).toBe("Parte II");
  });
});

describe("filterSectionsByQuery", () => {
  it("filtra por título sin importar acentos ni mayúsculas", () => {
    const secs = [sec(0, 1, "Introducción"), sec(10, 1, "Métodos"), sec(20, 1, "Resultados")];
    expect(filterSectionsByQuery(secs, "metod").map((s) => s.title)).toEqual(["Métodos"]);
    expect(filterSectionsByQuery(secs, "").length).toBe(3);
  });
});
```

- [ ] **Step 2: Correr el test (debe fallar)**

Run: `npm test`
Expected: FAIL — funciones no existen.

- [ ] **Step 3: Implementar**

Agregar a `lib/tableOfContents.ts`:

```ts
export interface SectionTreeNode {
  section: BookSection;
  children: SectionTreeNode[];
}

/** Construye un árbol anidando cada sección bajo la sección previa de menor
 *  nivel. Las secciones deben venir en orden de lectura. */
export function buildSectionTree(sections: BookSection[]): SectionTreeNode[] {
  const roots: SectionTreeNode[] = [];
  const stack: SectionTreeNode[] = [];
  for (const section of sections) {
    const node: SectionTreeNode = { section, children: [] };
    while (
      stack.length > 0 &&
      stack[stack.length - 1].section.level >= section.level
    ) {
      stack.pop();
    }
    if (stack.length === 0) roots.push(node);
    else stack[stack.length - 1].children.push(node);
    stack.push(node);
  }
  return roots;
}

/** Filtra secciones cuyo título contiene `query` (insensible a acentos/caso). */
export function filterSectionsByQuery(
  sections: BookSection[],
  query: string
): BookSection[] {
  const q = normalizeForSearch(query);
  if (!q) return sections;
  return sections.filter((s) => normalizeForSearch(s.title).includes(q));
}
```

- [ ] **Step 4: Correr el test (debe pasar)**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/tableOfContents.ts __tests__/tableOfContents.test.ts
git commit -m "feat: add buildSectionTree and filterSectionsByQuery"
```

---

## Task 6: `detectSectionsFromWords` (heurística sobre texto plano)

**Files:**
- Modify: `lib/tableOfContents.ts`
- Modify: `__tests__/tableOfContents.test.ts`

- [ ] **Step 1: Escribir el test**

Agregar a `__tests__/tableOfContents.test.ts`:

```ts
import { detectSectionsFromWords } from "@/lib/tableOfContents";

describe("detectSectionsFromWords", () => {
  it("detecta encabezados con palabra clave en el flujo de palabras", () => {
    const words =
      "Introducción Este libro trata de todo . Capítulo 1 El comienzo de la historia . Parte II La segunda mitad . Bibliografía Autor , Título .".split(
        " "
      );
    const secs = detectSectionsFromWords(words);
    const titles = secs.map((s) => s.title);
    expect(titles).toContain("Introducción");
    expect(titles).toContain("Capítulo 1");
    expect(titles).toContain("Parte II");
    expect(titles).toContain("Bibliografía");
    // "Parte" es nivel 0
    expect(secs.find((s) => s.title === "Parte II")?.level).toBe(0);
  });

  it("no confunde 'capítulo' en minúscula a mitad de oración", () => {
    const words = "esto se explica en el capítulo siguiente sin mayúscula".split(" ");
    expect(detectSectionsFromWords(words)).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Correr el test (debe fallar)**

Run: `npm test`
Expected: FAIL — `detectSectionsFromWords` no existe.

- [ ] **Step 3: Implementar**

Agregar a `lib/tableOfContents.ts`:

```ts
function stripPunct(w: string): string {
  return w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}

function capitalize(w: string): string {
  return w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w;
}

const STANDALONE_KW =
  /^(introduccion|prologo|prefacio|epilogo|conclusion|bibliografia|referencias)$/;
const NUMBERED_KW = /^(capitulo|parte|anexo|apendice)$/;
const NUMERAL_TOKEN = /^(?:[ivxlcdm]{1,7}|\d{1,3})$/i;

/** Heurística para libros ya cargados (solo tenemos el arreglo `words`).
 *  Detecta encabezados con palabra clave capitalizada; más limitada que la
 *  detección por líneas o el índice embebido, pero suficiente como fallback. */
export function detectSectionsFromWords(words: string[]): BookSection[] {
  const out: BookSection[] = [];
  for (let i = 0; i < words.length; i++) {
    const raw = words[i];
    // Debe empezar como encabezado: mayúscula inicial (o apertura de comillas).
    if (!/^[\p{Lu}¿"«¡]/u.test(raw)) continue;
    const w = normalizeForSearch(stripPunct(raw));

    let isHeading = false;
    let level = 1;
    let title = "";

    if (STANDALONE_KW.test(w)) {
      isHeading = true;
      title = capitalize(stripPunct(raw));
    } else if (NUMBERED_KW.test(w)) {
      const next = words[i + 1] ? stripPunct(words[i + 1]) : "";
      if (NUMERAL_TOKEN.test(next)) {
        isHeading = true;
        level = w === "parte" ? 0 : 1;
        title = `${capitalize(stripPunct(raw))} ${next}`;
      }
    }

    if (!isHeading) continue;
    // Evita duplicados pegados (p. ej. "Capítulo" seguido de otro encabezado).
    if (out.length > 0 && i - out[out.length - 1].startWord < 3) continue;

    out.push({
      id: `sec_${out.length}`,
      title,
      level,
      kind: classifyKind(title, level),
      startWord: i,
    });
  }
  return out;
}
```

- [ ] **Step 4: Correr el test (debe pasar)**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/tableOfContents.ts __tests__/tableOfContents.test.ts
git commit -m "feat: add detectSectionsFromWords heuristic for existing books"
```

---

## Task 7: `detectSectionsFromLines` (heurística sobre líneas del PDF)

**Files:**
- Modify: `lib/tableOfContents.ts`
- Modify: `__tests__/tableOfContents.test.ts`

- [ ] **Step 1: Escribir el test**

Agregar a `__tests__/tableOfContents.test.ts`:

```ts
import { detectSectionsFromLines, type LineRef } from "@/lib/tableOfContents";

describe("detectSectionsFromLines", () => {
  it("detecta líneas que parecen encabezados y guarda su wordStart", () => {
    const lines: LineRef[] = [
      { text: "CAPÍTULO PRIMERO", wordStart: 0 },
      { text: "Había una vez un texto largo que sigue y sigue sin parar nunca", wordStart: 2 },
      { text: "Introducción", wordStart: 60 },
      { text: "IV", wordStart: 120 },
      { text: "un párrafo normal con varias palabras que no es un título", wordStart: 130 },
    ];
    const secs = detectSectionsFromLines(lines);
    expect(secs.map((s) => s.startWord)).toEqual([0, 60, 120]);
    expect(secs[0].title).toBe("CAPÍTULO PRIMERO");
    expect(secs[1].kind).toBe("introduction");
  });

  it("marca 'Parte' como nivel 0", () => {
    const secs = detectSectionsFromLines([{ text: "Parte II", wordStart: 5 }]);
    expect(secs[0].level).toBe(0);
  });
});
```

- [ ] **Step 2: Correr el test (debe fallar)**

Run: `npm test`
Expected: FAIL — `detectSectionsFromLines` no existe.

- [ ] **Step 3: Implementar**

Agregar a `lib/tableOfContents.ts`:

```ts
/** Una línea del PDF con el índice de palabra donde empieza en el stream plano. */
export interface LineRef {
  text: string;
  wordStart: number;
}

const HEADING_KEYWORD_RE =
  /^(?:cap[ií]tulo|cap\.|chapter|parte|part|libro|tomo|anexo|ap[eé]ndice|appendix|pr[oó]logo|prefacio|preface|introducci[oó]n|introduction|ep[ií]logo|epilogue|conclusi[oó]n|conclusion|bibliograf[ií]a|referencias|bibliography|references)\b/i;
const NUMERAL_LINE_RE = /^(?:[IVXLCDM]{1,7}|\d{1,3})[.\-–—]?$/;

function isHeadingLine(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  const wordCount = t.split(/\s+/).length;
  if (wordCount > 10) return false;
  if (HEADING_KEYWORD_RE.test(t)) return true;
  if (NUMERAL_LINE_RE.test(t)) return true;
  // Línea corta EN MAYÚSCULAS (títulos tipeados así en muchos libros).
  const letters = t.replace(/[^\p{L}]/gu, "");
  if (
    letters.length >= 3 &&
    wordCount <= 8 &&
    letters === letters.toUpperCase() &&
    /\p{Lu}/u.test(letters)
  ) {
    return true;
  }
  return false;
}

/** Detección basada en líneas (mejor señal que el texto plano). La usa el
 *  parser en libros nuevos que no traen índice embebido. */
export function detectSectionsFromLines(lines: LineRef[]): BookSection[] {
  const out: BookSection[] = [];
  for (const line of lines) {
    const t = line.text.trim();
    if (!isHeadingLine(t)) continue;
    const level = /^(parte|part|libro|tomo)\b/i.test(t) ? 0 : 1;
    out.push({
      id: `sec_${out.length}`,
      title: t,
      level,
      kind: classifyKind(t, level),
      startWord: line.wordStart,
    });
  }
  return out;
}
```

- [ ] **Step 4: Correr el test (debe pasar)**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/tableOfContents.ts __tests__/tableOfContents.test.ts
git commit -m "feat: add detectSectionsFromLines heuristic for the parser"
```

---

## Task 8: `buildSectionsFromOutline` (índice embebido del PDF)

**Files:**
- Modify: `lib/tableOfContents.ts`
- Modify: `__tests__/tableOfContents.test.ts`

- [ ] **Step 1: Escribir el test**

Agregar a `__tests__/tableOfContents.test.ts`:

```ts
import { buildSectionsFromOutline, type OutlineDoc } from "@/lib/tableOfContents";

function fakeDoc(): OutlineDoc {
  // pageIndex 0..2 → simulamos 3 páginas; getPageIndex devuelve el "ref".
  return {
    async getOutline() {
      return [
        {
          title: "Parte I",
          dest: [{ pageRef: 0 }],
          items: [
            { title: "Capítulo 1", dest: [{ pageRef: 1 }], items: [] },
          ],
        },
        { title: "Bibliografía", dest: "bib", items: [] },
      ];
    },
    async getDestination(id: string) {
      return id === "bib" ? [{ pageRef: 2 }] : null;
    },
    async getPageIndex(ref: unknown) {
      return (ref as { pageRef: number }).pageRef;
    },
  };
}

describe("buildSectionsFromOutline", () => {
  it("resuelve dest→página→palabra y respeta la jerarquía", async () => {
    const pdfPageStarts = [0, 500, 900]; // palabra donde empieza cada página
    const secs = await buildSectionsFromOutline(fakeDoc(), pdfPageStarts);
    expect(secs).toEqual([
      { id: "sec_0", title: "Parte I", level: 0, kind: "part", startWord: 0 },
      { id: "sec_1", title: "Capítulo 1", level: 1, kind: "chapter", startWord: 500 },
      { id: "sec_2", title: "Bibliografía", level: 0, kind: "bibliography", startWord: 900 },
    ]);
  });

  it("devuelve [] si no hay outline", async () => {
    const doc: OutlineDoc = {
      async getOutline() {
        return null;
      },
      async getDestination() {
        return null;
      },
      async getPageIndex() {
        return 0;
      },
    };
    expect(await buildSectionsFromOutline(doc, [0])).toEqual([]);
  });
});
```

- [ ] **Step 2: Correr el test (debe fallar)**

Run: `npm test`
Expected: FAIL — `buildSectionsFromOutline` no existe.

- [ ] **Step 3: Implementar**

Agregar a `lib/tableOfContents.ts`:

```ts
/** Entrada del índice embebido tal como la devuelve pdf.js. */
export interface OutlineItem {
  title: string;
  dest: string | unknown[] | null;
  items?: OutlineItem[];
}

/** Subconjunto mínimo de PDFDocumentProxy que necesitamos (inyectable/mockeable).
 *  El objeto real de pdf.js lo satisface estructuralmente. */
export interface OutlineDoc {
  getOutline(): Promise<OutlineItem[] | null>;
  getDestination(id: string): Promise<unknown[] | null>;
  getPageIndex(ref: unknown): Promise<number>;
}

async function destToPageIndex(
  pdf: OutlineDoc,
  dest: string | unknown[] | null
): Promise<number | null> {
  let explicit: unknown[] | null;
  if (typeof dest === "string") explicit = await pdf.getDestination(dest);
  else explicit = dest;
  if (!Array.isArray(explicit) || explicit.length === 0) return null;
  try {
    return await pdf.getPageIndex(explicit[0]);
  } catch {
    return null;
  }
}

/** Convierte el índice embebido del PDF en secciones, mapeando cada destino a
 *  una posición de palabra vía `pdfPageStarts`. Devuelve [] si no hay outline
 *  usable (el llamador cae a la heurística). No normaliza: eso lo hace el
 *  llamador con `normalizeSections`. */
export async function buildSectionsFromOutline(
  pdf: OutlineDoc,
  pdfPageStarts: number[]
): Promise<BookSection[]> {
  const outline = await pdf.getOutline();
  if (!outline || outline.length === 0) return [];

  const out: BookSection[] = [];
  const walk = async (items: OutlineItem[], level: number): Promise<void> => {
    for (const item of items) {
      const pageIndex = await destToPageIndex(pdf, item.dest);
      if (
        pageIndex !== null &&
        pageIndex >= 0 &&
        pageIndex < pdfPageStarts.length
      ) {
        const title = (item.title || "").trim() || "Sección";
        out.push({
          id: `sec_${out.length}`,
          title,
          level,
          kind: classifyKind(title, level),
          startWord: pdfPageStarts[pageIndex],
        });
      }
      if (item.items && item.items.length > 0) {
        await walk(item.items, level + 1);
      }
    }
  };
  await walk(outline, 0);
  return out;
}
```

- [ ] **Step 4: Correr el test (debe pasar)**

Run: `npm test`
Expected: PASS. Correr toda la suite para confirmar que nada se rompió: `npm test` (todos los describe en verde).

- [ ] **Step 5: Commit**

```bash
git add lib/tableOfContents.ts __tests__/tableOfContents.test.ts
git commit -m "feat: add buildSectionsFromOutline (embedded PDF index resolver)"
```

---

## Task 9: Parser — capturar `pdfPageStarts`, líneas y producir `sections`

**Files:**
- Modify: `lib/pdfParser.ts`

- [ ] **Step 1: Extender el tipo `ParsedBook`**

En `lib/pdfParser.ts`, agregar al import de tipos y a la interfaz. Primero el import (arriba del archivo, tras la línea de `import * as pdfjsLib`):

```ts
import type { BookSection } from "@/types";
import {
  buildSectionsFromOutline,
  detectSectionsFromLines,
  normalizeSections,
  type LineRef,
} from "@/lib/tableOfContents";
```

Modificar `ParsedBook` para agregar dos campos:

```ts
export interface ParsedBook {
  title: string;
  author?: string;
  words: string[];
  paraStarts: number[];
  totalPages: number;
  wordsPerPage: number;
  /** Secciones detectadas (índice), ya normalizadas. */
  sections: BookSection[];
  /** Palabra donde arranca cada página física del PDF. */
  pdfPageStarts: number[];
}
```

- [ ] **Step 2: Capturar `pdfPageStarts` y líneas durante el segundo pass**

En `parsePdf`, dentro del segundo pass (el bucle `for (let p = 0; p < pageLines.length; p++)`), justo al entrar a cada página registrar el offset de página, y por cada línea limpia acumular una `LineRef`. Reemplazar el bloque del segundo pass:

```ts
  const words: string[] = [];
  const paraStarts: number[] = [0];
  const pdfPageStarts: number[] = [];
  const lineIndex: LineRef[] = [];
  const endsSentence = (text: string) => /[.!?…:][)\]"'”»›]*$/.test(text.trim());
  const startsParagraph = (text: string) =>
    /^[(\["'“«‹¿¡—–-]*[\p{Lu}\p{N}]/u.test(text.trim());
  let prevLineEndedSentence = false;

  for (let p = 0; p < pageLines.length; p++) {
    pdfPageStarts.push(words.length);
    const lines = pageLines[p];
    for (let li = 0; li < lines.length; li++) {
      const line = lines[li];
      const isEdge = li === 0 || li === lines.length - 1;
      const norm = normalize(line.text);
      if (isEdge && (chrome.has(norm) || isPageNumberLine(line.text))) continue;
      if (isPageNumberLine(line.text)) continue;

      const cleaned = line.text.replace(/\s+/g, " ").trim();
      if (!cleaned) continue;

      // Índice de palabra donde arranca esta línea (para detectar encabezados).
      lineIndex.push({ text: cleaned, wordStart: words.length });

      if (
        prevLineEndedSentence &&
        startsParagraph(cleaned) &&
        words.length > 0
      ) {
        paraStarts.push(words.length);
      }
      prevLineEndedSentence = endsSentence(cleaned);

      for (const w of cleaned.split(" ")) {
        if (w) words.push(w);
      }
    }
    if (onProgress) onProgress(0.9 + ((p + 1) / pageLines.length) * 0.1);
  }
```

- [ ] **Step 3: Detección híbrida y retorno**

Reemplazar el bloque final de `parsePdf` (desde `if (onProgress) onProgress(1);` hasta el `return`):

```ts
  // Detección híbrida del índice: outline embebido → heurística por líneas.
  let rawSections: BookSection[] = [];
  try {
    rawSections = await buildSectionsFromOutline(pdf, pdfPageStarts);
  } catch {
    rawSections = [];
  }
  if (rawSections.length === 0) {
    rawSections = detectSectionsFromLines(lineIndex);
  }
  const sections = normalizeSections(words.length, rawSections);

  if (onProgress) onProgress(1);

  return {
    title,
    author,
    words,
    paraStarts,
    totalPages,
    wordsPerPage: words.length / Math.max(totalPages, 1),
    sections,
    pdfPageStarts,
  };
```

Nota: `buildSectionsFromOutline` recibe `pdf` (el `PDFDocumentProxy` de pdf.js), que satisface `OutlineDoc` estructuralmente.

- [ ] **Step 4: Verificar tipos y build**

Run: `npx tsc --noEmit`
Expected: sin errores.

Run: `npm run build`
Expected: build de Next exitoso (la ruta del worker de pdf.js ya está configurada).

- [ ] **Step 5: Commit**

```bash
git add lib/pdfParser.ts
git commit -m "feat: parser captures pdfPageStarts and detects book sections"
```

---

## Task 10: Storage — persistir campos nuevos + `updateBookSections`

**Files:**
- Modify: `lib/storage.ts`

- [ ] **Step 1: Extender `saveBook`**

En `lib/storage.ts`, agregar `BookSection` al import de tipos (`import type { ... BookSection } from "@/types";`) y reemplazar `saveBook`:

```ts
export async function saveBook(
  meta: BookMeta,
  words: string[],
  paraStarts?: number[],
  sections?: BookSection[],
  pdfPageStarts?: number[]
): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(["books", "content"], "readwrite");
  await Promise.all([
    tx.objectStore("books").put(meta),
    tx
      .objectStore("content")
      .put({ id: meta.id, words, paraStarts, sections, pdfPageStarts }),
    tx.done,
  ]);
}
```

- [ ] **Step 2: Agregar `updateBookSections`**

En `lib/storage.ts`, después de `getBookContent`, agregar:

```ts
/** Cachea las secciones detectadas bajo demanda (libros previos sin índice). */
export async function updateBookSections(
  id: string,
  sections: BookSection[]
): Promise<void> {
  const db = await getDb();
  const content = await db.get("content", id);
  if (!content) return;
  await db.put("content", { ...content, sections });
}
```

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add lib/storage.ts
git commit -m "feat: persist sections/pdfPageStarts and add updateBookSections"
```

---

## Task 11: UploadButton — guardar las secciones detectadas

**Files:**
- Modify: `components/UploadButton.tsx`

- [ ] **Step 1: Pasar los campos nuevos a `saveBook`**

En `components/UploadButton.tsx`, localizar la llamada `await saveBook(meta, parsed.words, parsed.paraStarts);` y reemplazarla por:

```ts
        await saveBook(
          meta,
          parsed.words,
          parsed.paraStarts,
          parsed.sections,
          parsed.pdfPageStarts
        );
```

- [ ] **Step 2: Verificar tipos y build**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add components/UploadButton.tsx
git commit -m "feat: save detected sections when uploading a PDF"
```

---

## Task 12: Componente `ChapterNav` (botón + panel)

**Files:**
- Create: `components/Reader/ChapterNav.tsx`

- [ ] **Step 1: Implementar el componente**

Create `components/Reader/ChapterNav.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import {
  List,
  X,
  Search,
  ChevronRight,
  BookMarked,
  FileText,
  Bookmark,
  Library,
  CheckCircle2,
  Circle,
  Dot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  buildSectionTree,
  filterSectionsByQuery,
  sectionRanges,
  sectionStatus,
  estimateMinutes,
  type SectionTreeNode,
} from "@/lib/tableOfContents";
import type { BookSection, SectionKind } from "@/types";

interface ChapterNavProps {
  sections: BookSection[];
  totalWords: number;
  currentWord: number;
  wpm: number;
  onSeek: (word: number) => void;
  dark?: boolean;
}

const KIND_ICON: Record<SectionKind, typeof FileText> = {
  cover: BookMarked,
  prologue: FileText,
  preface: FileText,
  introduction: FileText,
  part: Library,
  chapter: FileText,
  subchapter: Dot,
  epilogue: FileText,
  appendix: Bookmark,
  bibliography: Bookmark,
  other: FileText,
};

export function ChapterNav({
  sections,
  totalWords,
  currentWord,
  wpm,
  onSeek,
  dark = true,
}: ChapterNavProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  // start (palabra) -> {end, status} para pintar estado/duración por sección.
  const rangeByStart = useMemo(() => {
    const map = new Map<number, { end: number }>();
    for (const r of sectionRanges(sections, totalWords)) {
      map.set(r.section.startWord, { end: r.end });
    }
    return map;
  }, [sections, totalWords]);

  const filtered = useMemo(
    () => filterSectionsByQuery(sections, query),
    [sections, query]
  );
  const tree = useMemo(() => buildSectionTree(filtered), [filtered]);

  const hasIndex = sections.length > 1;

  const handleSeek = (word: number) => {
    onSeek(word);
    setOpen(false);
  };

  const btn = dark
    ? "text-white/70 hover:bg-white/10 hover:text-white"
    : "text-black/60 hover:bg-black/10 hover:text-black";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors mix-blend-difference",
          btn
        )}
        aria-label="Abrir índice"
        title="Índice del libro"
      >
        <List className="size-4" />
        <span className="hidden sm:inline">Índice</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <button
            className="absolute inset-0 bg-black/60"
            aria-label="Cerrar índice"
            onClick={() => setOpen(false)}
          />
          {/* Panel */}
          <div className="relative flex h-full w-full max-w-sm flex-col bg-background text-foreground shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="text-base font-semibold">Índice</h2>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary"
                aria-label="Cerrar"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="border-b px-4 py-2">
              <div className="flex items-center gap-2 rounded-md bg-secondary px-2.5 py-1.5">
                <Search className="size-4 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar capítulo…"
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {!hasIndex ? (
                <div className="p-4 text-sm text-muted-foreground">
                  <p>No se detectó un índice en este libro.</p>
                  <button
                    onClick={() => handleSeek(0)}
                    className="mt-3 text-primary hover:underline"
                  >
                    Ir al inicio
                  </button>
                </div>
              ) : filtered.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">
                  Sin resultados para “{query}”.
                </p>
              ) : (
                <ul className="space-y-0.5">
                  {tree.map((node) => (
                    <TreeRow
                      key={node.section.id}
                      node={node}
                      depth={0}
                      currentWord={currentWord}
                      wpm={wpm}
                      rangeByStart={rangeByStart}
                      onSeek={handleSeek}
                    />
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

interface TreeRowProps {
  node: SectionTreeNode;
  depth: number;
  currentWord: number;
  wpm: number;
  rangeByStart: Map<number, { end: number }>;
  onSeek: (word: number) => void;
}

function TreeRow({
  node,
  depth,
  currentWord,
  wpm,
  rangeByStart,
  onSeek,
}: TreeRowProps) {
  const { section, children } = node;
  const hasChildren = children.length > 0;
  const [expanded, setExpanded] = useState(true);

  const range = rangeByStart.get(section.startWord);
  const end = range?.end ?? section.startWord;
  const status = sectionStatus(currentWord, section.startWord, end);
  const minutes = estimateMinutes(section.startWord, end, wpm);
  const Icon = KIND_ICON[section.kind];

  return (
    <li>
      <div
        className={cn(
          "group flex items-center gap-1 rounded-md pr-2 transition-colors hover:bg-secondary",
          status === "current" && "bg-primary/10"
        )}
        style={{ paddingLeft: `${depth * 14 + 4}px` }}
      >
        {hasChildren ? (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-1 text-muted-foreground"
            aria-label={expanded ? "Contraer" : "Expandir"}
          >
            <ChevronRight
              className={cn("size-4 transition-transform", expanded && "rotate-90")}
            />
          </button>
        ) : (
          <span className="w-6" />
        )}

        <button
          onClick={() => onSeek(section.startWord)}
          className="flex min-w-0 flex-1 items-center gap-2 py-2 text-left"
        >
          <StatusIcon status={status} />
          <Icon className="size-4 shrink-0 text-muted-foreground" />
          <span
            className={cn(
              "truncate text-sm",
              section.level === 0 && "font-semibold",
              status === "done" && "text-muted-foreground"
            )}
          >
            {section.title}
          </span>
          {minutes > 0 && (
            <span className="ml-auto shrink-0 text-xs text-muted-foreground">
              {minutes} min
            </span>
          )}
        </button>
      </div>

      {hasChildren && expanded && (
        <ul className="space-y-0.5">
          {children.map((child) => (
            <TreeRow
              key={child.section.id}
              node={child}
              depth={depth + 1}
              currentWord={currentWord}
              wpm={wpm}
              rangeByStart={rangeByStart}
              onSeek={onSeek}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function StatusIcon({ status }: { status: ReturnType<typeof sectionStatus> }) {
  if (status === "done")
    return <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />;
  if (status === "current")
    return <Dot className="size-4 shrink-0 text-primary" />;
  return <Circle className="size-4 shrink-0 text-muted-foreground/40" />;
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores; `ChapterNav` compila de forma aislada (los modos lo montan en la Task 13).

- [ ] **Step 3: Commit**

```bash
git add components/Reader/ChapterNav.tsx
git commit -m "feat: add ChapterNav (index button + sliding panel)"
```

---

## Task 13: Montar `ChapterNav` en los 3 modos

**Files:**
- Modify: `components/Reader/ReaderScreen.tsx`
- Modify: `components/Reader/PacerReader.tsx`
- Modify: `components/Reader/PageReader.tsx`

- [ ] **Step 1: RSVP (`ReaderScreen.tsx`)**

1. Agregar el import (junto a los otros de `./`):

```ts
import { ChapterNav } from "./ChapterNav";
```

2. Agregar `BookSection` al import de tipos y `sections` a las props:

```ts
import type {
  BookMeta,
  ReaderMode,
  ReadingMethod,
  Speed,
  ReadingGoal,
  BookSection,
} from "@/types";
```

```ts
interface ReaderScreenProps {
  meta: BookMeta;
  words: string[];
  paraStarts?: number[];
  sections?: BookSection[];
  onMethod: (m: ReadingMethod) => void;
  onProgress?: (index: number) => void;
}

export function ReaderScreen({
  meta,
  words,
  paraStarts,
  sections,
  onMethod,
  onProgress,
}: ReaderScreenProps) {
```

3. En la top bar, insertar el botón a la izquierda, junto al botón "Volver". Reemplazar el botón de "Volver" y su entorno para envolverlo con el índice:

```tsx
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              void engine.flush();
              router.push("/");
            }}
            className={cn(
              "bg-transparent",
              bgDark
                ? "text-white/70 hover:bg-white/10 hover:text-white"
                : "text-black/60 hover:bg-black/10 hover:text-black"
            )}
            aria-label="Volver"
          >
            <ArrowLeft />
          </Button>
          {sections && sections.length > 0 && (
            <ChapterNav
              sections={sections}
              totalWords={words.length}
              currentWord={engine.index}
              wpm={settings.speed}
              onSeek={engine.seekTo}
              dark={bgDark}
            />
          )}
        </div>
        <button
          onClick={openSummary}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
            bgDark
              ? "text-white/70 hover:bg-white/10 hover:text-white"
              : "text-black/60 hover:bg-black/10 hover:text-black"
          )}
        >
          <Sparkles className="size-4" /> Resumen del capítulo
        </button>
      </div>
```

- [ ] **Step 2: Guía (`PacerReader.tsx`)**

1. Imports:

```ts
import { ChapterNav } from "./ChapterNav";
import type { BookMeta, ReadingMethod, Speed, BookSection } from "@/types";
```

2. Props:

```ts
interface PacerReaderProps {
  meta: BookMeta;
  words: string[];
  paraStarts?: number[];
  sections?: BookSection[];
  onMethod: (m: ReadingMethod) => void;
  onProgress?: (index: number) => void;
}

export function PacerReader({
  meta,
  words,
  paraStarts,
  sections,
  onMethod,
  onProgress,
}: PacerReaderProps) {
```

3. En la top bar, reemplazar el botón "Volver" por un contenedor con el índice:

```tsx
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              void engine.flush();
              router.push("/");
            }}
            className="bg-transparent text-white/70 hover:bg-white/10 hover:text-white mix-blend-difference"
            aria-label="Volver"
          >
            <ArrowLeft />
          </Button>
          {sections && sections.length > 0 && (
            <ChapterNav
              sections={sections}
              totalWords={words.length}
              currentWord={engine.index}
              wpm={settings.speed}
              onSeek={engine.seekTo}
              dark
            />
          )}
        </div>
        <button
          onClick={openSummary}
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white mix-blend-difference"
        >
          <Sparkles className="size-4" /> Resumen
        </button>
      </div>
```

- [ ] **Step 3: Página (`PageReader.tsx`)**

1. Imports:

```ts
import { ChapterNav } from "./ChapterNav";
import type { BookMeta, ReadingMethod, BookSection } from "@/types";
```

2. Props:

```ts
interface PageReaderProps {
  meta: BookMeta;
  words: string[];
  paraStarts?: number[];
  sections?: BookSection[];
  onMethod: (m: ReadingMethod) => void;
  onProgress?: (index: number) => void;
}

export function PageReader({
  meta,
  words,
  paraStarts,
  sections,
  onMethod,
  onProgress,
}: PageReaderProps) {
```

3. En la top bar, envolver el botón "Volver" con un contenedor y agregar el índice. La navegación por página usa la paginación local (`pageStarts` + `segmentIndexFor`, ya importados en este archivo):

```tsx
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              void flush();
              router.push("/");
            }}
            className="bg-transparent text-white/70 hover:bg-white/10 hover:text-white mix-blend-difference"
            aria-label="Volver"
          >
            <ArrowLeft />
          </Button>
          {sections && sections.length > 0 && (
            <ChapterNav
              sections={sections}
              totalWords={words.length}
              currentWord={pageStarts[page] ?? 0}
              wpm={settings.speed}
              onSeek={(w) => setPage(segmentIndexFor(pageStarts, w))}
              dark
            />
          )}
        </div>
```

Nota: ese `<div>` reemplaza el `<Button>` de "Volver" que hoy es el primer hijo directo del contenedor `flex items-center justify-between` de la top bar. El bloque de la derecha (A-, A+, Bionic, Resumen) queda igual.

- [ ] **Step 4: Verificar tipos y build**

Run: `npx tsc --noEmit`
Expected: sin errores en todo el proyecto.

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 5: Commit**

```bash
git add components/Reader/ReaderScreen.tsx components/Reader/PacerReader.tsx components/Reader/PageReader.tsx
git commit -m "feat: mount ChapterNav in RSVP, Guía and Página readers"
```

---

## Task 14: ReaderContainer — propagar `sections` a los 3 modos

**Files:**
- Modify: `components/Reader/ReaderContainer.tsx`

- [ ] **Step 1: Aceptar y propagar `sections`**

En `components/Reader/ReaderContainer.tsx`:

1. Agregar `BookSection` al import de tipos y la prop a la interfaz:

```ts
import type { BookMeta, ReadingMethod, BookSection } from "@/types";

interface ReaderContainerProps {
  meta: BookMeta;
  words: string[];
  paraStarts?: number[];
  sections?: BookSection[];
}
```

2. Añadir `sections` a la desestructuración de props y al objeto `common`:

```ts
export function ReaderContainer({
  meta,
  words,
  paraStarts,
  sections,
}: ReaderContainerProps) {
```

```ts
  const common = {
    meta: effectiveMeta,
    words,
    paraStarts,
    sections,
    onMethod,
    onProgress,
  };
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores (los 3 modos ya aceptan `sections` desde la Task 13).

- [ ] **Step 3: Commit**

```bash
git add components/Reader/ReaderContainer.tsx
git commit -m "feat: propagate sections through ReaderContainer"
```

---

## Task 15: Reader page — cargar / detectar bajo demanda / propagar

**Files:**
- Modify: `app/reader/[id]/page.tsx`

- [ ] **Step 1: Cargar secciones y detectarlas si faltan**

En `app/reader/[id]/page.tsx`:

1. Agregar imports:

```ts
import { getBookMeta, getBookContent, updateBookMeta, updateBookSections } from "@/lib/storage";
import { detectSectionsFromWords, normalizeSections } from "@/lib/tableOfContents";
import type { BookMeta, BookSection } from "@/types";
```

2. Agregar estado para las secciones (junto a los otros `useState`):

```ts
  const [sections, setSections] = useState<BookSection[]>([]);
```

3. Dentro del `useEffect` de carga, después de `setParaStarts(c.paraStarts);`, agregar:

```ts
        let secs = c.sections;
        if (!secs || secs.length === 0) {
          secs = normalizeSections(
            c.words.length,
            detectSectionsFromWords(c.words)
          );
          void updateBookSections(params.id, secs);
        }
        setSections(secs);
```

- [ ] **Step 2: Pasar `sections` al contenedor**

En el JSX, en `<ReaderContainer ... />`, agregar la prop `sections={sections}`:

```tsx
      <ReaderContainer
        key={`${meta.id}-${startIndex}`}
        meta={{ ...meta, progressIndex: startIndex }}
        words={words}
        paraStarts={paraStarts}
        sections={sections}
      />
```

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores (el contenedor ya acepta `sections` desde la Task 14).

- [ ] **Step 4: Commit**

```bash
git add app/reader/[id]/page.tsx
git commit -m "feat: load sections in reader, detect on demand for old books"
```

---

## Task 16: Verificación end-to-end

**Files:** (ninguno — verificación manual)

- [ ] **Step 1: Suite completa verde**

Run: `npm test`
Expected: todos los tests de `tableOfContents` en verde.

- [ ] **Step 2: Levantar la app**

Crear `.claude/launch.json` si no existe con un server `readflow` (`npm run dev`, puerto 3000) y abrir el preview. Verificar en el navegador:

- [ ] **Step 3: PDF con índice embebido**

Subir un PDF que tenga índice (marcadores). Verificar: el botón "Índice" aparece; el panel muestra el árbol jerárquico; expandir/contraer funciona; tocar un capítulo salta y la lectura arranca ahí (probar en RSVP, cambiar a Guía y a Página y saltar en cada uno).

- [ ] **Step 4: PDF sin índice embebido**

Subir un PDF sin marcadores pero con encabezados ("Capítulo 1", etc.). Verificar que la heurística produce un índice usable y que la búsqueda filtra.

- [ ] **Step 5: Libro ya cargado (previo a esta feature)**

Abrir un libro que ya estaba en la biblioteca. Verificar que aparece un índice (detección bajo demanda) y que saltar funciona. Confirmar en las DevTools → Application → IndexedDB que `content` de ese libro ahora tiene `sections`.

- [ ] **Step 6: Libro sin estructura**

Subir/abrir un texto corrido sin encabezados. Verificar que el panel dice "No se detectó un índice" con "Ir al inicio", y que la lectura se comporta idéntica a antes (sin regresiones en reproducir/pausar/progreso).

- [ ] **Step 7: Screenshot de evidencia**

Tomar una captura del panel de índice abierto sobre el lector y adjuntarla como evidencia del resultado.

- [ ] **Step 8: Commit final (si hubo ajustes) y cierre**

```bash
git add -A
git commit -m "test: end-to-end verification of chapter navigation"
```

---

## Notas de implementación

- **DRY:** toda la lógica vive en `tableOfContents.ts`; el componente y el parser solo la consumen.
- **YAGNI:** no se agrega progreso por sección, IA por sección ni editor manual (fuera de alcance). El estado por sección se deriva del `progressIndex` global existente.
- **No romper nada:** todos los campos nuevos son opcionales; si `sections` no está o está vacío, el botón no se muestra y el lector funciona como hoy. No se sube `DB_VERSION` (no hay stores nuevos).
- **Límite conocido:** con progreso lineal único, saltar a un capítulo avanzado marca los previos como "hecho". Es esperado para este alcance (capa 1).
