import { describe, it, expect } from "vitest";
import {
  classifyKind,
  normalizeForSearch,
  normalizeSections,
  sectionRanges,
  sectionStatus,
  estimateMinutes,
  buildSectionTree,
  filterSectionsByQuery,
  detectSectionsFromWords,
  detectSectionsFromLines,
  buildSectionsFromOutline,
  type LineRef,
  type OutlineDoc,
} from "@/lib/tableOfContents";
import type { BookSection } from "@/types";

const raw = (startWord: number, title = "X"): BookSection => ({
  id: "x",
  title,
  level: 1,
  kind: "chapter",
  startWord,
});

const sec = (
  startWord: number,
  level: number,
  title: string
): BookSection => ({ id: `s${startWord}`, title, level, kind: "chapter", startWord });

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

describe("buildSectionTree", () => {
  it("anida por nivel: los de mayor nivel cuelgan del anterior de menor nivel", () => {
    const tree = buildSectionTree([
      sec(0, 0, "Parte I"),
      sec(10, 1, "Cap 1"),
      sec(20, 2, "Sub 1.1"),
      sec(30, 1, "Cap 2"),
      sec(40, 0, "Parte II"),
    ]);
    expect(tree).toHaveLength(2);
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
    expect(secs.find((s) => s.title === "Parte II")?.level).toBe(0);
  });

  it("no confunde 'capítulo' en minúscula a mitad de oración", () => {
    const words = "esto se explica en el capítulo siguiente sin mayúscula".split(" ");
    expect(detectSectionsFromWords(words)).toHaveLength(0);
  });
});

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

function fakeDoc(): OutlineDoc {
  return {
    async getOutline() {
      return [
        {
          title: "Parte I",
          dest: [{ pageRef: 0 }],
          items: [{ title: "Capítulo 1", dest: [{ pageRef: 1 }], items: [] }],
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
    const pdfPageStarts = [0, 500, 900];
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
