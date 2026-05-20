/**
 * Dachausmittlung fuer konvexe Grundrisse mit gemischten Kantentypen
 * (Traufe / Walm / Giebel) und individuell waehlbaren Neigungen je Kante.
 *
 * Algorithmus: gewichteter Straight Skeleton.
 *   - Jede Traufe/Walm-Kante wandert mit Geschwindigkeit cot(alpha) nach innen,
 *     gemessen pro Millimeter Hoehenzuwachs.
 *   - Giebel-Kanten wandern nicht (vertikale Wand).
 *   - Jeder Eckpunkt bewegt sich entlang einer "Winkelhalbierenden", die
 *     sich aus den Geschwindigkeiten der beiden angrenzenden Kanten ergibt.
 *   - Wenn eine Kante auf Laenge 0 schrumpft, verschmelzen ihre Endpunkte
 *     zu einem neuen Eckpunkt; die Spur jedes Endpunkts wird ein Grat.
 *   - Bleibt ein "Digon" (2 Eckpunkte zwischen parallelen Kanten), bildet
 *     diese Strecke den First.
 *
 * Alle Laengen in Millimetern, Winkel in Grad.
 */

import {
  ensureCCW,
  istKonvex,
  validateGrundriss,
  type EdgeType,
  type Grundriss,
} from "./model";
import {
  deg2rad,
  inwardNormalCCW,
  rad2deg,
  signedArea,
  type Point2,
  type Point3,
} from "./primitives";

export interface SkeletonLine {
  from: Point3;
  to: Point3;
  kind: "First" | "Grat" | "Kehle" | "Ortgang";
  /** Tatsaechliche raeumliche Laenge in mm. */
  laenge_mm: number;
}

export interface SparrenInfo {
  /** Index der Kante im Eingangs-Grundriss. */
  edgeIndex: number;
  edgeType: EdgeType;
  pitch_deg: number;
  /**
   * Horizontale Tiefe vom Trauf-/Walmrand zum naechstgelegenen
   * Skelett-Punkt (in der Draufsicht).
   */
  walmtiefe_mm: number;
  /**
   * Sparrenlaenge in der Dachebene (vom Trauf-Mittelpunkt zum
   * naechstgelegenen Skelett-Punkt).
   */
  sparrenlaenge_mm: number;
}

export interface DachausmittlungErgebnis {
  /** First-Hoehe ueber Trauf-Niveau in mm. */
  firsthoehe_mm: number;
  /** Alle 3D-Linien des Dachs (First, Grate, Kehlen). */
  lines: SkeletonLine[];
  /** Sparren-Informationen pro Original-Kante (nur Traufe/Walm). */
  sparren: SparrenInfo[];
  /** Gesamte Dachflaeche in m^2 (nur Traufe/Walm-Flaechen). */
  flaeche_m2: number;
  /** Diagnose: wie viele Skelett-Iterationen wurden benoetigt? */
  iterations: number;
}

// ---------------------------------------------------------------------------
// Internes Simulationsmodell
// ---------------------------------------------------------------------------

interface EdgeMeta {
  origIdx: number;
  nx: number;
  ny: number;
  speed: number;
  type: EdgeType;
  pitch_deg: number;
  a: Point2;
  b: Point2;
}

interface ActiveVertex {
  x: number;
  y: number;
  vx: number;
  vy: number;
  birthZ: number;
  edgeBefore: number;
  edgeAfter: number;
  prev: ActiveVertex | null;
  next: ActiveVertex | null;
  alive: boolean;
}

function posAtZ(v: ActiveVertex, z: number): Point2 {
  const dz = z - v.birthZ;
  return { x: v.x + v.vx * dz, y: v.y + v.vy * dz };
}

function buildEdgeMeta(g: Grundriss): EdgeMeta[] {
  return g.edges.map((e, i) => {
    const a = g.vertices[e.from];
    const b = g.vertices[e.to];
    const n = inwardNormalCCW(a, b);
    const speed = e.type === "Giebel" ? 0 : 1 / Math.tan(deg2rad(e.pitch_deg));
    return {
      origIdx: i,
      nx: n.x,
      ny: n.y,
      speed,
      type: e.type,
      pitch_deg: e.pitch_deg,
      a,
      b,
    };
  });
}

function solveVelocity(
  e1: EdgeMeta,
  e2: EdgeMeta,
): { vx: number; vy: number } | null {
  const det = e1.nx * e2.ny - e1.ny * e2.nx;
  if (Math.abs(det) < 1e-9) return null;
  const vx = (e1.speed * e2.ny - e2.speed * e1.ny) / det;
  const vy = (e1.nx * e2.speed - e2.nx * e1.speed) / det;
  return { vx, vy };
}

function edgeCollapseTime(
  u: ActiveVertex,
  v: ActiveVertex,
  currentZ: number,
): number | null {
  const ux = u.x + u.vx * (currentZ - u.birthZ);
  const uy = u.y + u.vy * (currentZ - u.birthZ);
  const vxNow = v.x + v.vx * (currentZ - v.birthZ);
  const vyNow = v.y + v.vy * (currentZ - v.birthZ);
  const dvx = v.vx - u.vx;
  const dvy = v.vy - u.vy;
  const dx0 = vxNow - ux;
  const dy0 = vyNow - uy;

  const A = dvx * dvx + dvy * dvy;
  const B = 2 * (dx0 * dvx + dy0 * dvy);
  const C = dx0 * dx0 + dy0 * dy0;

  if (A < 1e-15) return null;
  const disc = B * B - 4 * A * C;
  if (disc < -1e-6) return null;
  const sqrtDisc = Math.sqrt(Math.max(0, disc));
  const t1 = (-B - sqrtDisc) / (2 * A);
  const t2 = (-B + sqrtDisc) / (2 * A);
  const candidates = [t1, t2].filter((t) => t > 1e-6).sort((a, b) => a - b);
  if (candidates.length === 0) return null;
  return currentZ + candidates[0];
}

// ---------------------------------------------------------------------------
// Hauptfunktion
// ---------------------------------------------------------------------------

export function dachausmittlung(input: Grundriss): DachausmittlungErgebnis {
  const issues = validateGrundriss(input);
  if (issues.length > 0) {
    throw new Error(`Ungueltiger Grundriss: ${issues.map((x) => x.message).join("; ")}`);
  }
  if (!istKonvex(input)) {
    throw new Error("Aktuelle Implementierung unterstuetzt nur konvexe Grundrisse.");
  }
  const g = ensureCCW(input);
  const n = g.vertices.length;

  const meta = buildEdgeMeta(g);

  const allVerts: ActiveVertex[] = g.vertices.map((p, i) => ({
    x: p.x,
    y: p.y,
    vx: 0,
    vy: 0,
    birthZ: 0,
    edgeBefore: (i - 1 + n) % n,
    edgeAfter: i,
    prev: null,
    next: null,
    alive: true,
  }));
  for (let i = 0; i < n; i++) {
    allVerts[i].prev = allVerts[(i - 1 + n) % n];
    allVerts[i].next = allVerts[(i + 1) % n];
  }
  for (const a of allVerts) {
    const vel = solveVelocity(meta[a.edgeBefore], meta[a.edgeAfter]);
    if (vel) {
      a.vx = vel.vx;
      a.vy = vel.vy;
    }
  }

  const skeleton: SkeletonLine[] = [];
  const activeList = (): ActiveVertex[] => allVerts.filter((v) => v.alive);

  let currentZ = 0;
  let iterations = 0;
  const MAX_ITER = 5 * n;
  let lastFirstZ = 0;

  while (iterations < MAX_ITER) {
    iterations++;
    const active = activeList();
    if (active.length <= 2) break;

    type Event = { z: number; u: ActiveVertex; v: ActiveVertex };
    const events: Event[] = [];
    const seen = new Set<ActiveVertex>();
    let cur: ActiveVertex | null = active[0];
    while (cur && !seen.has(cur)) {
      seen.add(cur);
      const nxt: ActiveVertex = cur.next!;
      const z = edgeCollapseTime(cur, nxt, currentZ);
      if (z !== null) events.push({ z, u: cur, v: nxt });
      cur = nxt === active[0] ? null : nxt;
    }

    if (events.length === 0) break;
    events.sort((a, b) => a.z - b.z);
    const eventZ = events[0].z;
    const SIM_EPS = 1e-4;
    const simultaneous = events.filter((e) => Math.abs(e.z - eventZ) < SIM_EPS);

    for (const ev of simultaneous) {
      if (!ev.u.alive || !ev.v.alive) continue;
      if (ev.u.next !== ev.v) continue;

      const mergeP = posAtZ(ev.u, eventZ);

      const uBeforeT = meta[ev.u.edgeBefore].type;
      const uAfterT = meta[ev.u.edgeAfter].type;
      const vBeforeT = meta[ev.v.edgeBefore].type;
      const vAfterT = meta[ev.v.edgeAfter].type;
      const kindU: SkeletonLine["kind"] =
        uBeforeT === "Giebel" || uAfterT === "Giebel" ? "Ortgang" : "Grat";
      const kindV: SkeletonLine["kind"] =
        vBeforeT === "Giebel" || vAfterT === "Giebel" ? "Ortgang" : "Grat";

      if (eventZ - ev.u.birthZ > SIM_EPS) {
        const fromP = { x: ev.u.x, y: ev.u.y, z: ev.u.birthZ };
        const toP = { x: mergeP.x, y: mergeP.y, z: eventZ };
        skeleton.push({
          from: fromP,
          to: toP,
          kind: kindU,
          laenge_mm: Math.hypot(toP.x - fromP.x, toP.y - fromP.y, toP.z - fromP.z),
        });
      }
      if (eventZ - ev.v.birthZ > SIM_EPS) {
        const fromP = { x: ev.v.x, y: ev.v.y, z: ev.v.birthZ };
        const toP = { x: mergeP.x, y: mergeP.y, z: eventZ };
        skeleton.push({
          from: fromP,
          to: toP,
          kind: kindV,
          laenge_mm: Math.hypot(toP.x - fromP.x, toP.y - fromP.y, toP.z - fromP.z),
        });
      }

      const merged: ActiveVertex = {
        x: mergeP.x,
        y: mergeP.y,
        vx: 0,
        vy: 0,
        birthZ: eventZ,
        edgeBefore: ev.u.edgeBefore,
        edgeAfter: ev.v.edgeAfter,
        prev: ev.u.prev,
        next: ev.v.next,
        alive: true,
      };
      ev.u.alive = false;
      ev.v.alive = false;
      if (merged.prev) merged.prev.next = merged;
      if (merged.next) merged.next.prev = merged;
      allVerts.push(merged);
      const vel = solveVelocity(meta[merged.edgeBefore], meta[merged.edgeAfter]);
      if (vel) {
        merged.vx = vel.vx;
        merged.vy = vel.vy;
      }
    }

    currentZ = eventZ;
    lastFirstZ = eventZ;
  }

  const remaining = activeList();
  if (remaining.length === 2) {
    const a = remaining[0];
    const b = remaining[1];
    const pa = posAtZ(a, currentZ);
    const pb = posAtZ(b, currentZ);
    const fromP = { x: pa.x, y: pa.y, z: currentZ };
    const toP = { x: pb.x, y: pb.y, z: currentZ };
    skeleton.push({
      from: fromP,
      to: toP,
      kind: "First",
      laenge_mm: Math.hypot(toP.x - fromP.x, toP.y - fromP.y),
    });
  }

  const firsthoehe = remaining.length > 0 ? lastFirstZ : 0;

  const sparren: SparrenInfo[] = [];
  for (let i = 0; i < n; i++) {
    const e = g.edges[i];
    if (e.type === "Giebel") continue;
    const a = g.vertices[e.from];
    const b = g.vertices[e.to];
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const m = meta[i];
    let walmtiefe = Infinity;
    const dirX = m.nx;
    const dirY = m.ny;
    for (const line of skeleton) {
      const lx = line.to.x - line.from.x;
      const ly = line.to.y - line.from.y;
      const det = dirX * (-ly) - dirY * (-lx);
      if (Math.abs(det) < 1e-9) continue;
      const dx = line.from.x - mid.x;
      const dy = line.from.y - mid.y;
      const t = (dx * -ly - dy * -lx) / det;
      const s = (dirX * dy - dirY * dx) / det;
      if (t > 0 && s >= -1e-3 && s <= 1 + 1e-3) {
        if (t < walmtiefe) walmtiefe = t;
      }
    }
    if (!isFinite(walmtiefe)) walmtiefe = 0;
    const sparrenlaenge = walmtiefe / Math.cos(deg2rad(e.pitch_deg));
    sparren.push({
      edgeIndex: i,
      edgeType: e.type,
      pitch_deg: e.pitch_deg,
      walmtiefe_mm: walmtiefe,
      sparrenlaenge_mm: sparrenlaenge,
    });
  }

  // Pragmatische Schaetzung der Dachflaeche ueber Grundflaeche / cos(avg pitch).
  // Phase 2: exakte Flaechenberechnung pro Dachflaeche.
  const pitches = g.edges
    .filter((e) => e.type !== "Giebel")
    .map((e) => e.pitch_deg);
  const avgPitch =
    pitches.length > 0
      ? pitches.reduce((a, b) => a + b, 0) / pitches.length
      : 0;
  const grundflaeche_qmm = Math.abs(signedArea(g.vertices));
  const flaeche_m2 =
    avgPitch > 0
      ? grundflaeche_qmm / Math.cos(deg2rad(avgPitch)) / 1_000_000
      : 0;

  return {
    firsthoehe_mm: firsthoehe,
    lines: skeleton,
    sparren,
    flaeche_m2,
    iterations,
  };
}

/** Erstes First-Segment (es kann nur eines geben bei konvexem Grundriss). */
export function findFirst(r: DachausmittlungErgebnis): SkeletonLine | null {
  return r.lines.find((l) => l.kind === "First") ?? null;
}

/** Alle Grate. */
export function findGrate(r: DachausmittlungErgebnis): SkeletonLine[] {
  return r.lines.filter((l) => l.kind === "Grat");
}

/** Gratneigung im Raum fuer eine Linie (Grad). */
export function neigungImRaum(line: SkeletonLine): number {
  const dx = line.to.x - line.from.x;
  const dy = line.to.y - line.from.y;
  const dz = line.to.z - line.from.z;
  const horiz = Math.hypot(dx, dy);
  if (horiz < 1e-6) return 90;
  return rad2deg(Math.atan(dz / horiz));
}
