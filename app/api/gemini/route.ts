import { NextResponse } from "next/server";

/**
 * Proxy de servidor para Google Gemini.
 *
 * La clave vive SOLO en el servidor (GEMINI_API_KEY, sin NEXT_PUBLIC_).
 * El navegador llama a esta ruta con un prompt; nunca ve la clave.
 * No se registran los prompts ni las respuestas (privacidad del usuario).
 */

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

// Límite defensivo de tamaño del prompt (evita abuso / costos).
const MAX_PROMPT_CHARS = 60_000;

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  error?: { message: string };
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "IA no configurada en el servidor." },
      { status: 503 }
    );
  }

  let prompt: unknown;
  try {
    const body = await request.json();
    prompt = body?.prompt;
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }

  if (typeof prompt !== "string" || prompt.trim().length === 0) {
    return NextResponse.json(
      { error: "Falta el prompt." },
      { status: 400 }
    );
  }
  if (prompt.length > MAX_PROMPT_CHARS) {
    return NextResponse.json(
      { error: "Prompt demasiado largo." },
      { status: 413 }
    );
  }

  try {
    const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });

    const data = (await res.json()) as GeminiResponse;
    if (data.error) {
      // No filtramos el mensaje crudo de Google al cliente.
      return NextResponse.json(
        { error: "Error del proveedor de IA." },
        { status: 502 }
      );
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
    return NextResponse.json({ text });
  } catch {
    return NextResponse.json(
      { error: "No se pudo contactar la IA." },
      { status: 502 }
    );
  }
}
