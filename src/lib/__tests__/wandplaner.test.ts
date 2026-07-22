import { describe, it, expect } from "vitest";
import {
  pfostenPositionen,
  wandhoeheAnPosition,
  pfostenLaenge,
  raehmWinkelGrad,
  berechneWand,
} from "../wandplaner";

describe("pfostenPositionen", () => {
  it("exakte Teilung: 2500mm / 625mm → glatt 4 Felder, kein Restfeld", () => {
    const p = pfostenPositionen(2500, 625);
    expect(p).toEqual([0, 625, 1250, 1875, 2500]);
  });

  it("mit Restfeld: 2000mm / 625mm → letztes Feld kürzer", () => {
    const p = pfostenPositionen(2000, 625);
    expect(p).toEqual([0, 625, 1250, 1875, 2000]);
  });

  it("Breite kleiner als Abstand → nur die beiden Randpfosten", () => {
    const p = pfostenPositionen(400, 625);
    expect(p).toEqual([0, 400]);
  });
});

describe("wandhoeheAnPosition", () => {
  it("gleiche Kantenhöhen → konstante Höhe über die gesamte Breite", () => {
    expect(wandhoeheAnPosition(0, 4000, 2500, 2500)).toBe(2500);
    expect(wandhoeheAnPosition(2000, 4000, 2500, 2500)).toBe(2500);
    expect(wandhoeheAnPosition(4000, 4000, 2500, 2500)).toBe(2500);
  });

  it("unterschiedliche Kantenhöhen → lineare Interpolation", () => {
    expect(wandhoeheAnPosition(0, 4000, 2500, 3000)).toBe(2500);
    expect(wandhoeheAnPosition(4000, 4000, 2500, 3000)).toBe(3000);
    expect(wandhoeheAnPosition(2000, 4000, 2500, 3000)).toBe(2750);
  });
});

describe("pfostenLaenge", () => {
  it("zieht Schwellen- und Rähmstärke von der Wandhöhe ab", () => {
    const l = pfostenLaenge(0, 4000, 2500, 2500, 100, 120);
    expect(l).toBe(2500 - 100 - 120);
  });
});

describe("raehmWinkelGrad", () => {
  it("gleiche Höhen → 0 Grad", () => {
    expect(raehmWinkelGrad(4000, 2500, 2500)).toBe(0);
  });

  it("bekannte Steigung: 1000mm Höhendifferenz auf 1000mm Breite → 45 Grad", () => {
    expect(raehmWinkelGrad(1000, 3500, 2500)).toBeCloseTo(45, 6);
  });

  it("negativ, wenn rechts höher ist als links", () => {
    expect(raehmWinkelGrad(1000, 2500, 3500)).toBeCloseTo(-45, 6);
  });
});

describe("berechneWand", () => {
  it("waagerechte Wand: alle Pfosten gleich lang, Winkel 0, ok = true", () => {
    const erg = berechneWand({
      breite: 2500,
      schwellenhoehe: 100,
      raehmhoehe: 120,
      wandhoeheLinks: 2500,
      wandhoeheRechts: 2500,
      pfostenabstandSoll: 625,
    });
    expect(erg.ok).toBe(true);
    expect(erg.winkel).toBe(0);
    expect(erg.stueckliste).toHaveLength(5);
    for (const p of erg.stueckliste) {
      expect(p.laenge).toBe(2500 - 100 - 120);
    }
  });

  it("geneigte Wand: Pfostenlänge nimmt zur niedrigeren Seite hin ab", () => {
    const erg = berechneWand({
      breite: 4000,
      schwellenhoehe: 100,
      raehmhoehe: 120,
      wandhoeheLinks: 3000,
      wandhoeheRechts: 2500,
      pfostenabstandSoll: 625,
    });
    expect(erg.ok).toBe(true);
    const laengen = erg.stueckliste.map((p) => p.laenge);
    for (let i = 1; i < laengen.length; i++) {
      expect(laengen[i]).toBeLessThanOrEqual(laengen[i - 1]);
    }
    expect(erg.winkel).toBeGreaterThan(0);
  });

  it("manuelle Positions-Überschreibung verschiebt genau diesen Pfosten", () => {
    const erg = berechneWand({
      breite: 2500,
      schwellenhoehe: 100,
      raehmhoehe: 120,
      wandhoeheLinks: 2500,
      wandhoeheRechts: 2500,
      pfostenabstandSoll: 625,
      positionsUeberschreibungen: { 2: 1000 },
    });
    expect(erg.positionen).toEqual([0, 625, 1000, 1875, 2500]);
  });

  it("zu geringe Wandhöhe → ok = false (negative Pfostenlänge)", () => {
    const erg = berechneWand({
      breite: 2500,
      schwellenhoehe: 100,
      raehmhoehe: 120,
      wandhoeheLinks: 150,
      wandhoeheRechts: 150,
      pfostenabstandSoll: 625,
    });
    expect(erg.ok).toBe(false);
  });
});
