import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

type ChatCompletionRequestMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

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
    abstaende: Array<{ nr: number; position: number }>;
  } | undefined;

  if (!prompt) {
    return NextResponse.json({ error: "Keine Anfrage gesendet" }, { status: 400 });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const systemPrompt = `Du bist ein deutscher Assistent für Dachlatten-Einteilung. Antworte immer kurz und präzise, ohne lange Erklärungen. Verwende bei Bedarf die aktuellen Rechnungsdaten aus dem Kontext. Gib nur die notwendigen Informationen.`;
  const contextLines = [];

  if (context?.gesamtMass != null && context?.anzahlLatten != null && context?.lattenMass != null) {
    contextLines.push(`Aktuelle Berechnung: Gesamtmaß ${context.gesamtMass.toFixed(1)} cm, Anzahl Latten ${context.anzahlLatten}, berechnetes Lattenmaß ${context.lattenMass.toFixed(1)} cm.`);
  }

  if (context?.abstaende && context.abstaende.length > 0) {
    const positions = context.abstaende.map((a) => `Latte ${a.nr}: ${a.position.toFixed(1)} cm`).join("; ");
    contextLines.push(`Positionen: ${positions}.`);
  }

  const messages: ChatCompletionRequestMessage[] = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `${contextLines.join(" ")} Bitte beantworte die folgende Frage auf Deutsch: ${prompt}`,
    },
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.2,
      max_tokens: 250,
    });

    const text = completion.choices?.[0]?.message?.content?.trim() ?? "Ich konnte leider keine Antwort generieren.";
    return NextResponse.json({ text });
  } catch (error) {
    console.error("[latten-ki] OpenAI-Fehler:", error);
    return NextResponse.json({ error: "KI-Verarbeitung fehlgeschlagen" }, { status: 502 });
  }
}
