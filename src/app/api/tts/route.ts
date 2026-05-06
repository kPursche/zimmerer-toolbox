import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY nicht konfiguriert" }, { status: 500 });
  }

  const body = await req.json();
  const text = body.text as string | undefined;

  if (!text) {
    return NextResponse.json({ error: "Kein Text gesendet" }, { status: 400 });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: "nova", // Hochwertige deutsche Stimme
      input: text,
      response_format: "mp3",
    });

    const buffer = await mp3.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "audio/mpeg",
      },
    });
  } catch (error) {
    console.error("[tts] OpenAI-Fehler:", error);
    return NextResponse.json({ error: "TTS-Verarbeitung fehlgeschlagen" }, { status: 502 });
  }
}