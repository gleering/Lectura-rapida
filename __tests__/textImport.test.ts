import { describe, it, expect } from "vitest";
import { parseTextContent } from "@/lib/textImport";

describe("parseTextContent", () => {
  it("divide el texto en palabras y detecta inicios de párrafo", () => {
    const raw = "Primer párrafo con cinco palabras.\n\nSegundo párrafo corto.";
    const parsed = parseTextContent(raw, "archivo.txt");
    expect(parsed.words).toEqual([
      "Primer",
      "párrafo",
      "con",
      "cinco",
      "palabras.",
      "Segundo",
      "párrafo",
      "corto.",
    ]);
    expect(parsed.paraStarts).toEqual([0, 5]);
  });

  it("usa la primera línea corta como título y la conserva en el texto", () => {
    const raw = "El arte de leer\n\nCapítulo uno empieza aquí.";
    const parsed = parseTextContent(raw, "fallback");
    expect(parsed.title).toBe("El arte de leer");
    expect(parsed.words[0]).toBe("El");
  });

  it("cae al nombre de archivo cuando la primera línea es muy larga", () => {
    const longLine = "palabra ".repeat(40).trim();
    const parsed = parseTextContent(longLine, "mi-libro.txt");
    expect(parsed.title).toBe("mi-libro");
  });

  it("normaliza saltos de línea de Windows y limpia encabezados markdown", () => {
    const raw = "# Título\r\n\r\nTexto del **cuerpo** aquí.";
    const parsed = parseTextContent(raw, "x.md");
    expect(parsed.title).toBe("Título");
    expect(parsed.words).toContain("cuerpo");
    expect(parsed.words.some((w) => w.includes("#"))).toBe(false);
    expect(parsed.words.some((w) => w.includes("**"))).toBe(false);
  });

  it("devuelve vacío ante texto sin contenido", () => {
    const parsed = parseTextContent("   \n\n  ", "vacio.txt");
    expect(parsed.words).toEqual([]);
    expect(parsed.paraStarts).toEqual([]);
  });
});
