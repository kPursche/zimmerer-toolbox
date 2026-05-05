import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { message, name } = await req.json();

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json({ error: "Nachricht fehlt" }, { status: 400 });
  }

  const topic = process.env.NTFY_TOPIC;
  if (!topic) {
    return NextResponse.json({ error: "NTFY_TOPIC nicht konfiguriert" }, { status: 500 });
  }

  const absender = name?.trim() ? name.trim() : "Anonym";
  const body = `${absender}: ${message.trim()}`;

  const res = await fetch(`https://ntfy.sh/${topic}`, {
    method: "POST",
    headers: {
      "Title": "Neues Feedback — Zimmerer-Toolbox",
      "Priority": "default",
      "Tags": "speech_balloon",
      "Content-Type": "text/plain; charset=utf-8",
    },
    body,
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Senden fehlgeschlagen" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
