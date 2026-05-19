"use client";

import { useCallback, useRef, useState } from "react";
import { Calculator, Eraser, Save } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  dachausmittlung,
  type DachausmittlungErgebnis,
} from "@/lib/geometry/dachausmittlung";
import {
  saveGrundriss,
  type DachEdge,
  type EdgeType,
} from "@/lib/geometry/model";
import type { Point2 } from "@/lib/geometry/primitives";
import { glaetteFreihand } from "@/lib/geometry/smoothing";

type Mode = "drawing" | "editing" | "results";

const WORLD = 16000;
const PAD = 1000;
const GRID = 1000;

const COLOR_BY_TYPE: Record<EdgeType, string> = {
  Traufe: "#1565c0",
  Walm: "#c62828",
  Giebel: "#6b7280",
};

const SKELETON_COLOR: Record<string, string> = {
  First: "#dc2626",
  Grat: "#1d4ed8",
  Kehle: "#7c3aed",
  Ortgang: "#6b7280",
};

export function DachausmittlungTool() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [mode, setMode] = useState<Mode>("drawing");
  const [rawStroke, setRawStroke] = useState<Point2[]>([]);
  const [vertices, setVertices] = useState<Point2[]>([]);
  const [edges, setEdges] = useState<DachEdge[]>([]);
  const [selectedEdge, setSelectedEdge] = useState<number | null>(null);
  const [result, setResult] = useState<DachausmittlungErgebnis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isDrawingRef = useRef(false);

  const clientToWorld = useCallback(
    (clientX: number, clientY: number): Point2 | null => {
      const svg = svgRef.current;
      if (!svg) return null;
      const rect = svg.getBoundingClientRect();
      const vb = svg.viewBox.baseVal;
      return {
        x: ((clientX - rect.left) / rect.width) * vb.width + vb.x,
        y: ((clientY - rect.top) / rect.height) * vb.height + vb.y,
      };
    },
    [],
  );

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (mode !== "drawing") return;
    e.preventDefault();
    (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    const p = clientToWorld(e.clientX, e.clientY);
    if (p) setRawStroke([p]);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (mode !== "drawing" || !isDrawingRef.current) return;
    const p = clientToWorld(e.clientX, e.clientY);
    if (!p) return;
    setRawStroke((prev) => {
      const last = prev[prev.length - 1];
      if (last && Math.hypot(p.x - last.x, p.y - last.y) < 30) return prev;
      return [...prev, p];
    });
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (mode !== "drawing" || !isDrawingRef.current) return;
    isDrawingRef.current = false;
    try {
      (e.currentTarget as SVGSVGElement).releasePointerCapture(e.pointerId);
    } catch {
      // pointer was not captured
    }
    const stroke = rawStroke;
    if (stroke.length < 5) {
      setRawStroke([]);
      return;
    }
    const smoothed = glaetteFreihand(stroke, {
      rdpEpsilon: 400,
      gridSize: 250,
      closeThreshold: 1500,
    });
    if (smoothed.length < 3) {
      setRawStroke([]);
      setError(
        "Stroke konnte nicht in ein gueltiges Polygon umgewandelt werden. Bitte erneut zeichnen.",
      );
      return;
    }
    const newEdges: DachEdge[] = smoothed.map((_, i) => ({
      from: i,
      to: (i + 1) % smoothed.length,
      type: "Traufe",
      pitch_deg: 45,
    }));
    setVertices(smoothed);
    setEdges(newEdges);
    setRawStroke([]);
    setSelectedEdge(0);
    setError(null);
    setMode("editing");
  };

  const resetAll = () => {
    setMode("drawing");
    setRawStroke([]);
    setVertices([]);
    setEdges([]);
    setSelectedEdge(null);
    setResult(null);
    setError(null);
  };

  const updateEdge = (idx: number, patch: Partial<DachEdge>) => {
    setEdges((prev) => prev.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
  };

  const berechnen = () => {
    setError(null);
    try {
      const r = dachausmittlung({ vertices, edges });
      setResult(r);
      setMode("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const speichern = () => {
    const defaultName = `Grundriss ${new Date().toLocaleDateString("de-DE")}`;
    const name = window.prompt("Name fuer diesen Grundriss?", defaultName);
    if (!name) return;
    saveGrundriss({ name, vertices, edges });
    window.alert("Im Browser gespeichert (localStorage).");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="py-3 text-sm text-tx">
          {mode === "drawing" && (
            <>
              <span className="font-medium">Schritt 1:</span> Zeichne den Grundriss
              mit dem Finger oder der Maus auf die Flaeche. Schliesse den Linienzug
              in der Naehe des Startpunkts.
            </>
          )}
          {mode === "editing" && (
            <>
              <span className="font-medium">Schritt 2:</span> Tippe nacheinander auf
              jede Kante und waehle <em>Traufe</em>, <em>Walm</em> oder{" "}
              <em>Giebel</em> sowie die Neigung. Anschliessend &bdquo;Berechnen&ldquo;.
            </>
          )}
          {mode === "results" && (
            <>
              <span className="font-medium">Schritt 3:</span> Ergebnis der
              Dachausmittlung. Alle Werte in Millimetern.
            </>
          )}
        </CardContent>
      </Card>

      <div>
        <svg
          ref={svgRef}
          viewBox={`${-PAD} ${-PAD} ${WORLD + 2 * PAD} ${WORLD + 2 * PAD}`}
          className="w-full aspect-square select-none touch-none rounded-md border bg-white"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <g stroke="#e5e7eb" strokeWidth="20">
            {Array.from({ length: WORLD / GRID + 1 }, (_, i) => (
              <line key={`v${i}`} x1={i * GRID} y1={0} x2={i * GRID} y2={WORLD} />
            ))}
            {Array.from({ length: WORLD / GRID + 1 }, (_, i) => (
              <line key={`h${i}`} x1={0} y1={i * GRID} x2={WORLD} y2={i * GRID} />
            ))}
          </g>

          {vertices.length >= 3 && (
            <polygon
              points={vertices.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="#f1f5f9"
              stroke="none"
            />
          )}

          {result &&
            result.lines.map((l, i) => (
              <line
                key={`sk${i}`}
                x1={l.from.x}
                y1={l.from.y}
                x2={l.to.x}
                y2={l.to.y}
                stroke={SKELETON_COLOR[l.kind] ?? "#000"}
                strokeWidth={l.kind === "First" ? 140 : 90}
                strokeLinecap="round"
              />
            ))}

          {mode !== "drawing" &&
            edges.map((e, i) => {
              const a = vertices[e.from];
              const b = vertices[e.to];
              const isSel = selectedEdge === i;
              return (
                <line
                  key={`e${i}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={isSel ? "#fbbf24" : COLOR_BY_TYPE[e.type]}
                  strokeWidth={isSel ? 220 : 140}
                  strokeLinecap="round"
                  style={{ cursor: "pointer" }}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    setSelectedEdge(i);
                  }}
                />
              );
            })}

          {vertices.map((p, i) => (
            <g key={`vt${i}`}>
              <circle
                cx={p.x}
                cy={p.y}
                r={140}
                fill="white"
                stroke="#475569"
                strokeWidth="50"
              />
              <text
                x={p.x}
                y={p.y + 70}
                textAnchor="middle"
                fontSize="240"
                fontWeight="bold"
                fill="#475569"
              >
                {i + 1}
              </text>
            </g>
          ))}

          {rawStroke.length > 1 && (
            <polyline
              points={rawStroke.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke="#16a34a"
              strokeWidth="100"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>
        <p className="mt-1 text-xs text-mu">
          Raster: 1 m. Aktive Welt: {WORLD / 1000} &times; {WORLD / 1000} m.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={resetAll} variant="outline" size="sm">
          <Eraser className="mr-1 h-4 w-4" />
          Neu zeichnen
        </Button>
        {mode === "editing" && (
          <Button onClick={berechnen} size="sm">
            <Calculator className="mr-1 h-4 w-4" />
            Berechnen
          </Button>
        )}
        {(mode === "editing" || mode === "results") && vertices.length >= 3 && (
          <Button onClick={speichern} variant="secondary" size="sm">
            <Save className="mr-1 h-4 w-4" />
            Speichern
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {mode === "editing" && selectedEdge !== null && edges[selectedEdge] && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Kante {selectedEdge + 1} bearbeiten
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-sm">Typ</Label>
              <div className="mt-1 flex gap-2">
                {(["Traufe", "Walm", "Giebel"] as EdgeType[]).map((t) => (
                  <Button
                    key={t}
                    size="sm"
                    type="button"
                    variant={edges[selectedEdge].type === t ? "default" : "outline"}
                    onClick={() => {
                      const patch: Partial<DachEdge> = { type: t };
                      if (t === "Giebel") patch.pitch_deg = 90;
                      else if (edges[selectedEdge].pitch_deg === 90)
                        patch.pitch_deg = 45;
                      updateEdge(selectedEdge, patch);
                    }}
                  >
                    {t}
                  </Button>
                ))}
              </div>
            </div>
            {edges[selectedEdge].type !== "Giebel" && (
              <div>
                <Label className="text-sm" htmlFor="pitch">
                  Neigung in Grad
                </Label>
                <Input
                  id="pitch"
                  type="number"
                  min={1}
                  max={89}
                  step={0.5}
                  value={edges[selectedEdge].pitch_deg}
                  onChange={(ev) =>
                    updateEdge(selectedEdge, {
                      pitch_deg: parseFloat(ev.target.value) || 45,
                    })
                  }
                  className="mt-1"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {mode === "editing" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kanten-Uebersicht</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {edges.map((e, i) => {
                const a = vertices[e.from];
                const b = vertices[e.to];
                const len = Math.hypot(b.x - a.x, b.y - a.y);
                return (
                  <li
                    key={i}
                    className={`flex items-center justify-between gap-2 cursor-pointer rounded px-2 py-1 ${
                      selectedEdge === i ? "bg-oak-alpha" : "hover:bg-s1"
                    }`}
                    onClick={() => setSelectedEdge(i)}
                  >
                    <span>
                      Kante {i + 1}:{" "}
                      <span className="font-mono">
                        {(len / 1000).toFixed(2)} m
                      </span>
                    </span>
                    <Badge variant={selectedEdge === i ? "default" : "info"}>
                      {e.type}
                      {e.type !== "Giebel" ? ` ${e.pitch_deg}°` : ""}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {mode === "results" && result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Ergebnis &mdash; alle Laengen in mm
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between border-b pb-1 font-medium">
              <span>Firsthoehe ueber Trauf</span>
              <span className="font-mono">
                {result.firsthoehe_mm.toFixed(1)} mm
              </span>
            </div>

            <div>
              <div className="font-medium">Skelett-Linien</div>
              <ul className="mt-1 space-y-0.5">
                {result.lines.map((l, i) => (
                  <li key={i} className="flex justify-between">
                    <span>
                      {l.kind} #{i + 1}
                    </span>
                    <span className="font-mono">
                      {l.laenge_mm.toFixed(1)} mm
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="font-medium">Sparren</div>
              <ul className="mt-1 space-y-0.5">
                {result.sparren.map((s) => (
                  <li
                    key={s.edgeIndex}
                    className="grid grid-cols-[auto_1fr_1fr] gap-x-2"
                  >
                    <span>Kante {s.edgeIndex + 1}</span>
                    <span className="text-mu">
                      {s.edgeType} {s.pitch_deg}°
                    </span>
                    <span className="text-right font-mono">
                      L={s.sparrenlaenge_mm.toFixed(1)} / d=
                      {s.walmtiefe_mm.toFixed(1)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex justify-between border-t pt-1">
              <span>Dachflaeche (Naeherung)</span>
              <span className="font-mono">
                {result.flaeche_m2.toFixed(2)} m²
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
