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
const fmt = (v: number, dec = 1) => v.toFixed(dec);
const round1 = (v: number) => Math.round(v * 10) / 10;

// ─── Typen ────────────────────────────────────────────────────────────────────

interface Eingaben {
  eckhoeheVorne: string;
  gaubendachNeigung: string;
  hauptdachNeigung: string;
  holzBreite: string;
  holzTiefe: string;   // früher "Höhe (h)", jetzt "Tiefe"
  achsabstand: string;
}

interface Lotholz {
  nr: number;
  abstand: number;
  hoehe: number; // lotrechte Länge zwischen den Holzoberkanten
}

interface Ergebnis {
  tiefe: number;
  yFirst: number;
  L_eckstaender: number;
  L_gaubendach: number;
  L_hauptdach: number;
  schnittVorneGaube: number;
  schnittFirst: number;
  lothölzer: Lotholz[];
}

// ─── Berechnung ───────────────────────────────────────────────────────────────

function berechne(
  hvorne: number,
  alphaDeg: number,
  gammaDeg: number,
  b: number,
  t: number,       // Holztiefe (Querschnitt senkrecht zur Längsachse)
  achsabstand: number,
): Ergebnis {
  const alpha = toRad(alphaDeg);
  const gamma = toRad(gammaDeg);
  const tanA = Math.tan(alpha);
  const tanG = Math.tan(gamma);

  // Horizontale Tiefe bis zum First (Referenzlinien-Schnittpunkt)
  const T = hvorne / (tanA - tanG);
  const yFirst = T * tanA;

  // Dickenkorrektur: Wie viel vertikalen Raum belegen Hauptdach- und Gaubenholz?
  // Ein Holz mit Tiefe t senkrecht zur Dachfläche hat die vertikale Projektion t·cos(Neigung)
  const korrHaupt = t * Math.cos(alpha); // Hauptdachholz nimmt diese Höhe ein
  const korrGaube = t * Math.cos(gamma); // Gaubenholz nimmt diese Höhe ein
  const korrGes = korrHaupt + korrGaube;

  // Lotrechte Länge der Ständer = Abstand zwischen Oberkante Hauptdachholz und Unterkante Gaubenholz
  const hEckstaender = hvorne - korrGes;

  const L_hauptdach = (T - b) / Math.cos(alpha);
  const L_gaubendach = (T + b) / Math.cos(gamma);

  const schnittVorneGaube = 90 - gammaDeg;
  const schnittFirst = alphaDeg - gammaDeg;

  // Lothölzer: ab erstem Achsabstand bis kurz vor den First
  const lothölzer: Lotholz[] = [];
  for (let x = achsabstand; x < T - b / 2; x += achsabstand) {
    // Lotrechte Höhe der Referenzlinien an Position x, minus Holzdicken
    const hoehe = hvorne - x * (tanA - tanG) - korrGes;
    if (hoehe > 1) {
      lothölzer.push({ nr: lothölzer.length + 1, abstand: x, hoehe });
    }
  }

  return {
    tiefe: T,
    yFirst,
    L_eckstaender: hEckstaender,
    L_gaubendach,
    L_hauptdach,
    schnittVorneGaube,
    schnittFirst,
    lothölzer,
  };
}

// ─── Haupt-Komponente ─────────────────────────────────────────────────────────

export function GauenwangenTool() {
  const [e, setE] = useState<Eingaben>({
    eckhoeheVorne: "180",
    gaubendachNeigung: "23",
    hauptdachNeigung: "45",
    holzBreite: "6",
    holzTiefe: "8",
    achsabstand: "70",
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
    if (p.alpha <= p.gamma)                                       return "Hauptdach-Neigung muss größer als Gaubendach-Neigung sein.";
    if (isNaN(p.b)           || p.b <= 0)                       return "Holz-Breite muss größer als 0 sein.";
    if (isNaN(p.t)           || p.t <= 0)                       return "Holz-Tiefe muss größer als 0 sein.";
    if (isNaN(p.achsabstand) || p.achsabstand <= 0)             return "Achsabstand muss größer als 0 sein.";
    return null;
  }, [p]);

  const ergebnis = useMemo(() => {
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
      {ergebnis && (
        <>
          {/* Seitenansicht */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">Seitenansicht (maßstabsgetreu)</CardTitle>
                <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
                  <span className="rounded-sm bg-oak-alpha px-2 py-1 text-oak">Holz {p.b} × {p.t} cm</span>
                  <span className="rounded-sm bg-s2 px-2 py-1 text-mu">Tiefe {fmt(ergebnis.tiefe)} cm</span>
                  <span className="rounded-sm bg-s2 px-2 py-1 text-mu">First {fmt(ergebnis.yFirst)} cm</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 pb-4">
              <SeitenansichtSVG
                T={ergebnis.tiefe}
                yFirst={ergebnis.yFirst}
                hvorne={p.hvorne}
                alphaDeg={p.alpha}
                gammaDeg={p.gamma}
                b={p.b}
                t={p.t}
                lothölzer={ergebnis.lothölzer}
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
                      laenge={ergebnis.L_eckstaender}
                      schnitte={`u ${fmt(round1(90 - p.alpha))}° / o ${fmt(round1(90 - p.gamma))}°`}
                    />
                    <HkZeile
                      name="Holz an Gaubendach"
                      laenge={ergebnis.L_gaubendach}
                      schnitte={`v ${fmt(round1(ergebnis.schnittVorneGaube))}° / o ${fmt(round1(ergebnis.schnittFirst))}°`}
                    />
                    <HkZeile
                      name="Holz an Hauptdach"
                      laenge={ergebnis.L_hauptdach}
                      schnitte={`v ${fmt(round1(90 - p.alpha))}° / o ${fmt(round1(ergebnis.schnittFirst))}°`}
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
                Lothölzer ({ergebnis.lothölzer.length} Stk.)
              </CardTitle>
              <CardDescription>
                Unterer Schnitt: {fmt(round1(90 - p.alpha))}° (Hauptdach) ·{" "}
                Oberer Schnitt: {fmt(round1(90 - p.gamma))}° (Gaubendach)
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
                    {ergebnis.lothölzer.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-4 text-center text-mu">
                          Kein Lothölzer — Achsabstand größer als Tiefe
                        </td>
                      </tr>
                    ) : (
                      ergebnis.lothölzer.map((lot) => (
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

function SeitenansichtSVG({
  T, yFirst, hvorne, alphaDeg, gammaDeg, b, t, lothölzer,
}: {
  T: number; yFirst: number; hvorne: number;
  alphaDeg: number; gammaDeg: number; b: number; t: number;
  lothölzer: Lotholz[];
}) {
  const W = 560;
  const H = 300;
  const PL = 55; const PR = 20; const PT = 20; const PB = 40;
  const dW = W - PL - PR;
  const dH = H - PT - PB;
  const scale = Math.min(dW / T, dH / yFirst) * 0.9;

  const sx = (x: number) => PL + x * scale;
  const sy = (y: number) => PT + dH - y * scale;

  const alphaRad = toRad(alphaDeg);
  const gammaRad = toRad(gammaDeg);

  // Holzdicke in SVG-Pixel (für die Darstellungsbreite der Balken)
  const beamPx = Math.max(5, t * scale * 0.8);

  // Vertikale Dickenprojektionen
  const dHaupt = t * Math.cos(alphaRad); // Hauptdachholz nimmt lotrecht
  const dGaube = t * Math.cos(gammaRad); // Gaubenholz nimmt lotrecht

  // First-Punkt (Schnitt der Referenzlinien)
  const Cx = sx(T), Cy = sy(yFirst);

  // Hauptdachholz Mittellinie: y = x·tan(α) + dHaupt/2
  // Gaubenholz Mittellinie:    y = hvorne + x·tan(γ) - dGaube/2

  // Vorderholz (Eckständer): zwischen Oberkante Hauptdach und Unterkante Gauben
  const EckFussY  = sy(dHaupt);                  // Oberkante Hauptdachholz an x=0
  const EckKopfY  = sy(hvorne - dGaube);          // Unterkante Gaubenholz an x=0

  // Hauptdachholz: Centerline von x=b bis x=T
  const HauptX1 = sx(b),  HauptY1 = sy(b * Math.tan(alphaRad) + dHaupt / 2);
  const HauptX2 = Cx,     HauptY2 = sy(yFirst - dHaupt / 2 + dHaupt); // obere Kante am First

  // Gaubenholz: Centerline von x=0 bis x=T
  const GaubeX1 = sx(0),  GaubeY1 = sy(hvorne - dGaube / 2);
  const GaubeX2 = Cx,     GaubeY2 = sy(yFirst + dGaube / 2);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-label="Seitenansicht Gaubenwange">
      {/* Grid */}
      <defs>
        <pattern id="gw-grid" width={Math.max(10, scale * 50)} height={Math.max(10, scale * 50)}
          patternUnits="userSpaceOnUse" x={PL} y={PT}>
          <path d={`M ${Math.max(10, scale * 50)} 0 L 0 0 0 ${Math.max(10, scale * 50)}`}
            fill="none" stroke="#2e2a1e" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect x={PL} y={PT} width={dW} height={dH} fill="url(#gw-grid)" rx="4" />

      {/* Referenzlinien (gestrichelt) */}
      <line x1={sx(0)} y1={sy(0)}      x2={Cx} y2={Cy} stroke="#504840" strokeWidth="1" strokeDasharray="5 3" />
      <line x1={sx(0)} y1={sy(hvorne)} x2={Cx} y2={Cy} stroke="#504840" strokeWidth="1" strokeDasharray="5 3" />

      {/* Hauptdachholz — liegt auf der Hauptdachfläche, läuft von Vorderholz zum First */}
      <line x1={HauptX1} y1={HauptY1} x2={HauptX2} y2={HauptY2}
        stroke="#c9924a" strokeWidth={beamPx} strokeLinecap="square" />

      {/* Gaubenholz — liegt oben, vom Eckständer bis zum First */}
      <line x1={GaubeX1} y1={GaubeY1} x2={GaubeX2} y2={GaubeY2}
        stroke="#c9924a" strokeWidth={beamPx} strokeLinecap="square" />

      {/* Lothölzer — zwischen Oberkante Hauptdach und Unterkante Gaubenholz */}
      {lothölzer.map((lot) => {
        const yBotLot = sy(lot.abstand * Math.tan(alphaRad) + dHaupt);          // Oberkante Hauptdachholz
        const yTopLot = sy(hvorne + lot.abstand * Math.tan(gammaRad) - dGaube); // Unterkante Gaubenholz
        return (
          <line key={lot.nr}
            x1={sx(lot.abstand)} y1={yBotLot}
            x2={sx(lot.abstand)} y2={yTopLot}
            stroke="#6fa8d4" strokeWidth={beamPx} strokeLinecap="square"
          />
        );
      })}

      {/* Eckständer (Vorderholz) — zwischen den beiden Haupthölzern */}
      <line x1={sx(0)} y1={EckFussY} x2={sx(0)} y2={EckKopfY}
        stroke="#7fb87a" strokeWidth={beamPx} strokeLinecap="square" />

      {/* Bemaßung: Eckhöhe vorne (links) */}
      <line x1={sx(0) - 20} y1={sy(0)}      x2={sx(0) - 20} y2={sy(hvorne)} stroke="#d47070" strokeWidth="1.5" />
      <line x1={sx(0) - 25} y1={sy(0)}      x2={sx(0) - 15} y2={sy(0)}      stroke="#d47070" strokeWidth="1.5" />
      <line x1={sx(0) - 25} y1={sy(hvorne)} x2={sx(0) - 15} y2={sy(hvorne)} stroke="#d47070" strokeWidth="1.5" />
      <text x={sx(0) - 22} y={(sy(0) + sy(hvorne)) / 2 + 4} fill="#d47070" fontSize="9" textAnchor="middle"
        transform={`rotate(-90,${sx(0) - 22},${(sy(0) + sy(hvorne)) / 2})`}>
        {fmt(hvorne)} cm
      </text>

      {/* Bemaßung: Tiefe T (unten) */}
      {sy(0) + 28 < H && (
        <>
          <line x1={sx(0)} y1={sy(0) + 22} x2={Cx}    y2={sy(0) + 22} stroke="#d47070" strokeWidth="1.5" />
          <line x1={sx(0)} y1={sy(0) + 17} x2={sx(0)} y2={sy(0) + 27} stroke="#d47070" strokeWidth="1.5" />
          <line x1={Cx}    y1={sy(0) + 17} x2={Cx}    y2={sy(0) + 27} stroke="#d47070" strokeWidth="1.5" />
          <text x={(sx(0) + Cx) / 2} y={sy(0) + 36} fill="#d47070" fontSize="9" textAnchor="middle">
            T = {fmt(T)} cm
          </text>
        </>
      )}

      {/* Winkel-Labels */}
      <text x={sx(0) + 6} y={sy(0) - 5}      fill="#c9924a" fontSize="10" fontWeight="600">α={alphaDeg}°</text>
      <text x={sx(0) + 6} y={sy(hvorne) + 14} fill="#c9924a" fontSize="10" fontWeight="600">γ={gammaDeg}°</text>

      {/* Legende */}
      <g transform={`translate(${PL}, ${H - 14})`}>
        <line x1="0"   y1="0" x2="14"  y2="0" stroke="#7fb87a" strokeWidth="3" />
        <text x="18"  y="4" fill="#7fb87a" fontSize="9">Eckständer</text>
        <line x1="78"  y1="0" x2="92"  y2="0" stroke="#c9924a" strokeWidth="3" />
        <text x="96"  y="4" fill="#c9924a" fontSize="9">Gaubendach / Hauptdach</text>
        <line x1="220" y1="0" x2="234" y2="0" stroke="#6fa8d4" strokeWidth="3" />
        <text x="238" y="4" fill="#6fa8d4" fontSize="9">Lothölzer</text>
      </g>
    </svg>
  );
}
