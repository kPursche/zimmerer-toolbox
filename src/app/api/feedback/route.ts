import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

const MAX_NAME_LEN = 100;
const MAX_MESSAGE_LEN = 2000;

export async function POST(req: NextRequest) {
  const limited = rateLimit("feedback", req, 5, 60_000);
  if (limited) return limited;

  const { message, name } = await req.json();

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json({ error: "Nachricht fehlt" }, { status: 400 });
  }
  if (message.trim().length > MAX_MESSAGE_LEN) {
    return NextResponse.json({ error: `Nachricht zu lang (max. ${MAX_MESSAGE_LEN} Zeichen)` }, { status: 400 });
  }
  if (name && (typeof name !== "string" || name.trim().length > MAX_NAME_LEN)) {
    return NextResponse.json({ error: `Name zu lang (max. ${MAX_NAME_LEN} Zeichen)` }, { status: 400 });
  }

  const topic = process.env.NTFY_TOPIC;
  if (!topic) {
    console.error("[feedback] NTFY_TOPIC ist nicht gesetzt");
    return NextResponse.json({ error: "NTFY_TOPIC nicht konfiguriert" }, { status: 500 });
  }

  const absender = name?.trim() ? name.trim() : "Anonym";
  const body = `${absender}: ${message.trim()}`;

  try {
    const res = await fetch(`https://ntfy.sh/${topic}`, {
      method: "POST",
      headers: {
        "Title": "Neues Feedback - Zimmerer-Toolbox",
        "Priority": "3",
        "Tags": "speech_balloon",
        "Content-Type": "text/plain",
      },
      body,
    });

    const responseText = await res.text();
    console.log(`[feedback] ntfy status=${res.status} body=${responseText}`);

    if (!res.ok) {
      return NextResponse.json({ error: `ntfy Fehler: ${res.status}` }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[feedback] fetch zu ntfy.sh fehlgeschlagen:", err);
    return NextResponse.json({ error: "Netzwerkfehler" }, { status: 502 });
  }
}
