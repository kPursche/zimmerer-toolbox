// ─── Holzrahmenbau-Wandplaner: Berechnungslogik ───────────────────────────────
//
// Seitenansicht (Elevation) einer Holzrahmenbauwand: Schwelle unten (immer
// waagerecht), Rähm oben (waagerecht oder geneigt bei unterschiedlicher
// Wandhöhe links/rechts), Pfosten dazwischen im festen Raster ab der linken
// Kante mit Restfeld am Ende, jeder Pfosten einzeln in x verschiebbar.
//
// Einheiten-agnostisch: alle Maße (Breite, Höhen, Abstand) müssen konsistent
// in derselben Einheit übergeben werden (z. B. durchgängig cm) — die
// Berechnung selbst ist reine Geometrie ohne Einheitenumrechnung.

export interface WandplanerEingabe {
  breite: number;
  schwellenhoehe: number;
  raehmhoehe: number;
  wandhoeheLinks: number;
  wandhoeheRechts: number;
  pfostenabstandSoll: number;
  positionsUeberschreibungen?: Record<number, number>;
}

export interface Pfosten {
  nr: number;
  x: number;      // mm, Position von der linken Kante
  laenge: number; // mm
  winkel: number; // Grad, Kopfschnittwinkel (0 = rechtwinklig)
}

export interface WandplanerErgebnis {
  positionen: number[];
  winkel: number;
  stueckliste: Pfosten[];
  ok: boolean;
}

// Festes Raster ab der linken Kante (x=0) in Schritten von `abstandSoll`;
// das letzte Feld ist der Rest und kann kürzer als `abstandSoll` sein.
// Randpfosten bei x=0 und x=breite sind immer enthalten.
export function pfostenPositionen(breite: number, abstandSoll: number): number[] {
  if (breite <= 0 || abstandSoll <= 0) return [0];
  const positionen: number[] = [0];
  let x = abstandSoll;
  while (x < breite - 1e-6) {
    positionen.push(x);
    x += abstandSoll;
  }
  if (breite > positionen[positionen.length - 1] + 1e-6) {
    positionen.push(breite);
  }
  return positionen;
}

// Lineare Interpolation der Wandhöhe (UK Schwelle bis OK Rähm) zwischen den
// beiden Kantenhöhen.
export function wandhoeheAnPosition(
  x: number,
  breite: number,
  wandhoeheLinks: number,
  wandhoeheRechts: number,
): number {
  if (breite <= 0) return wandhoeheLinks;
  const anteil = x / breite;
  return wandhoeheLinks + (wandhoeheRechts - wandhoeheLinks) * anteil;
}

// Pfostenlänge = Wandhöhe an der Position minus Schwellen- und Rähmstärke,
// da der Pfosten zwischen OK Schwelle und UK Rähm sitzt.
export function pfostenLaenge(
  x: number,
  breite: number,
  wandhoeheLinks: number,
  wandhoeheRechts: number,
  schwellenhoehe: number,
  raehmhoehe: number,
): number {
  return (
    wandhoeheAnPosition(x, breite, wandhoeheLinks, wandhoeheRechts) -
    schwellenhoehe -
    raehmhoehe
  );
}

// Konstanter Kopfschnittwinkel aller Pfosten, da nur das Rähm geneigt ist
// (die Schwelle bleibt immer waagerecht). Positiv, wenn die Wand links höher
// ist als rechts.
export function raehmWinkelGrad(
  breite: number,
  wandhoeheLinks: number,
  wandhoeheRechts: number,
): number {
  if (breite <= 0) return 0;
  return (Math.atan((wandhoeheLinks - wandhoeheRechts) / breite) * 180) / Math.PI;
}

// Wendet manuelle Positions-Überschreibungen (Pfosten-Index → x) auf das
// Basis-Raster an, geklemmt auf [0, breite], und sortiert das Ergebnis.
function anwendenUeberschreibungen(
  basis: number[],
  breite: number,
  ueberschreibungen: Record<number, number>,
): number[] {
  const positionen = basis.slice();
  for (const [indexStr, wert] of Object.entries(ueberschreibungen)) {
    const index = Number(indexStr);
    if (index < 0 || index >= positionen.length) continue;
    positionen[index] = Math.min(Math.max(wert, 0), breite);
  }
  return positionen.slice().sort((a, b) => a - b);
}

export function berechneWand(eingabe: WandplanerEingabe): WandplanerErgebnis {
  const {
    breite,
    schwellenhoehe,
    raehmhoehe,
    wandhoeheLinks,
    wandhoeheRechts,
    pfostenabstandSoll,
    positionsUeberschreibungen = {},
  } = eingabe;

  const basis = pfostenPositionen(breite, pfostenabstandSoll);
  const positionen = anwendenUeberschreibungen(basis, breite, positionsUeberschreibungen);
  const winkel = raehmWinkelGrad(breite, wandhoeheLinks, wandhoeheRechts);

  const stueckliste: Pfosten[] = positionen.map((x, i) => ({
    nr: i + 1,
    x,
    laenge: pfostenLaenge(x, breite, wandhoeheLinks, wandhoeheRechts, schwellenhoehe, raehmhoehe),
    winkel,
  }));

  const ok = stueckliste.length > 0 && stueckliste.every((p) => p.laenge > 0);

  return { positionen, winkel, stueckliste, ok };
}
