import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY nicht konfiguriert" }, { status: 500 });
  }
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const formData = await req.formData();
  const audio = formData.get("audio") as File | null;

  if (!audio) {
    return NextResponse.json({ error: "Keine Audiodatei" }, { status: 400 });
  }

  try {
    const transcription = await openai.audio.transcriptions.create({
      file: audio,
      model: "whisper-1",
      language: "de",
    });
    return NextResponse.json({ text: transcription.text });
  } catch (err) {
    console.error("[transcribe] Whisper-Fehler:", err);
    return NextResponse.json({ error: "Transkription fehlgeschlagen" }, { status: 502 });
  }
}
