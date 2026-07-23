"use client";

import { useMemo, useState } from "react";
import { AlertCircle, FileDown, FileText, ListRestart, RotateCcw } from "lucide-react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { berechneWand, type Pfosten } from "@/lib/wandplaner";

// ── Export ──────────────────────────────────────────────────────────────────

function downloadBlob(inhalt: string, dateiname: string, mimeType: string) {
  const blob = new Blob([inhalt], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = dateiname;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function formatZahl(n: number): string {
  return n.toFixed(1).replace(".", ",");
}

function exportiereCsv(stueckliste: Pfosten[]) {
  const zeilen = stueckliste.map((p) =>
    [p.nr, formatZahl(p.x), formatZahl(p.laenge), p.winkel.toFixed(2).replace(".", ",")].join(";")
  );
  const csv = ["Nr;Position (cm);Länge (cm);Winkel (°)", ...zeilen].join("\r\n");
  downloadBlob("﻿" + csv, `wandplaner-stueckliste-${new Date().toISOString().slice(0, 10)}.csv`, "text/csv;charset=utf-8;");
}

function exportierePdf(stueckliste: Pfosten[], breite: number) {
  const zeilen = stueckliste
    .map((p) => `<tr><td>${p.nr}</td><td>${formatZahl(p.x)}</td><td>${formatZahl(p.laenge)}</td><td>${p.winkel.toFixed(2)}</td></tr>`)
    .join("");
  const html = `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><title>Wandplaner-Stückliste</title>
<style>body{font-family:Arial,sans-serif;padding:24px;color:#1a1a1a}h1{font-size:18px;margin-bottom:4px}
table{width:100%;border-collapse:collapse;font-size:13px}th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}
th{background:#f0f0f0}</style></head><body>
<h1>Holzrahmenbau-Wandplaner</h1><p style="color:#555;font-size:12px">Wandbreite ${formatZahl(breite)} cm — ${stueckliste.length} Pfosten</p>
<table><thead><tr><th>Nr.</th><th>Position (cm)</th><th>Länge (cm)</th><th>Winkel (°)</th></tr></thead>
<tbody>${zeilen}</tbody></table>
<script>window.onload=()=>window.print();</script></body></html>`;
  const fenster = window.open("", "_blank");
  if (!fenster) return;
  fenster.document.write(html);
  fenster.document.close();
}

// ── Eingabefeld ───────────────────────────────────────────────────────────────

function Feld({
  label, einheit, wert, onChange, min = 0, step = 1,
}: {
  label: string;
  einheit: string;
  wert: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  min?: number;
  step?: number;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold text-tx">{label}</label>
      <div className="flex overflow-hidden rounded-md border border-border bg-s2 focus-within:ring-2 focus-within:ring-oak/40">
        <input
          type="number" value={wert} onChange={onChange}
          min={min} step={step} inputMode="decimal"
          onFocus={(ev) => ev.target.select()}
          className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-tx outline-none"
        />
        <span className="shrink-0 border-l border-border bg-s3 px-3 py-2.5 text-xs font-semibold text-mu">
          {einheit}
        </span>
      </div>
    </div>
  );
}

// ── SVG Seitenansicht ─────────────────────────────────────────────────────────

function WandSVG({
  breite, schwellenhoehe, raehmhoehe, wandhoeheLinks, wandhoeheRechts, positionen, staenderbreite,
  winkel, raehmLaenge, verstich,
}: {
  breite: number;
  schwellenhoehe: number;
  raehmhoehe: number;
  wandhoeheLinks: number;
  wandhoeheRechts: number;
  positionen: number[];
  staenderbreite: number;
  winkel: number;
  raehmLaenge: number;
  verstich: number;
}) {
  const geneigt = Math.abs(winkel) > 1e-6;
  const gesamthoeheMax = Math.max(wandhoeheLinks, wandhoeheRechts);
  const SVG_W = 600;
  const PAD = { l: 52, r: 16, t: geneigt ? 48 : 16, b: 48 };
  const maxDrawW = SVG_W - PAD.l - PAD.r;
  const maxDrawH = 340;
  const scale = Math.min(maxDrawW / breite, maxDrawH / gesamthoeheMax);
  const drawW = breite * scale;
  const drawH = gesamthoeheMax * scale;
  const SVG_H = drawH + PAD.t + PAD.b;

  const sx = (x: number) => PAD.l + x * scale;
  const sy = (yVonUnten: number) => PAD.t + drawH - yVonUnten * scale;

  const wandhoeheAn = (x: number) =>
    wandhoeheLinks + ((wandhoeheRechts - wandhoeheLinks) * x) / breite;

  const C_SCHWELLE = "#8a6a48";
  const C_RAEHM = "#a07850";
  const C_PFOSTEN = "#504840";
  const C_DIM = "#504840";

  return (
    <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full">
      {/* Schwelle (immer waagerecht) */}
      <rect x={sx(0)} y={sy(schwellenhoehe)} width={drawW} height={schwellenhoehe * scale} fill={C_SCHWELLE} />

      {/* Rähm (waagerecht oder geneigt) */}
      <polygon
        points={`${sx(0)},${sy(wandhoeheLinks - raehmhoehe)} ${sx(breite)},${sy(wandhoeheRechts - raehmhoehe)} ${sx(breite)},${sy(wandhoeheRechts)} ${sx(0)},${sy(wandhoeheLinks)}`}
        fill={C_RAEHM}
      />

      {/* Pfosten (in tatsächlicher Ständerbreite, Randpfosten außen bündig).
          Kopf mit echter Schmiege gezeichnet: Ober­kante folgt der Rähm-Neigung
          statt eines rechtwinkeligen Abschnitts. */}
      {positionen.map((x, i) => {
        const breitePx = Math.max(staenderbreite * scale, 2);
        const halbeStaenderbreite = staenderbreite / 2;
        const yObenLinks = wandhoeheAn(x - halbeStaenderbreite) - raehmhoehe;
        const yObenRechts = wandhoeheAn(x + halbeStaenderbreite) - raehmhoehe;
        const xLinks = sx(x) - breitePx / 2;
        const xRechts = sx(x) + breitePx / 2;
        const yUnten = sy(schwellenhoehe);
        return (
          <polygon
            key={i}
            points={`${xLinks},${yUnten} ${xRechts},${yUnten} ${xRechts},${sy(yObenRechts)} ${xLinks},${sy(yObenLinks)}`}
            fill={C_PFOSTEN}
          />
        );
      })}

      {/* Maßkette Rähm (Länge über Alles + Verstichmaß für die Schmiege),
          nur bei geneigtem Rähm — bei waagerechtem Rähm entspricht die Länge
          ohnehin der Wandbreite unten. */}
      {geneigt && (() => {
        const ax = sx(0), ay = sy(wandhoeheLinks);
        const bx = sx(breite), by = sy(wandhoeheRechts);
        const dx = bx - ax, dy = by - ay;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        let nx = -dy / len, ny = dx / len;
        if (ny > 0) { nx = -nx; ny = -ny; }
        const OFFSET = 14;
        const p1x = ax + nx * OFFSET, p1y = ay + ny * OFFSET;
        const p2x = bx + nx * OFFSET, p2y = by + ny * OFFSET;
        const midx = (p1x + p2x) / 2, midy = (p1y + p2y) / 2;
        let textRot = (Math.atan2(dy, dx) * 180) / Math.PI;
        if (textRot > 90) textRot -= 180;
        if (textRot < -90) textRot += 180;
        return (
          <g>
            <line x1={ax} y1={ay} x2={p1x} y2={p1y} stroke={C_DIM} strokeWidth="0.8" />
            <line x1={bx} y1={by} x2={p2x} y2={p2y} stroke={C_DIM} strokeWidth="0.8" />
            <line x1={p1x} y1={p1y} x2={p2x} y2={p2y} stroke={C_DIM} strokeWidth="0.8" />
            <text
              x={midx} y={midy - 4} fontSize="10" fill={C_DIM} textAnchor="middle"
              transform={`rotate(${textRot}, ${midx}, ${midy - 4})`}
            >
              {formatZahl(raehmLaenge)} cm (LüA)
            </text>
            <text
              x={midx} y={midy - 16} fontSize="9" fill={C_DIM} textAnchor="middle"
              transform={`rotate(${textRot}, ${midx}, ${midy - 16})`}
            >
              Schmiege: 100 → {formatZahl(Math.abs(verstich))} cm
            </text>
          </g>
        );
      })()}

      {/* Maßkette Breite */}
      <line x1={sx(0)} x2={sx(breite)} y1={PAD.t + drawH + 22} y2={PAD.t + drawH + 22} stroke={C_DIM} strokeWidth="0.8" />
      <line x1={sx(0)} y1={PAD.t + drawH + 17} x2={sx(0)} y2={PAD.t + drawH + 27} stroke={C_DIM} strokeWidth="0.8" />
      <line x1={sx(breite)} y1={PAD.t + drawH + 17} x2={sx(breite)} y2={PAD.t + drawH + 27} stroke={C_DIM} strokeWidth="0.8" />
      <text x={sx(0) + drawW / 2} y={PAD.t + drawH + 36} textAnchor="middle" fontSize="10" fill={C_DIM}>
        {breite} cm
      </text>

      {/* Maßkette Höhe links */}
      <line x1={sx(0) - 32} y1={sy(0)} x2={sx(0) - 32} y2={sy(wandhoeheLinks)} stroke={C_DIM} strokeWidth="0.8" />
      <text
        x={sx(0) - 34} y={sy(wandhoeheLinks / 2)}
        fontSize="10" fill={C_DIM} textAnchor="middle"
        transform={`rotate(-90, ${sx(0) - 34}, ${sy(wandhoeheLinks / 2)})`}
      >
        {wandhoeheLinks} cm
      </text>
    </svg>
  );
}

// ── Stückliste ────────────────────────────────────────────────────────────────

function StuecklisteTabelle({
  stueckliste, ueberschreibungen, onUeberschreibungChange, onReset, onRasterAbHier, pfostenabstandSoll,
}: {
  stueckliste: Pfosten[];
  ueberschreibungen: Record<number, string>;
  onUeberschreibungChange: (index: number, wert: string) => void;
  onReset: (index: number) => void;
  onRasterAbHier: (index: number) => void;
  pfostenabstandSoll: number;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border">
            <th className="py-1.5 pr-4 text-left font-semibold text-mu">Nr.</th>
            <th className="py-1.5 pr-4 text-right font-semibold text-mu">Position (cm)</th>
            <th className="py-1.5 pr-4 text-right font-semibold text-mu">Länge (cm)</th>
            <th className="py-1.5 pr-4 text-right font-semibold text-mu">Winkel (°)</th>
            <th className="py-1.5 text-right font-semibold text-mu"></th>
          </tr>
        </thead>
        <tbody>
          {stueckliste.map((p, i) => (
            <tr key={i} className="border-b border-border/50 last:border-0">
              <td className="py-1.5 pr-4 text-mu">{p.nr}</td>
              <td className="py-1.5 pr-4 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <input
                    type="number" step={0.5}
                    value={ueberschreibungen[i] ?? formatZahl(p.x)}
                    onChange={(e) => onUeberschreibungChange(i, e.target.value)}
                    onFocus={(ev) => ev.target.select()}
                    className="w-20 rounded-sm border border-border bg-s2 px-1.5 py-1 text-right font-mono text-tx outline-none focus:ring-2 focus:ring-oak/40"
                  />
                  {ueberschreibungen[i] !== undefined && (
                    <button
                      type="button"
                      onClick={() => onReset(i)}
                      title="Auf Raster zurücksetzen"
                      className="text-mu hover:text-tx"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </td>
              <td className="py-1.5 pr-4 text-right font-mono text-tx">{formatZahl(p.laenge)}</td>
              <td className="py-1.5 pr-4 text-right font-mono text-tx">{p.winkel.toFixed(2)}</td>
              <td className="py-1.5 text-right">
                {i < stueckliste.length - 1 && (
                  <button
                    type="button"
                    onClick={() => onRasterAbHier(i)}
                    title={`Ab diesem Pfosten alle folgenden im Raster von ${formatZahl(pfostenabstandSoll)} cm setzen`}
                    className="text-mu hover:text-tx"
                  >
                    <ListRestart className="h-3.5 w-3.5" />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Hauptkomponente ───────────────────────────────────────────────────────────

export function WandplanerTool() {
  const [breite, setBreite] = useState("400");
  const [schwellenhoehe, setSchwellenhoehe] = useState("10");
  const [raehmhoehe, setRaehmhoehe] = useState("10");
  const [wandhoeheLinks, setWandhoeheLinks] = useState("250");
  const [wandhoeheRechts, setWandhoeheRechts] = useState("250");
  const [pfostenabstand, setPfostenabstand] = useState("62.5");
  const [staenderbreite, setStaenderbreite] = useState("6");
  const [ueberschreibungen, setUeberschreibungen] = useState<Record<number, string>>({});

  const p = useMemo(() => ({
    breite: parseFloat(breite),
    schwellenhoehe: parseFloat(schwellenhoehe),
    raehmhoehe: parseFloat(raehmhoehe),
    wandhoeheLinks: parseFloat(wandhoeheLinks),
    wandhoeheRechts: parseFloat(wandhoeheRechts),
    pfostenabstandSoll: parseFloat(pfostenabstand),
    staenderbreite: parseFloat(staenderbreite),
  }), [breite, schwellenhoehe, raehmhoehe, wandhoeheLinks, wandhoeheRechts, pfostenabstand, staenderbreite]);

  const fehler = useMemo((): string | null => {
    if (isNaN(p.breite) || p.breite <= 0) return "Wandbreite eingeben.";
    if (isNaN(p.schwellenhoehe) || p.schwellenhoehe < 0) return "Schwellenhöhe eingeben.";
    if (isNaN(p.raehmhoehe) || p.raehmhoehe < 0) return "Rähmhöhe eingeben.";
    if (isNaN(p.wandhoeheLinks) || p.wandhoeheLinks <= 0) return "Wandhöhe links eingeben.";
    if (isNaN(p.wandhoeheRechts) || p.wandhoeheRechts <= 0) return "Wandhöhe rechts eingeben.";
    if (isNaN(p.pfostenabstandSoll) || p.pfostenabstandSoll <= 0) return "Pfostenabstand eingeben.";
    if (isNaN(p.staenderbreite) || p.staenderbreite <= 0) return "Ständerbreite eingeben.";
    if (p.staenderbreite >= p.breite / 2) return "Ständerbreite ist zu groß für die Wandbreite.";
    return null;
  }, [p]);

  const positionsUeberschreibungen = useMemo(() => {
    const result: Record<number, number> = {};
    for (const [index, wert] of Object.entries(ueberschreibungen)) {
      const num = parseFloat(wert);
      if (!isNaN(num)) result[Number(index)] = num;
    }
    return result;
  }, [ueberschreibungen]);

  const erg = useMemo(() => {
    if (fehler) return null;
    return berechneWand({ ...p, positionsUeberschreibungen });
  }, [fehler, p, positionsUeberschreibungen]);

  const setUeberschreibung = (index: number, wert: string) => {
    setUeberschreibungen((prev) => ({ ...prev, [index]: wert }));
  };
  const resetUeberschreibung = (index: number) => {
    setUeberschreibungen((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  // Setzt, ausgehend vom Pfosten an `index`, alle folgenden Pfosten (außer
  // dem letzten — der bleibt Restfeld/bündig zum Wandende) im Raster von
  // pfostenabstandSoll. Ändert nicht die Anzahl der Pfosten.
  const rasterAbHierSetzen = (index: number) => {
    if (!erg) return;
    const positionen = erg.positionen;
    const letzterIndex = positionen.length - 1;
    const anker = positionen[index];
    setUeberschreibungen((prev) => {
      const next = { ...prev };
      for (let j = index + 1; j < letzterIndex; j++) {
        next[j] = String(anker + (j - index) * p.pfostenabstandSoll);
      }
      delete next[letzterIndex];
      return next;
    });
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Wand</CardTitle>
          <CardDescription>Alle Maße in cm — Seitenansicht (Elevation), Tiefe der Wand spielt keine Rolle</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Feld label="Breite" einheit="cm" wert={breite} onChange={(e) => setBreite(e.target.value)} min={10} />
            <Feld label="Ständerbreite" einheit="cm" wert={staenderbreite} onChange={(e) => setStaenderbreite(e.target.value)} min={1} step={0.5} />
            <Feld label="Pfostenabstand (Soll)" einheit="cm" wert={pfostenabstand} onChange={(e) => setPfostenabstand(e.target.value)} min={1} step={0.5} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Feld label="Schwellenhöhe" einheit="cm" wert={schwellenhoehe} onChange={(e) => setSchwellenhoehe(e.target.value)} min={0} step={0.5} />
            <Feld label="Rähmhöhe" einheit="cm" wert={raehmhoehe} onChange={(e) => setRaehmhoehe(e.target.value)} min={0} step={0.5} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Feld label="Wandhöhe links" einheit="cm" wert={wandhoeheLinks} onChange={(e) => setWandhoeheLinks(e.target.value)} min={10} />
            <Feld label="Wandhöhe rechts" einheit="cm" wert={wandhoeheRechts} onChange={(e) => setWandhoeheRechts(e.target.value)} min={10} />
          </div>
        </CardContent>
      </Card>

      {fehler && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{fehler}</span>
        </div>
      )}

      {!fehler && erg && !erg.ok && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          Wandhöhe ist geringer als Schwellenhöhe + Rähmhöhe zusammen — die Pfostenlänge würde negativ. Maße prüfen.
        </div>
      )}

      {erg && erg.ok && (
        <>
          <Card className="-mx-4 rounded-none border-x-0 sm:mx-0 sm:rounded-xl sm:border-x">
            <CardHeader className="px-4 pb-2 sm:px-6">
              <CardTitle className="text-base">
                Seitenansicht{erg.winkel !== 0 ? ` (Rähm geneigt, ${Math.abs(erg.winkel).toFixed(1)}°)` : " (waagerecht)"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 pb-4">
              <WandSVG
                breite={p.breite}
                schwellenhoehe={p.schwellenhoehe}
                raehmhoehe={p.raehmhoehe}
                wandhoeheLinks={p.wandhoeheLinks}
                wandhoeheRechts={p.wandhoeheRechts}
                positionen={erg.positionen}
                staenderbreite={p.staenderbreite}
                winkel={erg.winkel}
                raehmLaenge={erg.raehmLaenge}
                verstich={erg.verstichmass}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Stückliste ({erg.stueckliste.length} Pfosten)</CardTitle>
                <div className="flex gap-2">
                  <button
                    onClick={() => exportiereCsv(erg.stueckliste)}
                    className="flex items-center gap-1.5 rounded-md border border-border bg-s2 px-3 py-1.5 text-xs font-semibold text-mu hover:bg-s3 hover:text-tx"
                  >
                    <FileDown className="h-3.5 w-3.5" /> CSV
                  </button>
                  <button
                    onClick={() => exportierePdf(erg.stueckliste, p.breite)}
                    className="flex items-center gap-1.5 rounded-md border border-border bg-s2 px-3 py-1.5 text-xs font-semibold text-mu hover:bg-s3 hover:text-tx"
                  >
                    <FileText className="h-3.5 w-3.5" /> PDF
                  </button>
                </div>
              </div>
              <CardDescription>Position einzeln überschreibbar — Standard folgt dem festen Raster ab der linken Kante</CardDescription>
            </CardHeader>
            <CardContent>
              <StuecklisteTabelle
                stueckliste={erg.stueckliste}
                ueberschreibungen={ueberschreibungen}
                onUeberschreibungChange={setUeberschreibung}
                onReset={resetUeberschreibung}
                onRasterAbHier={rasterAbHierSetzen}
                pfostenabstandSoll={p.pfostenabstandSoll}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
