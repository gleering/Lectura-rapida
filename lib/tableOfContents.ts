// Detección y modelado del índice (tabla de contenidos) de un libro.
//
// Lógica PURA y testeable: no toca IndexedDB, DOM ni pdf.js directamente (el
// resolvedor de outline recibe un objeto mínimo inyectable). Convierte datos
// crudos (outline embebido, líneas del PDF, o el texto plano) en `BookSection[]`
// y deriva métricas (estado, duración, árbol) para la UI.

import type { BookSection, SectionKind } from "@/types";

// ---------------------------------------------------------------------------
// Clasificación y normalización de texto
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Normalización de la lista de secciones
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Rangos, estado y duración (derivados del progreso global)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Árbol y búsqueda (para la UI)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Heurística sobre texto plano (libros ya cargados: solo tenemos `words`)
// ---------------------------------------------------------------------------

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

/** Detecta encabezados con palabra clave capitalizada en el flujo de palabras.
 *  Más limitada que la detección por líneas o el índice embebido, pero sirve
 *  como fallback para libros guardados sin `sections`. */
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
    // Evita duplicados pegados (p. ej. dos encabezados casi contiguos).
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

// ---------------------------------------------------------------------------
// Heurística sobre líneas del PDF (mejor señal; la usa el parser)
// ---------------------------------------------------------------------------

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

/** Detección basada en líneas. La usa el parser en libros nuevos que no traen
 *  índice embebido. */
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

// ---------------------------------------------------------------------------
// Índice embebido del PDF (outline)
// ---------------------------------------------------------------------------

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
