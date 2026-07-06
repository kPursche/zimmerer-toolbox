import { describe, it, expect } from "vitest";
import {
  applyMindestversatz,
  berechneGauenwangen,
  berechnePlattenSchraeg,
  berechnePlattenWaagerecht,
} from "../gauenwangen";

// Golden-Master-Werte: beim Extrahieren der Logik aus gauenwangen.tsx
// (Commit-Stand 2026-07-06) aus dem unveränderten Code aufgezeichnet.
// Sie frieren das damalige Verhalten ein — bei bewussten Formel-Änderungen
// müssen sie nachgezogen werden.

describe("berechneGauenwangen — Standardwerte der UI (180/45°/23°/6/8/70)", () => {
  const erg = berechneGauenwangen(180, 45, 23, 6, 8, 70);

  it("Wangentiefe T", () => {
    expect(erg.T).toBeCloseTo(290.1334, 3);
  });

  it("Firsthöhe yFirst", () => {
    expect(erg.yFirst).toBeCloseTo(295.7903, 3);
  });

  it("Eckständer = Innenmass vorne", () => {
    expect(erg.L_eckstaender).toBeCloseTo(166.9791, 3);
  });

  it("Längen der Dachkanthölzer", () => {
    expect(erg.L_hauptdach).toBeCloseTo(401.8254, 3);
    expect(erg.L_gaubendach).toBeCloseTo(321.7076, 3);
  });

  it("Schnittwinkel", () => {
    expect(erg.schnittVorneGaube).toBe(67);   // 90 − γ
    expect(erg.schnittFirst).toBe(22);        // α − γ
  });

  it("vier Lothölzer im Achsabstand 70, Höhen fallen Richtung First", () => {
    expect(erg.lothölzer.map((l) => l.abstand)).toEqual([70, 140, 210, 280]);
    expect(erg.lothölzer[0].hoehe).toBeCloseTo(126.6923, 3);
    expect(erg.lothölzer[3].hoehe).toBeCloseTo(5.8321, 3);
    // streng monoton fallend
    for (let i = 1; i < erg.lothölzer.length; i++) {
      expect(erg.lothölzer[i].hoehe).toBeLessThan(erg.lothölzer[i - 1].hoehe);
    }
  });

  it("Konsistenz: Lotholz-Höhe folgt der Ständerformel innerVorne − x·(tanα − tanγ)", () => {
    const tanA = Math.tan((45 * Math.PI) / 180);
    const tanG = Math.tan((23 * Math.PI) / 180);
    for (const l of erg.lothölzer) {
      expect(l.hoehe).toBeCloseTo(erg.L_eckstaender - l.abstand * (tanA - tanG), 6);
    }
  });
});

describe("berechneGauenwangen — Randfälle", () => {
  it("Holz-Tiefe frisst Eckhöhe auf → T wird negativ (UI zeigt dann geoFehler)", () => {
    const erg = berechneGauenwangen(10, 45, 23, 6, 8, 70);
    expect(erg.L_eckstaender).toBeLessThan(0);
    expect(erg.T).toBeLessThan(0);
    expect(erg.lothölzer).toEqual([]); // Schleife läuft bei T < 0 nicht
  });
});

describe("applyMindestversatz", () => {
  const pb = 250;

  it("mv = 0 ändert nichts", () => {
    expect(applyMindestversatz(72.58, 52.69, pb, 0)).toBeCloseTo(72.58, 10);
  });

  it("Fuge weit genug entfernt bleibt unverändert", () => {
    expect(applyMindestversatz(125, 0, pb, 30)).toBe(125);
  });

  it("Fuge zu nah rechts der Vorreihen-Fuge wird nach links geschoben", () => {
    // d = 10 < mv = 30 → la − d − mv = 100 − 10 − 30 = 60
    expect(applyMindestversatz(100, 90, pb, 30)).toBe(60);
  });

  it("Ergebnis hält den Mindestversatz in beide Richtungen ein", () => {
    for (const [la, prev] of [[100, 90], [72.58, 52.69], [240, 10], [20, 15]] as const) {
      const adj = applyMindestversatz(la, prev, pb, 30);
      const d = (((adj - prev) % pb) + pb) % pb;
      expect(d).toBeGreaterThanOrEqual(30);
      expect(pb - d).toBeGreaterThanOrEqual(30);
    }
  });
});

describe("Plattenschnitt — Golden Master (Standardwerte)", () => {
  const params = {
    hvorne: 180, alphaDeg: 45, gammaDeg: 23,
    plattenBreite: 250, ersteReiheHoehe: 62.5, plattenHoehe: 62.5,
    ueberstand: 0, mindestversatz: 0,
  };

  it("schräg: 3 Reihen mit erwarteten Längen/Abschnitten", () => {
    const rows = berechnePlattenSchraeg(params);
    expect(rows.length).toBe(3);
    expect(rows[0].la).toBe(250);
    expect(rows[0].abschnitt).toBeCloseTo(57.6937, 3);
    expect(rows[1].la).toBeCloseTo(52.6937, 3);
    expect(rows[2].la).toBeCloseTo(72.5802, 3);
    expect(rows[2].abschnitt).toBeCloseTo(64.6597, 3);
  });

  it("waagerecht: 6 Reihen, erste Reihe volle Platte", () => {
    const rows = berechnePlattenWaagerecht(params);
    expect(rows.length).toBe(6);
    expect(rows[0].la).toBe(250);
    expect(rows[0].abschnitt).toBeCloseTo(187.5, 3);
    expect(rows[5].la).toBeCloseTo(220.0786, 3);
    expect(rows[5].abschnitt).toBeCloseTo(219.4712, 3);
  });

  it("schräg mit Mindestversatz 30: Reihe 2 wird verschoben (72,58 → 22,69)", () => {
    const rows = berechnePlattenSchraeg({ ...params, mindestversatz: 30 });
    expect(rows[2].laRaw).toBeCloseTo(72.5802, 3);
    expect(rows[2].la).toBeCloseTo(22.6937, 3);
  });

  it("Plattenschnitt terminiert auch bei sehr kleiner Plattenhöhe (kein Endlos-Lauf)", () => {
    const rows = berechnePlattenSchraeg({ ...params, plattenHoehe: 1, ersteReiheHoehe: 1 });
    expect(rows.length).toBeLessThanOrEqual(60); // harte Schleifengrenze
  });
});
