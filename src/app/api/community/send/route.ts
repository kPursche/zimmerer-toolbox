import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimit } from "@/lib/rate-limit";

// Längen-Limits (werden zusätzlich per CHECK-Constraint in der DB erzwungen)
const MAX_NAME_LEN = 50;
const MAX_MESSAGE_LEN = 1000;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  const limited = rateLimit("community-send", req, 10, 60_000);
  if (limited) return limited;

  const { name, message, reply_to, session_id } = await req.json();

  if (!message?.trim() || typeof message !== "string") {
    return NextResponse.json({ error: "Nachricht fehlt" }, { status: 400 });
  }
  if (message.trim().length > MAX_MESSAGE_LEN) {
    return NextResponse.json({ error: `Nachricht zu lang (max. ${MAX_MESSAGE_LEN} Zeichen)` }, { status: 400 });
  }
  if (name && (typeof name !== "string" || name.trim().length > MAX_NAME_LEN)) {
    return NextResponse.json({ error: `Name zu lang (max. ${MAX_NAME_LEN} Zeichen)` }, { status: 400 });
  }
  if (reply_to != null && !UUID_RE.test(String(reply_to))) {
    return NextResponse.json({ error: "Ungültige Antwort-Referenz" }, { status: 400 });
  }
  const sessionId = typeof session_id === "string" && UUID_RE.test(session_id) ? session_id : null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Service-Role-Key: umgeht RLS — Schreiben ist für anon per RLS gesperrt.
  // Fallback auf Anon-Key, solange die RLS-Migration noch nicht eingespielt ist.
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Supabase nicht konfiguriert" }, { status: 500 });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("[community/send] SUPABASE_SERVICE_ROLE_KEY fehlt — nutze Anon-Key (vor RLS-Migration setzen!)");
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase.from("community_feed").insert({
    name: name?.trim() || "Anonym",
    message: message.trim(),
    reply_to: reply_to ?? null,
    session_id: sessionId,
  }).select().single();

  if (error) {
    console.error("[community/send] Supabase Fehler:", error.message);
    return NextResponse.json({ error: "Nachricht konnte nicht gespeichert werden" }, { status: 500 });
  }

  // Push-Benachrichtigung via ntfy.sh
  const topic = process.env.NTFY_TOPIC;
  if (topic) {
    const absender = name?.trim() || "Anonym";
    fetch(`https://ntfy.sh/${topic}`, {
      method: "POST",
      headers: {
        "Title": `Community: ${absender}`,
        "Priority": "3",
        "Tags": "speech_balloon",
        "Content-Type": "text/plain",
      },
      body: message.trim(),
    }).catch((err) => console.error("[community/send] ntfy Fehler:", err));
  }

  return NextResponse.json({ ok: true, data });
}
