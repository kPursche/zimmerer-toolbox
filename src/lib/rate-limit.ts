import { NextRequest, NextResponse } from "next/server";

// ─── Einfacher In-Memory-Rate-Limiter (Fixed Window, pro IP) ──────────────────
// Hinweis: Auf Vercel gilt der Zähler pro Serverless-Instanz — kein perfekter
// Schutz, blockt aber naive Missbrauchs-Schleifen zuverlässig und kostet nichts.
// Bei Bedarf später durch @upstash/ratelimit (Redis) ersetzen.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

// Verhindert unbegrenztes Wachstum der Map bei vielen unterschiedlichen IPs
function sweep(now: number) {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, b] of buckets) {
    if (now >= b.resetAt) buckets.delete(key);
  }
}

export function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unbekannt";
}

/**
 * Prüft das Limit für eine Route. Gibt bei Überschreitung direkt die
 * 429-Response zurück, sonst null.
 *
 * Verwendung:
 *   const limited = rateLimit("tts", req, 20, 60_000);
 *   if (limited) return limited;
 */
export function rateLimit(
  scope: string,
  req: NextRequest,
  limit: number,
  windowMs: number
): NextResponse | null {
  const now = Date.now();
  sweep(now);

  const key = `${scope}:${getClientIp(req)}`;
  const b = buckets.get(key);

  if (!b || now >= b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  if (b.count >= limit) {
    const retryAfterSec = Math.max(1, Math.ceil((b.resetAt - now) / 1000));
    return NextResponse.json(
      { error: "Zu viele Anfragen — bitte kurz warten." },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
    );
  }

  b.count++;
  return null;
}
