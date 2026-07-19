// PDF text extraction and cleaning.
//
// pdf.js runs its heavy parsing inside a dedicated Web Worker, so decoding a
// 2000-page book never blocks the UI thread. We stream page by page and report
// progress so the processing screen can animate a real progress bar.

import * as pdfjsLib from "pdfjs-dist";
import type { BookSection } from "@/types";
import {
  buildSectionsFromOutline,
  detectSectionsFromLines,
  normalizeSections,
  type LineRef,
} from "@/lib/tableOfContents";

// Point pdf.js at the worker bundle. Webpack emits this file and rewrites the
// URL at build time, so it works offline without a CDN.
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();
}

export interface ParsedBook {
  title: string;
  author?: string;
  words: string[];
  /** Índices de palabra donde empieza cada párrafo (heurística por layout). */
  paraStarts: number[];
  totalPages: number;
  wordsPerPage: number;
  /** Secciones detectadas (índice), ya normalizadas. */
  sections: BookSection[];
  /** Palabra donde arranca cada página física del PDF. */
  pdfPageStarts: number[];
}

interface Line {
  text: string;
  y: number;
}

/** Normalise a line for header/footer frequency comparison. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/\d+/g, "#") // page numbers become a wildcard
    .replace(/\s+/g, " ")
    .trim();
}

/** True when a line is nothing but a page number / roman numeral / "Page N". */
function isPageNumberLine(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (/^\d{1,4}$/.test(t)) return true;
  if (/^[ivxlcdm]{1,7}$/i.test(t)) return true;
  if (/^(p[áa]gina|page|pág\.?)\s*\d+$/i.test(t)) return true;
  if (/^[-–—]\s*\d+\s*[-–—]$/.test(t)) return true;
  return false;
}

/** Group text items into visual lines using their y coordinate. */
function itemsToLines(items: { str: string; transform: number[] }[]): Line[] {
  const lines: Line[] = [];
  let current: { parts: string[]; y: number } | null = null;
  const TOL = 3; // px tolerance for same-line grouping

  for (const item of items) {
    const y = Math.round(item.transform[5]);
    if (current && Math.abs(current.y - y) <= TOL) {
      current.parts.push(item.str);
    } else {
      if (current) lines.push({ text: current.parts.join(" "), y: current.y });
      current = { parts: [item.str], y };
    }
  }
  if (current) lines.push({ text: current.parts.join(" "), y: current.y });
  return lines;
}

export async function parsePdf(
  file: File | ArrayBuffer,
  onProgress?: (ratio: number) => void
): Promise<ParsedBook> {
  const data = file instanceof File ? await file.arrayBuffer() : file;
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdf = await loadingTask.promise;
  const totalPages = pdf.numPages;

  // First pass metadata: title/author from the PDF info dict.
  let title = "Documento sin título";
  let author: string | undefined;
  try {
    const meta = await pdf.getMetadata();
    const info = meta.info as { Title?: string; Author?: string } | undefined;
    if (info?.Title && info.Title.trim()) title = info.Title.trim();
    if (info?.Author && info.Author.trim()) author = info.Author.trim();
  } catch {
    /* metadata is optional */
  }

  // Collect the top and bottom line of every page to detect running headers
  // and footers that repeat across the book.
  const pageLines: Line[][] = [];
  const edgeFrequency = new Map<string, number>();

  for (let p = 1; p <= totalPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const items = content.items
      .filter((i): i is { str: string; transform: number[] } & typeof i =>
        "str" in i
      )
      .map((i) => ({ str: i.str, transform: i.transform }));

    // pdf.js returns items top-to-bottom already, but sort by descending y to
    // be safe (PDF origin is bottom-left, so higher y == top of page).
    const lines = itemsToLines(items).sort((a, b) => b.y - a.y);
    pageLines.push(lines);

    if (lines.length > 0) {
      const top = normalize(lines[0].text);
      const bottom = normalize(lines[lines.length - 1].text);
      if (top) edgeFrequency.set(top, (edgeFrequency.get(top) ?? 0) + 1);
      if (bottom && bottom !== top)
        edgeFrequency.set(bottom, (edgeFrequency.get(bottom) ?? 0) + 1);
    }

    // Report progress across the extraction phase (0–0.9).
    if (onProgress && p % 2 === 0) onProgress((p / totalPages) * 0.9);
    // Release page resources for large documents.
    page.cleanup();
  }

  // A normalized edge line seen on more than ~25% of pages is chrome.
  const chromeThreshold = Math.max(3, Math.floor(totalPages * 0.25));
  const chrome = new Set(
    [...edgeFrequency.entries()]
      .filter(([, count]) => count >= chromeThreshold)
      .map(([text]) => text)
  );

  // Second pass: build the clean word stream + paragraph boundaries.
  //
  // Señal de párrafo en PDFs (que no traen "\n\n"): una línea que termina en
  // puntuación de cierre de oración seguida de una línea que arranca como
  // oración nueva (mayúscula, ¿¡, comillas, guión de diálogo). Los inicios se
  // registran como índice de palabra en el stream plano.
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
}
