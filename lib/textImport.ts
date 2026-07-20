// Importación de libros desde texto plano (.txt / .md).
//
// Mismo contrato que el parser de PDF: palabras en orden + inicios de párrafo.
// Las secciones no se calculan acá: el lector las detecta bajo demanda con la
// misma heurística por-palabras que usa para libros antiguos.

export interface ParsedText {
  title: string;
  words: string[];
  paraStarts: number[];
}

/** Quita marcado ligero de markdown para que el RSVP no muestre símbolos. */
function cleanLine(line: string): string {
  return line
    .replace(/^#{1,6}\s+/, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1");
}

export function parseTextContent(
  raw: string,
  fallbackName: string
): ParsedText {
  const normalized = raw.replace(/\r\n?/g, "\n");
  const paragraphs = normalized
    .split(/\n\s*\n+/)
    .map((p) => p.split("\n").map(cleanLine).join(" ").trim())
    .filter((p) => p.length > 0);

  const words: string[] = [];
  const paraStarts: number[] = [];
  for (const p of paragraphs) {
    const ws = p.split(/\s+/).filter(Boolean);
    if (ws.length === 0) continue;
    paraStarts.push(words.length);
    words.push(...ws);
  }

  // Título: la primera línea si parece un título (corta); si no, el nombre
  // del archivo sin extensión. El título se conserva dentro del texto.
  const firstLine = paragraphs[0] ?? "";
  const title =
    firstLine.length > 0 && firstLine.length <= 80
      ? firstLine
      : fallbackName.replace(/\.(txt|md|markdown)$/i, "");

  return { title, words, paraStarts };
}
