// AI service layer.
//
// The MVP ships with fully local, offline heuristics so comprehension checks,
// chapter summaries and the dictionary work with no backend and no API keys.
// Every function goes through the `AiProvider` interface, so a future version
// can drop in a real LLM (Claude, etc.) by implementing this contract and
// swapping `activeProvider` — no call sites change.

export interface ComprehensionQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface WordDefinition {
  word: string;
  definition: string;
  synonyms: string[];
  simple: string;
}

export interface AiProvider {
  comprehension(text: string): Promise<ComprehensionQuestion>;
  summarize(text: string): Promise<string>;
  define(word: string): Promise<WordDefinition>;
}

const STOP_WORDS = new Set([
  "el","la","los","las","un","una","unos","unas","de","del","al","a","y","o","u",
  "que","en","con","por","para","su","sus","se","lo","le","les","es","son","como",
  "más","pero","sus","the","of","and","to","in","is","it","that","this","for","was",
]);

function sentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);
}

function keywords(text: string): string[] {
  const freq = new Map<string, number>();
  for (const raw of text.toLowerCase().split(/[^a-záéíóúñü]+/i)) {
    if (raw.length < 5 || STOP_WORDS.has(raw)) continue;
    freq.set(raw, (freq.get(raw) ?? 0) + 1);
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([w]) => w);
}

/**
 * Local heuristic provider — no network required.
 * - comprehension: cloze question built from a salient sentence.
 * - summarize: extractive summary of the most keyword-dense sentences.
 * - define: structural placeholder that stays useful offline.
 */
export const localProvider: AiProvider = {
  async comprehension(text) {
    const sents = sentences(text);
    const keys = keywords(text);
    const fallback: ComprehensionQuestion = {
      question: "¿Cuál fue la idea principal del fragmento que acabas de leer?",
      options: [
        "Sigue leyendo para reforzar la comprensión.",
        "El texto no presentaba una idea central.",
        "El fragmento era puramente decorativo.",
      ],
      correctIndex: 0,
    };
    if (sents.length === 0 || keys.length === 0) return fallback;

    // Pick the sentence containing the top keyword.
    const key = keys[0];
    const target =
      sents.find((s) => s.toLowerCase().includes(key)) ?? sents[0];
    const distractors = keys.slice(1, 6).filter((k) => k !== key);
    if (distractors.length < 2) return fallback;

    const options = [key, distractors[0], distractors[1]];
    // Shuffle deterministically-ish.
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    return {
      question: `En el fragmento se destaca: “${target}”. ¿Cuál es el concepto clave?`,
      options,
      correctIndex: options.indexOf(key),
    };
  },

  async summarize(text) {
    const sents = sentences(text);
    if (sents.length === 0) return "Aún no hay suficiente texto leído para resumir.";
    const keys = new Set(keywords(text).slice(0, 12));
    const scored = sents.map((s) => {
      const words = s.toLowerCase().split(/[^a-záéíóúñü]+/i);
      const score = words.filter((w) => keys.has(w)).length;
      return { s, score };
    });
    const top = scored
      .map((v, i) => ({ ...v, i }))
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.min(4, sents.length))
      .sort((a, b) => a.i - b.i)
      .map((v) => v.s);
    return top.join(" ");
  },

  async define(word) {
    const clean = word.replace(/[^\p{L}\p{N}-]/gu, "");
    return {
      word: clean,
      definition:
        "Definición no disponible sin conexión. En una próxima versión se consultará un diccionario con IA.",
      synonyms: [],
      simple: `“${clean}” es la palabra seleccionada. Toca de nuevo para continuar la lectura.`,
    };
  },
};

// ---------------------------------------------------------------------------
// Proveedor con IA real (Google Gemini vía /api/gemini).
//
// El lector usa la misma IA que el resto de la app (tutor, recall, mapas). Si
// no hay red, la clave no está configurada en el servidor, o la respuesta no es
// válida, cae de forma transparente al proveedor local: la función nunca falla.
// ---------------------------------------------------------------------------

async function callGemini(prompt: string): Promise<string | null> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return null;
  }
  try {
    const res = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { text?: string | null };
    return data.text ?? null;
  } catch {
    return null;
  }
}

/** Extrae el primer bloque JSON ({...} o [...]) de una respuesta de texto. */
function extractJson<T>(text: string): T | null {
  const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}

export const geminiProvider: AiProvider = {
  async comprehension(text) {
    const context = text.split(/\s+/).slice(-1200).join(" ");
    const prompt = `Eres un tutor de lectura. A partir del siguiente fragmento que el usuario acaba de leer, crea UNA pregunta de comprensión de opción múltiple (3 opciones) para verificar que entendió la idea principal. La respuesta correcta debe deducirse del texto; los distractores deben ser plausibles pero incorrectos.

IMPORTANTE: responde SOLO con JSON válido, sin markdown ni texto adicional.

Fragmento:
${context}

Formato exacto:
{ "question": "...", "options": ["...", "...", "..."], "correctIndex": 0 }`;

    const raw = await callGemini(prompt);
    if (!raw) return localProvider.comprehension(text);

    const parsed = extractJson<ComprehensionQuestion>(raw);
    if (
      !parsed ||
      typeof parsed.question !== "string" ||
      !Array.isArray(parsed.options) ||
      parsed.options.length < 2 ||
      typeof parsed.correctIndex !== "number" ||
      parsed.correctIndex < 0 ||
      parsed.correctIndex >= parsed.options.length
    ) {
      return localProvider.comprehension(text);
    }
    return {
      question: String(parsed.question),
      options: parsed.options.map((o) => String(o)),
      correctIndex: parsed.correctIndex,
    };
  },

  async summarize(text) {
    const context = text.split(/\s+/).slice(-2000).join(" ");
    if (context.trim().length < 40) return localProvider.summarize(text);
    const prompt = `Resume en español, en 3-5 frases claras, las ideas principales del siguiente fragmento que el usuario acaba de leer. No añadas encabezados ni markdown, solo el resumen.

Fragmento:
${context}`;

    const raw = await callGemini(prompt);
    if (!raw || raw.trim().length === 0) return localProvider.summarize(text);
    return raw.trim();
  },

  async define(word) {
    const clean = word.replace(/[^\p{L}\p{N}-]/gu, "");
    if (!clean) return localProvider.define(word);
    const prompt = `Define la palabra española "${clean}".

IMPORTANTE: responde SOLO con JSON válido, sin markdown ni texto adicional.

Formato exacto:
{ "word": "${clean}", "definition": "definición precisa en 1-2 frases", "synonyms": ["sinónimo1", "sinónimo2"], "simple": "explicación sencilla para alguien que no conoce la palabra" }`;

    const raw = await callGemini(prompt);
    if (!raw) return localProvider.define(word);

    const parsed = extractJson<WordDefinition>(raw);
    if (!parsed || typeof parsed.definition !== "string" || !parsed.definition.trim()) {
      return localProvider.define(word);
    }
    return {
      word: clean,
      definition: String(parsed.definition),
      synonyms: Array.isArray(parsed.synonyms)
        ? parsed.synonyms.map((s) => String(s)).filter(Boolean)
        : [],
      simple:
        typeof parsed.simple === "string" && parsed.simple.trim()
          ? String(parsed.simple)
          : String(parsed.definition),
    };
  },
};

// El lector usa la IA real; cae al proveedor local cuando no hay red o clave.
export const activeProvider: AiProvider = geminiProvider;
