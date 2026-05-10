import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const { name, message, reply_to, session_id } = await req.json();

  if (!message?.trim()) {
    return NextResponse.json({ error: "Nachricht fehlt" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Supabase nicht konfiguriert" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase.from("community_feed").insert({
    name: name?.trim() || "Anonym",
    message: message.trim(),
    reply_to: reply_to ?? null,
    session_id,
  }).select().single();

  if (error) {
    console.error("[community/send] Supabase Fehler:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
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
