import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimit } from "@/lib/rate-limit";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Löscht eine eigene Community-Nachricht. Die Eigentümerprüfung passiert
// serverseitig: gelöscht wird nur, wenn id UND session_id übereinstimmen.
// (Vorher lief das Löschen direkt über den Anon-Key im Client — damit
// konnte jeder beliebige Nachrichten löschen.)
export async function POST(req: NextRequest) {
  const limited = rateLimit("community-delete", req, 20, 60_000);
  if (limited) return limited;

  const { id, session_id } = await req.json();

  if (!UUID_RE.test(String(id)) || !UUID_RE.test(String(session_id))) {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Supabase nicht konfiguriert" }, { status: 500 });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("[community/delete] SUPABASE_SERVICE_ROLE_KEY fehlt — nutze Anon-Key (vor RLS-Migration setzen!)");
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // .eq("session_id", ...) stellt sicher, dass nur eigene Nachrichten löschbar sind
  const { error } = await supabase
    .from("community_feed")
    .delete()
    .eq("id", id)
    .eq("session_id", session_id);

  if (error) {
    console.error("[community/delete] Supabase Fehler:", error.message);
    return NextResponse.json({ error: "Löschen fehlgeschlagen" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
