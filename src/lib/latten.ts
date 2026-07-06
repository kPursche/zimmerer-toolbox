// ─── Dachlatten-Einteilung: Berechnungslogik ──────────────────────────────────
//
// Aus der UI-Komponente (components/tools/latteneinteilung.tsx) extrahiert,
// damit die Einteilung testbar ist. Verhalten unverändert übernommen.
//
// Alle Ein-/Ausgaben in mm, sofern nicht anders vermerkt; Positionen in den
// LattenAbstand-Objekten in cm (so erwartet es die Anzeige und die Sprach-KI).

export interface LattenAbstand {
  nr:       number;
  abstand:  number; // in cm
  position: number; // in cm
}

export interface BerechnungErgebnis {
  la: number;    // Decklänge in mm (= la_a + la_b bei Krone, = Lattenabstand bei Doppel)
  n: number;     // Anzahl Felder (Doppel) bzw. Zyklen (Krone)
  ok: boolean;
  la_a?: number; // kurze Teilung Kronendeckung (= HB, halbe Ziegelbreite)
  la_b?: number; // lange Teilung Kronendeckung (= la − HB)
}

// Teilt die Länge L so in n gleiche Felder, dass der Lattenabstand möglichst
// nah am Mittel von [la_min, la_max] liegt; ok = Abstand liegt im zulässigen Bereich.
export function berechneLattenmass(L: number, la_min: number, la_max: number): BerechnungErgebnis {
  const la_ziel = (la_min + la_max) / 2;
  let n = Math.max(1, Math.round(L / la_ziel));
  let la = L / n;
  while (la > la_max && n < 10000) { n++; la = L / n; }
  while (la < la_min && n > 1)    { n--; la = L / n; }
  return { la, n, ok: la >= la_min && la <= la_max };
}

// Doppeldeckung: n gleichmäßige Abstände
export function lattenPositionen(n: number, la: number): LattenAbstand[] {
  const laCm = la / 10;
  const result: LattenAbstand[] = [];
  for (let i = 1; i <= n; i++) {
    result.push({ nr: i, abstand: laCm, position: i * laCm });
  }
  return result;
}

// Kronendeckung: alternierend la_a (kurz) und la_b (lang), n Zyklen
export function kronenPositionen(n: number, la_a: number, la_b: number): LattenAbstand[] {
  const result: LattenAbstand[] = [];
  let pos = 0;
  let nr = 1;
  for (let i = 0; i < n; i++) {
    pos += la_a;
    result.push({ nr: nr++, abstand: la_a / 10, position: pos / 10 });
    pos += la_b;
    result.push({ nr: nr++, abstand: la_b / 10, position: pos / 10 });
  }
  return result;
}
