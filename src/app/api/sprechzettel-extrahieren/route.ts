import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { rateLimit } from "@/lib/rate-limit";

// Limits gegen Missbrauch (OpenAI-Aufrufe kosten Geld)
const MAX_TEXT_LEN = 2000;

export async function POST(req: NextRequest) {
  const limited = rateLimit("sprechzettel-extrahieren", req, 20, 60_000);
  if (limited) return limited;

  const body = await req.json();
  const text = body.text as string | undefined;

  if (!text || typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "Kein Text zum Auswerten übergeben" }, { status: 400 });
  }
  if (text.length > MAX_TEXT_LEN) {
    return NextResponse.json({ error: "Text zu lang" }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY nicht konfiguriert" }, { status: 500 });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const heute = new Date().toISOString().slice(0, 10);

  const systemPrompt = `Du extrahierst strukturierte Daten aus dem Diktat eines Zimmerers für seinen Stundenzettel.
Antworte AUSSCHLIESSLICH als JSON mit genau vier Feldern: {"datum": "YYYY-MM-DD"|null, "stunden": Zahl|null, "baustelle": "..."|null, "taetigkeit": "..."|null}

Regeln:
- Das heutige Datum ist ${heute}. Löse relative Angaben ("heute", "gestern", Wochentage) relativ dazu auf.
- Rate keine Werte, die nicht im Text vorkommen — setze sie stattdessen auf null.
- "stunden" ist eine reine Zahl (z.B. 8 oder 7.5), ohne Einheit.
- "baustelle" ist der Name der Baustelle, des Kunden oder des Projekts.
- "taetigkeit" ist eine kurze Beschreibung der ausgeführten Arbeit.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 200,
    });

    const raw = completion.choices?.[0]?.message?.content?.trim() ?? "{}";
    let parsed: {
      datum?: string | null;
      stunden?: number | null;
      baustelle?: string | null;
      taetigkeit?: string | null;
    };
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }

    return NextResponse.json({
      datum: parsed.datum ?? null,
      stunden: typeof parsed.stunden === "number" ? parsed.stunden : null,
      baustelle: parsed.baustelle ?? null,
      taetigkeit: parsed.taetigkeit ?? null,
    });
  } catch (error) {
    console.error("[sprechzettel-extrahieren] OpenAI-Fehler:", error);
    return NextResponse.json({ error: "KI-Verarbeitung fehlgeschlagen" }, { status: 502 });
  }
}
