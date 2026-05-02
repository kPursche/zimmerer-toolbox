/**
 * Supabase-Client (vorbereitet für PROJ-2 Auth).
 *
 * In PROJ-1 noch nicht aktiv genutzt — die Funktion wirft bewusst nur
 * einen Hinweis, falls jemand sie zu früh aufruft. Die Env-Variablen
 * sind in `.env.local.example` dokumentiert.
 */

import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase-Umgebungsvariablen fehlen. Auth wird in PROJ-2 aktiviert."
    );
  }

  return createBrowserClient(url, key);
}
