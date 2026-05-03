"use client";

import { useState, useMemo } from "react";
import { AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ─── Typen ────────────────────────────────────────────────────────────────────

interface Eingaben {
  dachneigung: string;
  wangenhoehe: string;
  gaubenbreite: string;
  holzdicke: string;
}

interface Ergebnis {
  fusswinkel: number;
  schifterschnittwinkel: number;
  laengeSchaege: number;
  horizontaleProjektion: number;
  wangenhoeheSenkrecht: number;
}

// ─── Berechnung ───────────────────────────────────────────────────────────────

function berechne(
  dachneigung: number,
  wangenhoehe: number,
): Ergebnis {
  const alpha = (dachneigung * Math.PI) / 180;

  return {
    fusswinkel:              dachneigung,
    schifterschnittwinkel:   90 - dachneigung,
    laengeSchaege:           wangenhoehe / Math.sin(alpha),
    horizontaleProjektion:   wangenhoehe / Math.tan(alpha),
    wangenhoeheSenkrecht:    wangenhoehe,
  };
}

// Winkel auf 0,1° runden, Längen auf 0,5 cm runden (Zimmermannsnorm)
const rundeWinkel = (v: number) => Math.round(v * 10) / 10;
const rundeLaenge = (v: number) => Math.round(v * 2) / 2;

// ─── Haupt-Komponente ─────────────────────────────────────────────────────────

export function GauenwangenTool() {
  const [eingaben, setEingaben] = useState<Eingaben>({
    dachneigung:  "35",
    wangenhoehe:  "120",
    gaubenbreite: "150",
    holzdicke:    "6",
  });

  const [skizzeOffen, setSkizzeOffen] = useState(false);

  const setze = (key: keyof Eingaben) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setEingaben((prev) => ({ ...prev, [key]: e.target.value }));

  const parsed = useMemo(() => ({
    dachneigung:  parseFloat(eingaben.dachneigung),
    wangenhoehe:  parseFloat(eingaben.wangenhoehe),
    gaubenbreite: parseFloat(eingaben.gaubenbreite),
    holzdicke:    parseFloat(eingaben.holzdicke),
  }), [eingaben]);

  const fehler = useMemo(() => {
    if (isNaN(parsed.dachneigung) || parsed.dachneigung <= 0 || parsed.dachneigung >= 90)
      return "Dachneigung muss zwischen 1° und 89° liegen.";
    if (parsed.dachneigung < 10)
      return "Dachneigung unter 10° ist für Gauben unüblich — Ergebnis trotzdem angezeigt.";
    if (isNaN(parsed.wangenhoehe) || parsed.wangenhoehe <= 0)
      return "Wangenhöhe muss größer als 0 sein.";
    if (isNaN(parsed.gaubenbreite) || parsed.gaubenbreite <= 0)
      return "Gaubenbreite muss größer als 0 sein.";
    if (isNaN(parsed.holzdicke) || parsed.holzdicke <= 0)
      return "Holzdicke muss größer als 0 sein.";
    return null;
  }, [parsed]);

  const istKritisch = fehler !== null && (
    isNaN(parsed.dachneigung) || parsed.dachneigung <= 0 || parsed.dachneigung >= 90 ||
    isNaN(parsed.wangenhoehe) || parsed.wangenhoehe <= 0
  );

  const ergebnis = useMemo(() => {
    if (istKritisch) return null;
    return berechne(parsed.dachneigung, parsed.wangenhoehe);
  }, [istKritisch, parsed]);

  return (
    <div className="space-y-5">

      {/* ── Eingaben ── */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Eingaben</CardTitle>
          <CardDescription>Maße des Hauptdachs und der Gauenwange</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <EingabeFeld
            label="Dachneigung α"
            einheit="°"
            wert={eingaben.dachneigung}
            onChange={setze("dachneigung")}
            min={1} max={89} step={0.5}
            hinweis="Neigung des Hauptdachs"
          />
          <EingabeFeld
            label="Wangenhöhe (senkrecht)"
            einheit="cm"
            wert={eingaben.wangenhoehe}
            onChange={setze("wangenhoehe")}
            min={1} step={0.5}
            hinweis="Senkrechte Höhe der Gauenwange"
          />
          <EingabeFeld
            label="Gaubenbreite"
            einheit="cm"
            wert={eingaben.gaubenbreite}
            onChange={setze("gaubenbreite")}
            min={1} step={1}
            hinweis="Lichte Breite der Gaube"
          />
          <EingabeFeld
            label="Holzdicke"
            einheit="cm"
            wert={eingaben.holzdicke}
            onChange={setze("holzdicke")}
            min={1} step={0.5}
            hinweis="Stärke der Aufdoppelungsbretter"
          />
        </CardContent>
      </Card>

      {/* ── Hinweis / Fehler ── */}
      {fehler && (
        <div className={cn(
          "flex items-start gap-2 rounded-md border px-4 py-3 text-sm",
          istKritisch
            ? "border-destructive/30 bg-destructive/10 text-destructive"
            : "border-oak/30 bg-oak-alpha text-oak"
        )}>
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{fehler}</span>
        </div>
      )}

      {/* ── Ergebnisse ── */}
      {ergebnis && (
        <Card className="border-pine/20">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Ergebnisse</CardTitle>
            <CardDescription>
              Schnittwinkel und Maße · Winkel auf 0,1° · Längen auf 0,5 cm
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-0 divide-y divide-border">
            <ErgebnisZeile
              label="Fußwinkel"
              wert={`${rundeWinkel(ergebnis.fusswinkel).toFixed(1)}°`}
              einheit="Winkel"
              farbe="oak"
              info="Neigungswinkel am Fuß der Wangenbretter (= Dachneigung α). Sägeanschlag für den Fußschnitt."
            />
            <ErgebnisZeile
              label="Schifterschnittwinkel"
              wert={`${rundeWinkel(ergebnis.schifterschnittwinkel).toFixed(1)}°`}
              einheit="Winkel"
              farbe="oak"
              info="Ergänzungswinkel (90° − α). Sägeblatt-Neigung für senkrechte Schnittfläche bei liegenden Brettern."
            />
            <ErgebnisZeile
              label="Länge entlang Dachschräge"
              wert={`${rundeLaenge(ergebnis.laengeSchaege).toFixed(1)} cm`}
              einheit="Länge"
              farbe="pine"
              info="Tatsächliche Länge der Wangenbretter, gemessen entlang der Dachfläche."
            />
            <ErgebnisZeile
              label="Horizontale Tiefe"
              wert={`${rundeLaenge(ergebnis.horizontaleProjektion).toFixed(1)} cm`}
              einheit="Länge"
              farbe="pine"
              info="Grundriss-Maß der Gauenwange (horizontale Ausdehnung vom Traufpunkt)."
            />
            <ErgebnisZeile
              label="Wangenhöhe senkrecht"
              wert={`${rundeLaenge(ergebnis.wangenhoeheSenkrecht).toFixed(1)} cm`}
              einheit="Kontrolle"
              farbe="steel"
              info="Kontrollmaß — entspricht der eingegebenen Wangenhöhe."
            />
          </CardContent>
        </Card>
      )}

      {/* ── Skizze (aufklappbar) ── */}
      {ergebnis && (
        <div>
          <button
            onClick={() => setSkizzeOffen((v) => !v)}
            className="flex w-full items-center justify-between rounded-md border border-border bg-s1 px-4 py-3 text-sm text-mu transition-colors hover:bg-s2 hover:text-tx"
          >
            <span className="font-medium">Skizze — Querschnitt</span>
            {skizzeOffen
              ? <ChevronUp className="h-4 w-4" />
              : <ChevronDown className="h-4 w-4" />
            }
          </button>
          {skizzeOffen && (
            <div className="mt-2 rounded-md border border-border bg-s1 p-4">
              <Skizze
                alpha={parsed.dachneigung}
                laengeSchaege={rundeLaenge(ergebnis.laengeSchaege)}
                wangenhoehe={parsed.wangenhoehe}
                horizontaleProjektion={rundeLaenge(ergebnis.horizontaleProjektion)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Eingabe-Feld ─────────────────────────────────────────────────────────────

interface EingabeFeldProps {
  label: string;
  einheit: string;
  wert: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  min?: number;
  max?: number;
  step?: number;
  hinweis?: string;
}

function EingabeFeld({ label, einheit, wert, onChange, min, max, step, hinweis }: EingabeFeldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-tx">{label}</label>
      {hinweis && <p className="text-[11px] text-mu">{hinweis}</p>}
      <div className="flex items-center overflow-hidden rounded-md border border-border bg-s2 focus-within:ring-2 focus-within:ring-oak/50">
        <input
          type="number"
          value={wert}
          onChange={onChange}
          min={min}
          max={max}
          step={step}
          className="flex-1 bg-transparent px-3 py-3 text-sm text-tx outline-none placeholder:text-mu"
          inputMode="decimal"
        />
        <span className="shrink-0 border-l border-border bg-s3 px-3 py-3 text-xs font-semibold text-mu">
          {einheit}
        </span>
      </div>
    </div>
  );
}

// ─── Ergebnis-Zeile ───────────────────────────────────────────────────────────

interface ErgebnisZeileProps {
  label: string;
  wert: string;
  einheit: string;
  farbe: "oak" | "pine" | "steel";
  info: string;
}

function ErgebnisZeile({ label, wert, einheit, farbe, info }: ErgebnisZeileProps) {
  const [aufgeklappt, setAufgeklappt] = useState(false);

  const farbeKlassen = {
    oak:   "text-oak",
    pine:  "text-pine",
    steel: "text-steel",
  }[farbe];

  const einheitFarbe = {
    oak:   "bg-oak-alpha text-oak",
    pine:  "bg-pine-alpha text-pine",
    steel: "bg-steel-alpha text-steel",
  }[farbe];

  return (
    <div className="py-3">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-tx">{label}</span>
            <span className={cn("rounded-sm px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider", einheitFarbe)}>
              {einheit}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn("text-lg font-bold tabular-nums", farbeKlassen)}>{wert}</span>
          <button
            onClick={() => setAufgeklappt((v) => !v)}
            className="rounded-sm p-1 text-mu transition-colors hover:bg-s2 hover:text-tx"
            aria-label="Erklärung anzeigen"
          >
            {aufgeklappt ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
      {aufgeklappt && (
        <p className="mt-2 text-xs text-mu leading-relaxed">{info}</p>
      )}
    </div>
  );
}

// ─── Skizze (SVG) ─────────────────────────────────────────────────────────────

function Skizze({
  alpha,
  laengeSchaege,
  wangenhoehe,
  horizontaleProjektion,
}: {
  alpha: number;
  laengeSchaege: number;
  wangenhoehe: number;
  horizontaleProjektion: number;
}) {
  // SVG-Koordinaten: Ursprung unten-links, Y nach oben (gespiegelt in SVG)
  const W = 300;
  const H = 200;
  const pad = 40;

  const maxH = H - pad * 2;
  const maxW = W - pad * 2;

  // Skala: Wangenhöhe passt in maxH
  const skala = Math.min(maxH / wangenhoehe, maxW / horizontaleProjektion) * 0.85;

  const svgW = horizontaleProjektion * skala;
  const svgH = wangenhoehe * skala;

  // Punkte (in SVG-Koordinaten: Y wächst nach unten)
  const A = { x: pad, y: H - pad };                   // Fußpunkt Gauenwange (unten-links)
  const B = { x: pad, y: H - pad - svgH };             // Kopfpunkt Gauenwange (oben-links)
  const C = { x: pad + svgW, y: H - pad };             // Fußpunkt Dachfläche (unten-rechts)

  // Winkel-Bogen am Fußpunkt
  const bogenR = 24;
  const alphaRad = (alpha * Math.PI) / 180;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full max-w-sm mx-auto"
      aria-label="Querschnitt der Gauenwange"
    >
      {/* Dachfläche (Hypotenuse) */}
      <line x1={A.x} y1={A.y} x2={C.x} y2={C.y} stroke="#8a8070" strokeWidth="1.5" strokeDasharray="6 3" />

      {/* Dachschräge */}
      <line
        x1={A.x} y1={A.y}
        x2={A.x + laengeSchaege * skala * Math.cos(alphaRad)}
        y2={A.y - laengeSchaege * skala * Math.sin(alphaRad)}
        stroke="#c9924a" strokeWidth="2.5"
      />

      {/* Gauenwange (senkrecht) */}
      <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke="#7fb87a" strokeWidth="2.5" />

      {/* Horizontale Basis */}
      <line x1={A.x} y1={A.y} x2={C.x} y2={A.y} stroke="#504840" strokeWidth="1.5" />

      {/* Winkel-Bogen α */}
      <path
        d={`M ${A.x + bogenR} ${A.y} A ${bogenR} ${bogenR} 0 0 0 ${A.x + bogenR * Math.cos(alphaRad)} ${A.y - bogenR * Math.sin(alphaRad)}`}
        fill="none" stroke="#c9924a" strokeWidth="1.5"
      />

      {/* Label α */}
      <text
        x={A.x + bogenR + 6}
        y={A.y - 6}
        fill="#c9924a"
        fontSize="11"
        fontWeight="700"
      >
        α = {alpha.toFixed(1)}°
      </text>

      {/* Label Dachschräge */}
      <text
        x={A.x + svgW * 0.3}
        y={A.y - svgH * 0.3}
        fill="#c9924a"
        fontSize="10"
        textAnchor="middle"
        transform={`rotate(${-alpha}, ${A.x + svgW * 0.3}, ${A.y - svgH * 0.3})`}
      >
        {laengeSchaege.toFixed(1)} cm
      </text>

      {/* Label Wangenhöhe */}
      <text
        x={A.x - 8}
        y={A.y - svgH / 2}
        fill="#7fb87a"
        fontSize="10"
        textAnchor="end"
      >
        {wangenhoehe.toFixed(1)} cm
      </text>

      {/* Label Horizontale */}
      <text
        x={A.x + svgW / 2}
        y={A.y + 16}
        fill="#504840"
        fontSize="10"
        textAnchor="middle"
      >
        {horizontaleProjektion.toFixed(1)} cm
      </text>

      {/* Rechter Winkel (Gauenwange ist senkrecht) */}
      <rect
        x={A.x}
        y={A.y - 10}
        width="10"
        height="10"
        fill="none"
        stroke="#7fb87a"
        strokeWidth="1.2"
      />
    </svg>
  );
}
