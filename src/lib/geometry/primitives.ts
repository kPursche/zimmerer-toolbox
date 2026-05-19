/**
 * 2D-Geometrie-Primitiven fuer die Dachausmittlung.
 * Saemtliche Laengen werden in Millimetern gefuehrt, Winkel in Grad.
 *
 * Diese Datei ist UI-frei und vollstaendig synchron testbar.
 */

export interface Point2 {
  x: number;
  y: number;
}

export interface Point3 {
  x: number;
  y: number;
  z: number;
}

export const v = (x: number, y: number): Point2 => ({ x, y });
export const v3 = (x: number, y: number, z: number): Point3 => ({ x, y, z });

export const add = (a: Point2, b: Point2): Point2 => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Point2, b: Point2): Point2 => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (a: Point2, s: number): Point2 => ({ x: a.x * s, y: a.y * s });
export const dot = (a: Point2, b: Point2): number => a.x * b.x + a.y * b.y;
export const cross = (a: Point2, b: Point2): number => a.x * b.y - a.y * b.x;
export const length = (a: Point2): number => Math.hypot(a.x, a.y);

export function normalize(a: Point2): Point2 {
  const l = length(a);
  if (l === 0) throw new Error("Cannot normalize zero vector");
  return { x: a.x / l, y: a.y / l };
}

/** 90 Grad gegen den Uhrzeigersinn gedreht. */
export const perpLeft = (a: Point2): Point2 => ({ x: -a.y, y: a.x });
/** 90 Grad im Uhrzeigersinn gedreht. */
export const perpRight = (a: Point2): Point2 => ({ x: a.y, y: -a.x });

export const deg2rad = (d: number): number => (d * Math.PI) / 180;
export const rad2deg = (r: number): number => (r * 180) / Math.PI;

export const distance = (a: Point2, b: Point2): number => length(sub(a, b));
export const distance3 = (a: Point3, b: Point3): number =>
  Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

/**
 * Vorzeichenbehaftete Polygon-Flaeche. Positiv = gegen den Uhrzeigersinn.
 * Vertices in Millimetern.
 */
export function signedArea(verts: readonly Point2[]): number {
  let s = 0;
  const n = verts.length;
  for (let i = 0; i < n; i++) {
    const a = verts[i];
    const b = verts[(i + 1) % n];
    s += a.x * b.y - b.x * a.y;
  }
  return s / 2;
}

/** Polygonflaeche (immer positiv). */
export const area = (verts: readonly Point2[]): number => Math.abs(signedArea(verts));

/** Polygon ist gegen den Uhrzeigersinn (mathematische Konvention). */
export const isCCW = (verts: readonly Point2[]): boolean => signedArea(verts) > 0;

/**
 * Konvexitaets-Test. Erwartet ein einfaches (nicht selbst-schneidendes) Polygon.
 */
export function isConvex(verts: readonly Point2[]): boolean {
  const n = verts.length;
  if (n < 3) return false;
  let signSeen: number | null = null;
  for (let i = 0; i < n; i++) {
    const a = verts[i];
    const b = verts[(i + 1) % n];
    const c = verts[(i + 2) % n];
    const ab = sub(b, a);
    const bc = sub(c, b);
    const z = cross(ab, bc);
    if (Math.abs(z) < 1e-9) continue;
    const sign = Math.sign(z);
    if (signSeen === null) signSeen = sign;
    else if (sign !== signSeen) return false;
  }
  return signSeen !== null;
}

/**
 * Parametrische Geradenschnittberechnung:
 *   p + t * d  ==  q + s * e
 * Liefert (t, s) oder null bei Parallelitaet.
 */
export function intersectParametric(
  p: Point2,
  d: Point2,
  q: Point2,
  e: Point2,
): { t: number; s: number } | null {
  const det = d.x * e.y - d.y * e.x;
  if (Math.abs(det) < 1e-12) return null;
  const dx = q.x - p.x;
  const dy = q.y - p.y;
  const t = (dx * e.y - dy * e.x) / det;
  const s = (dx * d.y - dy * d.x) / det;
  return { t, s };
}

/**
 * Innere Normale einer Kante a -> b, normalisiert.
 * Bei CCW-gewickeltem Polygon zeigt die Normale ins Polygon-Innere.
 */
export function inwardNormalCCW(a: Point2, b: Point2): Point2 {
  return normalize(perpLeft(sub(b, a)));
}

/**
 * Sicheres Runden auf eine bestimmte Anzahl Nachkommastellen
 * (vermeidet 0.1+0.2-Probleme bei Vergleichen).
 */
export const round = (x: number, decimals = 4): number => {
  const f = 10 ** decimals;
  return Math.round(x * f) / f;
};
