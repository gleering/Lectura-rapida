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

// Swap this for a real LLM-backed provider in future versions.
export const activeProvider: AiProvider = localProvider;
