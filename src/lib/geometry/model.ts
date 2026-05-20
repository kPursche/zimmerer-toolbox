/**
 * Datenmodell fuer einen Grundriss inklusive Kanten-Typen
 * (Traufe / Walm / Giebel) und Kanten-spezifischer Dachneigung.
 *
 * Saemtliche Laengen in Millimetern, Winkel in Grad.
 */

import type { Point2 } from "./primitives";
import {
  distance,
  isCCW,
  isConvex,
  signedArea,
} from "./primitives";

export type EdgeType = "Traufe" | "Walm" | "Giebel";

export interface DachEdge {
  /** Index des Startpunkts im vertices-Array. */
  from: number;
  /** Index des Endpunkts im vertices-Array. */
  to: number;
  type: EdgeType;
  /**
   * Neigung in Grad.
   *  - Traufe / Walm: 0 < pitch < 90
   *  - Giebel: 90 (vertikale Wand)
   */
  pitch_deg: number;
}

export interface Grundriss {
  /** Stabile Id fuer localStorage. */
  id?: string;
  /** Anzeigename des Projekts. */
  name?: string;
  /** ISO-Zeitstempel beim Speichern. */
  created_at?: string;
  /** Polygon-Eckpunkte in Millimetern. */
  vertices: Point2[];
  /**
   * Genau eine Kante pro Eckpunkt, in Reihenfolge.
   * edges[i] verbindet vertices[i] mit vertices[(i+1) % n].
   */
  edges: DachEdge[];
}

export interface ValidationIssue {
  message: string;
  edgeIndex?: number;
  vertexIndex?: number;
}

/**
 * Pruefe einen Grundriss auf Konsistenz und Berechenbarkeit.
 * Leeres Array = alles in Ordnung.
 */
export function validateGrundriss(g: Grundriss): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const n = g.vertices.length;

  if (n < 3) {
    issues.push({ message: "Grundriss benoetigt mindestens 3 Eckpunkte." });
    return issues;
  }
  if (g.edges.length !== n) {
    issues.push({
      message: `Anzahl Kanten (${g.edges.length}) muss gleich Anzahl Punkte (${n}) sein.`,
    });
    return issues;
  }

  for (let i = 0; i < n; i++) {
    const e = g.edges[i];
    if (e.from !== i || e.to !== (i + 1) % n) {
      issues.push({
        message: `Kante ${i} muss von Punkt ${i} zu Punkt ${(i + 1) % n} laufen.`,
        edgeIndex: i,
      });
    }
    if (e.type === "Giebel") {
      if (e.pitch_deg !== 90) {
        issues.push({
          message: "Giebel muss 90 Grad Neigung haben (vertikale Wand).",
          edgeIndex: i,
        });
      }
    } else if (!(e.pitch_deg > 0 && e.pitch_deg < 90)) {
      issues.push({
        message: `${e.type}-Neigung muss zwischen 0 und 90 Grad liegen.`,
        edgeIndex: i,
      });
    }
  }

  if (!g.edges.some((e) => e.type === "Traufe" || e.type === "Walm")) {
    issues.push({
      message: "Mindestens eine Traufe oder Walm wird fuer ein Dach benoetigt.",
    });
  }

  for (let i = 0; i < n; i++) {
    const a = g.vertices[i];
    const b = g.vertices[(i + 1) % n];
    if (distance(a, b) < 0.1) {
      issues.push({ message: `Kante ${i} hat keine Laenge.`, edgeIndex: i });
    }
  }

  return issues;
}

/**
 * Stelle sicher, dass der Grundriss CCW gewickelt ist.
 * Liefert ggf. eine umgedrehte Kopie inkl. neu indizierter Kanten.
 */
export function ensureCCW(g: Grundriss): Grundriss {
  if (isCCW(g.vertices)) return g;
  const n = g.vertices.length;
  const verts = [...g.vertices].reverse();
  const edges: DachEdge[] = [];
  for (let i = 0; i < n; i++) {
    const oldEdge = g.edges[(n - 1 - i + n - 1) % n];
    edges.push({
      from: i,
      to: (i + 1) % n,
      type: oldEdge.type,
      pitch_deg: oldEdge.pitch_deg,
    });
  }
  return { ...g, vertices: verts, edges };
}

/** Polygon-Flaeche in m^2. */
export const flaecheM2 = (g: Grundriss): number =>
  Math.abs(signedArea(g.vertices)) / 1_000_000;

/** Konvexitaet ist im MVP Pflicht. */
export const istKonvex = (g: Grundriss): boolean => isConvex(g.vertices);

// ---------------------------------------------------------------------------
// localStorage I/O
// ---------------------------------------------------------------------------

const STORAGE_KEY = "zimmerer-toolbox.grundrisse";

function readAll(): Grundriss[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Grundriss[]) : [];
  } catch {
    return [];
  }
}

function writeAll(items: Grundriss[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export const listGrundrisse = (): Grundriss[] => readAll();

export const loadGrundriss = (id: string): Grundriss | null =>
  readAll().find((g) => g.id === id) ?? null;

export function saveGrundriss(g: Grundriss): Grundriss {
  const items = readAll();
  const id = g.id ?? `g_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const saved: Grundriss = {
    ...g,
    id,
    created_at: g.created_at ?? new Date().toISOString(),
  };
  const idx = items.findIndex((x) => x.id === id);
  if (idx >= 0) items[idx] = saved;
  else items.push(saved);
  writeAll(items);
  return saved;
}

export function deleteGrundriss(id: string): void {
  writeAll(readAll().filter((g) => g.id !== id));
}

// ---------------------------------------------------------------------------
// Komfort-Konstruktoren
// ---------------------------------------------------------------------------

/**
 * Baue ein Rechteck (CCW): A(0,0) -> B(L,0) -> C(L,B) -> D(0,B).
 * Edge-Typen koennen einzeln gesetzt werden.
 */
export function rechteck(opts: {
  laenge_mm: number;
  breite_mm: number;
  edges: [DachEdge["type"], DachEdge["type"], DachEdge["type"], DachEdge["type"]];
  pitches: [number, number, number, number];
  name?: string;
}): Grundriss {
  const { laenge_mm: L, breite_mm: B, edges: types, pitches } = opts;
  const vertices: Point2[] = [
    { x: 0, y: 0 },
    { x: L, y: 0 },
    { x: L, y: B },
    { x: 0, y: B },
  ];
  const edges: DachEdge[] = [0, 1, 2, 3].map((i) => ({
    from: i,
    to: (i + 1) % 4,
    type: types[i],
    pitch_deg: pitches[i],
  }));
  return { name: opts.name, vertices, edges };
}
