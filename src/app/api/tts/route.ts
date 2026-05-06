import { NextRequest, NextResponse } from "next/server";
import { ElevenLabsClient } from "elevenlabs";

export async function POST(req: NextRequest) {
  if (!process.env.ELEVENLABS_API_KEY) {
    return NextResponse.json({ error: "ELEVENLABS_API_KEY nicht konfiguriert" }, { status: 500 });
  }

  const body = await req.json();
  const text = body.text as string | undefined;

  if (!text) {
    return NextResponse.json({ error: "Kein Text gesendet" }, { status: 400 });
  }

  const elevenlabs = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });

  try {
    const audioStream = await elevenlabs.textToSpeech.convert("VR6AewLTigWG4xSOukaG", { // Arnold
      text: text,
      model_id: "eleven_monolingual_v1",
    });

    const chunks: Uint8Array[] = [];
    for await (const chunk of audioStream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "audio/mpeg",
      },
    });
  } catch (error) {
    console.error("[tts] Eleven Labs Fehler:", error);
    return NextResponse.json({ error: "TTS-Verarbeitung fehlgeschlagen" }, { status: 502 });
  }
}