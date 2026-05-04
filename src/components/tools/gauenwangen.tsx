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
//
// Referenzlinien (= Innenflächen der Hölzer zum Ständerraum):
//   Hauptdach-Innenfläche:   y_H(x) = x · tan α
//   Gaubendach-Innenfläche:  y_G(x) = hvorne + x · tan γ
//
// Ständerhöhe bei x:  h(x) = y_G(x) − y_H(x) = hvorne − x·(tanα − tanγ)
// First bei h(T) = 0: T = hvorne / (tanα − tanγ)
//
// Die Hölzer liegen AUSSEN von den Referenzlinien:
//   Hauptdachholz  → UNTERHALB von y_H, Dicke senkrecht zur Dachfläche = t, Proj. lotrecht = t·cos α
//   Gaubenholz     → OBERHALB  von y_G, Dicke senkrecht zur Dachfläche = t, Proj. lotrecht = t·cos γ

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

  const T      = hvorne / (tanA - tanG);
  const yFirst = T * tanA; // Schnittpunkt der Referenzlinien

  // Eckständer = hvorne (das ist direkt die lotrechte Innenmass-Höhe)
  const L_eckstaender = hvorne;

  // Längen der Dachkanthölzer
  const L_hauptdach  = (T - b) / Math.cos(alpha); // beginnt an Innenkante Eckständer
  const L_gaubendach = (T + b) / Math.cos(gamma);

  // Schnittwinkel
  const schnittVorneGaube = 90 - gammaDeg; // Gaubenholz an Vorderholz
  const schnittFirst      = alphaDeg - gammaDeg; // Firstschnitt

  // Lothölzer: zwischen Hauptdach-Innenfläche und Gaubendach-Innenfläche
  const lothölzer: Lotholz[] = [];
  for (let x = achsabstand; x < T - b / 2; x += achsabstand) {
    const hoehe = hvorne - x * (tanA - tanG); // lotrechtes Innenmass
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
          {/* Seitenansicht */}
          <Card>
            <CardHeader className="pb-3">
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

// ─── SVG Seitenansicht ────────────────────────────────────────────────────────
//
// Koordinatensystem:
//   Referenzlinie Hauptdach:  y_H(x) = x·tan α   → Innenfläche (oben) des Hauptdachholzes
//   Referenzlinie Gaubendach: y_G(x) = hvorne + x·tan γ → Innenfläche (unten) des Gaubenholzes
//
// Die Hölzer werden als Streifen dargestellt:
//   Hauptdachholz  → unterhalb von y_H, vertikale Dicke ≈ t·cos α
//   Gaubenholz     → oberhalb  von y_G, vertikale Dicke ≈ t·cos γ
//   Lothölzer      → lotrechte Balken von y_H(x) bis y_G(x)

function SeitenansichtSVG({
  T, hvorne, alphaDeg, gammaDeg, b, t, lothölzer,
}: {
  T: number; hvorne: number;
  alphaDeg: number; gammaDeg: number;
  b: number; t: number;
  lothölzer: Lotholz[];
}) {
  const W = 560; const H = 300;
  const PL = 55; const PR = 20; const PT = 24; const PB = 42;
  const dW = W - PL - PR;
  const dH = H - PT - PB;

  const alphaRad = toRad(alphaDeg);
  const gammaRad = toRad(gammaDeg);

  // Vertikale Holzdicken-Projektionen
  const dH_haupt = t * Math.cos(alphaRad); // Hauptdachholz lotrecht
  const dH_gaube = t * Math.cos(gammaRad); // Gaubenholz lotrecht

  // SVG Bounding Box: y geht von -dH_haupt (Unterkante Hauptdachholz) bis y_G(T) + dH_gaube
  const yMin = -dH_haupt;
  const yMax = hvorne + T * Math.tan(gammaRad) + dH_gaube; // Oberkante Gaubenholz am First

  const scaleX = dW / T;
  const scaleY = dH / (yMax - yMin);
  const scale  = Math.min(scaleX, scaleY) * 0.92;

  // World → SVG  (SVG Y wächst nach unten)
  const sx = (x: number) => PL + x * scale;
  const sy = (y: number) => PT + (yMax - y) * scale;

  // Referenzlinien
  const refH = (x: number) => x * Math.tan(alphaRad);           // Hauptdach Innenfläche
  const refG = (x: number) => hvorne + x * Math.tan(gammaRad);  // Gauben Innenfläche

  const beamPx = Math.max(5, t * scale * 0.85);
  const halfBpx = beamPx / 2;

  // First-Punkt
  const Cx = sx(T), Cy = sy(refH(T)); // Schnittpunkt der Referenzlinien

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

      {/* ── Hauptdachholz ──
          Innenfläche (Referenz) = y_H(x) = x·tan α
          Außenfläche             = y_H(x) - dH_haupt
          Darstellung: Mittelachse auf halbem Weg → dH_haupt/2 unter der Referenzlinie */}
      <line
        x1={sx(b)}  y1={sy(refH(b)  - dH_haupt / 2)}
        x2={Cx}     y2={sy(refH(T)  - dH_haupt / 2)}
        stroke="#c9924a" strokeWidth={beamPx} strokeLinecap="square"
      />

      {/* ── Gaubenholz ──
          Innenfläche (Referenz) = y_G(x) = hvorne + x·tan γ
          Außenfläche             = y_G(x) + dH_gaube
          Mittelachse:             dH_gaube/2 über der Referenzlinie */}
      <line
        x1={sx(0)} y1={sy(refG(0) + dH_gaube / 2)}
        x2={Cx}    y2={sy(refG(T) + dH_gaube / 2)}
        stroke="#c9924a" strokeWidth={beamPx} strokeLinecap="square"
      />

      {/* ── Referenzlinien (Innenflächen, gestrichelt) ── */}
      <line x1={sx(0)} y1={sy(refH(0))} x2={Cx} y2={sy(refH(T))}
        stroke="#504840" strokeWidth="1" strokeDasharray="4 3" />
      <line x1={sx(0)} y1={sy(refG(0))} x2={Cx} y2={sy(refG(T))}
        stroke="#504840" strokeWidth="1" strokeDasharray="4 3" />

      {/* ── Lothölzer ── zwischen den Innenflächen */}
      {lothölzer.map((lot) => (
        <line key={lot.nr}
          x1={sx(lot.abstand)} y1={sy(refH(lot.abstand))}  // Innenfläche Hauptdach
          x2={sx(lot.abstand)} y2={sy(refG(lot.abstand))}  // Innenfläche Gaube
          stroke="#6fa8d4" strokeWidth={beamPx} strokeLinecap="square"
        />
      ))}

      {/* ── Gaubeneckständer ── zwischen den Innenflächen an x=0 */}
      <line
        x1={sx(0)} y1={sy(refH(0))}  // = sy(0) → Innenfläche Hauptdach bei x=0
        x2={sx(0)} y2={sy(refG(0))}  // = sy(hvorne) → Innenfläche Gaube bei x=0
        stroke="#7fb87a" strokeWidth={beamPx} strokeLinecap="square"
      />

      {/* ── Bemaßung: Eckhöhe vorne (links) ── */}
      <line x1={sx(0) - 20} y1={sy(0)}       x2={sx(0) - 20} y2={sy(hvorne)} stroke="#d47070" strokeWidth="1.5" />
      <line x1={sx(0) - 25} y1={sy(0)}       x2={sx(0) - 15} y2={sy(0)}      stroke="#d47070" strokeWidth="1.5" />
      <line x1={sx(0) - 25} y1={sy(hvorne)}  x2={sx(0) - 15} y2={sy(hvorne)} stroke="#d47070" strokeWidth="1.5" />
      <text
        x={sx(0) - 22} y={(sy(0) + sy(hvorne)) / 2 + 4}
        fill="#d47070" fontSize="9" textAnchor="middle"
        transform={`rotate(-90,${sx(0) - 22},${(sy(0) + sy(hvorne)) / 2})`}
      >
        {fmt(hvorne)} cm
      </text>

      {/* ── Bemaßung: Tiefe T (unten) ── */}
      {sy(yMin) + 10 < H && (
        <>
          <line x1={sx(0)} y1={sy(yMin) + 18} x2={Cx}    y2={sy(yMin) + 18} stroke="#d47070" strokeWidth="1.5" />
          <line x1={sx(0)} y1={sy(yMin) + 13} x2={sx(0)} y2={sy(yMin) + 23} stroke="#d47070" strokeWidth="1.5" />
          <line x1={Cx}    y1={sy(yMin) + 13} x2={Cx}    y2={sy(yMin) + 23} stroke="#d47070" strokeWidth="1.5" />
          <text x={(sx(0) + Cx) / 2} y={sy(yMin) + 32} fill="#d47070" fontSize="9" textAnchor="middle">
            T = {fmt(T)} cm
          </text>
        </>
      )}

      {/* Winkel-Labels */}
      <text x={sx(0) + 5} y={sy(0) - 4}      fill="#c9924a" fontSize="10" fontWeight="600">α = {alphaDeg}°</text>
      <text x={sx(0) + 5} y={sy(hvorne) + 13} fill="#c9924a" fontSize="10" fontWeight="600">γ = {gammaDeg}°</text>

      {/* Ersten Lotholz-Höhe einblenden */}
      {lothölzer.length > 0 && (() => {
        const l = lothölzer[0];
        const midY = (sy(refH(l.abstand)) + sy(refG(l.abstand))) / 2;
        return (
          <text x={sx(l.abstand) + halfBpx + 3} y={midY + 4}
            fill="#6fa8d4" fontSize="9" dominantBaseline="auto">
            {fmt(round1(l.hoehe))} cm
          </text>
        );
      })()}

      {/* Legende */}
      <g transform={`translate(${PL}, ${H - 14})`}>
        <line x1="0"   y1="0" x2="14"  y2="0" stroke="#7fb87a" strokeWidth="3" />
        <text x="18"  y="4" fill="#7fb87a" fontSize="9">Eckständer</text>
        <line x1="78"  y1="0" x2="92"  y2="0" stroke="#c9924a" strokeWidth="3" />
        <text x="96"  y="4" fill="#c9924a" fontSize="9">Gaubendach- / Hauptdachholz</text>
        <line x1="234" y1="0" x2="248" y2="0" stroke="#6fa8d4" strokeWidth="3" />
        <text x="252" y="4" fill="#6fa8d4" fontSize="9">Lothölzer</text>
      </g>
    </svg>
  );
}
