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
import { cn } from "@/lib/utils";

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
  holzHoehe: string;
  achsabstand: string;
}

interface Lotholz {
  nr: number;
  abstand: number;
  hoehe: number;
}

interface Ergebnis {
  tiefe: number;
  yFirst: number;
  L_vorderholz: number;
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
  achsabstand: number,
): Ergebnis {
  const alpha = toRad(alphaDeg);
  const gamma = toRad(gammaDeg);
  const tanA = Math.tan(alpha);
  const tanG = Math.tan(gamma);

  // Horizontale Tiefe bis zum First
  const T = hvorne / (tanA - tanG);
  const yFirst = T * tanA;

  // Längen der Hauptkanten
  const L_vorderholz = hvorne;
  const L_hauptdach = (T - b) / Math.cos(alpha);   // beginnt an Innenkante Vorderholz
  const L_gaubendach = (T + b) / Math.cos(gamma);  // endet leicht hinter dem First

  // Schnittwinkel
  const schnittVorneGaube = 90 - gammaDeg;  // Gaubendachholz an Vorderholz (67° bei 23°)
  const schnittFirst = alphaDeg - gammaDeg; // Firstschnitt beide Hölzer (22° bei 45°-23°)

  // Lothölzer: erste Position = Achsabstand, letzte vor dem First
  const lothölzer: Lotholz[] = [];
  for (let x = achsabstand; x < T - b / 2; x += achsabstand) {
    const hoehe = hvorne - x * (tanA - tanG);
    if (hoehe > 1) {
      lothölzer.push({ nr: lothölzer.length + 1, abstand: x, hoehe });
    }
  }

  return { tiefe: T, yFirst, L_vorderholz, L_gaubendach, L_hauptdach, schnittVorneGaube, schnittFirst, lothölzer };
}

// ─── Haupt-Komponente ─────────────────────────────────────────────────────────

export function GauenwangenTool() {
  const [e, setE] = useState<Eingaben>({
    eckhoeheVorne: "180",
    gaubendachNeigung: "23",
    hauptdachNeigung: "45",
    holzBreite: "6",
    holzHoehe: "8",
    achsabstand: "70",
  });

  const setze = useCallback(
    (key: keyof Eingaben) => (ev: React.ChangeEvent<HTMLInputElement>) =>
      setE((prev) => ({ ...prev, [key]: ev.target.value })),
    []
  );

  const p = useMemo(() => ({
    hvorne: parseFloat(e.eckhoeheVorne),
    alpha: parseFloat(e.hauptdachNeigung),
    gamma: parseFloat(e.gaubendachNeigung),
    b: parseFloat(e.holzBreite),
    h: parseFloat(e.holzHoehe),
    achsabstand: parseFloat(e.achsabstand),
  }), [e]);

  const fehler = useMemo((): string | null => {
    if (isNaN(p.hvorne) || p.hvorne <= 0) return "Eckhöhe vorne muss größer als 0 sein.";
    if (isNaN(p.gamma) || p.gamma <= 0 || p.gamma >= 90) return "Gaubendach-Neigung: 1°–89°";
    if (isNaN(p.alpha) || p.alpha <= 0 || p.alpha >= 90) return "Hauptdach-Neigung: 1°–89°";
    if (p.alpha <= p.gamma) return "Hauptdach-Neigung muss größer als Gaubendach-Neigung sein.";
    if (isNaN(p.b) || p.b <= 0) return "Holz-Breite muss größer als 0 sein.";
    if (isNaN(p.h) || p.h <= 0) return "Holz-Höhe muss größer als 0 sein.";
    if (isNaN(p.achsabstand) || p.achsabstand <= 0) return "Achsabstand muss größer als 0 sein.";
    return null;
  }, [p]);

  const ergebnis = useMemo(() => {
    if (fehler) return null;
    return berechne(p.hvorne, p.alpha, p.gamma, p.b, p.achsabstand);
  }, [fehler, p]);

  return (
    <div className="space-y-5">

      {/* ── Eingaben ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Eingaben</CardTitle>
          <CardDescription>
            Schleppdachgaube — alle Maße in cm, Winkel in Grad
          </CardDescription>
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
              <EingabeFeld label="Hauptdach-Neigung" einheit="°" wert={e.hauptdachNeigung} onChange={setze("hauptdachNeigung")} min={1} max={89} step={0.5} />
            </div>
          </Gruppe>

          <Gruppe label="Holz">
            <div className="grid grid-cols-2 gap-3">
              <EingabeFeld label="Breite (b)" einheit="cm" wert={e.holzBreite} onChange={setze("holzBreite")} min={1} step={0.5} />
              <EingabeFeld label="Höhe (h)" einheit="cm" wert={e.holzHoehe} onChange={setze("holzHoehe")} min={1} step={0.5} />
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
                  <span className="rounded-sm bg-oak-alpha px-2 py-1 text-oak">Holz {p.b} × {p.h} cm</span>
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
                lothölzer={ergebnis.lothölzer}
              />
            </CardContent>
          </Card>

          {/* Zuschnitte Hauptkanten */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Zuschnitte Hauptkanten</CardTitle>
              <CardDescription>Querschnitt aller Hölzer: {p.b} × {p.h} cm</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[320px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-2 font-semibold text-tx">Holz</th>
                      <th className="pb-2 text-right font-semibold text-tx">Länge</th>
                      <th className="pb-2 text-right font-semibold text-mu text-xs">Schnitte</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <HkZeile
                      name="Vorderholz (lotrecht)"
                      laenge={ergebnis.L_vorderholz}
                      schnitte={`oben ${fmt(round1(90 - p.gamma))}°`}
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
  T, yFirst, hvorne, alphaDeg, gammaDeg, b, lothölzer,
}: {
  T: number; yFirst: number; hvorne: number;
  alphaDeg: number; gammaDeg: number; b: number;
  lothölzer: Lotholz[];
}) {
  const W = 560;
  const H = 300;
  const PL = 55; const PR = 20; const PT = 20; const PB = 40;
  const dW = W - PL - PR;
  const dH = H - PT - PB;

  const scale = Math.min(dW / T, dH / yFirst) * 0.9;

  // World → SVG (Y inverted)
  const sx = (x: number) => PL + x * scale;
  const sy = (y: number) => PT + dH - y * scale;

  const alphaRad = toRad(alphaDeg);
  const gammaRad = toRad(gammaDeg);

  const beamPx = Math.max(5, b * scale * 0.8);

  // Key points
  const Ax = sx(0), Ay = sy(0);         // Vorderholz Fuß
  const Bx = sx(0), By = sy(hvorne);    // Vorderholz Kopf
  const Cx = sx(T), Cy = sy(yFirst);    // First

  // Hauptdachholz: starts at inner face of Vorderholz on main roof
  const HauptStartX = sx(b), HauptStartY = sy(b * Math.tan(alphaRad));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-label="Seitenansicht Gaubenwange">
      {/* Grid */}
      <defs>
        <pattern id="gw-grid" width={scale * 50} height={scale * 50} patternUnits="userSpaceOnUse"
          x={PL % (scale * 50)} y={(PT + dH) % (scale * 50)}>
          <path d={`M ${scale * 50} 0 L 0 0 0 ${scale * 50}`}
            fill="none" stroke="#2e2a1e" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect x={PL} y={PT} width={dW} height={dH} fill="url(#gw-grid)" rx="4" />

      {/* Reference lines (dashed) */}
      <line x1={Ax} y1={Ay} x2={Cx} y2={Cy} stroke="#504840" strokeWidth="1" strokeDasharray="5 3" />
      <line x1={Bx} y1={By} x2={Cx} y2={Cy} stroke="#504840" strokeWidth="1" strokeDasharray="5 3" />

      {/* Hauptdachholz (oak, lies on main roof) */}
      <line x1={HauptStartX} y1={HauptStartY} x2={Cx} y2={Cy}
        stroke="#c9924a" strokeWidth={beamPx} strokeLinecap="square" />

      {/* Gaubendachholz (oak, along dormer roof) */}
      <line x1={Bx} y1={By} x2={Cx} y2={Cy}
        stroke="#c9924a" strokeWidth={beamPx} strokeLinecap="square" />

      {/* Lothölzer (steel, vertical posts) */}
      {lothölzer.map((lot) => {
        const yBot = lot.abstand * Math.tan(alphaRad);
        const yTop = hvorne + lot.abstand * Math.tan(gammaRad);
        return (
          <line key={lot.nr}
            x1={sx(lot.abstand)} y1={sy(yBot)}
            x2={sx(lot.abstand)} y2={sy(yTop)}
            stroke="#6fa8d4" strokeWidth={beamPx} strokeLinecap="square"
          />
        );
      })}

      {/* Vorderholz (pine, vertical at front) */}
      <line x1={Ax} y1={Ay} x2={Bx} y2={By}
        stroke="#7fb87a" strokeWidth={beamPx} strokeLinecap="square" />

      {/* Dimension: h_vorne (left arrow) */}
      <line x1={Ax - 18} y1={Ay} x2={Ax - 18} y2={By} stroke="#d47070" strokeWidth="1.5" markerEnd="url(#arr)" />
      <line x1={Ax - 23} y1={Ay} x2={Ax - 13} y2={Ay} stroke="#d47070" strokeWidth="1.5" />
      <line x1={Ax - 23} y1={By} x2={Ax - 13} y2={By} stroke="#d47070" strokeWidth="1.5" />
      <text x={Ax - 22} y={(Ay + By) / 2 + 4} fill="#d47070" fontSize="9" textAnchor="middle"
        transform={`rotate(-90,${Ax - 22},${(Ay + By) / 2})`}>
        {fmt(hvorne)} cm
      </text>

      {/* Dimension: T (bottom arrow) */}
      {Ay + 28 < H && (
        <>
          <line x1={Ax} y1={Ay + 22} x2={Cx} y2={Ay + 22} stroke="#d47070" strokeWidth="1.5" />
          <line x1={Ax} y1={Ay + 17} x2={Ax} y2={Ay + 27} stroke="#d47070" strokeWidth="1.5" />
          <line x1={Cx} y1={Ay + 17} x2={Cx} y2={Ay + 27} stroke="#d47070" strokeWidth="1.5" />
          <text x={(Ax + Cx) / 2} y={Ay + 36} fill="#d47070" fontSize="9" textAnchor="middle">
            T = {fmt(T)} cm
          </text>
        </>
      )}

      {/* Angle labels */}
      <text x={Ax + 6} y={Ay - 5} fill="#c9924a" fontSize="10" fontWeight="600">α={alphaDeg}°</text>
      <text x={Bx + 6} y={By + 14} fill="#c9924a" fontSize="10" fontWeight="600">γ={gammaDeg}°</text>

      {/* Lotholz height labels (first and last) */}
      {lothölzer.length > 0 && (() => {
        const first = lothölzer[0];
        return (
          <text x={sx(first.abstand) + 4} y={(sy(first.abstand * Math.tan(alphaRad)) + sy(hvorne + first.abstand * Math.tan(gammaRad))) / 2}
            fill="#6fa8d4" fontSize="9" dominantBaseline="middle">
            {fmt(round1(first.hoehe))}
          </text>
        );
      })()}

      {/* Legend */}
      <g transform={`translate(${PL}, ${H - 14})`}>
        <line x1="0" y1="0" x2="14" y2="0" stroke="#7fb87a" strokeWidth="3" />
        <text x="18" y="4" fill="#7fb87a" fontSize="9">Vorderholz</text>
        <line x1="78" y1="0" x2="92" y2="0" stroke="#c9924a" strokeWidth="3" />
        <text x="96" y="4" fill="#c9924a" fontSize="9">Gaubendach / Hauptdach</text>
        <line x1="220" y1="0" x2="234" y2="0" stroke="#6fa8d4" strokeWidth="3" />
        <text x="238" y="4" fill="#6fa8d4" fontSize="9">Lothölzer</text>
      </g>
    </svg>
  );
}
