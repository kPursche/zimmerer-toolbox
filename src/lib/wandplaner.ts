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
  staenderbreite?: number;
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
  raehmLaenge: number;
  verstichmass: number;
  stueckliste: Pfosten[];
  ok: boolean;
}

// Referenzlänge (cm), auf die sich das Verstichmaß bezieht — "auf 100 cm
// Anschlag X cm Verstich" ist die gebräuchliche Bezugsgröße zum Einstellen
// einer Schmiege ohne Winkelmesser.
export const VERSTICH_REFERENZLAENGE = 100;

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

// Bei geneigtem Rähm hat ein Pfosten mit eigener Ständerbreite zwei
// unterschiedlich hohe Kanten (Vorder-/Rückkante in Richtung der Neigung).
// Für den Zuschnitt zählt die höhere Kante — sonst wäre der Rohling an der
// langen Kante zu kurz. Bei staenderbreite=0 (oder waagerechtem Rähm) fallen
// beide Kanten auf die Mittelachse zusammen.
export function pfostenOberkanteMax(
  x: number,
  breite: number,
  wandhoeheLinks: number,
  wandhoeheRechts: number,
  staenderbreite: number,
): number {
  const halbeStaenderbreite = staenderbreite / 2;
  return Math.max(
    wandhoeheAnPosition(x - halbeStaenderbreite, breite, wandhoeheLinks, wandhoeheRechts),
    wandhoeheAnPosition(x + halbeStaenderbreite, breite, wandhoeheLinks, wandhoeheRechts),
  );
}

// Pfostenlänge (Rohlänge für den Zuschnitt) = höchste Kante des Pfostens
// minus Schwellen- und Rähmstärke, da der Pfosten zwischen OK Schwelle und
// UK Rähm sitzt.
export function pfostenLaenge(
  x: number,
  breite: number,
  wandhoeheLinks: number,
  wandhoeheRechts: number,
  schwellenhoehe: number,
  raehmhoehe: number,
  staenderbreite: number = 0,
): number {
  return (
    pfostenOberkanteMax(x, breite, wandhoeheLinks, wandhoeheRechts, staenderbreite) -
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

// Länge über Alles des Rähms: bei geneigtem Rähm ist die tatsächliche
// (schräge) Länge des Holzes größer als die Wandbreite (horizontale
// Projektion) — maßgeblich für die Bestelllänge.
export function raehmLaengeUeberAlles(
  breite: number,
  wandhoeheLinks: number,
  wandhoeheRechts: number,
): number {
  const hoehendifferenz = wandhoeheLinks - wandhoeheRechts;
  return Math.sqrt(breite * breite + hoehendifferenz * hoehendifferenz);
}

// Verstichmaß zum Einstellen einer Schmiege ohne Winkelmesser: auf
// `referenzlaenge` (Anschlag) entlang der Waagerechten entspricht der
// Neigung ein Versatz (Verstich) von so vielen cm. Positiv, wenn die Wand
// links höher ist als rechts (gleiches Vorzeichen wie raehmWinkelGrad).
export function verstichmass(
  breite: number,
  wandhoeheLinks: number,
  wandhoeheRechts: number,
  referenzlaenge: number = VERSTICH_REFERENZLAENGE,
): number {
  if (breite <= 0) return 0;
  return (referenzlaenge * (wandhoeheLinks - wandhoeheRechts)) / breite;
}

// Rückt die beiden Randpfosten (erster/letzter Eintrag im Positions-Raster)
// so weit nach innen, dass ihre Außenkante bündig mit Schwelle/Rähm-Ende
// abschließt, statt mit der Mittelachse auf x=0 bzw. x=breite zu sitzen.
function mitBuendigenRandpfosten(
  basis: number[],
  breite: number,
  staenderbreite: number,
): number[] {
  if (basis.length < 2 || staenderbreite <= 0) return basis;
  const positionen = basis.slice();
  const halbeStaenderbreite = staenderbreite / 2;
  positionen[0] = halbeStaenderbreite;
  positionen[positionen.length - 1] = breite - halbeStaenderbreite;
  return positionen;
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
    staenderbreite = 0,
    positionsUeberschreibungen = {},
  } = eingabe;

  const basis = pfostenPositionen(breite, pfostenabstandSoll);
  const basisBuendig = mitBuendigenRandpfosten(basis, breite, staenderbreite);
  const positionen = anwendenUeberschreibungen(basisBuendig, breite, positionsUeberschreibungen);
  const winkel = raehmWinkelGrad(breite, wandhoeheLinks, wandhoeheRechts);
  const raehmLaenge = raehmLaengeUeberAlles(breite, wandhoeheLinks, wandhoeheRechts);
  const verstich = verstichmass(breite, wandhoeheLinks, wandhoeheRechts);

  const stueckliste: Pfosten[] = positionen.map((x, i) => ({
    nr: i + 1,
    x,
    laenge: pfostenLaenge(x, breite, wandhoeheLinks, wandhoeheRechts, schwellenhoehe, raehmhoehe, staenderbreite),
    winkel,
  }));

  const ok = stueckliste.length > 0 && stueckliste.every((p) => p.laenge > 0);

  return { positionen, winkel, raehmLaenge, verstichmass: verstich, stueckliste, ok };
}
