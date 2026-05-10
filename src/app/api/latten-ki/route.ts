import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY nicht konfiguriert" }, { status: 500 });
  }

  const body = await req.json();
  const prompt = body.prompt as string | undefined;
  const context = body.context as {
    gesamtMass: number | null;
    anzahlLatten: number | null;
    lattenMass: number | null;
    letzteLatte: number | null;
    abstaende: Array<{ nr: number; position: number }>;
  } | undefined;

  if (!prompt) {
    return NextResponse.json({ error: "Keine Anfrage gesendet" }, { status: 400 });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const positionenText = context?.abstaende?.length
    ? context.abstaende.map((a) => `Latte ${a.nr}: ${a.position.toFixed(1)} cm`).join(", ")
    : "noch nicht berechnet";

  const systemPrompt = `Du bist ein sprachgesteuerter Assistent für Dachlatten-Einteilung auf der Baustelle.
Antworte IMMER als JSON mit genau zwei Feldern: {"text": "...", "letzteLatte": N}

Regeln für text:
- Maximal 1 kurzer Satz. Nur die direkt gefragte Zahl nennen.
- Niemals alle Positionen aufzählen.
- Beispiel: "Latte 8 steht auf 186,5 Zentimeter."

Regeln für letzteLatte:
- Die Nummer der Latte, über die text spricht. null wenn keine bestimmte Latte.

Befehle:
- "nächste" / "weiter" / "und weiter" → letzteLatte + 1 (oder Latte 1 wenn letzteLatte null)
- "vorherige" / "zurück" → letzteLatte - 1
- "erste" → Latte 1, "letzte" → höchste Lattennummer

Aktuelle Berechnung:
- Gesamtmaß: ${context?.gesamtMass != null ? context.gesamtMass.toFixed(1) + " cm" : "unbekannt"}
- Anzahl Latten: ${context?.anzahlLatten ?? "unbekannt"}
- Lattenmaß: ${context?.lattenMass != null ? context.lattenMass.toFixed(1) + " cm" : "unbekannt"}
- Zuletzt genannte Latte: ${context?.letzteLatte ?? "keine"}
- Positionen: ${positionenText}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 100,
    });

    const raw = completion.choices?.[0]?.message?.content?.trim() ?? "{}";
    let parsed: { text?: string; letzteLatte?: number | null };
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { text: raw, letzteLatte: null };
    }

    return NextResponse.json({
      text: parsed.text ?? "Ich konnte leider keine Antwort generieren.",
      letzteLatte: parsed.letzteLatte ?? null,
    });
  } catch (error) {
    console.error("[latten-ki] OpenAI-Fehler:", error);
    return NextResponse.json({ error: "KI-Verarbeitung fehlgeschlagen" }, { status: 502 });
  }
}
