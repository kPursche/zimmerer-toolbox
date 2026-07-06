// ─── Gauenwangen: Berechnungslogik ────────────────────────────────────────────
//
// Aus der UI-Komponente (components/tools/gauenwangen.tsx) extrahiert,
// damit die Geometrie testbar ist. Verhalten unverändert übernommen.
//
// Koordinatensystem:  x = horizontal (Vorderkante → First), y = lotrecht (↑)
// hvorne = Gesamthöhe der Ecke (Außenmaß: Unterkante Hauptdachholz → Oberkante Gaubenholz)
//
// Lotschmiegen (lotrechte Holzdicken-Projektionen):
//   lotA = t · cos α   (Hauptdachholz)
//   lotG = t · cos γ   (Gaubenholz)
//
// Ständer-Innenmass an der Vorderkante (x = 0):
//   innerVorne = hvorne − lotA − lotG
//
// Referenzlinien (= Innenflächen der Hölzer zum Ständerraum):
//   Hauptdach-Innenfläche:   y_H(x) = lotA + x · tan α
//   Gaubendach-Innenfläche:  y_G(x) = (hvorne − lotG) + x · tan γ
//
// Ständerhöhe bei x:  h(x) = y_G(x) − y_H(x) = innerVorne − x·(tanα − tanγ)
// First bei h(T) = 0: T = innerVorne / (tanα − tanγ)

export const toRad = (deg: number) => (deg * Math.PI) / 180;

export interface Lotholz {
  nr:      number;
  abstand: number;
  hoehe:   number; // lotrechte Länge (= Innenmass zwischen den Hölzern)
}

export interface Ergebnis {
  T:                 number; // horizontale Tiefe
  yFirst:            number; // Höhe des First-Punkts (Referenzlinie)
  L_eckstaender:     number; // = hvorne (lotrecht)
  L_gaubendach:      number;
  L_hauptdach:       number;
  schnittVorneGaube: number; // Schnitt Gaubenholz an Vorderkante
  schnittFirst:      number; // Schnitt am First (beide Hölzer)
  lothölzer:         Lotholz[];
}

export function berechneGauenwangen(
  hvorne:      number,
  alphaDeg:    number,
  gammaDeg:    number,
  b:           number,
  t:           number,
  achsabstand: number,
): Ergebnis {
  const alpha = toRad(alphaDeg);
  const gamma = toRad(gammaDeg);
  const tanA  = Math.tan(alpha);
  const tanG  = Math.tan(gamma);
  const cosA  = Math.cos(alpha);
  const cosG  = Math.cos(gamma);

  // Lotschmiegen = lotrechte Projektion der Holztiefe t
  const lotA = t * cosA;
  const lotG = t * cosG;

  // Innenmass an der Vorderkante = tatsächliche Eckständer-Länge
  const innerVorne = hvorne - lotA - lotG;

  const T      = innerVorne / (tanA - tanG);
  const yFirst = lotA + T * tanA; // Schnittpunkt der Referenzlinien

  // Eckständer = Innenmass an x=0 (zwischen den Innenflächen der Hölzer)
  const L_eckstaender = innerVorne;

  // Längen der Dachkanthölzer
  const L_hauptdach  = (T - b) / cosA;
  const L_gaubendach = (T + b) / cosG;

  // Schnittwinkel
  const schnittVorneGaube = 90 - gammaDeg;
  const schnittFirst      = alphaDeg - gammaDeg;

  // Lothölzer: Innenmass zwischen y_H(x) und y_G(x)
  const lothölzer: Lotholz[] = [];
  for (let x = achsabstand; x < T - b / 2; x += achsabstand) {
    const hoehe = innerVorne - x * (tanA - tanG);
    if (hoehe > 1) {
      lothölzer.push({ nr: lothölzer.length + 1, abstand: x, hoehe });
    }
  }

  return { T, yFirst, L_eckstaender, L_gaubendach, L_hauptdach, schnittVorneGaube, schnittFirst, lothölzer };
}

// ─── Plattenschnitt (Wangen-Beplankung) ───────────────────────────────────────

// Verschiebt den ersten Plattenstoss einer Reihe, damit der Mindestversatz
// zur Fugenreihe darunter eingehalten wird.
// prevOffset = Position des ersten Stosses der Vorreihe.
// Nach jeder Verschiebung wird erneut geprüft (max. 3 Durchläufe), weil eine
// Verschiebung die Fuge zu nah an eine andere Vorreihen-Fuge bringen kann.
export function applyMindestversatz(la: number, prevOffset: number, pb: number, mv: number): number {
  if (mv <= 0 || la <= 0) return la;

  for (let i = 0; i < 3; i++) {
    const d = ((la - prevOffset) % pb + pb) % pb; // Abstand zur nächstliegenden Vorreihen-Fuge
    if (d >= mv && pb - d >= mv) return la;        // gültiger Bereich erreicht

    if (d < mv) {
      // Fuge liegt d cm rechts einer Vorreihen-Fuge — zu nah.
      // Stoss um (d + mv) nach links verschieben; wenn das negativ wäre, pb addieren (Wrap).
      const adjBack = la - d - mv;
      la = adjBack > 0 ? adjBack : adjBack + pb;
    } else {
      // pb - d < mv: Fuge liegt (pb-d) cm vor der nächsten Vorreihen-Fuge — zu nah
      const adjFwd = la + (pb - d) - mv;             // links: mv cm vor die nächste Vorreihen-Fuge
      la = adjFwd > 0 ? adjFwd : la + (pb - d) + mv; // rechts: mv cm nach der nächsten Vorreihen-Fuge
    }
  }
  return la;
}

export interface PlattenParams {
  hvorne:          number; // Eckhöhe vorne
  alphaDeg:        number; // Hauptdach-Neigung
  gammaDeg:        number; // Gaubendach-Neigung
  plattenBreite:   number; // pb
  ersteReiheHoehe: number; // ph0 (Höhe der untersten Reihe)
  plattenHoehe:    number; // phN (alle weiteren Reihen)
  ueberstand:      number; // horizontal, in cm
  mindestversatz:  number; // mv
}

export interface PlattenReihe {
  r:         number;
  la:        number;
  laRaw:     number;
  abschnitt: number;
}

// Waagerechte Verlegung: Reihen parallel zur Traufe
export function berechnePlattenWaagerecht(q: PlattenParams): PlattenReihe[] {
  const tanA = Math.tan(toRad(q.alphaDeg));
  const tanG = Math.tan(toRad(q.gammaDeg));
  const yF   = (q.hvorne / (tanA - tanG)) * tanA; // Firsthöhe (Ecke B)
  const pb   = q.plattenBreite;
  const ph0  = q.ersteReiheHoehe;
  const phN  = q.plattenHoehe;
  const uH   = q.ueberstand;
  const mv   = q.mindestversatz;

  const rowsW: PlattenReihe[] = [];
  let coY = 0;
  let firstLen: number | null = null;
  let prevJointOffset = 0;

  for (let r = 0; r < 60; r++) {
    const ph = r === 0 ? ph0 : phN;
    if (coY >= yF) break;
    const sEnd = Math.min((coY + ph) / tanA, yF / tanA); // nie über B hinaus
    if (sEnd <= 0.1) break;

    const laRaw: number = (firstLen !== null && firstLen > 0) ? firstLen : pb;

    // xStart muss VOR der Mindestversatz-Prüfung stehen, da er sich ab coY ≥ hvorne
    // ändert und die absolute Fugenposition bestimmt.
    const xStart = coY >= q.hvorne ? (coY - q.hvorne) / tanG : -uH;
    const absRaw = xStart + laRaw;
    const absAdj = r === 0 ? absRaw : applyMindestversatz(absRaw, prevJointOffset, pb, mv);
    const la     = absAdj - xStart;

    let s: number = xStart + la;
    while (s < sEnd) s += pb;
    const abschnitt: number = s - sEnd;

    rowsW.push({ r, la, laRaw, abschnitt });
    coY             += ph;
    prevJointOffset  = r === 0 ? 0 : absAdj;
    firstLen         = abschnitt - 5;
  }
  return rowsW;
}

// Schräge Verlegung: Reihen parallel zum Gaubendach
export function berechnePlattenSchraeg(q: PlattenParams): PlattenReihe[] {
  const cosA  = Math.cos(toRad(q.alphaDeg));
  const cosG  = Math.cos(toRad(q.gammaDeg));
  const sinAG = Math.sin(toRad(q.alphaDeg - q.gammaDeg));
  const pb     = q.plattenBreite;
  const ph0    = q.ersteReiheHoehe;
  const phN    = q.plattenHoehe;
  const uSlope = q.ueberstand / cosA;
  const mv     = q.mindestversatz;

  const rows: PlattenReihe[] = [];
  let co               = 0;
  let firstLen: number | null = null;
  let prevJointOffset  = 0; // Fugenversatz der Vorreihe (0 = Reihe-0-Muster)

  for (let r = 0; r < 60; r++) {
    const ph   = r === 0 ? ph0 : phN;
    const sEnd = (q.hvorne - co / cosA) * cosG / sinAG;
    if (sEnd <= 0.1) break;

    const laRaw: number = (firstLen !== null && firstLen > 0) ? firstLen : pb;

    const la: number = r === 0
      ? laRaw
      : applyMindestversatz(laRaw, prevJointOffset, pb, mv);

    let s: number           = -uSlope + la;
    while (s < sEnd) s += pb;
    const abschnitt: number = s - sEnd;

    rows.push({ r, la, laRaw, abschnitt });
    co              += ph;
    prevJointOffset  = r === 0 ? 0 : la;
    firstLen         = abschnitt - 5;
  }
  return rows;
}
