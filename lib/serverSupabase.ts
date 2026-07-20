// Cliente Supabase de SERVIDOR con la service_role key.
//
// Se usa SOLO en rutas de API del servidor (p. ej. el webhook de Lemon
// Squeezy), nunca en el navegador: la service_role key saltea RLS y jamás debe
// filtrarse al cliente. Las variables NO llevan prefijo NEXT_PUBLIC_.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** true cuando el servidor puede escribir en Supabase con privilegios. */
export const isServerSupabaseConfigured = Boolean(url && serviceKey);

let client: SupabaseClient | null = null;

/** Cliente service-role (singleton). Lanza si falta configuración. */
export function getServerSupabase(): SupabaseClient {
  if (!isServerSupabaseConfigured) {
    throw new Error(
      "Falta configurar SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el servidor."
    );
  }
  if (!client) {
    client = createClient(url as string, serviceKey as string, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
