import { config } from "dotenv";
config({ path: ".env.local", override: false });
import { NextRequest, NextResponse } from "next/server";
import { ElevenLabsClient } from "elevenlabs";

// ─── Deutsche Zahlwörter ──────────────────────────────────────────────────────

function einzel(n: number): string {
  return ["null","ein","zwei","drei","vier","fünf","sechs","sieben","acht","neun"][n] ?? String(n);
}

function zweistellig(n: number): string {
  if (n <= 9) return einzel(n);
  const spezial: Record<number, string> = {
    10: "zehn", 11: "elf", 12: "zwölf", 13: "dreizehn", 14: "vierzehn",
    15: "fünfzehn", 16: "sechzehn", 17: "siebzehn", 18: "achtzehn", 19: "neunzehn",
  };
  if (spezial[n]) return spezial[n];
  const zehner = ["","","zwanzig","dreißig","vierzig","fünfzig","sechzig","siebzig","achtzig","neunzig"];
  const t = Math.floor(n / 10);
  const e = n % 10;
  if (e === 0) return zehner[t];
  return einzel(e) + "und" + zehner[t];
}

// 123,5 cm → "einmeterdreiundzwanzigfünf"
// 88,5 cm  → "achtundachtzigfünf"
function cmZuSprache(ganz: number, dez: number | null): string {
  const meter = Math.floor(ganz / 100);
  const rest  = ganz % 100;
  let out = "";
  if (meter > 0) {
    out += einzel(meter) + "meter";
    if (rest > 0) out += zweistellig(rest);
  } else {
    out += zweistellig(ganz);
  }
  if (dez !== null && dez > 0) out += einzel(dez);
  return out;
}

// ─── Text bereinigen ──────────────────────────────────────────────────────────

function bereinige(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/°/g, " Grad")
    // cm-Maße mit Dezimalstelle → gesprochenes Deutsch
    .replace(/(\d+)[,.](\d)\s*(?:cm|Zentimeter)/gi, (_, g, d) =>
      cmZuSprache(parseInt(g, 10), parseInt(d, 10))
    )
    // cm-Maße ohne Dezimalstelle
    .replace(/(\d+)\s*(?:cm|Zentimeter)/gi, (_, g) =>
      cmZuSprache(parseInt(g, 10), null)
    )
    .replace(/(\d+)[,.](\d+)\s*m\b/gi, "$1 Komma $2 Meter")
    .replace(/(\d+)\s*m\b/gi, "$1 Meter")
    .replace(/(\d+)\.(\d+)/g, "$1,$2")
    .replace(/[→←↑↓•·]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// ─── Route ────────────────────────────────────────────────────────────────────

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
  const voiceId = process.env.ELEVENLABS_VOICE_ID || "ztZBipzb4WQJRDayep3G";
  const cleanText = bereinige(text);

  try {
    const audioStream = await elevenlabs.textToSpeech.convert(voiceId, {
      text: cleanText,
      model_id: "eleven_turbo_v2_5",
      voice_settings: { stability: 0.75, similarity_boost: 0.8, style: 0, use_speaker_boost: false },
    });

    const chunks: Uint8Array[] = [];
    for await (const chunk of audioStream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "X-TTS-Voice-Id": voiceId,
        "X-TTS-Source": "elevenlabs",
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[tts] Eleven Labs Fehler:", msg);
    return NextResponse.json({ error: "TTS-Verarbeitung fehlgeschlagen", detail: msg }, { status: 502 });
  }
}
