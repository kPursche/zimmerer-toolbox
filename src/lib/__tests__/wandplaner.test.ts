import { describe, it, expect } from "vitest";
import {
  pfostenPositionen,
  wandhoeheAnPosition,
  pfostenLaenge,
  pfostenOberkanteMax,
  raehmWinkelGrad,
  raehmLaengeUeberAlles,
  verstichmass,
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

describe("pfostenOberkanteMax", () => {
  it("waagerechtes Rähm: Ständerbreite spielt keine Rolle", () => {
    expect(pfostenOberkanteMax(2000, 4000, 2500, 2500, 80)).toBe(2500);
  });

  it("geneigtes Rähm: nimmt die höhere der beiden Pfostenkanten, nicht die Mittelachse", () => {
    // Wand 4000mm, links 3000mm, rechts 2500mm → Gefälle 0.125mm Höhe je mm Breite.
    // Pfosten an x=2000 mit Ständerbreite=200: Kanten bei x=1900 und x=2100.
    const hMittelachse = wandhoeheAnPosition(2000, 4000, 3000, 2500);
    const hLinkeKante = wandhoeheAnPosition(1900, 4000, 3000, 2500);
    const hRechteKante = wandhoeheAnPosition(2100, 4000, 3000, 2500);
    const max = pfostenOberkanteMax(2000, 4000, 3000, 2500, 200);
    expect(max).toBe(hLinkeKante);
    expect(max).toBeGreaterThan(hMittelachse);
    expect(max).toBeGreaterThan(hRechteKante);
  });
});

describe("pfostenLaenge mit Ständerbreite", () => {
  it("ohne Ständerbreite (Default 0) unverändert wie bisher (Mittelachse)", () => {
    const l = pfostenLaenge(2000, 4000, 3000, 2500, 100, 120);
    expect(l).toBe(wandhoeheAnPosition(2000, 4000, 3000, 2500) - 100 - 120);
  });

  it("mit Ständerbreite: Zuschnittlänge = längste Kante, nicht Mittelachse", () => {
    const lMitBreite = pfostenLaenge(2000, 4000, 3000, 2500, 100, 120, 200);
    const lMittelachse = pfostenLaenge(2000, 4000, 3000, 2500, 100, 120);
    expect(lMitBreite).toBeGreaterThan(lMittelachse);
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

describe("raehmLaengeUeberAlles", () => {
  it("waagerechtes Rähm → Länge über Alles = Wandbreite", () => {
    expect(raehmLaengeUeberAlles(4000, 2500, 2500)).toBe(4000);
  });

  it("geneigtes Rähm → Länge über Alles = Hypotenuse (Pythagoras)", () => {
    // 3-4-5-Dreieck: Breite 4000, Höhendifferenz 3000 → Länge 5000
    expect(raehmLaengeUeberAlles(4000, 5500, 2500)).toBe(5000);
  });
});

describe("verstichmass", () => {
  it("waagerechtes Rähm → 0 Verstich", () => {
    expect(verstichmass(4000, 2500, 2500)).toBe(0);
  });

  it("bekannte Steigung: 1000mm Höhendifferenz auf 1000mm Breite → auf 100 Referenz 100 Verstich (45°)", () => {
    expect(verstichmass(1000, 3500, 2500, 100)).toBeCloseTo(100, 6);
  });

  it("negativ, wenn rechts höher ist als links", () => {
    expect(verstichmass(1000, 2500, 3500, 100)).toBeCloseTo(-100, 6);
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

  it("Ständerbreite: Randpfosten rücken so ein, dass Außenkante bündig mit Schwelle/Rähm ist", () => {
    const erg = berechneWand({
      breite: 2500,
      schwellenhoehe: 100,
      raehmhoehe: 120,
      wandhoeheLinks: 2500,
      wandhoeheRechts: 2500,
      pfostenabstandSoll: 625,
      staenderbreite: 60,
    });
    expect(erg.positionen[0]).toBe(30);
    expect(erg.positionen[erg.positionen.length - 1]).toBe(2500 - 30);
    // innere Pfosten bleiben auf dem Raster
    expect(erg.positionen.slice(1, -1)).toEqual([625, 1250, 1875]);
  });

  it("ohne Ständerbreite (Default 0) bleiben Randpfosten wie bisher auf 0 / Breite", () => {
    const erg = berechneWand({
      breite: 2500,
      schwellenhoehe: 100,
      raehmhoehe: 120,
      wandhoeheLinks: 2500,
      wandhoeheRechts: 2500,
      pfostenabstandSoll: 625,
    });
    expect(erg.positionen[0]).toBe(0);
    expect(erg.positionen[erg.positionen.length - 1]).toBe(2500);
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
