/**
 * Glaettung von Freihand-Eingaben zu sauberen Polygon-Eckpunkten.
 *
 * Pipeline:
 *   1. Ramer-Douglas-Peucker reduziert die rohe Stroke auf wesentliche Knicke.
 *   2. Optionaler Grid-Snap richtet die Punkte am Raster aus.
 *   3. Konsekutive Duplikate werden entfernt.
 *   4. Polygon wird geschlossen, wenn End- und Anfangspunkt nahe beieinander liegen.
 *
 * Alle Koordinaten in mm.
 */

import type { Point2 } from "./primitives";

/**
 * Senkrechter Abstand von Punkt p zur Geraden durch a und b.
 */
function perpDistance(p: Point2, a: Point2, b: Point2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  return Math.abs((p.x - a.x) * dy - (p.y - a.y) * dx) / len;
}

/**
 * Ramer-Douglas-Peucker: reduziert eine Punktfolge auf die wesentlichen Knicke.
 * epsilon in mm (selbe Einheit wie die Punkte).
 */
export function rdp(points: readonly Point2[], epsilon: number): Point2[] {
  if (points.length < 3) return points.slice();
  let maxDist = 0;
  let maxIdx = 0;
  const first = points[0];
  const last = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpDistance(points[i], first, last);
    if (d > maxDist) {
      maxDist = d;
      maxIdx = i;
    }
  }
  if (maxDist < epsilon) return [first, last];
  const left = rdp(points.slice(0, maxIdx + 1), epsilon);
  const right = rdp(points.slice(maxIdx), epsilon);
  return [...left.slice(0, -1), ...right];
}

/** Jeder Punkt aufs naechstgelegene Vielfache von gridSize. */
export function snapToGrid(points: readonly Point2[], gridSize: number): Point2[] {
  return points.map((p) => ({
    x: Math.round(p.x / gridSize) * gridSize,
    y: Math.round(p.y / gridSize) * gridSize,
  }));
}

/** Entfernt aufeinanderfolgende identische Punkte. */
export function removeConsecutiveDuplicates(points: readonly Point2[]): Point2[] {
  if (points.length < 2) return points.slice();
  const result: Point2[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const last = result[result.length - 1];
    if (last.x !== points[i].x || last.y !== points[i].y) {
      result.push(points[i]);
    }
  }
  return result;
}

/**
 * Wenn der letzte Punkt nahe am ersten liegt, wird er entfernt:
 * Das Polygon wird damit "geschlossen" (kein doppelter Knoten).
 */
export function closeIfNear(points: readonly Point2[], threshold: number): Point2[] {
  if (points.length < 3) return points.slice();
  const first = points[0];
  const last = points[points.length - 1];
  if (Math.hypot(last.x - first.x, last.y - first.y) < threshold) {
    return points.slice(0, -1);
  }
  return points.slice();
}

/**
 * Komplette Glaettungspipeline fuer Freihand-Polygone.
 *
 * @param points         Rohe Punktfolge (Stroke), Koordinaten in mm.
 * @param rdpEpsilon     RDP-Toleranz in mm (Default 200 mm).
 * @param gridSize       Raster fuer Snap in mm (Default 100 mm).
 * @param closeThreshold Abstand letzter zu erster Punkt zum Schliessen (Default 500 mm).
 */
export function glaetteFreihand(
  points: readonly Point2[],
  opts: { rdpEpsilon?: number; gridSize?: number; closeThreshold?: number } = {},
): Point2[] {
  const { rdpEpsilon = 200, gridSize = 100, closeThreshold = 500 } = opts;
  let pts: Point2[] = rdp(points, rdpEpsilon);
  pts = snapToGrid(pts, gridSize);
  pts = removeConsecutiveDuplicates(pts);
  pts = closeIfNear(pts, closeThreshold);
  return pts;
}
