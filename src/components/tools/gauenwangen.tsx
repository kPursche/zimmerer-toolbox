"use client";

import { useState, useMemo, useCallback } from "react";
import { AlertCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toRad = (deg: number) => (deg * Math.PI) / 180;
const fmt   = (v: number, dec = 1) => v.toFixed(dec);
const round1 = (v: number) => Math.round(v * 10) / 10;

// Verschiebt den ersten Plattenstoss einer Reihe, damit der Mindestversatz
// zur Fugenreihe darunter eingehalten wird.
// prevOffset = Position des ersten Stosses der Vorreihe.
// Nach jeder Verschiebung wird erneut geprüft (max. 3 Durchläufe), weil eine
// Verschiebung die Fuge zu nah an eine andere Vorreihen-Fuge bringen kann.
function applyMindestversatz(la: number, prevOffset: number, pb: number, mv: number): number {
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
      const adjFwd = la + (pb - d) - mv;           // links: mv cm vor die nächste Vorreihen-Fuge
      la = adjFwd > 0 ? adjFwd : la + (pb - d) + mv; // rechts: mv cm nach der nächsten Vorreihen-Fuge
    }
  }
  return la;
}

// ─── Typen ────────────────────────────────────────────────────────────────────

interface Eingaben {
  eckhoeheVorne:      string; // lotrechte Ständerhöhe an der Vorderkante
  gaubendachNeigung:  string; // γ
  hauptdachNeigung:   string; // α
  holzBreite:         string; // b
  holzTiefe:          string; // t (senkrecht zur Holzlängsachse)
  achsabstand:        string;
}

interface Lotholz {
  nr:       number;
  abstand:  number;
  hoehe:    number; // lotrechte Länge (= Innenmass zwischen den Hölzern)
}

interface Ergebnis {
  T:                  number; // horizontale Tiefe
  yFirst:             number; // Höhe des First-Punkts (Referenzlinie)
  L_eckstaender:      number; // = hvorne (lotrecht)
  L_gaubendach:       number;
  L_hauptdach:        number;
  schnittVorneGaube:  number; // Schnitt Gaubenholz an Vorderkante
  schnittFirst:       number; // Schnitt am First (beide Hölzer)
  lothölzer:          Lotholz[];
}

interface PlattenEingaben {
  platteBreite:    string;
  platteHoehe:     string;
  ersteReiheHoehe: string;
  ueberstand:      string;
  mindestversatz:  string;
  verlegeart:      'schraeg' | 'waagerecht';
}


// ─── Berechnung ───────────────────────────────────────────────────────────────
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

function berechne(
  hvorne:     number,
  alphaDeg:   number,
  gammaDeg:   number,
  b:          number,
  t:          number,
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


// ─── Haupt-Komponente ─────────────────────────────────────────────────────────

export function GauenwangenTool() {
  const [e, setE] = useState<Eingaben>({
    eckhoeheVorne:     "180",
    gaubendachNeigung: "23",
    hauptdachNeigung:  "45",
    holzBreite:        "6",
    holzTiefe:         "8",
    achsabstand:       "70",
  });

  const setze = useCallback(
    (key: keyof Eingaben) => (ev: React.ChangeEvent<HTMLInputElement>) =>
      setE((prev) => ({ ...prev, [key]: ev.target.value })),
    []
  );

const p = useMemo(() => ({
    hvorne:      parseFloat(e.eckhoeheVorne),
    alpha:       parseFloat(e.hauptdachNeigung),
    gamma:       parseFloat(e.gaubendachNeigung),
    b:           parseFloat(e.holzBreite),
    t:           parseFloat(e.holzTiefe),
    achsabstand: parseFloat(e.achsabstand),
  }), [e]);

  const fehler = useMemo((): string | null => {
    if (isNaN(p.hvorne)      || p.hvorne <= 0)                  return "Eckhöhe vorne muss größer als 0 sein.";
    if (isNaN(p.gamma)       || p.gamma < 0   || p.gamma >= 90) return "Gaubendach-Neigung: 0°–89°";
    if (isNaN(p.alpha)       || p.alpha <= 0  || p.alpha >= 90) return "Hauptdach-Neigung: 1°–89°";
    if (p.alpha <= p.gamma)                                      return "Hauptdach-Neigung muss größer als Gaubendach-Neigung sein.";
    if (isNaN(p.b)           || p.b <= 0)                       return "Holz-Breite muss größer als 0 sein.";
    if (isNaN(p.t)           || p.t <= 0)                       return "Holz-Tiefe muss größer als 0 sein.";
    if (isNaN(p.achsabstand) || p.achsabstand <= 0)             return "Achsabstand muss größer als 0 sein.";
    return null;
  }, [p]);

  const erg = useMemo(() => {
    if (fehler) return null;
    return berechne(p.hvorne, p.alpha, p.gamma, p.b, p.t, p.achsabstand);
  }, [fehler, p]);

  const [ep, setEp] = useState<PlattenEingaben>({ platteBreite: '250', platteHoehe: '62.5', ersteReiheHoehe: '', ueberstand: '0', mindestversatz: '0', verlegeart: 'schraeg' });
  const setzeP = useCallback(
    (key: keyof PlattenEingaben) => (ev: React.ChangeEvent<HTMLInputElement>) =>
      setEp(prev => ({ ...prev, [key]: ev.target.value })),
    [],
  );

  const plattenErg = useMemo(() => {
    if (fehler) return null;

    if (ep.verlegeart === 'waagerecht') {
      const tanA = Math.tan(toRad(p.alpha));
      const tanG = Math.tan(toRad(p.gamma));
      const yF   = (p.hvorne / (tanA - tanG)) * tanA; // Firsthöhe (Ecke B)
      const pb   = parseFloat(ep.platteBreite) || 250;
      const ph0  = parseFloat(ep.ersteReiheHoehe) || parseFloat(ep.platteHoehe) || 62.5;
      const phN  = parseFloat(ep.platteHoehe) || 62.5;
      const uH   = parseFloat(ep.ueberstand) || 0;
      const mv   = parseFloat(ep.mindestversatz) || 0;

      type RowErgW = { r: number; la: number; laRaw: number; abschnitt: number };
      const rowsW: RowErgW[] = [];
      let coY = 0;
      let firstLen: number | null = null;
      let prevJointOffset = 0;

      for (let r = 0; r < 60; r++) {
        const ph   = r === 0 ? ph0 : phN;
        if (coY >= yF) break;
        const sEnd = Math.min((coY + ph) / tanA, yF / tanA); // nie über B hinaus
        if (sEnd <= 0.1) break;

        const laRaw: number = (firstLen !== null && firstLen > 0) ? firstLen : pb;

        // xStart muss VOR der Mindestversatz-Prüfung stehen, da er sich ab coY ≥ hvorne
        // ändert und die absolute Fugenposition bestimmt.
        const xStart = coY >= p.hvorne ? (coY - p.hvorne) / tanG : -uH;
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

    const cosA  = Math.cos(toRad(p.alpha));
    const tanG  = Math.tan(toRad(p.gamma));
    const cosG  = Math.cos(toRad(p.gamma));
    const sinAG = Math.sin(toRad(p.alpha - p.gamma));
    const pb      = parseFloat(ep.platteBreite) || 250;
    const ph0     = parseFloat(ep.ersteReiheHoehe) || parseFloat(ep.platteHoehe) || 62.5;
    const phN     = parseFloat(ep.platteHoehe) || 62.5;
    const uSlope  = (parseFloat(ep.ueberstand) || 0) / cosA;
    const mv      = parseFloat(ep.mindestversatz) || 0;

    type RowErg = { r: number; la: number; laRaw: number; abschnitt: number };
    const rows: RowErg[] = [];
    let co               = 0;
    let firstLen: number | null = null;
    let prevJointOffset  = 0; // Fugenversatz der Vorreihe (0 = Reihe-0-Muster)

    for (let r = 0; r < 60; r++) {
      const ph   = r === 0 ? ph0 : phN;
      const sEnd = (p.hvorne - co / cosA) * cosG / sinAG;
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
  }, [fehler, p, ep]);

  return (
    <div className="space-y-5">

      {/* ── Eingaben ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Eingaben</CardTitle>
          <CardDescription>Schleppdachgaube — alle Maße in cm, Winkel in Grad</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Gruppe label="Geometrie">
            <EingabeFeld
              label="Eckhöhe vorne"
              einheit="cm"
              wert={e.eckhoeheVorne}
              onChange={setze("eckhoeheVorne")}
              hinweis="Lotrechte Höhe der Wange an der Vorderkante"
              min={1} step={1}
            />
            <div className="grid grid-cols-2 gap-3">
              <EingabeFeld label="Gaubendach-Neigung" einheit="°" wert={e.gaubendachNeigung} onChange={setze("gaubendachNeigung")} min={0} max={89} step={0.5} />
              <EingabeFeld label="Hauptdach-Neigung"  einheit="°" wert={e.hauptdachNeigung}  onChange={setze("hauptdachNeigung")}  min={1} max={89} step={0.5} />
            </div>
          </Gruppe>

          <Gruppe label="Holz">
            <div className="grid grid-cols-2 gap-3">
              <EingabeFeld label="Breite (b)" einheit="cm" wert={e.holzBreite} onChange={setze("holzBreite")} min={1} step={0.5} />
              <EingabeFeld label="Tiefe (t)"  einheit="cm" wert={e.holzTiefe}  onChange={setze("holzTiefe")}  min={1} step={0.5} />
            </div>
          </Gruppe>

          <Gruppe label="Lothölzer">
            <EingabeFeld
              label="Achsabstand"
              einheit="cm"
              wert={e.achsabstand}
              onChange={setze("achsabstand")}
              hinweis="Abstand der lotrechten Hölzer zueinander"
              min={1} step={1}
            />
          </Gruppe>
        </CardContent>
      </Card>

      {/* ── Fehler ── */}
      {fehler && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{fehler}</span>
        </div>
      )}

      {/* ── Ergebnisse ── */}
      {erg && (
        <>
          {/* Seitenansicht – auf Mobile volle Displaybreite */}
          <Card className="-mx-4 rounded-none border-x-0 sm:mx-0 sm:rounded-xl sm:border-x">
            <CardHeader className="px-4 pb-3 sm:px-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">Seitenansicht (maßstabsgetreu)</CardTitle>
                <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
                  <span className="rounded-sm bg-oak-alpha px-2 py-1 text-oak">Holz {p.b} × {p.t} cm</span>
                  <span className="rounded-sm bg-s2 px-2 py-1 text-mu">Tiefe {fmt(erg.T)} cm</span>
                  <span className="rounded-sm bg-s2 px-2 py-1 text-mu">First {fmt(erg.yFirst)} cm</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 pb-4">
              <SeitenansichtSVG
                T={erg.T}
                hvorne={p.hvorne}
                alphaDeg={p.alpha}
                gammaDeg={p.gamma}
                b={p.b}
                t={p.t}
                lothölzer={erg.lothölzer}
              />
            </CardContent>
          </Card>


          {/* Zuschnittansicht */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Zuschnittansicht</CardTitle>
              <CardDescription>Schematisch — Schmiegen, Maße und Zwischenhölzer</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <HolzSchematik
                name="Holz an Hauptdach"
                laenge={erg.L_hauptdach}
                farbe="#c9924a"
                links={{ label: "Fußschnitt", anzeigeGrad: round1(90 - p.alpha), zeichenGrad: p.alpha }}
                rechts={{ label: "Firstschnitt", anzeigeGrad: round1(erg.schnittFirst), zeichenGrad: 90 - erg.schnittFirst }}
                dimLinien={{
                  gesamtlaenge: erg.L_hauptdach,
                  hauptVers:    p.b * Math.tan(toRad(p.alpha)),
                  gaubeVers:    p.b / Math.tan(toRad(erg.schnittFirst)),
                  mitte:        erg.L_hauptdach - p.b * Math.tan(toRad(p.alpha)) - p.b / Math.tan(toRad(erg.schnittFirst)),
                }}
              />
              <HolzSchematik
                name="Holz an Gaubendach"
                laenge={erg.L_gaubendach}
                farbe="#c9924a"
                links={{ label: "Vorschnitt", anzeigeGrad: round1(90 - p.gamma), zeichenGrad: p.gamma }}
                rechts={{ label: "Firstschnitt", anzeigeGrad: round1(erg.schnittFirst), zeichenGrad: 90 - erg.schnittFirst }}
                rechtsGekippt
                dimLinien={{
                  gesamtlaenge: erg.L_gaubendach,
                  hauptVers:    p.b * Math.tan(toRad(p.gamma)),
                  gaubeVers:    p.b / Math.tan(toRad(erg.schnittFirst)),
                  mitte:        erg.L_gaubendach - p.b * Math.tan(toRad(p.gamma)) - p.b / Math.tan(toRad(erg.schnittFirst)),
                }}
              />
              <HolzSchematik
                name="Gaubeneckständer"
                laenge={erg.L_eckstaender}
                farbe="#7fb87a"
                links={{ label: "Hauptdach-Schmiege", anzeigeGrad: round1(p.alpha), zeichenGrad: p.alpha }}
                rechts={{ label: "Gaubendach-Schmiege", anzeigeGrad: round1(p.gamma), zeichenGrad: p.gamma }}
                linksGekippt
                dimLinien={{
                  gesamtlaenge: erg.L_eckstaender,
                  hauptVers:    p.b * Math.tan(toRad(p.alpha)),
                  mitte:        erg.L_eckstaender - p.b * Math.tan(toRad(p.alpha)) - p.b * Math.tan(toRad(p.gamma)),
                  gaubeVers:    p.b * Math.tan(toRad(p.gamma)),
                  gesamtlaengePrefix: "x = ",
                  mittePrefix:        "y = ",
                }}
              />
              {erg.lothölzer.length > 0 && (
                <GaubenwangeSkizze
                  lothölzer={erg.lothölzer}
                  L_eckstaender={erg.L_eckstaender}
                  T={erg.T}
                  b={p.b}
                  alpha={p.alpha}
                  gamma={p.gamma}
                />
              )}
              {/* Zwischenhölzer — Maßtabelle */}
              {erg.lothölzer.length > 0 && (
                <div className="space-y-4 border-t border-border pt-4">
                  <div>
                    <p className="text-sm font-semibold text-tx">
                      Zwischenhölzer ({erg.lothölzer.length} Stk.) · u {fmt(round1(p.alpha))}° / o {fmt(round1(p.gamma))}°
                    </p>
                    <p className="mt-0.5 text-[11px] text-mu">
                      Pos. = Abstand von Vorderkante entlang des Holzes
                    </p>
                  </div>
                  <LotholzTabelle lothölzer={erg.lothölzer} alpha={p.alpha} gamma={p.gamma} b={p.b} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Plattenzuschnitt */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Plattenzuschnitt</CardTitle>
              <CardDescription>Beplankung der Gaubenwange</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex overflow-hidden rounded-md border border-border">
                {(['schraeg', 'waagerecht'] as const).map((art) => (
                  <button
                    key={art}
                    type="button"
                    onClick={() => setEp(prev => ({ ...prev, verlegeart: art }))}
                    className={`flex-1 px-3 py-2 text-sm font-semibold transition-colors ${
                      ep.verlegeart === art
                        ? 'bg-oak text-white'
                        : 'bg-s2 text-mu hover:text-tx'
                    }`}
                  >
                    {art === 'schraeg' ? 'Entlang Dachschräge' : 'Waagerecht'}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <EingabeFeld
                  label="Plattenbreite"
                  einheit="cm"
                  wert={ep.platteBreite}
                  onChange={setzeP('platteBreite')}
                  min={1} step={0.5}
                />
                <EingabeFeld
                  label="Plattenhöhe"
                  einheit="cm"
                  wert={ep.platteHoehe}
                  onChange={setzeP('platteHoehe')}
                  min={1} step={0.5}
                />
                <EingabeFeld
                  label="1. Reihe Höhe"
                  einheit="cm"
                  wert={ep.ersteReiheHoehe}
                  onChange={setzeP('ersteReiheHoehe')}
                  hinweis={`Standard: ${ep.platteHoehe || '62.5'} cm`}
                  min={1} step={0.5}
                />
                <EingabeFeld
                  label="Überstand VK"
                  einheit="cm"
                  wert={ep.ueberstand}
                  onChange={setzeP('ueberstand')}
                  hinweis="horizontal am Gaubenständer"
                  min={0} step={0.5}
                />
                <EingabeFeld
                  label="Mindestversatz"
                  einheit="cm"
                  wert={ep.mindestversatz}
                  onChange={setzeP('mindestversatz')}
                  hinweis="Stossfugen-Versatz min."
                  min={0} step={0.5}
                />
              </div>
              <GaubenwangeKonturSVG
                hvorne={p.hvorne}
                alphaDeg={p.alpha}
                gammaDeg={p.gamma}
                platteBreite={parseFloat(ep.platteBreite) || 250}
                platteHoeheFirst={parseFloat(ep.ersteReiheHoehe) || parseFloat(ep.platteHoehe) || 62.5}
                platteHoeheNorm={parseFloat(ep.platteHoehe) || 62.5}
                ueberstand={parseFloat(ep.ueberstand) || 0}
                mindestversatz={parseFloat(ep.mindestversatz) || 0}
                verlegeart={ep.verlegeart}
              />
              {plattenErg && plattenErg.length > 0 && (() => {
                const ph0 = parseFloat(ep.ersteReiheHoehe) || parseFloat(ep.platteHoehe) || 62.5;
                const phN = parseFloat(ep.platteHoehe) || 62.5;
                const pbRow = parseFloat(ep.platteBreite) || 250;
                const uH = parseFloat(ep.ueberstand) || 0;
                return (
                  <div className="space-y-2 rounded-md border border-border bg-s2 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-mu">
                      Zuschnittplan
                    </p>
                    {ep.verlegeart === 'waagerecht' ? (
                      <AllePlattenSkizze
                        pb={pbRow} ph0={ph0} phN={phN}
                        alpha={p.alpha} gamma={p.gamma}
                        hvorne={p.hvorne} ueberstand={uH}
                        rows={plattenErg}
                      />
                    ) : (
                      <AllePlattenSkizzeSchraeg
                        pb={pbRow} ph0={ph0} phN={phN}
                        alpha={p.alpha} gamma={p.gamma}
                        hvorne={p.hvorne} ueberstand={uH}
                        rows={plattenErg}
                      />
                    )}
                  </div>
                );
              })()}
              {plattenErg && plattenErg.length > 0 && (
                <div className="rounded-md border border-border bg-s2 px-4 py-3 space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-mu">
                    Schnittmaße — Abschnitt je Reihe
                  </p>
                  {(() => {
                    const ph = parseFloat(ep.platteHoehe) || 62.5;
                    if (ep.verlegeart === 'waagerecht') {
                      const vm = round1(ph / Math.tan(toRad(p.alpha)));
                      return (
                        <p className="text-[11px] text-mu">
                          Verstichmass Hauptdach-Schmiege:{' '}
                          <strong className="text-tx">{fmt(vm)} cm</strong>
                          {' '}(= {ph} cm / tan {fmt(p.alpha)}°)
                        </p>
                      );
                    } else {
                      const ag = p.alpha - p.gamma;
                      const vm = round1(ph / Math.tan(toRad(ag)));
                      return (
                        <p className="text-[11px] text-mu">
                          Verstichmass Gaubendach-Schmiege:{' '}
                          <strong className="text-tx">{fmt(vm)} cm</strong>
                          {' '}(= {ph} cm / tan {fmt(round1(ag))}°)
                        </p>
                      );
                    }
                  })()}
                  <div className="space-y-1">
                    {plattenErg.map(({ r, la, laRaw, abschnitt }) => {
                      const versatzAngepasst = r > 0 && Math.abs(la - laRaw) > 0.05;
                      return (
                        <div key={r} className="flex flex-wrap gap-x-6 gap-y-0.5 text-sm">
                          <span className="w-16 shrink-0 text-mu">Reihe {r + 1}</span>
                          {r > 0 && (
                            <span className="text-tx">
                              Platte 1:{" "}
                              <strong className="tabular-nums text-pine">{fmt(round1(la))} cm</strong>
                              {versatzAngepasst && (
                                <span className="ml-1 text-xs text-mu">
                                  (gekürzt von {fmt(round1(laRaw))} cm)
                                </span>
                              )}
                            </span>
                          )}
                          <span className="text-tx">
                            Abschnitt:{" "}
                            <strong className="tabular-nums text-oak">{fmt(round1(abschnitt))} cm</strong>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

        </>
      )}
    </div>
  );
}

// ─── Gaubenwange Kontur SVG ───────────────────────────────────────────────────
//
// Seitenansicht der Außenkontur: Dreieck aus Vorderkante (links), Hauptdachlinie
// (unten) und Gaubendachlinie (oben), die sich am First treffen.
// Koordinatensystem: x = waagerecht (VK → First), y = lotrecht (↑)

function GaubenwangeKonturSVG({
  hvorne, alphaDeg, gammaDeg, platteBreite, platteHoeheFirst, platteHoeheNorm, ueberstand, mindestversatz, verlegeart,
}: {
  hvorne: number;
  alphaDeg: number;
  gammaDeg: number;
  platteBreite: number;
  platteHoeheFirst: number;
  platteHoeheNorm: number;
  ueberstand: number;
  mindestversatz: number;
  verlegeart: 'schraeg' | 'waagerecht';
}) {
  const cosA  = Math.cos(toRad(alphaDeg));
  const sinA  = Math.sin(toRad(alphaDeg));
  const tanA  = Math.tan(toRad(alphaDeg));
  const tanG  = Math.tan(toRad(gammaDeg));
  const cosG   = Math.cos(toRad(gammaDeg));
  const sinAG  = Math.sin(toRad(alphaDeg - gammaDeg));
  const uSlope = ueberstand / cosA; // horizontaler Überstand → Schräg-Offset

  const T  = hvorne / (tanA - tanG);
  const yF = T * tanA;
  const pb = platteBreite;

  // ── Alle Reihen berechnen ────────────────────────────────────────────────────
  // sEnd(co): Schräglänge, bis Kante a/b die Gaubendachlinie erreicht
  // Herleitung: co/cosA + s·sinA = hvorne + s·cosA·tanG
  //             → s = (hvorne − co/cosA) · cosG / sin(α−γ)
  type Plate = { start: number; len: number };
  type Row   = { r: number; co: number; ph: number; sEnd: number; plates: Plate[]; abschnitt: number };

  const allRows: Row[] = [];
  let co              = 0;
  let firstLen: number | null = null;
  let prevJointOffset = 0;

  for (let r = 0; r < 60; r++) {
    const ph   = r === 0 ? platteHoeheFirst : platteHoeheNorm;
    const sEnd = (hvorne - co / cosA) * cosG / sinAG;
    if (sEnd <= 0.1) break;

    const laRaw: number = (firstLen !== null && firstLen > 0) ? firstLen : pb;

    const la: number = r === 0
      ? laRaw
      : applyMindestversatz(laRaw, prevJointOffset, pb, mindestversatz);

    const plates: Plate[] = [];
    if (r === 0) {
      let s = -uSlope;
      while (s < sEnd) { plates.push({ start: s, len: pb }); s += pb; }
    } else {
      plates.push({ start: -uSlope, len: la });
      let s = -uSlope + la;
      while (s < sEnd) { plates.push({ start: s, len: pb }); s += pb; }
    }

    const last      = plates[plates.length - 1];
    const abschnitt = last.start + last.len - sEnd;

    allRows.push({ r, co, ph, sEnd, plates, abschnitt });
    co              += ph;
    prevJointOffset  = r === 0 ? 0 : la;
    firstLen         = abschnitt - 5;
  }

  // ── Waagerecht-Reihen ─────────────────────────────────────────────────────────
  type PlateW = { start: number; len: number };
  type RowW   = { r: number; coY: number; ph: number; sEnd: number; plates: PlateW[]; abschnitt: number };
  const allRowsW: RowW[] = [];
  if (verlegeart === 'waagerecht') {
    let coYw             = 0;
    let firstLenW: number | null = null;
    let prevJointOffW   = 0;
    for (let r = 0; r < 60; r++) {
      const ph    = r === 0 ? platteHoeheFirst : platteHoeheNorm;
      if (coYw >= yF) break;
      const sEnd  = Math.min((coYw + ph) / tanA, T); // nie über B hinaus
      if (sEnd <= 0.1) break;
      const laRaw: number = (firstLenW !== null && firstLenW > 0) ? firstLenW : pb;
      // xStartW muss VOR der Mindestversatz-Prüfung stehen (absolute Fugenposition).
      const xStartW = coYw >= hvorne ? (coYw - hvorne) / tanG : -ueberstand;
      const absRawW = xStartW + laRaw;
      const absAdjW = r === 0 ? absRawW : applyMindestversatz(absRawW, prevJointOffW, pb, mindestversatz);
      const la      = absAdjW - xStartW;
      const platesW: PlateW[] = [];
      if (r === 0) {
        let s = xStartW;
        while (s < sEnd) { platesW.push({ start: s, len: pb }); s += pb; }
      } else {
        platesW.push({ start: xStartW, len: la });
        let s = xStartW + la;
        while (s < sEnd) { platesW.push({ start: s, len: pb }); s += pb; }
      }
      const lastW      = platesW[platesW.length - 1];
      const abschnittW = lastW.start + lastW.len - sEnd;
      allRowsW.push({ r, coY: coYw, ph, sEnd, plates: platesW, abschnitt: abschnittW });
      coYw             += ph;
      prevJointOffW    = r === 0 ? 0 : absAdjW;
      firstLenW        = abschnittW - 5;
    }
  }

  // ── SVG-Layout ────────────────────────────────────────────────────────────────
  const activeRows = verlegeart === 'waagerecht' ? allRowsW : allRows;
  const nPlatten0  = activeRows[0]?.plates.length ?? 1;

  const BASE_PAD_L = 52; const PAD_R_BASE = 28; const PAD_T = 28; const PAD_B = 50;
  const MAX_W = 540; const MAX_H = 380;

  const scale = Math.min(
    (MAX_W - BASE_PAD_L - PAD_R_BASE) / T,
    (MAX_H - PAD_T - PAD_B) / yF,
  ) * 0.86;

  const plateLeftPx  = verlegeart === 'schraeg'
    ? Math.ceil((ueberstand + platteHoeheFirst * sinA) * scale) + 10
    : Math.ceil(ueberstand * scale) + 10;
  const plateRightPx = Math.ceil(Math.max(0, nPlatten0 * pb * cosA - T) * scale) + 16;
  const PAD_L = BASE_PAD_L + plateLeftPx;
  const PAD_R = PAD_R_BASE + plateRightPx;

  const SVG_W = Math.round(T * scale + PAD_L + PAD_R);
  const SVG_H = Math.round(yF * scale + PAD_T + PAD_B);

  const sx = (x: number) => PAD_L + x * scale;
  const sy = (y: number) => PAD_T + (yF - y) * scale;

  const wA = { x: sx(0), y: sy(0) };
  const wB = { x: sx(T), y: sy(yF) };
  const wC = { x: sx(0), y: sy(hvorne) };

  // Plattenecken: a=unten-links, b=unten-rechts, d=oben-rechts, c=oben-links
  // start = Schräg-Offset ab Gaubenständer, co = kumulierter Senkrechtabstand
  const ecken = (start: number, len: number, cumOff: number, phRow: number): [number, number][] => {
    const y0 = cumOff / cosA;
    return [
      [sx(start * cosA),                            sy(y0 + start * sinA)]                            as [number, number],
      [sx((start + len) * cosA),                    sy(y0 + (start + len) * sinA)]                    as [number, number],
      [sx((start + len) * cosA - phRow * sinA),     sy(y0 + (start + len) * sinA + phRow * cosA)]     as [number, number],
      [sx(start * cosA - phRow * sinA),             sy(y0 + start * sinA + phRow * cosA)]             as [number, number],
    ];
  };

  const eckenW = (startX: number, lenX: number, coY: number, phRow: number): [number, number][] => [
    [sx(startX),          sy(coY)],
    [sx(startX + lenX),   sy(coY)],
    [sx(startX + lenX),   sy(coY + phRow)],
    [sx(startX),          sy(coY + phRow)],
  ];

  const polyStr = (pts: [number, number][]) => pts.map(([x, y]) => `${x},${y}`).join(' ');

  const fillCol  = (r: number) => r === 0 ? '#6fa8d4' : '#7fb87a';
  const fillOpac = (r: number, i: number) => i % 2 === 0 ? (r === 0 ? 0.24 : 0.28) : (r === 0 ? 0.12 : 0.15);

  const row0 = allRows[0];
  const p0   = row0 ? ecken(-uSlope, pb, 0, row0.ph) : null;

  const dimL = PAD_L - plateLeftPx - 30;
  const dimB = sy(0) + 22;

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      className="w-full overflow-visible"
      aria-label="Gaubenwange Außenkontur mit Platteneinteilung"
    >
      <defs>
        <pattern id="gk-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" stroke="#c9924a" strokeWidth="0.6" opacity="0.25" />
        </pattern>
        <clipPath id="gk-clip">
          <polygon points={`${wA.x},${wA.y} ${wB.x},${wB.y} ${wC.x},${wC.y}`} />
        </clipPath>
      </defs>

      {/* ── Schräg-Modus ── */}
      {verlegeart === 'schraeg' && <>
        {/* Geisterplatten */}
        {allRows.flatMap(({ r, co, ph, plates }) =>
          plates.map(({ start, len }, i) => (
            <polygon key={`g${r}-${i}`}
              points={polyStr(ecken(start, len, co, ph))}
              fill={fillCol(r)} fillOpacity="0.05"
              stroke={fillCol(r)} strokeWidth="0.8" strokeDasharray="5 3" opacity="0.45"
            />
          ))
        )}
      </>}

      {/* ── Waagerecht-Modus: Geisterplatten (nur bis sEnd, kein Off-Cut rechts) ── */}
      {verlegeart === 'waagerecht' && allRowsW.flatMap(({ r, coY, ph, plates, sEnd }) =>
        plates.map(({ start, len }, i) => {
          const visEnd = Math.min(start + len, sEnd);
          if (visEnd <= start) return null;
          return (
            <polygon key={`gw${r}-${i}`}
              points={polyStr(eckenW(start, visEnd - start, coY, ph))}
              fill={fillCol(r)} fillOpacity="0.05"
              stroke={fillCol(r)} strokeWidth="0.8" strokeDasharray="5 3" opacity="0.45"
            />
          );
        })
      )}

      {/* Wand-Außenkontur */}
      <polygon
        points={`${wA.x},${wA.y} ${wB.x},${wB.y} ${wC.x},${wC.y}`}
        fill="url(#gk-hatch)" stroke="#504840" strokeWidth="2" strokeLinejoin="round"
      />

      {/* ── Schräg-Modus: geclippt ── */}
      {verlegeart === 'schraeg' && (
        <g clipPath="url(#gk-clip)">
          {allRows.flatMap(({ r, co, ph, plates }) =>
            plates.map(({ start, len }, i) => (
              <polygon key={`c${r}-${i}`}
                points={polyStr(ecken(start, len, co, ph))}
                fill={fillCol(r)} fillOpacity={fillOpac(r, i)}
                stroke={fillCol(r)} strokeWidth="1.3" strokeLinejoin="round"
              />
            ))
          )}
        </g>
      )}

      {/* ── Waagerecht-Modus: geclippt ── */}
      {verlegeart === 'waagerecht' && (
        <g clipPath="url(#gk-clip)">
          {allRowsW.flatMap(({ r, coY, ph, plates }) =>
            plates.map(({ start, len }, i) => (
              <polygon key={`cw${r}-${i}`}
                points={polyStr(eckenW(start, len, coY, ph))}
                fill={fillCol(r)} fillOpacity={fillOpac(r, i)}
                stroke={fillCol(r)} strokeWidth="1.3" strokeLinejoin="round"
              />
            ))
          )}
        </g>
      )}

      {/* Überstand-Markierung */}
      {ueberstand > 0 && (() => {
        const xOut = -ueberstand;
        const yBot = xOut * tanA;
        const yTop = hvorne + xOut * tanG;
        return (
          <>
            <line x1={sx(xOut)} y1={sy(yBot)} x2={sx(xOut)} y2={sy(yTop)}
              stroke="#6fa8d4" strokeWidth="0.8" strokeLinecap="round" />
            <line x1={sx(xOut)} y1={sy(yTop)} x2={wC.x} y2={wC.y}
              stroke="#6fa8d4" strokeWidth="0.8" strokeLinecap="round" />
          </>
        );
      })()}

      {/* Wand-Eckpunkte */}
      <text x={wA.x - 7} y={wA.y + 4}  fontSize="9" fill="#504840" textAnchor="end" fontWeight="700">A</text>
      <text x={wB.x + 5} y={wB.y + 4}  fontSize="9" fill="#504840" fontWeight="700">B</text>
      <text x={wC.x - 7} y={wC.y + 4}  fontSize="9" fill="#504840" textAnchor="end" fontWeight="700">C</text>

      {/* ── Schräg-Modus: Eckpunkte 1. Platte + Labels + Abschnitt ── */}
      {verlegeart === 'schraeg' && <>
        {p0 && <>
          <text x={p0[0][0] + 3}  y={p0[0][1] + 13} fontSize="8" fill="#6fa8d4" fontWeight="700">a</text>
          <text x={p0[1][0] + 5}  y={p0[1][1] + 4}  fontSize="8" fill="#6fa8d4" fontWeight="700">b</text>
          <text x={p0[3][0] - 4}  y={p0[3][1] + 3}  fontSize="8" fill="#6fa8d4" textAnchor="end" opacity="0.45" fontWeight="700">c</text>
          <text x={p0[2][0] + 5}  y={p0[2][1] + 4}  fontSize="8" fill="#6fa8d4" fontWeight="700">d</text>
        </>}
        {allRows.flatMap(({ r, co, ph, plates, sEnd }) =>
          plates.map(({ start, len }, i) => {
            if (r === 0 && i === 0) return null;
            const clampedEnd = Math.min(start + len, sEnd);
            const midS = (start + clampedEnd) / 2;
            const lx   = sx(midS * cosA - (ph / 2) * sinA);
            const ly   = sy(co / cosA + midS * sinA + (ph / 2) * cosA);
            const label = r > 0 && i === 0 ? `${fmt(round1(len))} cm` : String(i + 1);
            return (
              <text key={`l${r}-${i}`} x={lx} y={ly}
                fontSize="8" fill={fillCol(r)} textAnchor="middle" dominantBaseline="middle"
                fontWeight="700" opacity="0.85">
                {label}
              </text>
            );
          })
        )}
        {row0 && (() => {
          const last    = row0.plates[row0.plates.length - 1];
          const endX    = (last.start + last.len) * cosA;
          const endY    = (last.start + last.len) * sinA;
          const midSvgX = (wB.x + sx(endX)) / 2;
          const midSvgY = (wB.y + sy(endY)) / 2;
          return (
            <g>
              <line x1={wB.x} y1={wB.y} x2={sx(endX)} y2={sy(endY)}
                stroke="#7fb87a" strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
              <text x={midSvgX + sinA * 16} y={midSvgY + cosA * 16}
                fontSize="8" fill="#7fb87a" textAnchor="middle" fontWeight="700">
                {fmt(round1(row0.abschnitt))} cm
              </text>
            </g>
          );
        })()}
      </>}

      {/* ── Waagerecht-Modus: Labels + Verstichmass-Linien ── */}
      {verlegeart === 'waagerecht' && <>
        {allRowsW.flatMap(({ r, coY, ph, plates, sEnd }) =>
          plates.map(({ start, len }, i) => {
            if (r === 0 && i === 0) return null;
            const clampedEnd = Math.min(start + len, sEnd);
            const midX  = (start + clampedEnd) / 2;
            const label = r > 0 && i === 0 ? `${fmt(round1(len))} cm` : String(i + 1);
            return (
              <text key={`lw${r}-${i}`} x={sx(midX)} y={sy(coY + ph / 2)}
                fontSize="8" fill={fillCol(r)} textAnchor="middle" dominantBaseline="middle"
                fontWeight="700" opacity="0.85">
                {label}
              </text>
            );
          })
        )}
        {allRowsW.map(({ r, coY, ph, sEnd }) => {
          const isUpper = coY >= hvorne;
          // Endpunkt auf First (yF) clampen — letzte Reihe kann über yF hinausgehen
          const yTop = Math.min(coY + ph, yF);
          // Rechte Schmiege (Hauptdach α)
          const xBotR = coY / tanA;
          const xTopR = sEnd;
          // Linke Schmiege (Gaubendach γ) — nur für obere Reihen
          const xBotL = isUpper ? (coY - hvorne) / tanG : null;
          const xTopL = isUpper ? (yTop - hvorne) / tanG : null;
          return (
            <g key={`vm${r}`}>
              {/* Hauptdach-Schmiege rechts */}
              <line x1={sx(xBotR)} y1={sy(coY)} x2={sx(xTopR)} y2={sy(yTop)}
                stroke="#d47070" strokeWidth="1.2" strokeDasharray="4 2" />
              <text x={sx((xBotR + xTopR) / 2) + 8} y={sy((coY + yTop) / 2)}
                fontSize="7.5" fill="#d47070" dominantBaseline="middle">
                vα={fmt(round1(ph / tanA))} cm
              </text>
              {/* Gaubendach-Schmiege links (nur obere Reihen) */}
              {isUpper && xBotL !== null && xTopL !== null && (
                <>
                  <line x1={sx(xBotL)} y1={sy(coY)} x2={sx(xTopL)} y2={sy(yTop)}
                    stroke="#6fa8d4" strokeWidth="1.2" strokeDasharray="4 2" />
                  <text x={sx((xBotL + xTopL) / 2) - 8} y={sy((coY + yTop) / 2)}
                    fontSize="7.5" fill="#6fa8d4" textAnchor="end" dominantBaseline="middle">
                    vγ={fmt(round1(ph / tanG))} cm
                  </text>
                </>
              )}
            </g>
          );
        })}
      </>}

      {/* Winkel */}
      <text x={wA.x + 6} y={wA.y - 5}  fontSize="9" fill="#c9924a" fontWeight="600">α = {alphaDeg}°</text>
      <text x={wC.x + 6} y={wC.y + 12} fontSize="9" fill="#c9924a" fontWeight="600">γ = {gammaDeg}°</text>

      {/* Bemaßung: hvorne */}
      <line x1={dimL} y1={wA.y} x2={dimL} y2={wC.y} stroke="#7fb87a" strokeWidth="1.3" />
      <line x1={dimL - 4} y1={wA.y} x2={dimL + 4} y2={wA.y} stroke="#7fb87a" strokeWidth="1.3" />
      <line x1={dimL - 4} y1={wC.y} x2={dimL + 4} y2={wC.y} stroke="#7fb87a" strokeWidth="1.3" />
      <text x={dimL - 5} y={(wA.y + wC.y) / 2} fontSize="8.5" fill="#7fb87a" textAnchor="middle"
        transform={`rotate(-90 ${dimL - 5} ${(wA.y + wC.y) / 2})`}>
        {fmt(hvorne)} cm
      </text>

      {/* Bemaßung: T */}
      <line x1={wA.x} y1={dimB} x2={wB.x} y2={dimB} stroke="#d47070" strokeWidth="1.3" />
      <line x1={wA.x} y1={dimB - 4} x2={wA.x} y2={dimB + 4} stroke="#d47070" strokeWidth="1.3" />
      <line x1={wB.x} y1={dimB - 4} x2={wB.x} y2={dimB + 4} stroke="#d47070" strokeWidth="1.3" />
      <text x={(wA.x + wB.x) / 2} y={dimB + 13} fontSize="8.5" fill="#d47070" textAnchor="middle">
        T = {fmt(round1(T))} cm
      </text>

      {/* Firsthöhe gestrichelt */}
      <line x1={wB.x} y1={wB.y} x2={wB.x} y2={wA.y} stroke="#888" strokeWidth="0.8" strokeDasharray="4 3" />
      <text x={wB.x + 4} y={(wB.y + wA.y) / 2} fontSize="8" fill="#888" dominantBaseline="middle">
        {fmt(round1(yF))} cm
      </text>
    </svg>
  );
}

// ─── Plattenzuschnitt-Skizze ──────────────────────────────────────────────────

function HDimLine({ x1, x2, y, label, col, above }: {
  x1: number; x2: number; y: number; label: string; col: string; above: boolean;
}) {
  const mid = (x1 + x2) / 2;
  const tk  = 3.5;
  return (
    <g>
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={col} strokeWidth="1" />
      <line x1={x1} y1={y - tk} x2={x1} y2={y + tk} stroke={col} strokeWidth="1" />
      <line x1={x2} y1={y - tk} x2={x2} y2={y + tk} stroke={col} strokeWidth="1" />
      <text x={mid} y={above ? y - 5 : y + 11}
        fontSize="8" fill={col} textAnchor="middle" fontWeight="600">{label}</text>
    </g>
  );
}

function EinzelplatteSVG({
  platteW, platteH, cutTopY, alpha, gamma,
  hasRightCut, rightCutLocalBot, rightCutLocalTop, rightCutEntryY, abschnitt,
  hasLeftCut, leftCutLocalTop, leftCutEntryY, leftCutExitY,
  rightCutExitRight = false,
  alphaCutRightY,
}: {
  platteW: number; platteH: number; cutTopY: number; alpha: number; gamma: number;
  hasRightCut: boolean; rightCutLocalBot: number; rightCutLocalTop: number; rightCutEntryY: number; abschnitt: number;
  hasLeftCut: boolean; leftCutLocalTop: number; leftCutEntryY: number; leftCutExitY: number;
  rightCutExitRight?: boolean;
  alphaCutRightY?: number;
}) {
  const sc  = Math.min(100 / platteH, 240 / platteW);
  const bW  = platteW * sc;
  const bH  = platteH * sc;
  const PAD_L = 8;
  const PAD_R = 26;
  const PAD_T = (hasRightCut || hasLeftCut) ? 36 : 14;
  const PAD_B = 26;
  const SVG_W = Math.round(bW + PAD_L + PAD_R);
  const SVG_H = Math.round(bH + PAD_T + PAD_B);

  const sx = (x: number) => PAD_L + x * sc;
  const sy = (y: number) => PAD_T + (platteH - y) * sc;
  const xL = sx(0), xR = sx(platteW);
  const yB = sy(0), yT = sy(platteH);
  // yCutT: row-level top reference (effPh) — used for γ-cuts and hasCutOff
  const yCutT = sy(cutTopY);
  // yCutA: where the α-cut terminates in SVG y
  //   - top-exit: same as yCutT
  //   - right-exit: height at the right edge (alphaCutRightY)
  const yCutA = (rightCutExitRight && alphaCutRightY !== undefined) ? sy(alphaCutRightY) : yCutT;
  const hasCutOff = !rightCutExitRight && cutTopY < platteH - 0.1;

  const showLC = hasLeftCut && leftCutLocalTop > 0.3;
  const botR   = hasRightCut ? sx(rightCutLocalBot) : xR;
  // For right-exit: α exits at the right edge regardless of rightCutLocalTop
  const topR   = hasRightCut ? (rightCutExitRight ? xR : sx(rightCutLocalTop)) : xR;
  const topL   = showLC ? sx(leftCutLocalTop) : xL;
  // SVG y-coords for γ-cut entry (left edge) and exit (top or right edge)
  const entL   = showLC ? sy(leftCutEntryY) : yB;
  const exitL  = showLC ? sy(leftCutExitY)  : yCutT;
  // γ-cut exits through the right edge when leftCutLocalTop == platteW
  const lcExR  = showLC && leftCutLocalTop >= platteW - 0.01;
  // α-cut enters from the left edge (not bottom) when rightCutLocalBot ≈ 0 but rightCutEntryY > 0
  const lcEntersLeft = hasRightCut && rightCutLocalBot < 0.01 && rightCutEntryY > 0.01;
  // SVG y-coord where α-cut enters the left edge (only meaningful when lcEntersLeft)
  const entA = lcEntersLeft ? sy(rightCutEntryY) : yB;

  // usedPts: usable material zone.
  //
  // rightCutExitRight=true (α exits right edge at yCutA):
  //   If γ also exits right (lcExR): usable zone is a quadrilateral bounded on the upper-right
  //   by the γ-exit — the top above that belongs to γ-waste (lwPts).
  //   Otherwise: full plate top is usable above the α-exit.
  //
  // rightCutExitRight=false: original logic unchanged.
  const usedPts = rightCutExitRight
    ? lcEntersLeft
      ? lcExR
        ? `${xL},${entA} ${xR},${yCutA} ${xR},${exitL}`
        : `${xL},${entA} ${xR},${yCutA} ${xR},${yT} ${xL},${yT}`
      : lcExR
        ? `${xL},${yB} ${botR},${yB} ${xR},${yCutA} ${xR},${exitL}`
        : `${xL},${yB} ${botR},${yB} ${xR},${yCutA} ${xR},${yT} ${xL},${yT}`
    : showLC
      ? lcExR
        ? `${xL},${yB} ${xR},${yB} ${xR},${exitL} ${xL},${entL}`
        : lcEntersLeft
          ? `${xL},${entA} ${xL},${entL} ${topL},${yCutT} ${topR},${yCutT}`
          : `${xL},${yB} ${botR},${yB} ${topR},${yCutT} ${topL},${yCutT} ${xL},${entL}`
      : lcEntersLeft
        ? `${xL},${entA} ${topR},${yCutT} ${xL},${yCutT}`
        : `${xL},${yB} ${botR},${yB} ${topR},${yCutT} ${topL},${yCutT}`;
  // absPts: α-waste zone (to the right of the α-cut).
  const absPts = hasRightCut
    ? rightCutExitRight
      ? lcEntersLeft
        ? `${xL},${yB} ${xR},${yB} ${xR},${yCutA} ${xL},${entA}`
        : `${botR},${yB} ${xR},${yB} ${xR},${yCutA}`
      : lcEntersLeft
        ? `${xL},${yB} ${xR},${yB} ${xR},${yCutT} ${topR},${yCutT} ${xL},${entA}`
        : `${botR},${yB} ${xR},${yB} ${xR},${yCutT} ${topR},${yCutT}`
    : '';
  // Waste polygon for γ-cut
  // lcExR=false: triangle entL→topL→TL
  // lcExR=true:  quad    entL→exitL(right)→TR→TL
  const lwPts = showLC
    ? lcExR
      ? `${xL},${entL} ${xR},${exitL} ${xR},${yT} ${xL},${yT}`
      : `${xL},${entL} ${topL},${yCutT} ${xL},${yCutT}`
    : '';

  const dimY = yT - 10;

  return (
    <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ width: SVG_W, height: SVG_H }}
      overflow="visible">

      <polygon points={usedPts}
        fill="#6fa8d4" fillOpacity="0.2" stroke="#6fa8d4" strokeWidth="1.2" />

      {hasRightCut && (
        <polygon points={absPts}
          fill="#c9924a" fillOpacity="0.15" stroke="#c9924a"
          strokeWidth="1" strokeDasharray="4 2" />
      )}

      {lwPts && (
        <polygon points={lwPts}
          fill="#888" fillOpacity="0.1" stroke="#6fa8d4"
          strokeWidth="1" strokeDasharray="4 2" />
      )}

      {/* Top-waste zone when ridge falls within the plate (last row) */}
      {hasCutOff && (
        <rect x={xL} y={yT} width={bW} height={yCutT - yT}
          fill="#aaa" fillOpacity="0.08" />
      )}
      {hasCutOff && (
        <line x1={xL} y1={yCutT} x2={xR} y2={yCutT}
          stroke="#888" strokeWidth="1" strokeDasharray="4 2" />
      )}

      {hasRightCut && (
        <line x1={lcEntersLeft ? xL : botR} y1={lcEntersLeft ? entA : yB}
          x2={topR} y2={yCutA}
          stroke="#d47070" strokeWidth="1.5" strokeDasharray="5 2" />
      )}

      {showLC && (
        <line x1={xL} y1={entL}
          x2={lcExR ? xR : topL}
          y2={lcExR ? exitL : yCutT}
          stroke="#6fa8d4" strokeWidth="1.5" strokeDasharray="5 2" />
      )}

      {/* vα dimension: only for top-exit (right-exit has no meaningful vα strip) */}
      {hasRightCut && !rightCutExitRight && (
        <HDimLine x1={botR} x2={topR} y={dimY}
          label={`vα ${fmt(round1(rightCutLocalTop - rightCutLocalBot))} cm`}
          col="#d47070" above={true} />
      )}

      {hasRightCut && abschnitt > 0.3 && (
        <HDimLine x1={topR} x2={xR} y={dimY}
          label={`${fmt(round1(abschnitt))} cm`}
          col="#c9924a" above={true} />
      )}

      {showLC && (
        <HDimLine x1={xL} x2={topL} y={dimY}
          label={`vγ ${fmt(round1(leftCutLocalTop))} cm`}
          col="#6fa8d4" above={true} />
      )}

      <HDimLine x1={xL} x2={xR} y={yB + 16}
        label={`${fmt(platteW)} cm`} col="#888" above={false} />

      <line x1={xR + 8} y1={yB} x2={xR + 8} y2={yT} stroke="#aaa" strokeWidth="0.8" />
      <line x1={xR + 5} y1={yB} x2={xR + 11} y2={yB} stroke="#aaa" strokeWidth="0.8" />
      <line x1={xR + 5} y1={yT} x2={xR + 11} y2={yT} stroke="#aaa" strokeWidth="0.8" />
      <text x={xR + 14} y={(yB + yT) / 2} fontSize="7.5" fill="#888"
        dominantBaseline="middle" fontWeight="600">{fmt(platteH)} cm</text>

      {hasRightCut && (
        <text x={topR + 3} y={yT + 11} fontSize="7" fill="#d47070" fontWeight="600">
          α={alpha}°
        </text>
      )}
      {showLC && (
        <text x={topL + 2} y={yT + 11} fontSize="7" fill="#6fa8d4" fontWeight="600">
          γ={gamma}°
        </text>
      )}
    </svg>
  );
}

function AllePlattenSkizze({ pb, ph0, phN, alpha, gamma, hvorne, ueberstand, rows }: {
  pb: number; ph0: number; phN: number;
  alpha: number; gamma: number; hvorne: number; ueberstand: number;
  rows: Array<{ r: number; la: number; abschnitt: number }>;
}) {
  const tanA = Math.tan(toRad(alpha));
  const tanG = Math.tan(toRad(gamma));
  const T    = hvorne / (tanA - tanG);
  const yF   = T * tanA;

  type RD = {
    r: number; ph: number; coY: number;
    plates: { dispX: number; w: number }[];
    cutBotDX: number; cutTopDX: number;
    abschnitt: number; isUpper: boolean;
  };

  const rds: RD[] = [];
  let coY = 0;
  for (const { r, la, abschnitt } of rows) {
    const ph     = r === 0 ? ph0 : phN;
    const xStart = coY >= hvorne ? (coY - hvorne) / tanG : -ueberstand;
    const sTopW  = Math.min((coY + ph) / tanA, T);
    const cBotDX = Math.max(0, Math.min(coY / tanA, T) - xStart);
    const cTopDX = sTopW - xStart;

    const plates: { dispX: number; w: number }[] = [];
    plates.push({ dispX: 0, w: r === 0 ? pb : la });
    let dX = r === 0 ? pb : la;
    while (dX < cTopDX + 0.1) { plates.push({ dispX: dX, w: pb }); dX += pb; }

    // A row is "upper" if any part of it is above the dormer line (coY+ph > hvorne).
    // This includes the straddle row where coY < hvorne < coY+ph.
    rds.push({ r, ph, coY, plates, cutBotDX: cBotDX, cutTopDX: cTopDX, abschnitt, isUpper: coY + ph > hvorne });
    coY += ph;
  }

  return (
    <div className="space-y-5">
      {rds.map(({ r, ph, coY: rowCoY, plates, cutBotDX, cutTopDX, isUpper, abschnitt }) => {
        // For the last row the ridge (Gaubenpunkt B) falls within the plate height.
        // Use the effective height up to the ridge so both cuts converge correctly.
        const effPh = Math.min(ph, yF - rowCoY);
        // For the straddle row (coY < hvorne < coY+ph) the γ-cut only starts at the
        // height where the plate crosses the dormer line. yEntryRow is 0 for fully
        // upper rows, and (hvorne - coY) for the straddle row.
        const yEntryRow = Math.max(0, hvorne - rowCoY);
        const vGeff = (effPh - yEntryRow) / tanG;
        return (
        <div key={r} className="space-y-2">
          <p className="text-[11px] font-semibold text-mu">Reihe {r + 1}</p>
          <div className="flex flex-wrap gap-x-5 gap-y-4">
            {plates.map(({ dispX, w }, i) => {
              const isLast = i === plates.length - 1;

              // α-cut touches this plate when its x-range overlaps the plate's x-range.
              const hasRightCut = cutBotDX < dispX + w - 0.01 && cutTopDX > dispX + 0.01;
              // Non-last plates: cut exits through the right edge (not the top).
              const rightCutExitRight = hasRightCut && !isLast;

              // Local x where cut enters from the bottom (0 when it enters from the left edge).
              const rightCutLocalBot = hasRightCut ? Math.max(0, cutBotDX - dispX) : 0;
              // Exit x: top of the plate for last plate, right edge (w) for intermediate.
              const rightCutLocalTop = hasRightCut
                ? (isLast ? Math.max(0, cutTopDX - dispX) : w)
                : 0;
              // When the cut's bottom is left of this plate it enters from the left edge.
              const rightCutEntryY = hasRightCut && cutBotDX < dispX - 0.01
                ? Math.max(0, (dispX - cutBotDX) * tanA)
                : 0;

              // cutTopY: for last plate = effPh (exits top); for intermediate = height at right edge.
              const plateCutTopY = (!hasRightCut || isLast)
                ? effPh
                : Math.min(rightCutEntryY + (w - rightCutLocalBot) * tanA, ph);

              // γ-cut: applies when row is upper and cut hasn't passed this plate yet.
              const lcRaw       = isUpper ? vGeff - dispX : -1;
              const hasLeftCut  = lcRaw > 0 && (!isLast || lcRaw <= rightCutLocalTop + 0.01);
              const leftCutLocalTop = hasLeftCut ? Math.min(lcRaw, w) : 0;
              const leftCutEntryY   = hasLeftCut ? yEntryRow + dispX * tanG : 0;
              const leftCutExitY    = hasLeftCut
                ? (leftCutLocalTop < w - 0.01 ? effPh : yEntryRow + (dispX + w) * tanG)
                : effPh;
              const plateAbschnitt = isLast ? abschnitt : 0;
              return (
                <div key={i} className="space-y-1">
                  <p className="text-[9px] font-semibold text-dm">Platte {i + 1}</p>
                  <EinzelplatteSVG
                    platteW={w} platteH={ph} cutTopY={effPh}
                    alpha={alpha} gamma={gamma}
                    hasRightCut={hasRightCut}
                    rightCutLocalBot={rightCutLocalBot}
                    rightCutLocalTop={rightCutLocalTop}
                    rightCutEntryY={rightCutEntryY}
                    abschnitt={plateAbschnitt}
                    hasLeftCut={hasLeftCut}
                    leftCutLocalTop={leftCutLocalTop}
                    leftCutEntryY={leftCutEntryY}
                    leftCutExitY={leftCutExitY}
                    rightCutExitRight={rightCutExitRight}
                    alphaCutRightY={rightCutExitRight ? plateCutTopY : undefined}
                  />
                </div>
              );
            })}
          </div>
        </div>
        );
      })}
    </div>
  );
}

// ─── Schräg-Zuschnittplan ─────────────────────────────────────────────────────

function EinzelplatteSVGSchraeg({
  platteW, platteH,
  hasCut, cutBotLocal, cutTopLocal,
  hasVkCut, vkBotLocal, vkTopLocal,
  abschnitt, gamma, tanAlpha, rowColor,
}: {
  platteW: number; platteH: number;
  hasCut: boolean; cutBotLocal: number; cutTopLocal: number;
  hasVkCut: boolean; vkBotLocal: number; vkTopLocal: number;
  abschnitt: number; gamma: number; tanAlpha: number; rowColor: string;
}) {
  const sc  = Math.min(100 / platteH, 240 / platteW);
  const bW  = platteW * sc;
  const bH  = platteH * sc;
  const PAD_L = 8; const PAD_R = 26;
  const anyDim = hasCut || hasVkCut;
  const PAD_T = anyDim ? 36 : 14; const PAD_B = 26;
  const SVG_W = Math.round(bW + PAD_L + PAD_R);
  const SVG_H = Math.round(bH + PAD_T + PAD_B);

  const sx = (x: number) => PAD_L + x * sc;
  const sy = (y: number) => PAD_T + (platteH - y) * sc;
  const xL = sx(0), xR = sx(platteW);
  const yB = sy(0), yT = sy(platteH);

  // ── Gaubendach cut (right side, left-leaning) ────────────────────────────────
  // Goes from (cutBotLocal, 0) → (cutTopLocal, platteH). cutTopLocal < cutBotLocal.
  const verstichmass = cutBotLocal - cutTopLocal;
  const botEntersBottom = hasCut && cutBotLocal >= 0 && cutBotLocal <= platteW;
  const botEntersRight  = hasCut && cutBotLocal > platteW;
  const topExitsTop     = hasCut && cutTopLocal >= 0 && cutTopLocal <= platteW;
  const topExitsLeft    = hasCut && cutTopLocal < 0;
  const rightEntryH = (botEntersRight && verstichmass > 0)
    ? platteH * (cutBotLocal - platteW) / verstichmass : 0;
  const leftExitH   = (topExitsLeft && verstichmass > 0)
    ? platteH * cutBotLocal / verstichmass : 0;
  const entX = botEntersBottom ? sx(cutBotLocal) : xR;
  const entY = botEntersBottom ? yB : sy(rightEntryH);
  const exX  = topExitsTop ? sx(cutTopLocal) : xL;
  const exY  = topExitsTop ? yT : sy(leftExitH);

  // ── Vorderkante cut (left side, right-leaning) ───────────────────────────────
  // World-x formula from ecken(): x_world = (start + x_local)·cosA − y_local·sinA
  // Setting x_world=0: x_local = y_local·tanA − start
  // → at y=0:  vkBotLocal = -start   (plate-local x where VK hits bottom)
  // → at y=ph: vkTopLocal = ph·tanA − start
  // No co term — the perpendicular row offset doesn't affect x_world.
  //
  // Cases based on entry and exit edges:
  //   A: enters bottom (vkBotLocal ≥ 0), exits top  (vkTopLocal ≤ len)
  //   B: enters bottom (vkBotLocal ≥ 0), exits right (vkTopLocal > len)
  //   C: enters left   (vkBotLocal < 0), exits top  (vkTopLocal ≤ len)
  //   D: enters left   (vkBotLocal < 0), exits right (vkTopLocal > len)

  const vkEntersBottom = hasVkCut && vkBotLocal >= -0.01;
  const vkEntersLeft   = hasVkCut && vkBotLocal < -0.01;
  const vkExitsTop     = hasVkCut && vkTopLocal <= platteW + 0.01;
  const vkExitsRight   = hasVkCut && vkTopLocal > platteW + 0.01;

  // Height where VK enters left edge: x_local=0 → y_local = start/tanA = -vkBotLocal/tanA
  const vkLeftEntryH = (vkEntersLeft && tanAlpha > 0) ? (-vkBotLocal / tanAlpha) : 0;
  // Height where VK exits right edge: x_local=len → y_local = (len-vkBotLocal)/tanA
  const vkRightExitH = (vkExitsRight && tanAlpha > 0) ? ((platteW - vkBotLocal) / tanAlpha) : platteH;

  const vkEntX = vkEntersBottom ? sx(Math.max(0, vkBotLocal)) : xL;
  const vkEntY = vkEntersBottom ? yB : sy(vkLeftEntryH);
  const vkExX  = vkExitsTop ? sx(Math.min(vkTopLocal, platteW)) : xR;
  const vkExY  = vkExitsTop ? yT : sy(vkRightExitH);

  // Vorderkante waste polygon (left of cut)
  let vkWastePts = '';
  if (hasVkCut) {
    if (vkEntersBottom && vkExitsTop) {
      // Case A: trapezoid (or triangle when vkBotLocal=0)
      vkWastePts = `${xL},${yB} ${vkEntX},${yB} ${vkExX},${yT} ${xL},${yT}`;
    } else if (vkEntersBottom && vkExitsRight) {
      // Case B: pentagon
      vkWastePts = `${xL},${yB} ${vkEntX},${yB} ${xR},${vkExY} ${xR},${yT} ${xL},${yT}`;
    } else if (vkEntersLeft && vkExitsTop) {
      // Case C: triangle
      vkWastePts = `${xL},${vkEntY} ${vkExX},${yT} ${xL},${yT}`;
    } else {
      // Case D: quad
      vkWastePts = `${xL},${vkEntY} ${xR},${vkExY} ${xR},${yT} ${xL},${yT}`;
    }
  }

  // ── Gaubendach waste polygon (right of cut) ──────────────────────────────────
  let wastePts = '';
  if (hasCut) {
    if (botEntersBottom && topExitsTop) {
      wastePts = `${entX},${yB} ${xR},${yB} ${xR},${yT} ${exX},${yT}`;
    } else if (botEntersBottom && topExitsLeft) {
      wastePts = `${entX},${yB} ${xR},${yB} ${xR},${yT} ${xL},${yT} ${xL},${exY}`;
    } else if (botEntersRight && topExitsTop) {
      wastePts = `${entX},${entY} ${xR},${yT} ${exX},${yT}`;
    } else {
      wastePts = `${entX},${entY} ${xR},${yT} ${xL},${yT} ${xL},${exY}`;
    }
  }

  // ── Usable zone polygon ──────────────────────────────────────────────────────
  let usedPts: string;
  if (!hasCut && !hasVkCut) {
    usedPts = `${xL},${yB} ${xR},${yB} ${xR},${yT} ${xL},${yT}`;
  } else if (!hasCut) {
    // Only VK cut
    if (vkEntersBottom && vkExitsTop)   usedPts = `${vkEntX},${yB} ${xR},${yB} ${xR},${yT} ${vkExX},${yT}`;
    else if (vkEntersBottom)             usedPts = `${vkEntX},${yB} ${xR},${yB} ${xR},${vkExY}`;  // Case B triangle
    else if (vkEntersLeft && vkExitsTop) usedPts = `${xL},${yB} ${xR},${yB} ${xR},${yT} ${vkExX},${yT} ${xL},${vkEntY}`;
    else                                 usedPts = `${xL},${yB} ${xR},${yB} ${xR},${vkExY} ${xL},${vkEntY}`; // Case D
  } else if (!hasVkCut) {
    // Only Gaubendach cut
    if (botEntersBottom && topExitsTop)   usedPts = `${xL},${yB} ${entX},${yB} ${exX},${yT} ${xL},${yT}`;
    else if (botEntersBottom && topExitsLeft) usedPts = `${xL},${yB} ${entX},${yB} ${xL},${exY}`;
    else if (botEntersRight && topExitsTop)   usedPts = `${xL},${yB} ${xR},${yB} ${entX},${entY} ${exX},${yT} ${xL},${yT}`;
    else                                      usedPts = `${xL},${yB} ${xR},${yB} ${entX},${entY} ${xL},${exY}`;
  } else {
    // Both cuts — handle most common combinations; fallback to full-rect outline
    if (vkEntersBottom && vkExitsTop && botEntersBottom && topExitsTop) {
      usedPts = `${vkEntX},${yB} ${entX},${yB} ${exX},${yT} ${vkExX},${yT}`;
    } else if (vkEntersBottom && vkExitsRight && botEntersBottom && topExitsTop) {
      usedPts = `${vkEntX},${yB} ${entX},${yB} ${exX},${yT} ${xR},${yT} ${xR},${vkExY}`;
    } else if (vkEntersLeft && vkExitsTop && botEntersBottom && topExitsTop) {
      usedPts = `${xL},${yB} ${entX},${yB} ${exX},${yT} ${vkExX},${yT} ${xL},${vkEntY}`;
    } else if (vkEntersLeft && vkExitsTop && botEntersBottom && topExitsLeft) {
      // Gaubendach cuts left edge entirely → small triangle in lower-left.
      // VK waste is in the Gaubendach waste zone (above exY on left edge).
      usedPts = `${xL},${yB} ${entX},${yB} ${xL},${exY}`;
    } else {
      // Generic fallback: draw VK-bounded left, full right
      usedPts = `${vkEntX},${yB} ${xR},${yB} ${xR},${yT} ${vkExX},${yT}`;
    }
  }

  const dimY = yT - 10;

  return (
    <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ width: SVG_W, height: SVG_H }} overflow="visible">
      <polygon points={usedPts}
        fill={rowColor} fillOpacity="0.2" stroke={rowColor} strokeWidth="1.2" />
      {hasVkCut && vkWastePts && (
        <polygon points={vkWastePts}
          fill="#d47070" fillOpacity="0.15" stroke="#d47070"
          strokeWidth="1" strokeDasharray="4 2" />
      )}
      {hasCut && wastePts && (
        <polygon points={wastePts}
          fill="#c9924a" fillOpacity="0.15" stroke="#c9924a"
          strokeWidth="1" strokeDasharray="4 2" />
      )}
      {/* Vorderkante cut line (red, right-leaning) */}
      {hasVkCut && (
        <line x1={vkEntX} y1={vkEntY} x2={vkExX} y2={vkExY}
          stroke="#d47070" strokeWidth="1.5" strokeDasharray="5 2" />
      )}
      {/* Gaubendach cut line (blue, left-leaning) */}
      {hasCut && (
        <line x1={entX} y1={entY} x2={exX} y2={exY}
          stroke="#6fa8d4" strokeWidth="1.5" strokeDasharray="5 2" />
      )}
      {/* Anschnitt links: bottom waste when entering from bottom */}
      {hasVkCut && vkEntersBottom && vkBotLocal > 0.3 && (
        <HDimLine x1={xL} x2={vkEntX} y={dimY}
          label={`vα ${fmt(round1(vkBotLocal))} cm`}
          col="#d47070" above={true} />
      )}
      {/* Anschnitt links: top exit width when entering from left edge */}
      {hasVkCut && vkEntersLeft && vkExitsTop && vkTopLocal > 0.3 && (
        <HDimLine x1={xL} x2={vkExX} y={dimY}
          label={`vα ${fmt(round1(Math.min(vkTopLocal, platteW)))} cm`}
          col="#d47070" above={true} />
      )}
      {/* vγ dimension */}
      {hasCut && botEntersBottom && topExitsTop && (
        <HDimLine x1={exX} x2={entX} y={dimY}
          label={`vγ ${fmt(round1(verstichmass))} cm`}
          col="#6fa8d4" above={true} />
      )}
      {/* Abschnitt (right waste, last plate only) */}
      {hasCut && abschnitt > 0.3 && botEntersBottom && (
        <HDimLine x1={entX} x2={xR} y={dimY}
          label={`${fmt(round1(abschnitt))} cm`}
          col="#c9924a" above={true} />
      )}
      <HDimLine x1={xL} x2={xR} y={yB + 16}
        label={`${fmt(platteW)} cm`} col="#888" above={false} />
      <line x1={xR + 8} y1={yB} x2={xR + 8} y2={yT} stroke="#aaa" strokeWidth="0.8" />
      <line x1={xR + 5} y1={yB} x2={xR + 11} y2={yB} stroke="#aaa" strokeWidth="0.8" />
      <line x1={xR + 5} y1={yT} x2={xR + 11} y2={yT} stroke="#aaa" strokeWidth="0.8" />
      <text x={xR + 14} y={(yB + yT) / 2} fontSize="7.5" fill="#888"
        dominantBaseline="middle" fontWeight="600">{fmt(platteH)} cm</text>
      {hasVkCut && (
        <text x={vkEntX + 2} y={yT + 11} fontSize="7" fill="#d47070" fontWeight="600">
          α
        </text>
      )}
      {hasCut && (
        <text x={exX + 2} y={yT + 11} fontSize="7" fill="#6fa8d4" fontWeight="600">
          γ={gamma}°
        </text>
      )}
    </svg>
  );
}

function AllePlattenSkizzeSchraeg({ pb, ph0, phN, alpha, gamma, ueberstand, hvorne, rows }: {
  pb: number; ph0: number; phN: number;
  alpha: number; gamma: number; ueberstand: number; hvorne: number;
  rows: Array<{ r: number; la: number; abschnitt: number }>;
}) {
  const cosA  = Math.cos(toRad(alpha));
  const tanA  = Math.tan(toRad(alpha));
  const cosG  = Math.cos(toRad(gamma));
  const sinAG = Math.sin(toRad(alpha - gamma));
  const cosAG = Math.cos(toRad(alpha - gamma));
  const uSlope = ueberstand / cosA;

  let co = 0;
  const rds = rows.map(({ r, la, abschnitt }) => {
    const ph  = r === 0 ? ph0 : phN;
    const sEnd = (hvorne - co / cosA) * cosG / sinAG;
    const verstichmassG = ph * cosAG / sinAG;

    const plates: { start: number; len: number }[] = [];
    if (r === 0) {
      let s = -uSlope;
      while (s < sEnd) { plates.push({ start: s, len: pb }); s += pb; }
    } else {
      plates.push({ start: -uSlope, len: la });
      let s = -uSlope + la;
      while (s < sEnd) { plates.push({ start: s, len: pb }); s += pb; }
    }
    co += ph;
    return { r, ph, sEnd, plates, abschnitt, verstichmassG };
  });

  return (
    <div className="space-y-5">
      {rds.map(({ r, ph, sEnd, plates, abschnitt, verstichmassG }) => {
        const rowColor = r === 0 ? '#6fa8d4' : '#7fb87a';
        return (
          <div key={r} className="space-y-2">
            <p className="text-[11px] font-semibold text-mu">Reihe {r + 1}</p>
            <div className="flex flex-wrap gap-x-5 gap-y-4">
              {plates.map(({ start, len }, i) => {
                const isLast = i === plates.length - 1;

                // Gaubendach cut (right side, left-leaning)
                const cutBotLocal = sEnd - start;
                const cutTopLocal = sEnd - verstichmassG - start;
                const hasCut = cutBotLocal > 0.01 && cutTopLocal < len - 0.01;

                // Vorderkante cut (left side, right-leaning):
                // World-x formula: x_world = (start + x_local)·cosA − y_local·sinA
                // Setting x_world=0 → x_local = y_local·tanA − start
                // No co term — perpendicular row offset doesn't affect world-x.
                const vkBotLocal = -start;           // VK hits bottom at this plate-local x
                const vkTopLocal = ph * tanA - start; // VK hits top at this plate-local x
                const hasVkCut = vkTopLocal > 0.01 && vkBotLocal < len - 0.01;

                return (
                  <div key={i} className="space-y-1">
                    <p className="text-[9px] font-semibold text-dm">Platte {i + 1}</p>
                    <EinzelplatteSVGSchraeg
                      platteW={len} platteH={ph}
                      hasCut={hasCut}
                      cutBotLocal={hasCut ? cutBotLocal : 0}
                      cutTopLocal={hasCut ? cutTopLocal : 0}
                      hasVkCut={hasVkCut}
                      vkBotLocal={hasVkCut ? vkBotLocal : 0}
                      vkTopLocal={hasVkCut ? vkTopLocal : 0}
                      abschnitt={isLast ? abschnitt : 0}
                      gamma={gamma}
                      tanAlpha={tanA}
                      rowColor={rowColor}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Sub-Komponenten ──────────────────────────────────────────────────────────

function Gruppe({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-label text-mu">{label}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

interface EFProps {
  label: string; einheit: string; wert: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  min?: number; max?: number; step?: number; hinweis?: string;
}
function EingabeFeld({ label, einheit, wert, onChange, min, max, step, hinweis }: EFProps) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold text-tx">{label}</label>
      <div className="flex overflow-hidden rounded-md border border-border bg-s2 focus-within:ring-2 focus-within:ring-oak/40">
        <input
          type="number" value={wert} onChange={onChange}
          min={min} max={max} step={step} inputMode="decimal"
          onFocus={(ev) => ev.target.select()}
          className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-tx outline-none"
        />
        <span className="shrink-0 border-l border-border bg-s3 px-3 py-2.5 text-xs font-semibold text-mu">
          {einheit}
        </span>
      </div>
      {hinweis && <p className="text-[11px] text-mu">{hinweis}</p>}
    </div>
  );
}


// ─── Zuschnittansicht ─────────────────────────────────────────────────────────

interface SchnittInfo {
  label: string;
  anzeigeGrad: number;
  zeichenGrad: number;
  verstichmass?: boolean;
}

interface DimLinien {
  gesamtlaenge: number;  // obere Gesamtmaßlinie (Spitze–Spitze)
  hauptVers: number;     // untere Teilmaßlinie links  = b·tan α
  mitte: number;         // untere Teilmaßlinie Mitte
  gaubeVers: number;     // untere Teilmaßlinie rechts = b·tan γ
  gesamtlaengePrefix?: string; // optionales Kürzel vor dem Maß, z.B. "x = "
  mittePrefix?: string;        // optionales Kürzel vor dem Mittelmaß, z.B. "y = "
}

function DimSeg({ x1, x2, y, label, above }: {
  x1: number; x2: number; y: number; label: string; above: boolean;
}) {
  const mid = (x1 + x2) / 2;
  const textY = above ? y - 4 : y + 9;
  const c = "rgba(255,255,255,0.28)";
  const ct = "rgba(255,255,255,0.55)";
  const tH = 3;
  return (
    <g>
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={c} strokeWidth="0.8" />
      <line x1={x1} y1={y - tH} x2={x1} y2={y + tH} stroke={c} strokeWidth="0.8" />
      <line x1={x2} y1={y - tH} x2={x2} y2={y + tH} stroke={c} strokeWidth="0.8" />
      <text x={mid} y={textY} textAnchor="middle" fontSize="8.5" fill={ct}>{label}</text>
    </g>
  );
}


function LotholzTabelle({ lothölzer, alpha, gamma, b }: {
  lothölzer: Lotholz[]; alpha: number; gamma: number; b: number;
}) {
  const cosA = Math.cos(toRad(alpha));
  const cosG = Math.cos(toRad(gamma));
  const schmiegeA = b * Math.tan(toRad(alpha));
  const schmiegeG = b * Math.tan(toRad(gamma));
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[340px] text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="pb-2 font-semibold text-tx">Nr.</th>
            <th className="pb-2 text-right font-semibold text-tx">Höhe x<br /><span className="font-normal text-mu">cm</span></th>
            <th className="pb-2 text-right font-semibold text-tx">Höhe y<br /><span className="font-normal text-mu">cm</span></th>
            <th className="pb-2 text-right text-xs font-semibold text-mu">Bundmaß<br />HD cm</th>
            <th className="pb-2 text-right text-xs font-semibold text-mu">Bundmaß<br />GD cm</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {lothölzer.map((lot) => {
            const hoehey = lot.hoehe - schmiegeA - schmiegeG;
            return (
              <tr key={lot.nr}>
                <td className="py-2.5 text-mu">{lot.nr}</td>
                <td className="py-2.5 text-right tabular-nums font-bold text-oak">{fmt(round1(lot.hoehe))}</td>
                <td className="py-2.5 text-right tabular-nums font-bold text-pine">{fmt(round1(hoehey))}</td>
                <td className="py-2.5 text-right tabular-nums text-tx">{fmt(round1(lot.abstand / cosA))}</td>
                <td className="py-2.5 text-right tabular-nums text-tx">{fmt(round1(lot.abstand / cosG))}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-1.5 text-[10px] text-dm">
        x = Gesamtlänge · y = Mittelmaß (ohne Schmiegen) · Bundmaß = Abstand von VK entlang des Holzes
      </p>
    </div>
  );
}

function GaubenwangeSkizze({
  lothölzer, L_eckstaender, T, b, alpha, gamma,
}: {
  lothölzer: Lotholz[]; L_eckstaender: number;
  T: number; b: number; alpha: number; gamma: number;
}) {
  const W = 300;
  const lP = 30; const rP = 16;
  const tP = 10; const sh = 70;
  const sw = W - lP - rP;

  const tanA = Math.tan(toRad(alpha));
  const tanG = Math.tan(toRad(gamma));
  const cosA = Math.cos(toRad(alpha));
  const cosG = Math.cos(toRad(gamma));

  // Hauptdach steigt an — maxY immer T·tanα (der Firstpunkt ist der höchste)
  const maxY = T * tanA;
  const scaleX = sw / T;
  const scaleY = sh / maxY;

  const yBase = tP + sh; // SVG-y der Vorderkante unten
  const rx = (x: number) => lP + x * scaleX;
  const ry = (y: number) => yBase - y * scaleY;

  const vkTopY = ry(L_eckstaender); // Eckständer oben
  const firstX = rx(T);
  const firstY = ry(maxY); // = tP (Firstpunkt oben)

  // Senkrechte auf die HD-Linie (zeigt nach unten/außen)
  const hdSx = scaleX; const hdSy = -tanA * scaleY;
  const hdLen = Math.sqrt(hdSx ** 2 + hdSy ** 2);
  const hdPx = -hdSy / hdLen; const hdPy = hdSx / hdLen; // nach unten in SVG

  // Senkrechte auf die GD-Linie (zeigt nach oben/außen)
  const gdSx = firstX - rx(0); const gdSy = firstY - vkTopY;
  const gdLen = Math.sqrt(gdSx ** 2 + gdSy ** 2);
  const gdPx = gdSy / gdLen; const gdPy = -gdSx / gdLen; // nach oben in SVG

  const tickLen = 5;
  const svgH = tP + sh + 42;

  return (
    <svg viewBox={`0 0 ${W} ${svgH}`} className="w-full overflow-visible">
      {/* Hauptdach-Linie (Innenfläche) */}
      <line x1={rx(0)} y1={yBase} x2={firstX} y2={firstY} stroke="#c9924a" strokeWidth="1.5" />
      {/* Gaubendach-Linie (gestrichelt, Innenfläche) */}
      <line x1={rx(0)} y1={vkTopY} x2={firstX} y2={firstY} stroke="#c9924a" strokeWidth="1.5" strokeDasharray="5 2" />
      {/* Eckständer */}
      <line x1={rx(0)} y1={yBase} x2={rx(0)} y2={vkTopY} stroke="#7fb87a" strokeWidth="3" />

      {/* Beschriftungen Outline */}
      <text x={rx(0) - 4} y={(yBase + vkTopY) / 2} fontSize="7" fill="#7fb87a"
        textAnchor="end" dominantBaseline="middle">{fmt(round1(L_eckstaender))} cm</text>
      <text x={rx(0)} y={yBase + 9} fontSize="7" fill="#504840" textAnchor="middle">VK</text>
      <text x={firstX + 3} y={firstY + 1} fontSize="7" fill="#504840" dominantBaseline="middle">F</text>
      <text x={rx(0) + 6} y={yBase - 4} fontSize="6.5" fill="rgba(201,146,74,0.7)">α {alpha}°</text>
      <text x={rx(0) + 6} y={vkTopY - 4} fontSize="6.5" fill="rgba(201,146,74,0.7)">γ {gamma}°</text>

      {/* Gaubenständer */}
      {lothölzer.map((lot) => {
        const x = lot.abstand;
        const svgX = rx(x);
        const botY = ry(x * tanA);            // Auflagepunkt auf HD-Fläche
        const topY = ry(L_eckstaender + x * tanG); // Auflagepunkt auf GD-Fläche
        const anschHD = fmt(round1(x / cosA));
        const anschGD = fmt(round1(x / cosG));

        return (
          <g key={lot.nr}>
            {/* Lotrechter Balken */}
            <line x1={svgX} y1={botY} x2={svgX} y2={topY} stroke="#6fa8d4" strokeWidth="1.5" />
            {/* Höhenmaß rechts des Balkens */}
            <text x={svgX + 3} y={(botY + topY) / 2} fontSize="6.5" fill="#6fa8d4" dominantBaseline="middle">
              {fmt(round1(lot.hoehe))} cm
            </text>

            {/* Tick auf HD-Linie */}
            <line
              x1={svgX - hdPx * tickLen} y1={botY - hdPy * tickLen}
              x2={svgX + hdPx * tickLen} y2={botY + hdPy * tickLen}
              stroke="#c9924a" strokeWidth="1"
            />
            {/* Tick auf GD-Linie */}
            <line
              x1={svgX - gdPx * tickLen} y1={topY - gdPy * tickLen}
              x2={svgX + gdPx * tickLen} y2={topY + gdPy * tickLen}
              stroke="#c9924a" strokeWidth="1" strokeDasharray="2 1"
            />

            {/* Anschlag-Maße unterhalb der Skizze */}
            <text x={svgX} y={yBase + 20} fontSize="7" fill="#c9924a" textAnchor="middle">{anschHD} cm</text>
            <text x={svgX} y={yBase + 32} fontSize="7" fill="rgba(201,146,74,0.65)" textAnchor="middle">{anschGD} cm</text>
          </g>
        );
      })}

      {/* Zeilen-Labels links */}
      <text x={lP - 4} y={yBase + 20} fontSize="6.5" fill="#504840" textAnchor="end" dominantBaseline="middle">HD:</text>
      <text x={lP - 4} y={yBase + 32} fontSize="6.5" fill="#504840" textAnchor="end" dominantBaseline="middle">GD:</text>
    </svg>
  );
}

function HolzSchematik({
  name, laenge, farbe, links, rechts,
  linksGekippt = false, rechtsGekippt = false, dimLinien,
}: {
  name: string; laenge: number; farbe: string;
  links: SchnittInfo; rechts: SchnittInfo;
  linksGekippt?: boolean; rechtsGekippt?: boolean;
  dimLinien?: DimLinien;
}) {
  const W = 300; const Ht = 40; const Yoff = 4;
  const ohL = Math.min(Ht * Math.tan(toRad(links.zeichenGrad)), W / 2 - 5);
  const ohR = Math.min(Ht * Math.tan(toRad(rechts.zeichenGrad)), W / 2 - 5);

  const TLx = linksGekippt ? 0 : ohL;
  const BLx = linksGekippt ? ohL : 0;
  const TRx = rechtsGekippt ? W : W - ohR;
  const BRx = rechtsGekippt ? W - ohR : W;

  const pts = [`${TLx},${Yoff}`, `${TRx},${Yoff}`, `${BRx},${Yoff + Ht}`, `${BLx},${Yoff + Ht}`].join(" ");

  const arcL = linksGekippt
    ? `M 0,${Yoff} L ${ohL},${Yoff + Ht} M ${ohL},${Yoff} L ${ohL},${Yoff + Ht}`
    : `M ${ohL},${Yoff} L 0,${Yoff + Ht} M ${ohL},${Yoff} L ${ohL},${Yoff + Ht}`;
  const arcR = rechtsGekippt
    ? `M ${W},${Yoff} L ${W - ohR},${Yoff + Ht} M ${W - ohR},${Yoff} L ${W - ohR},${Yoff + Ht}`
    : `M ${W - ohR},${Yoff} L ${W},${Yoff + Ht} M ${W - ohR},${Yoff} L ${W - ohR},${Yoff + Ht}`;

  const extraTop = dimLinien ? 28 : 0;
  const extraBot = dimLinien ? 26 : 0;
  const dimAboveY = -12;
  const dimBelowY = Yoff + Ht + 14;
  const extC = "rgba(255,255,255,0.18)";

  // Rundungs-sicherer Check: Mitte aus bereits gerundeten Werten ableiten
  // → verhindert 1mm-Differenz durch unabhängiges Runden
  const dim10   = (v: number) => Math.round(v * 10);
  const dimGL   = dimLinien ? dim10(dimLinien.gesamtlaenge) : 0;
  const dimHV   = dimLinien ? dim10(dimLinien.hauptVers)   : 0;
  const dimGV   = dimLinien ? dim10(dimLinien.gaubeVers)   : 0;
  const dimMi   = dimLinien ? dimGL - dimHV - dimGV        : 0; // exakte Ganzzahl-Arithmetik

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold text-tx">{name}</span>
        <span className="tabular-nums text-sm font-bold text-oak">{fmt(round1(laenge))} cm</span>
      </div>

      <svg
        viewBox={`0 ${-extraTop} ${W} ${Yoff + Ht + 2 + extraTop + extraBot}`}
        className="w-full overflow-visible"
      >
        <polygon points={pts} fill={farbe} fillOpacity="0.85" stroke="none" />
        <path d={arcL} stroke="rgba(255,255,255,0.35)" strokeWidth="1" fill="none" />
        <path d={arcR} stroke="rgba(255,255,255,0.35)" strokeWidth="1" fill="none" />

        {dimLinien && (
          <>
            {/* Verlängerungslinien oben */}
            <line x1={0}   y1={Yoff} x2={0}   y2={dimAboveY + 3} stroke={extC} strokeWidth="0.6" strokeDasharray="2 2" />
            <line x1={W}   y1={Yoff} x2={W}   y2={dimAboveY + 3} stroke={extC} strokeWidth="0.6" strokeDasharray="2 2" />
            {/* Verlängerungslinien unten — y-Start am tatsächlichen Eckpunkt */}
            <line x1={0}       y1={linksGekippt ? Yoff : Yoff + Ht}  x2={0}       y2={dimBelowY - 3} stroke={extC} strokeWidth="0.6" strokeDasharray="2 2" />
            <line x1={ohL}     y1={linksGekippt ? Yoff + Ht : Yoff}  x2={ohL}     y2={dimBelowY - 3} stroke={extC} strokeWidth="0.6" strokeDasharray="2 2" />
            <line x1={W - ohR} y1={rechtsGekippt ? Yoff + Ht : Yoff} x2={W - ohR} y2={dimBelowY - 3} stroke={extC} strokeWidth="0.6" strokeDasharray="2 2" />
            <line x1={W}       y1={rechtsGekippt ? Yoff : Yoff + Ht} x2={W}       y2={dimBelowY - 3} stroke={extC} strokeWidth="0.6" strokeDasharray="2 2" />

            {/* Oben: Gesamtlänge (Spitze–Spitze) */}
            <DimSeg x1={0} x2={W} y={dimAboveY} label={`${dimLinien.gesamtlaengePrefix ?? ""}${fmt(dimGL / 10)} cm`} above={true} />

            {/* Unten: dreiteilige Maßkette */}
            <DimSeg x1={0}       x2={ohL}     y={dimBelowY} label={`↕ ${fmt(dimHV / 10)} cm`}  above={false} />
            <DimSeg x1={ohL}     x2={W - ohR} y={dimBelowY} label={`${dimLinien.mittePrefix ?? ""}${fmt(dimMi / 10)} cm`}  above={false} />
            <DimSeg x1={W - ohR} x2={W}       y={dimBelowY} label={`↕ ${fmt(dimGV / 10)} cm`}  above={false} />
          </>
        )}
      </svg>

      <div className="grid grid-cols-2 gap-1">
        <div className="rounded-md bg-s2 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wide text-mu">{links.label}</div>
          <div className="text-lg font-bold text-tx">{fmt(links.anzeigeGrad, 1)}°</div>
        </div>
        <div className="rounded-md bg-s2 px-3 py-2 text-right">
          <div className="text-[10px] uppercase tracking-wide text-mu">{rechts.label}</div>
          <div className="text-lg font-bold text-tx">{fmt(rechts.anzeigeGrad, 1)}°</div>
        </div>
      </div>
    </div>
  );
}

// ─── SVG Seitenansicht ────────────────────────────────────────────────────────
//
// Alle Hölzer als Polygone (4 Ecken) gezeichnet — kein Stroke-based rendering.
// Querschnitte:
//   Hauptdachholz: Außenfläche (y=x·tanα) → Innenfläche (y=refH(x)=lotA+x·tanα)
//   Gaubenholz:    Innenfläche (y=refG(x)=(hvorne-lotG)+x·tanγ) → Außenfläche (y=hvorne+x·tanγ)
//   Eckständer/Lothölzer: Parallelogramm zwischen refH und refG

function SeitenansichtSVG({
  T, hvorne, alphaDeg, gammaDeg, b, t, lothölzer,
}: {
  T: number; hvorne: number;
  alphaDeg: number; gammaDeg: number;
  b: number; t: number;
  lothölzer: Lotholz[];
}) {
  const W = 560; const H = 420;
  const PL = 55; const PR = 20; const PT = 24; const PB = 42;
  const dW = W - PL - PR;
  const dH = H - PT - PB;

  const alphaRad = toRad(alphaDeg);
  const gammaRad = toRad(gammaDeg);
  const tanA = Math.tan(alphaRad);
  const tanG = Math.tan(gammaRad);

  const cosA = Math.cos(alphaRad);
  const cosG = Math.cos(gammaRad);
  const lotA = t * cosA;
  const lotG = t * cosG;
  const innerVorne = hvorne - lotA - lotG;

  // SVG-Geometrie: senkrechte Holzdicke = b für alle Hölzer
  // Für ein geneigtes Holz gilt: senkrechter Abstand = vertikaler Abstand × cos(α)
  // → vertikaler Abstand = b / cos(α), damit senkrechte Breite = b
  const outerH = (x: number) => x * tanA;           // Hauptdach Außenfläche (Unterkante)
  const outerG = (x: number) => hvorne + x * tanG;  // Gaube Außenfläche (Oberkante)

  const svgRefH = (x: number) => b / cosA + x * tanA;
  const svgRefG = (x: number) => (hvorne - b / cosG) + x * tanG;

  // SVG-Innerer First: svgRefH(x) = svgRefG(x)
  // b/cosA + x*tanA = (hvorne - b/cosG) + x*tanG
  // x = (hvorne - b/cosA - b/cosG) / (tanA - tanG)
  const svgT = (hvorne - b / cosA - b / cosG) / (tanA - tanG);
  const svgYInnerFirst = svgRefH(svgT);

  // SVG-Spitzpunkt: outerG(x) = svgRefH(x)
  // hvorne + x*tanG = b/cosA + x*tanA → x = (hvorne - b/cosA) / (tanA - tanG)
  const svgT_gaubeFirst = (hvorne - b / cosA) / (tanA - tanG);
  const svgYSpitz = svgRefH(svgT_gaubeFirst);

  // Äußerer First (Firstspitze): outerH = outerG → kein Lotschnitt, geometrisch korrekt
  const T_outer     = hvorne / (tanA - tanG);
  const yOuterFirst = T_outer * tanA;

  const yMin = 0;
  const yMax = yOuterFirst; // höchster Punkt = Firstspitze

  const scaleX = dW / T_outer;
  const scaleY = dH / (yMax - yMin);
  const scale  = Math.min(scaleX, scaleY) * 0.92;

  const sx = (x: number) => PL + x * scale;
  const sy = (y: number) => PT + (yMax - y) * scale;

  const Cx = sx(T); // x-Koordinate innerer First (Bemaßung T)

  // Polygon-Helper
  const pts = (...pairs: [number, number][]) =>
    pairs.map(([x, y]) => `${sx(x)},${sy(y)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-label="Seitenansicht Gaubenwange">
      {/* Grid */}
      <defs>
        <pattern id="gw-grid" width={Math.max(8, scale * 50)} height={Math.max(8, scale * 50)}
          patternUnits="userSpaceOnUse" x={PL} y={PT}>
          <path d={`M ${Math.max(8, scale * 50)} 0 L 0 0 0 ${Math.max(8, scale * 50)}`}
            fill="none" stroke="#2e2a1e" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect x={PL} y={PT} width={dW} height={dH} fill="url(#gw-grid)" rx="4" />

      {/* ── Hauptdachholz ── Außenfläche (Unterkante) → Firstspitze → Spitzpunkt → SVG-Innenfläche */}
      <polygon
        points={pts(
          [0,              outerH(0)],      // Vorne unten  (Außenfläche)
          [T_outer,        yOuterFirst],    // Firstspitze  (kein Lotschnitt)
          [svgT_gaubeFirst, svgYSpitz],     // Spitzpunkt   (SVG-Innenfläche endet hier)
          [0,              svgRefH(0)],     // Vorne oben   (SVG-Innenfläche)
        )}
        fill="#c9924a" fillOpacity="0.9" stroke="none"
      />

      {/* ── Gaubenholz ── schmiegt sich auf SVG-Innenfläche des Hauptdachholzes */}
      <polygon
        points={pts(
          [0,              svgRefG(0)],     // Vorne unten  (SVG-Innenfläche)
          [svgT,           svgYInnerFirst], // SVG-Innerer First
          [svgT_gaubeFirst, svgYSpitz],     // Spitzpunkt   (läuft spitz aus)
          [0,              outerG(0)],      // Vorne oben   (Außenfläche)
        )}
        fill="#c9924a" fillOpacity="0.9" stroke="none"
      />

      {/* ── Lothölzer ── Parallelogramme zwischen svgRefH und svgRefG */}
      {lothölzer.map((lot) => {
        const x0 = Math.max(b, lot.abstand - b / 2);
        const x1 = Math.min(T - 0.1, lot.abstand + b / 2);
        return (
          <polygon key={lot.nr}
            points={pts([x0, svgRefH(x0)], [x1, svgRefH(x1)], [x1, svgRefG(x1)], [x0, svgRefG(x0)])}
            fill="#6fa8d4" fillOpacity="0.85" stroke="none"
          />
        );
      })}

      {/* ── Gaubeneckständer ── Parallelogramm von x=0 bis x=b */}
      <polygon
        points={pts([0, svgRefH(0)], [b, svgRefH(b)], [b, svgRefG(b)], [0, svgRefG(0)])}
        fill="#7fb87a" fillOpacity="0.85" stroke="none"
      />

      {/* ── Bemaßung: Gesamthöhe hvorne (links, grau) ── */}
      <line x1={sx(0) - 30} y1={sy(0)}       x2={sx(0) - 30} y2={sy(hvorne)} stroke="#504840" strokeWidth="1" strokeDasharray="3 2" />
      <line x1={sx(0) - 35} y1={sy(0)}       x2={sx(0) - 25} y2={sy(0)}      stroke="#504840" strokeWidth="1" />
      <line x1={sx(0) - 35} y1={sy(hvorne)}  x2={sx(0) - 25} y2={sy(hvorne)} stroke="#504840" strokeWidth="1" />
      <text
        x={sx(0) - 33} y={(sy(0) + sy(hvorne)) / 2 + 4}
        fill="#504840" fontSize="8" textAnchor="middle"
        transform={`rotate(-90,${sx(0) - 33},${(sy(0) + sy(hvorne)) / 2})`}
      >
        {fmt(hvorne)} cm
      </text>

      {/* ── Bemaßung: Eckständer-Innenmass (links, grün) ── */}
      <line x1={sx(0) - 18} y1={sy(svgRefH(0))} x2={sx(0) - 18} y2={sy(svgRefG(0))} stroke="#7fb87a" strokeWidth="1.5" />
      <line x1={sx(0) - 23} y1={sy(svgRefH(0))} x2={sx(0) - 13} y2={sy(svgRefH(0))} stroke="#7fb87a" strokeWidth="1.5" />
      <line x1={sx(0) - 23} y1={sy(svgRefG(0))} x2={sx(0) - 13} y2={sy(svgRefG(0))} stroke="#7fb87a" strokeWidth="1.5" />
      <text
        x={sx(0) - 20} y={(sy(svgRefH(0)) + sy(svgRefG(0))) / 2 + 4}
        fill="#7fb87a" fontSize="8" textAnchor="middle"
        transform={`rotate(-90,${sx(0) - 20},${(sy(svgRefH(0)) + sy(svgRefG(0))) / 2})`}
      >
        {fmt(round1(innerVorne))} cm
      </text>

      {/* ── Bemaßung: Tiefe T (unten) ── */}
      <line x1={sx(0)} y1={sy(yMin) + 18} x2={Cx}    y2={sy(yMin) + 18} stroke="#d47070" strokeWidth="1.5" />
      <line x1={sx(0)} y1={sy(yMin) + 13} x2={sx(0)} y2={sy(yMin) + 23} stroke="#d47070" strokeWidth="1.5" />
      <line x1={Cx}    y1={sy(yMin) + 13} x2={Cx}    y2={sy(yMin) + 23} stroke="#d47070" strokeWidth="1.5" />
      <text x={(sx(0) + Cx) / 2} y={sy(yMin) + 32} fill="#d47070" fontSize="9" textAnchor="middle">
        T = {fmt(T)} cm
      </text>

      {/* Winkel-Labels */}
      <text x={sx(0) + 5} y={sy(yMin) - 4}   fill="#c9924a" fontSize="10" fontWeight="600">α = {alphaDeg}°</text>
      <text x={sx(0) + 5} y={sy(hvorne) + 13} fill="#c9924a" fontSize="10" fontWeight="600">γ = {gammaDeg}°</text>

      {/* Ersten Lotholz-Höhe einblenden */}
      {lothölzer.length > 0 && (() => {
        const l = lothölzer[0];
        const midY = (sy(svgRefH(l.abstand)) + sy(svgRefG(l.abstand))) / 2;
        const labelX = sx(Math.min(l.abstand + b / 2, T) + 2);
        return (
          <text x={labelX} y={midY + 4} fill="#6fa8d4" fontSize="9" dominantBaseline="auto">
            {fmt(round1(l.hoehe))} cm
          </text>
        );
      })()}

      {/* Legende */}
      <g transform={`translate(${PL}, ${H - 14})`}>
        <rect x="0" y="-5" width="14" height="8" fill="#7fb87a" fillOpacity="0.85" />
        <text x="18" y="4" fill="#7fb87a" fontSize="9">Eckständer</text>
        <rect x="78" y="-5" width="14" height="8" fill="#c9924a" fillOpacity="0.85" />
        <text x="96" y="4" fill="#c9924a" fontSize="9">Gaubendach- / Hauptdachholz</text>
        <rect x="234" y="-5" width="14" height="8" fill="#6fa8d4" fillOpacity="0.85" />
        <text x="252" y="4" fill="#6fa8d4" fontSize="9">Lothölzer</text>
      </g>
    </svg>
  );
}
