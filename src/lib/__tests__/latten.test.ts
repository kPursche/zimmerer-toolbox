import { describe, it, expect } from "vitest";
import { berechneLattenmass, kronenPositionen, lattenPositionen } from "../latten";

describe("berechneLattenmass", () => {
  it("teilt 6000 mm bei Bereich 300-345 in gleichmäßige Felder im Bereich", () => {
    const r = berechneLattenmass(6000, 300, 345);
    expect(r.ok).toBe(true);
    expect(r.la).toBeGreaterThanOrEqual(300);
    expect(r.la).toBeLessThanOrEqual(345);
    expect(r.n * r.la).toBeCloseTo(6000, 6); // Felder decken die Länge exakt
  });

  it("exakte Teilung: 6450 / (300..345) → 20 Felder à 322,5 mm", () => {
    const r = berechneLattenmass(6450, 300, 345);
    expect(r.n).toBe(20);
    expect(r.la).toBeCloseTo(322.5, 6);
    expect(r.ok).toBe(true);
  });

  it("Länge kleiner als la_min → 1 Feld, ok = false", () => {
    const r = berechneLattenmass(200, 300, 345);
    expect(r.n).toBe(1);
    expect(r.la).toBe(200);
    expect(r.ok).toBe(false);
  });

  it("nicht teilbare Länge über la_max → ok = false, aber kein Endlos-Lauf", () => {
    // 700 mm mit Bereich 300-345: 2 Felder à 350 (> max), 3 Felder à 233 (< min)
    const r = berechneLattenmass(700, 300, 345);
    expect(r.ok).toBe(false);
    expect(Number.isFinite(r.la)).toBe(true);
  });

  it("terminiert auch bei extremen Längen mit endlichem, exaktem Ergebnis", () => {
    // Hinweis: die 10000er-Grenze deckelt nur die Korrektur-Schleife,
    // nicht das initiale n — bei 10 km sind >30000 Felder korrekt.
    const r = berechneLattenmass(10_000_000, 300, 345);
    expect(Number.isFinite(r.la)).toBe(true);
    expect(r.n * r.la).toBeCloseTo(10_000_000, 3);
    expect(r.ok).toBe(true);
  });
});

describe("lattenPositionen (Doppeldeckung)", () => {
  it("liefert n Latten mit kumulierten Positionen in cm", () => {
    const pos = lattenPositionen(3, 325); // 325 mm = 32,5 cm
    expect(pos.length).toBe(3);
    expect(pos[0]).toEqual({ nr: 1, abstand: 32.5, position: 32.5 });
    expect(pos[2].position).toBeCloseTo(97.5, 6);
  });
});

describe("kronenPositionen (Kronendeckung)", () => {
  it("alterniert kurze und lange Teilung, 2 Latten pro Zyklus", () => {
    // la = 330, HB = 120 → la_a = 120, la_b = 210
    const pos = kronenPositionen(2, 120, 210);
    expect(pos.length).toBe(4);
    expect(pos[0]).toEqual({ nr: 1, abstand: 12, position: 12 });
    expect(pos[1]).toEqual({ nr: 2, abstand: 21, position: 33 });
    expect(pos[2]).toEqual({ nr: 3, abstand: 12, position: 45 });
    expect(pos[3]).toEqual({ nr: 4, abstand: 21, position: 66 });
  });

  it("Endposition = n · (la_a + la_b) in cm", () => {
    const pos = kronenPositionen(5, 120, 210);
    expect(pos[pos.length - 1].position).toBeCloseTo((5 * 330) / 10, 6);
  });
});
