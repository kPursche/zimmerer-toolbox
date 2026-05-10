"use client";

import { useState, useMemo } from "react";
import { AlertCircle, Plus, Trash2 } from "lucide-react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";

// ── Types ─────────────────────────────────────────────────────────────────────

type Ecke = "boden" | "deckel";

interface Oeffnung {
  id: number;
  x_str: string;
  breite_str: string;
  hoehe_str: string;
  ypos_str: string;
  einstand_l_str: string;
  einstand_r_str: string;
}

interface ParsedOeffnung {
  id: number;
  x: number;
  breite: number;
  hoehe: number;
  ypos: number;
  einstand_l: number;
  einstand_r: number;
}

interface BoardPos {
  x: number;
  w: number;
  typ: "boden" | "deckel";
}

interface Ergebnis {
  n_boden: number;
  n_deckel: number;
  u: number;
  gap: number;
  module: number;
  boards: BoardPos[];
}

// ── Calculation ───────────────────────────────────────────────────────────────
//
// Corner combos determine how many boards fit and the u formula.
//
// B-B: (n+1) Boden, n Deckel  → u = ((n+1)·b_B + n·b_D − W) / (2n)
// D-D: n Boden, (n+1) Deckel  → u = (n·b_B + (n+1)·b_D − W) / (2n)
// B-D or D-B: n each           → u = (n·(b_B+b_D) − W) / (2n−1)
//
// Board x-offsets:
//   ecke_l=B: Boden[i] = i·m, Deckel[i] = b_B−u + i·m
//   ecke_l=D: Boden[i] = b_D−u + i·m, Deckel[i] = i·m
// where m = b_B + b_D − 2u

function solve(
  W: number, b_B: number, b_D: number,
  u_min: number, u_max: number,
  ecke_l: Ecke, ecke_r: Ecke,
): Ergebnis | null {
  const combo = `${ecke_l}-${ecke_r}`;
  const maxN = Math.ceil(W / b_B) + 4;
  const u_target = (u_min + u_max) / 2;
  let best: Ergebnis | null = null;
  let bestDist = Infinity;

  for (let n = 1; n <= maxN; n++) {
    let u: number, n_B: number, n_D: number;

    if (combo === "boden-boden") {
      u = ((n + 1) * b_B + n * b_D - W) / (2 * n);
      n_B = n + 1; n_D = n;
    } else if (combo === "deckel-deckel") {
      u = (n * b_B + (n + 1) * b_D - W) / (2 * n);
      n_B = n; n_D = n + 1;
    } else {
      // B-D or D-B
      u = (n * (b_B + b_D) - W) / (2 * n - 1);
      n_B = n; n_D = n;
    }

    if (isNaN(u) || u < u_min - 0.5 || u > u_max + 0.5) continue;
    const gap = b_D - 2 * u;
    if (gap <= 0) continue;
    const m = b_B + gap;

    const bx = ecke_l === "boden" ? 0 : b_D - u;
    const dx = ecke_l === "boden" ? b_B - u : 0;

    const boards: BoardPos[] = [];
    for (let i = 0; i < n_B; i++) boards.push({ x: bx + i * m, w: b_B, typ: "boden" });
    for (let i = 0; i < n_D; i++) boards.push({ x: dx + i * m, w: b_D, typ: "deckel" });

    const dist = Math.abs(u - u_target);
    if (dist < bestDist) {
      bestDist = dist;
      best = { n_boden: n_B, n_deckel: n_D, u, gap, module: m, boards };
    }
  }

  return best;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BodenDeckelschaulungTool() {
  const [wandbreite, setWandbreite] = useState("4500");
  const [wandhoehe, setWandhoehe] = useState("2800");
  const [bodenBreite, setBodenBreite] = useState("160");
  const [deckelBreite, setDeckelBreite] = useState("80");
  const [uMin, setUMin] = useState("20");
  const [uMax, setUMax] = useState("30");
  const [eckeL, setEckeL] = useState<Ecke>("boden");
  const [eckeR, setEckeR] = useState<Ecke>("boden");
  const [oeffnungen, setOeffnungen] = useState<Oeffnung[]>([]);
  const [nextId, setNextId] = useState(1);

  const p = useMemo(() => ({
    W: parseFloat(wandbreite),
    H: parseFloat(wandhoehe),
    b_B: parseFloat(bodenBreite),
    b_D: parseFloat(deckelBreite),
    u_min: parseFloat(uMin),
    u_max: parseFloat(uMax),
  }), [wandbreite, wandhoehe, bodenBreite, deckelBreite, uMin, uMax]);

  const fehler = useMemo((): string | null => {
    if (isNaN(p.W) || p.W <= 0) return "Wandbreite eingeben.";
    if (isNaN(p.H) || p.H <= 0) return "Wandhöhe eingeben.";
    if (isNaN(p.b_B) || p.b_B <= 0) return "Brettbreite Boden eingeben.";
    if (isNaN(p.b_D) || p.b_D <= 0) return "Brettbreite Deckel eingeben.";
    if (isNaN(p.u_min) || p.u_min < 0) return "Überdeckung min ≥ 0 mm.";
    if (isNaN(p.u_max) || p.u_max < p.u_min) return "Überdeckung max ≥ min.";
    if (p.b_D <= 2 * p.u_min) return "Deckelbreite muss größer als 2 × Überdeckung min sein.";
    return null;
  }, [p]);

  const erg = useMemo(() => {
    if (fehler) return null;
    return solve(p.W, p.b_B, p.b_D, p.u_min, p.u_max, eckeL, eckeR);
  }, [fehler, p, eckeL, eckeR]);

  const parsedOeff = useMemo<ParsedOeffnung[]>(() =>
    oeffnungen.map(o => ({
      id: o.id,
      x: parseFloat(o.x_str) || 0,
      breite: parseFloat(o.breite_str) || 0,
      hoehe: parseFloat(o.hoehe_str) || 0,
      ypos: parseFloat(o.ypos_str) || 0,
      einstand_l: parseFloat(o.einstand_l_str) || 0,
      einstand_r: parseFloat(o.einstand_r_str) || 0,
    })),
    [oeffnungen]
  );

  const addOeffnung = () => {
    setOeffnungen(prev => [...prev, {
      id: nextId,
      x_str: "800", breite_str: "900", hoehe_str: "1200",
      ypos_str: "800", einstand_l_str: "0", einstand_r_str: "0",
    }]);
    setNextId(n => n + 1);
  };

  return (
    <div className="space-y-5">

      {/* Wand */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Wand</CardTitle>
          <CardDescription>Alle Maße in mm</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <EF label="Breite" einheit="mm" wert={wandbreite} onChange={e => setWandbreite(e.target.value)} min={100} />
            <EF label="Höhe" einheit="mm" wert={wandhoehe} onChange={e => setWandhoehe(e.target.value)} min={100} />
          </div>
        </CardContent>
      </Card>

      {/* Schalung */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Schalung</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <EF label="Brettbreite Boden" einheit="mm" wert={bodenBreite} onChange={e => setBodenBreite(e.target.value)} min={10} />
            <EF label="Brettbreite Deckel" einheit="mm" wert={deckelBreite} onChange={e => setDeckelBreite(e.target.value)} min={10} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <EF label="Überdeckung min" einheit="mm" wert={uMin} onChange={e => setUMin(e.target.value)} min={0} />
            <EF label="Überdeckung max" einheit="mm" wert={uMax} onChange={e => setUMax(e.target.value)} min={0} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <EckeSelect label="Ecke links" wert={eckeL} onChange={setEckeL} />
            <EckeSelect label="Ecke rechts" wert={eckeR} onChange={setEckeR} />
          </div>
        </CardContent>
      </Card>

      {/* Öffnungen */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Öffnungen</CardTitle>
            <button
              onClick={addOeffnung}
              className="flex items-center gap-1.5 rounded-md bg-oak-alpha px-3 py-1.5 text-xs font-semibold text-oak hover:bg-oak/20"
            >
              <Plus className="h-3.5 w-3.5" />
              Hinzufügen
            </button>
          </div>
        </CardHeader>
        {oeffnungen.length > 0 && (
          <CardContent className="space-y-4">
            {oeffnungen.map(o => (
              <OeffnungCard
                key={o.id}
                o={o}
                onChange={(field, val) =>
                  setOeffnungen(prev => prev.map(x => x.id === o.id ? { ...x, [field]: val } : x))
                }
                onRemove={() => setOeffnungen(prev => prev.filter(x => x.id !== o.id))}
              />
            ))}
          </CardContent>
        )}
      </Card>

      {/* Fehler */}
      {fehler && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{fehler}</span>
        </div>
      )}

      {/* Kein Ergebnis */}
      {!fehler && !erg && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          Mit diesen Maßen ist keine ganzzahlige Einteilung im Überdeckungsbereich möglich. Überdeckung oder Brettbreiten anpassen.
        </div>
      )}

      {/* Ergebnisse */}
      {erg && !fehler && (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Einteilung</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <ErgebnisWert label="Bodenbretter" wert={`${erg.n_boden} Stk.`} />
                <ErgebnisWert label="Deckelbretter" wert={`${erg.n_deckel} Stk.`} />
                <ErgebnisWert label="Überdeckung" wert={`${erg.u.toFixed(1)} mm`} highlight />
                <ErgebnisWert label="Sichtfuge" wert={`${erg.gap.toFixed(1)} mm`} />
              </div>
              <div className="text-xs text-mu">
                Modul: {erg.module.toFixed(1)} mm · Ecke links: {eckeL === "boden" ? "Bodenbrett" : "Deckelbrett"} · Ecke rechts: {eckeR === "boden" ? "Bodenbrett" : "Deckelbrett"}
              </div>
            </CardContent>
          </Card>

          <Card className="-mx-4 rounded-none border-x-0 sm:mx-0 sm:rounded-xl sm:border-x">
            <CardHeader className="px-4 pb-2 sm:px-6">
              <CardTitle className="text-base">Wandansicht (maßstabsgetreu)</CardTitle>
            </CardHeader>
            <CardContent className="p-0 pb-4">
              <WandSVG W={p.W} H={p.H} boards={erg.boards} oeffnungen={parsedOeff} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ── Sub-Components ─────────────────────────────────────────────────────────────

interface EFProps {
  label: string;
  einheit: string;
  wert: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  min?: number;
  step?: number;
}

function EF({ label, einheit, wert, onChange, min, step = 1 }: EFProps) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold text-tx">{label}</label>
      <div className="flex overflow-hidden rounded-md border border-border bg-s2 focus-within:ring-2 focus-within:ring-oak/40">
        <input
          type="number" value={wert} onChange={onChange}
          min={min} step={step} inputMode="decimal"
          onFocus={ev => ev.target.select()}
          className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-tx outline-none"
        />
        <span className="shrink-0 border-l border-border bg-s3 px-3 py-2.5 text-xs font-semibold text-mu">
          {einheit}
        </span>
      </div>
    </div>
  );
}

function EckeSelect({ label, wert, onChange }: { label: string; wert: Ecke; onChange: (v: Ecke) => void }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold text-tx">{label}</label>
      <div className="flex overflow-hidden rounded-md border border-border bg-s2 focus-within:ring-2 focus-within:ring-oak/40">
        <select
          value={wert}
          onChange={e => onChange(e.target.value as Ecke)}
          className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-tx outline-none"
        >
          <option value="boden">Bodenbrett</option>
          <option value="deckel">Deckelbrett</option>
        </select>
      </div>
    </div>
  );
}

function OeffnungCard({
  o, onChange, onRemove,
}: {
  o: Oeffnung;
  onChange: (field: keyof Oeffnung, val: string) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-mu">Öffnung {o.id}</span>
        <button
          onClick={onRemove}
          className="flex h-6 w-6 items-center justify-center rounded text-mu hover:bg-s3 hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <EF label="Position von links" einheit="mm" wert={o.x_str} onChange={e => onChange("x_str", e.target.value)} min={0} />
        <EF label="Breite" einheit="mm" wert={o.breite_str} onChange={e => onChange("breite_str", e.target.value)} min={1} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <EF label="Höhe" einheit="mm" wert={o.hoehe_str} onChange={e => onChange("hoehe_str", e.target.value)} min={1} />
        <EF label="Unterkante ab Boden" einheit="mm" wert={o.ypos_str} onChange={e => onChange("ypos_str", e.target.value)} min={0} />
      </div>
      <div>
        <p className="mb-2 text-[11px] text-mu">Einstand der Schalung in die Öffnung</p>
        <div className="grid grid-cols-2 gap-3">
          <EF label="Links" einheit="mm" wert={o.einstand_l_str} onChange={e => onChange("einstand_l_str", e.target.value)} min={0} />
          <EF label="Rechts" einheit="mm" wert={o.einstand_r_str} onChange={e => onChange("einstand_r_str", e.target.value)} min={0} />
        </div>
      </div>
    </div>
  );
}

function ErgebnisWert({ label, wert, highlight = false }: { label: string; wert: string; highlight?: boolean }) {
  return (
    <div className="rounded-md bg-s2 px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wide text-mu">{label}</div>
      <div className={`text-lg font-bold ${highlight ? "text-oak" : "text-tx"}`}>{wert}</div>
    </div>
  );
}

// ── SVG Wandansicht ───────────────────────────────────────────────────────────

function WandSVG({
  W, H, boards, oeffnungen,
}: {
  W: number;
  H: number;
  boards: BoardPos[];
  oeffnungen: ParsedOeffnung[];
}) {
  const SVG_W = 600;
  const PAD = { l: 52, r: 16, t: 16, b: 48 };
  const maxDrawW = SVG_W - PAD.l - PAD.r;
  const maxDrawH = 340;
  const scale = Math.min(maxDrawW / W, maxDrawH / H);
  const drawW = W * scale;
  const drawH = H * scale;
  const SVG_H = drawH + PAD.t + PAD.b;

  const sx = (x: number) => PAD.l + x * scale;
  const sy = (yFromBot: number) => PAD.t + drawH - yFromBot * scale;

  const C_BODEN   = "#a07850";
  const C_DECKEL  = "#d4aa7a";
  const C_WALL    = "#e8e0d8";
  const C_OPENING = "#18140e";
  const C_DIM     = "#504840";

  // For each opening, redraw boards in the einstand zones on top of the dark hole
  const einstandRects = oeffnungen.flatMap((o, oi) =>
    boards.flatMap((b, bi) => {
      const color = b.typ === "boden" ? C_BODEN : C_DECKEL;
      const oTop = sy(o.ypos + o.hoehe);
      const oH = o.hoehe * scale;
      const elems: React.ReactNode[] = [];

      if (o.einstand_l > 0) {
        const lx = Math.max(b.x, o.x);
        const rx = Math.min(b.x + b.w, o.x + o.einstand_l);
        if (rx > lx)
          elems.push(
            <rect key={`l${oi}-${bi}`}
              x={sx(lx)} y={oTop}
              width={(rx - lx) * scale} height={oH}
              fill={color}
            />
          );
      }
      if (o.einstand_r > 0) {
        const lx = Math.max(b.x, o.x + o.breite - o.einstand_r);
        const rx = Math.min(b.x + b.w, o.x + o.breite);
        if (rx > lx)
          elems.push(
            <rect key={`r${oi}-${bi}`}
              x={sx(lx)} y={oTop}
              width={(rx - lx) * scale} height={oH}
              fill={color}
            />
          );
      }
      return elems;
    })
  );

  return (
    <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full">
      {/* Wall background */}
      <rect x={sx(0)} y={PAD.t} width={drawW} height={drawH} fill={C_WALL} />

      {/* Boden boards (drawn first, behind deckel) */}
      {boards.filter(b => b.typ === "boden").map((b, i) => (
        <rect key={i}
          x={sx(b.x)} y={PAD.t}
          width={Math.max(0.5, b.w * scale)} height={drawH}
          fill={C_BODEN}
        />
      ))}

      {/* Deckel boards */}
      {boards.filter(b => b.typ === "deckel").map((b, i) => (
        <rect key={i}
          x={sx(b.x)} y={PAD.t}
          width={Math.max(0.5, b.w * scale)} height={drawH}
          fill={C_DECKEL}
        />
      ))}

      {/* Openings */}
      {oeffnungen.map((o, i) => (
        <rect key={i}
          x={sx(o.x)} y={sy(o.ypos + o.hoehe)}
          width={Math.max(1, o.breite * scale)} height={o.hoehe * scale}
          fill={C_OPENING}
        />
      ))}

      {/* Einstand zones: boards visible inside opening edges */}
      {einstandRects}

      {/* Wall outline */}
      <rect x={sx(0)} y={PAD.t} width={drawW} height={drawH}
        fill="none" stroke={C_DIM} strokeWidth="1.5" />

      {/* Dimension: width at bottom */}
      <line x1={sx(0)} x2={sx(W)} y1={PAD.t + drawH + 22} y2={PAD.t + drawH + 22} stroke={C_DIM} strokeWidth="0.8" />
      <line x1={sx(0)} y1={PAD.t + drawH + 17} x2={sx(0)} y2={PAD.t + drawH + 27} stroke={C_DIM} strokeWidth="0.8" />
      <line x1={sx(W)} y1={PAD.t + drawH + 17} x2={sx(W)} y2={PAD.t + drawH + 27} stroke={C_DIM} strokeWidth="0.8" />
      <text x={sx(0) + drawW / 2} y={PAD.t + drawH + 36}
        textAnchor="middle" fontSize="10" fill={C_DIM}>
        {W} mm
      </text>

      {/* Dimension: height on left */}
      <line x1={sx(0) - 32} y1={PAD.t} x2={sx(0) - 32} y2={PAD.t + drawH} stroke={C_DIM} strokeWidth="0.8" />
      <line x1={sx(0) - 37} y1={PAD.t} x2={sx(0) - 27} y2={PAD.t} stroke={C_DIM} strokeWidth="0.8" />
      <line x1={sx(0) - 37} y1={PAD.t + drawH} x2={sx(0) - 27} y2={PAD.t + drawH} stroke={C_DIM} strokeWidth="0.8" />
      <text
        x={sx(0) - 34} y={PAD.t + drawH / 2}
        fontSize="10" fill={C_DIM} textAnchor="middle"
        transform={`rotate(-90, ${sx(0) - 34}, ${PAD.t + drawH / 2})`}
      >
        {H} mm
      </text>

      {/* Legend */}
      <g transform={`translate(${PAD.l}, ${PAD.t + drawH + 40})`}>
        <rect x="0" y="-7" width="16" height="10" fill={C_BODEN} />
        <text x="20" y="3" fontSize="9" fill={C_DIM}>Bodenbrett</text>
        <rect x="92" y="-7" width="16" height="10" fill={C_DECKEL} />
        <text x="112" y="3" fontSize="9" fill={C_DIM}>Deckelbrett</text>
      </g>
    </svg>
  );
}
