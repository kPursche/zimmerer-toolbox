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
const verstichmass = (deg: number) => (10 * Math.tan(toRad(deg))).toFixed(1);

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
    if (isNaN(p.gamma)       || p.gamma <= 0  || p.gamma >= 90) return "Gaubendach-Neigung: 1°–89°";
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
              <EingabeFeld label="Gaubendach-Neigung" einheit="°" wert={e.gaubendachNeigung} onChange={setze("gaubendachNeigung")} min={1} max={89} step={0.5} />
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

          {/* Zuschnitte Hauptkanten */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Zuschnitte Hauptkanten</CardTitle>
              <CardDescription>Querschnitt aller Hölzer: {p.b} × {p.t} cm</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[320px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-2 font-semibold text-tx">Holz</th>
                      <th className="pb-2 text-right font-semibold text-tx">Länge</th>
                      <th className="pb-2 text-right text-xs font-semibold text-mu">Schnitte</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <HkZeile
                      name="Gaubeneckständer (lotrecht)"
                      laenge={erg.L_eckstaender}
                      schnitte={`u ${fmt(round1(p.alpha))}° / o ${fmt(round1(p.gamma))}°`}
                    />
                    <HkZeile
                      name="Holz an Gaubendach"
                      laenge={erg.L_gaubendach}
                      schnitte={`v ${fmt(round1(erg.schnittVorneGaube))}° / o ${fmt(round1(erg.schnittFirst))}°`}
                    />
                    <HkZeile
                      name="Holz an Hauptdach"
                      laenge={erg.L_hauptdach}
                      schnitte={`v ${fmt(round1(90 - p.alpha))}° / o ${fmt(round1(erg.schnittFirst))}°`}
                    />
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Lothölzer */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Lothölzer ({erg.lothölzer.length} Stk.)
              </CardTitle>
              <CardDescription>
                Unterer Schnitt: {fmt(round1(p.alpha))}° (Hauptdach-Schmiege) ·{" "}
                Oberer Schnitt: {fmt(round1(p.gamma))}° (Gaubendach-Schmiege)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[280px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-2 font-semibold text-tx">Nr.</th>
                      <th className="pb-2 text-right font-semibold text-tx">Abst. v. Vorderkante</th>
                      <th className="pb-2 text-right font-semibold text-tx">Länge (lotrecht)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {erg.lothölzer.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-4 text-center text-mu">
                          Kein Lothölzer — Achsabstand größer als Tiefe
                        </td>
                      </tr>
                    ) : (
                      erg.lothölzer.map((lot) => (
                        <tr key={lot.nr}>
                          <td className="py-2.5 text-mu">{lot.nr}</td>
                          <td className="py-2.5 text-right tabular-nums text-tx">{fmt(lot.abstand)} cm</td>
                          <td className="py-2.5 text-right tabular-nums font-bold text-oak">{fmt(round1(lot.hoehe))} cm</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Zuschnittansicht */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Zuschnittansicht</CardTitle>
              <CardDescription>Schematisch — Schmiegen und Verstichmass</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <HolzSchematik
                name="Gaubeneckständer"
                laenge={erg.L_eckstaender}
                farbe="#7fb87a"
                links={{ label: "Hauptdach-Schmiege", anzeigeGrad: round1(p.alpha), zeichenGrad: p.alpha }}
                rechts={{ label: "Gaubendach-Schmiege", anzeigeGrad: round1(p.gamma), zeichenGrad: p.gamma }}
                rechtsGekippt
              />
              <HolzSchematik
                name="Holz an Hauptdach"
                laenge={erg.L_hauptdach}
                farbe="#c9924a"
                links={{ label: "Fußschnitt", anzeigeGrad: round1(90 - p.alpha), zeichenGrad: p.alpha }}
                rechts={{ label: "Firstschnitt", anzeigeGrad: round1(erg.schnittFirst), zeichenGrad: 90 - erg.schnittFirst, verstichmass: true }}
              />
              <HolzSchematik
                name="Holz an Gaubendach"
                laenge={erg.L_gaubendach}
                farbe="#c9924a"
                links={{ label: "Vorschnitt", anzeigeGrad: round1(90 - p.gamma), zeichenGrad: p.gamma }}
                rechts={{ label: "Firstschnitt", anzeigeGrad: round1(erg.schnittFirst), zeichenGrad: 90 - erg.schnittFirst, verstichmass: true }}
                linksGekippt
                rechtsGekippt
              />
            </CardContent>
          </Card>
        </>
      )}
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

function HkZeile({ name, laenge, schnitte }: { name: string; laenge: number; schnitte: string }) {
  return (
    <tr>
      <td className="py-3 font-semibold text-tx">{name}</td>
      <td className="py-3 text-right tabular-nums font-bold text-oak">{fmt(round1(laenge))} cm</td>
      <td className="py-3 text-right text-xs text-mu">{schnitte}</td>
    </tr>
  );
}

// ─── Zuschnittansicht ─────────────────────────────────────────────────────────

interface SchnittInfo {
  label: string;
  anzeigeGrad: number;  // Winkel für Anzeige
  zeichenGrad: number;  // Winkel vom Lot (für SVG-Überhang)
  verstichmass?: boolean;
}

function HolzSchematik({
  name, laenge, farbe, links, rechts, linksGekippt = false, rechtsGekippt = false,
}: {
  name: string; laenge: number; farbe: string;
  links: SchnittInfo; rechts: SchnittInfo;
  linksGekippt?: boolean; rechtsGekippt?: boolean;
}) {
  const W = 300; const Ht = 40; const Yoff = 4;
  const ohL = Math.min(Ht * Math.tan(toRad(links.zeichenGrad)), W / 2 - 5);
  const ohR = Math.min(Ht * Math.tan(toRad(rechts.zeichenGrad)), W / 2 - 5);

  // Standard: Unterkante übersteht (Trapez). Gekippt: Oberkante übersteht.
  const TLx = linksGekippt ? 0 : ohL;
  const BLx = linksGekippt ? ohL : 0;
  const TRx = rechtsGekippt ? W : W - ohR;
  const BRx = rechtsGekippt ? W - ohR : W;

  const pts = [`${TLx},${Yoff}`, `${TRx},${Yoff}`, `${BRx},${Yoff + Ht}`, `${BLx},${Yoff + Ht}`].join(" ");

  // Winkelindikator: Schnittlinie + Lotlinie vom Inneneck
  const arcL = linksGekippt
    ? `M 0,${Yoff} L ${ohL},${Yoff + Ht} M ${ohL},${Yoff} L ${ohL},${Yoff + Ht}`
    : `M ${ohL},${Yoff} L 0,${Yoff + Ht} M ${ohL},${Yoff} L ${ohL},${Yoff + Ht}`;
  const arcR = rechtsGekippt
    ? `M ${W},${Yoff} L ${W - ohR},${Yoff + Ht} M ${W - ohR},${Yoff} L ${W - ohR},${Yoff + Ht}`
    : `M ${W - ohR},${Yoff} L ${W},${Yoff + Ht} M ${W - ohR},${Yoff} L ${W - ohR},${Yoff + Ht}`;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold text-tx">{name}</span>
        <span className="tabular-nums text-sm font-bold text-oak">{fmt(round1(laenge))} cm</span>
      </div>

      <svg viewBox={`0 0 ${W} ${Yoff + Ht + 2}`} className="w-full overflow-visible">
        <polygon points={pts} fill={farbe} fillOpacity="0.85" stroke="none" />
        <path d={arcL} stroke="rgba(255,255,255,0.35)" strokeWidth="1" fill="none" />
        <path d={arcR} stroke="rgba(255,255,255,0.35)" strokeWidth="1" fill="none" />
      </svg>

      <div className="grid grid-cols-2 gap-1">
        <div className="rounded-md bg-s2 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wide text-mu">{links.label}</div>
          <div className="text-lg font-bold text-tx">{fmt(links.anzeigeGrad, 1)}°</div>
        </div>
        <div className="rounded-md bg-s2 px-3 py-2 text-right">
          <div className="text-[10px] uppercase tracking-wide text-mu">{rechts.label}</div>
          <div className="text-lg font-bold text-tx">{fmt(rechts.anzeigeGrad, 1)}°</div>
          {rechts.verstichmass && (
            <div className="text-xs font-semibold text-oak">
              ↕ {verstichmass(rechts.anzeigeGrad)} cm / 10 cm
            </div>
          )}
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
