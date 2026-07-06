import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { rateLimit } from "@/lib/rate-limit";

// Kurze Sprachbefehle — 5 MB reichen locker (Whisper kostet pro Minute Audio)
const MAX_AUDIO_BYTES = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const limited = rateLimit("transcribe", req, 10, 60_000);
  if (limited) return limited;

  const formData = await req.formData();
  const audio = formData.get("audio") as File | null;

  if (!audio) {
    return NextResponse.json({ error: "Keine Audiodatei" }, { status: 400 });
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: "Audiodatei zu groß (max. 5 MB)" }, { status: 413 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY nicht konfiguriert" }, { status: 500 });
  }
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
