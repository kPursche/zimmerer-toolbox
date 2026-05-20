import { describe, it, expect } from "vitest";
import {
  dachausmittlung,
  findFirst,
  findGrate,
  neigungImRaum,
} from "../dachausmittlung";
import { rechteck } from "../model";

const TOL_MM = 0.5;
const TOL_DEG = 0.05;

describe("Walmdach 12 x 8 m, Hauptdach 45 Grad, Walm 55 Grad", () => {
  const g = rechteck({
    laenge_mm: 12000,
    breite_mm: 8000,
    edges: ["Traufe", "Walm", "Traufe", "Walm"],
    pitches: [45, 55, 45, 55],
    name: "Test-Walmdach",
  });
  const r = dachausmittlung(g);

  it("Firsthoehe = 4000 mm exakt", () => {
    expect(r.firsthoehe_mm).toBeCloseTo(4000, 3);
  });

  it("liefert genau einen First", () => {
    const firsts = r.lines.filter((l) => l.kind === "First");
    expect(firsts.length).toBe(1);
  });

  it("Firstlaenge ist 6398,3397 mm", () => {
    const f = findFirst(r);
    expect(f).not.toBeNull();
    expect(f!.laenge_mm).toBeCloseTo(6398.3397, 1);
  });

  it("liefert vier Grate", () => {
    const grate = findGrate(r);
    expect(grate.length).toBe(4);
  });

  it("Jeder Grat hat 3D-Laenge 6312,2618 mm", () => {
    const grate = findGrate(r);
    for (const g of grate) {
      expect(g.laenge_mm).toBeCloseTo(6312.2618, 1);
    }
  });

  it("Gratneigung im Raum ist ca. 39,32 Grad", () => {
    const grate = findGrate(r);
    expect(neigungImRaum(grate[0])).toBeCloseTo(39.3227, 2);
  });

  it("Walmtiefe der Walm-Kanten = 2800,8302 mm", () => {
    const walmSparren = r.sparren.filter((s) => s.edgeType === "Walm");
    expect(walmSparren.length).toBe(2);
    for (const s of walmSparren) {
      expect(s.walmtiefe_mm).toBeCloseTo(2800.8302, 1);
    }
  });

  it("Walm-Sparrenlaenge in der Dachebene = 4883,0985 mm", () => {
    const walmSparren = r.sparren.filter((s) => s.edgeType === "Walm");
    for (const s of walmSparren) {
      expect(s.sparrenlaenge_mm).toBeCloseTo(4883.0984, 1);
    }
  });

  it("Hauptdach-Sparrenlaenge (Trauf-Mitte zum First) = 5656,8542 mm", () => {
    const trSparren = r.sparren.filter((s) => s.edgeType === "Traufe");
    expect(trSparren.length).toBe(2);
    for (const s of trSparren) {
      expect(s.sparrenlaenge_mm).toBeCloseTo(5656.8542, 1);
    }
  });
});

describe("Satteldach 12 x 8 m, beide Seiten 45 Grad", () => {
  const g = rechteck({
    laenge_mm: 12000,
    breite_mm: 8000,
    edges: ["Traufe", "Giebel", "Traufe", "Giebel"],
    pitches: [45, 90, 45, 90],
  });
  const r = dachausmittlung(g);

  it("Firsthoehe = 4000 mm exakt", () => {
    expect(r.firsthoehe_mm).toBeCloseTo(4000, 3);
  });

  it("Firstlaenge = 12000 mm (laeuft komplett zwischen den Giebeln)", () => {
    const f = findFirst(r);
    expect(f).not.toBeNull();
    expect(f!.laenge_mm).toBeCloseTo(12000, 1);
  });

  it("keine Grate beim Satteldach", () => {
    const grate = findGrate(r);
    expect(grate.length).toBe(0);
  });
});

describe("Zeltdach 6 x 6 m, alle Seiten Walm 45 Grad", () => {
  const g = rechteck({
    laenge_mm: 6000,
    breite_mm: 6000,
    edges: ["Walm", "Walm", "Walm", "Walm"],
    pitches: [45, 45, 45, 45],
  });
  const r = dachausmittlung(g);

  it("Firsthoehe = 3000 mm (halbe Seitenlaenge bei 45 Grad)", () => {
    expect(r.firsthoehe_mm).toBeCloseTo(3000, 3);
  });

  it("First-Laenge ist 0 (Pyramide hat Spitze)", () => {
    const f = findFirst(r);
    if (f) {
      expect(f.laenge_mm).toBeLessThan(TOL_MM);
    }
  });

  it("vier Grate, alle gleich lang", () => {
    const grate = findGrate(r);
    expect(grate.length).toBe(4);
    const expected = Math.hypot(3000, 3000, 3000);
    for (const g of grate) {
      expect(g.laenge_mm).toBeCloseTo(expected, 1);
    }
  });
});

describe("Krueppelwalm-aehnlich: 12 x 8, Hauptdach 45, Walm steiler 60 Grad", () => {
  const g = rechteck({
    laenge_mm: 12000,
    breite_mm: 8000,
    edges: ["Traufe", "Walm", "Traufe", "Walm"],
    pitches: [45, 60, 45, 60],
  });
  const r = dachausmittlung(g);

  it("Firsthoehe weiterhin 4000 mm (vom Hauptdach bestimmt)", () => {
    expect(r.firsthoehe_mm).toBeCloseTo(4000, 3);
  });

  it("Walmtiefe d = 4000 / tan(60 Grad) ~ 2309,4 mm", () => {
    const walmSparren = r.sparren.filter((s) => s.edgeType === "Walm");
    const erwartet = 4000 / Math.tan((60 * Math.PI) / 180);
    for (const s of walmSparren) {
      expect(s.walmtiefe_mm).toBeCloseTo(erwartet, 1);
    }
  });

  it("Firstlaenge = 12000 - 2 * d", () => {
    const d = 4000 / Math.tan((60 * Math.PI) / 180);
    const erwartet = 12000 - 2 * d;
    const f = findFirst(r);
    expect(f!.laenge_mm).toBeCloseTo(erwartet, 1);
  });
});
