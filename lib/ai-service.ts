/**
 * AI Service para generar resúmenes usando Google Gemini.
 * API gratuita: https://aistudio.google.com/app/apikey
 */

export async function generateSummary(text: string): Promise<string | null> {
  // Limitar el texto a ~8000 palabras para no exceder límites de token
  const maxWords = 8000;
  const words = text.split(/\s+/);
  const limitedText = words.slice(0, maxWords).join(" ");

  const prompt = `Por favor, crea un resumen conciso (3-5 párrafos) del siguiente texto en español.
El resumen debe ser claro, informativo y capturar los puntos principales.

Texto:
${limitedText}

Resumen:`;

  try {
    const response = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) return null;
    const data = (await response.json()) as { text?: string | null };
    return data.text || null;
  } catch (error) {
    console.error("Error al llamar API de Gemini:", error);
    return null;
  }
}
