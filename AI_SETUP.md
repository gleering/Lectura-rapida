# 🤖 Configuración de Resúmenes Automáticos con IA

Tu app ReadFlow ahora genera **resúmenes automáticos con IA** usando Google Gemini.

## 🚀 Configuración Rápida

### 1. Obtener API Key de Google Gemini (Gratis)

1. Ve a https://aistudio.google.com/app/apikey
2. Haz clic en "Create API Key"
3. Copia la clave

### 2. Configurar la clave en tu proyecto

Edita `.env.local` (esta variable es **solo del servidor**, sin `NEXT_PUBLIC_`,
por lo que la clave nunca se expone en el navegador):

```bash
GEMINI_API_KEY=tu_api_key_aqui
```

> ⚠️ Seguridad: `.env.local` está en `.gitignore` y no debe subirse al repo.
> Las llamadas a Gemini pasan por la ruta de servidor `/api/gemini`, que es la
> única que lee la clave. Nunca uses el prefijo `NEXT_PUBLIC_` para esta clave.

Luego reinicia tu servidor:

```bash
npm run dev
```

## 📝 Cómo Funciona

1. **Carga PDF**: Cuando subes un PDF, ReadFlow extrae el texto
2. **Genera Resumen**: La IA crea un resumen de 3-5 párrafos automáticamente
3. **Muestra en Biblioteca**: El resumen aparece en cada libro de tu biblioteca
4. **Accesible**: Puedes expandir/contraer el resumen con un clic

## 📊 Límites de Google Gemini (Free Tier)

- **250,000 tokens/minuto**
- **20 solicitudes/día**
- **5 solicitudes/minuto**

Esto es suficiente para generar ~2-3 resúmenes por día de PDFs grandes.

## 🔧 Opciones Avanzadas

### Cambiar el proveedor de IA

Si quieres usar otro proveedor (Groq, Mistral, etc.), edita `lib/ai-service.ts`:

```typescript
// Groq (Ultra-rápido)
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

// Mistral (Modelos abiertos)
const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";
```

### Ajustar la calidad del resumen

En `lib/ai-service.ts`, modifica el prompt:

```typescript
const prompt = `Por favor, crea un resumen DETALLADO de...`; // Más largo
const prompt = `Por favor, crea un resumen BREVE de...`; // Más corto
```

## 🐛 Troubleshooting

### "API key no está configurada"
- Verifica que `.env.local` existe y tiene la clave
- Reinicia `npm run dev`

### "Error al generar resumen"
- Verifica que tu API key es válida
- Comprueba que tienes solicitudes disponibles (max 20/día en free tier)
- Revisa la consola del navegador (F12) para ver errores

### "Resumen nunca aparece"
- Algunos PDFs pueden ser muy grandes, espera más tiempo
- La clave puede estar inactiva, genera una nueva en aistudio.google.com

## 📚 Recursos

- [Google Gemini API Docs](https://ai.google.dev/docs)
- [Free LLM API Resources](https://github.com/cheahjs/free-llm-api-resources) (originales)
- [OpenRouter](https://openrouter.ai) - Alternativa con muchos modelos
- [Groq](https://console.groq.com) - Super rápido

## 🎯 Próximas Features

- [ ] Preguntas generadas automáticamente
- [ ] Flashcards automáticas
- [ ] Análisis de legibilidad
- [ ] Sugerencia de velocidad adaptativa
