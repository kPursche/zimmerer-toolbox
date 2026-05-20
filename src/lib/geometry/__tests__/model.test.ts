import { describe, it, expect } from "vitest";
import {
  validateGrundriss,
  rechteck,
  istKonvex,
  flaecheM2,
  type Grundriss,
} from "../model";

describe("rechteck-Konstruktor", () => {
  it("erzeugt 4 Eckpunkte und 4 Kanten in CCW-Reihenfolge", () => {
    const g = rechteck({
      laenge_mm: 12000,
      breite_mm: 8000,
      edges: ["Traufe", "Walm", "Traufe", "Walm"],
      pitches: [45, 55, 45, 55],
    });
    expect(g.vertices).toEqual([
      { x: 0, y: 0 },
      { x: 12000, y: 0 },
      { x: 12000, y: 8000 },
      { x: 0, y: 8000 },
    ]);
    expect(g.edges).toHaveLength(4);
    expect(g.edges[0]).toMatchObject({ from: 0, to: 1, type: "Traufe", pitch_deg: 45 });
    expect(g.edges[1]).toMatchObject({ from: 1, to: 2, type: "Walm", pitch_deg: 55 });
  });
});

describe("validateGrundriss", () => {
  const walmdach = rechteck({
    laenge_mm: 12000,
    breite_mm: 8000,
    edges: ["Traufe", "Walm", "Traufe", "Walm"],
    pitches: [45, 55, 45, 55],
  });

  it("akzeptiert ein gueltiges Walmdach", () => {
    expect(validateGrundriss(walmdach)).toEqual([]);
  });

  it("lehnt Polygon mit weniger als 3 Punkten ab", () => {
    const g: Grundriss = { vertices: [{ x: 0, y: 0 }, { x: 1, y: 0 }], edges: [] };
    const issues = validateGrundriss(g);
    expect(issues.length).toBeGreaterThan(0);
  });

  it("lehnt Giebel mit anderem Neigungswinkel als 90 ab", () => {
    const bad: Grundriss = {
      ...walmdach,
      edges: walmdach.edges.map((e, i) => (i === 1 ? { ...e, type: "Giebel" as const, pitch_deg: 60 } : e)),
    };
    const issues = validateGrundriss(bad);
    expect(issues.some((x) => x.message.includes("Giebel"))).toBe(true);
  });

  it("lehnt Grundriss ohne jegliche Traufe oder Walm ab", () => {
    const allGiebel: Grundriss = {
      ...walmdach,
      edges: walmdach.edges.map((e) => ({ ...e, type: "Giebel" as const, pitch_deg: 90 })),
    };
    const issues = validateGrundriss(allGiebel);
    expect(issues.some((x) => x.message.includes("Traufe oder Walm"))).toBe(true);
  });

  it("lehnt Traufe mit 0 oder 90 Grad ab", () => {
    const bad: Grundriss = {
      ...walmdach,
      edges: walmdach.edges.map((e, i) => (i === 0 ? { ...e, pitch_deg: 0 } : e)),
    };
    expect(validateGrundriss(bad).length).toBeGreaterThan(0);
  });
});

describe("Hilfs-Eigenschaften", () => {
  it("Flaeche eines 12x8-Rechtecks ist 96 m^2", () => {
    const g = rechteck({
      laenge_mm: 12000, breite_mm: 8000,
      edges: ["Traufe", "Walm", "Traufe", "Walm"],
      pitches: [45, 55, 45, 55],
    });
    expect(flaecheM2(g)).toBe(96);
  });

  it("Rechteck ist konvex", () => {
    const g = rechteck({
      laenge_mm: 5000, breite_mm: 3000,
      edges: ["Traufe", "Walm", "Traufe", "Walm"],
      pitches: [45, 55, 45, 55],
    });
    expect(istKonvex(g)).toBe(true);
  });
});
