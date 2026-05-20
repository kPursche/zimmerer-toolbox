import { describe, it, expect } from "vitest";
import {
  rdp,
  snapToGrid,
  removeConsecutiveDuplicates,
  closeIfNear,
  glaetteFreihand,
} from "../smoothing";
import { v } from "../primitives";

describe("rdp", () => {
  it("behaelt eine gerade Linie auf 2 Punkte", () => {
    const pts = Array.from({ length: 11 }, (_, i) => v(i * 1000, 0));
    expect(rdp(pts, 1).length).toBe(2);
  });

  it("erkennt einen klaren Knick", () => {
    const pts = [v(0, 0), v(500, 10), v(1000, 0), v(1000, 1000), v(1000, 2000)];
    const out = rdp(pts, 50);
    expect(out.length).toBe(3);
    expect(out[0]).toEqual(v(0, 0));
    expect(out[2]).toEqual(v(1000, 2000));
  });

  it("eine Rechteck-Stroke wird auf 4-5 Punkte reduziert", () => {
    const rect: { x: number; y: number }[] = [];
    for (let i = 0; i <= 10; i++) rect.push(v(i * 1200, 0));
    for (let i = 1; i <= 10; i++) rect.push(v(12000, i * 800));
    for (let i = 1; i <= 10; i++) rect.push(v(12000 - i * 1200, 8000));
    for (let i = 1; i <= 10; i++) rect.push(v(0, 8000 - i * 800));
    const out = rdp(rect, 100);
    expect(out.length).toBeGreaterThanOrEqual(4);
    expect(out.length).toBeLessThanOrEqual(6);
  });
});

describe("snapToGrid", () => {
  it("rundet auf gridSize", () => {
    expect(snapToGrid([v(123, 456)], 100)).toEqual([v(100, 500)]);
    expect(snapToGrid([v(2750, 4250)], 500)).toEqual([v(3000, 4500)]);
  });
});

describe("removeConsecutiveDuplicates", () => {
  it("entfernt doppelte Punkte direkt hintereinander", () => {
    const pts = [v(0, 0), v(0, 0), v(100, 0), v(100, 0), v(100, 0)];
    expect(removeConsecutiveDuplicates(pts)).toEqual([v(0, 0), v(100, 0)]);
  });
});

describe("closeIfNear", () => {
  it("entfernt letzten Punkt wenn er nahe am ersten liegt", () => {
    const pts = [v(0, 0), v(1000, 0), v(1000, 1000), v(0, 1000), v(50, 50)];
    expect(closeIfNear(pts, 500)).toHaveLength(4);
  });

  it("laesst das Polygon unveraendert, wenn der letzte Punkt fern ist", () => {
    const pts = [v(0, 0), v(1000, 0), v(1000, 1000), v(0, 1000), v(5000, 5000)];
    expect(closeIfNear(pts, 500)).toHaveLength(5);
  });
});

describe("glaetteFreihand: zittriges Rechteck", () => {
  // Deterministische Pseudo-Noise statt Math.random fuer reproduzierbare Tests
  let seed = 42;
  const noise = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return (seed / 0x7fffffff - 0.5) * 60; // +- 30 mm
  };
  const noisy: { x: number; y: number }[] = [];
  const addJitter = (x: number, y: number) => noisy.push(v(x + noise(), y + noise()));
  for (let i = 0; i <= 60; i++) addJitter((i / 60) * 12000, 0);
  for (let i = 1; i <= 40; i++) addJitter(12000, (i / 40) * 8000);
  for (let i = 1; i <= 60; i++) addJitter(12000 - (i / 60) * 12000, 8000);
  for (let i = 1; i <= 40; i++) addJitter(0, 8000 - (i / 40) * 8000);

  it("reduziert ein verrauschtes Rechteck auf 4-6 Eckpunkte", () => {
    const out = glaetteFreihand(noisy, { rdpEpsilon: 300, gridSize: 100, closeThreshold: 500 });
    expect(out.length).toBeGreaterThanOrEqual(4);
    expect(out.length).toBeLessThanOrEqual(6);
  });

  it("alle 4 Soll-Ecken werden in der Naehe getroffen (Toleranz 250 mm)", () => {
    const out = glaetteFreihand(noisy, { rdpEpsilon: 300, gridSize: 100, closeThreshold: 500 });
    const expected = [v(0, 0), v(12000, 0), v(12000, 8000), v(0, 8000)];
    for (const exp of expected) {
      const ok = out.some(
        (p) => Math.hypot(p.x - exp.x, p.y - exp.y) < 250,
      );
      expect(ok).toBe(true);
    }
  });
});
