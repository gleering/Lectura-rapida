// Cliente Supabase para el navegador — biblioteca pública compartida.
//
// La app sigue siendo local-first: la lectura y los libros privados viven en
// IndexedDB y funcionan sin conexión. Supabase se usa solo para el catálogo
// público (auth + metadata + contenido en Storage). El acceso está restringido
// por RLS, así que la anon key puede vivir en el cliente.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** true cuando el proyecto está configurado. Si falta, la biblioteca pública
 *  se oculta con elegancia y la app local sigue funcionando igual. */
export const isSupabaseConfigured = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

/** Devuelve el cliente (singleton). Lanza solo si se usa sin configurar. */
export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase no está configurado. Define NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }
  if (!client) {
    client = createClient(url as string, anonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}
