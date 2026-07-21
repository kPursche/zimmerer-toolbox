"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { AlertCircle, FileDown, FileText, Mic, Pencil, Square, Trash2 } from "lucide-react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useSprechzettel, type SprechzettelEintrag } from "@/hooks/use-sprechzettel";

type RecordState = "idle" | "recording" | "transkribiert" | "auswertend";

type Entwurf = Partial<Omit<SprechzettelEintrag, "updatedAt">>;

function formatDatum(datum: string): string {
  const [jahr, monat, tag] = datum.split("-");
  return `${tag}.${monat}.${jahr}`;
}

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

function exportiereCsv(eintraege: SprechzettelEintrag[]) {
  const zeilen = eintraege.map((e) =>
    [formatDatum(e.datum), e.stunden.toString().replace(".", ","), e.baustelle.replace(/;/g, ","), e.taetigkeit.replace(/;/g, ",")].join(";")
  );
  const csv = ["Datum;Stunden;Baustelle;Tätigkeit", ...zeilen].join("\r\n");
  downloadBlob("﻿" + csv, `sprechzettel-${new Date().toISOString().slice(0, 10)}.csv`, "text/csv;charset=utf-8;");
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function exportierePdf(eintraege: SprechzettelEintrag[]) {
  const gesamt = eintraege.reduce((s, e) => s + e.stunden, 0);
  const zeilen = eintraege
    .map((e) => `<tr><td>${formatDatum(e.datum)}</td><td>${e.stunden}</td><td>${escapeHtml(e.baustelle)}</td><td>${escapeHtml(e.taetigkeit)}</td></tr>`)
    .join("");
  const html = `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><title>Sprechzettel</title>
<style>body{font-family:Arial,sans-serif;padding:24px;color:#1a1a1a}h1{font-size:18px;margin-bottom:4px}
table{width:100%;border-collapse:collapse;font-size:13px}th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}
th{background:#f0f0f0}tfoot td{font-weight:bold}</style></head><body>
<h1>Sprechzettel</h1><p style="color:#555;font-size:12px">Erstellt am ${formatDatum(new Date().toISOString().slice(0, 10))}</p>
<table><thead><tr><th>Datum</th><th>Stunden</th><th>Baustelle</th><th>Tätigkeit</th></tr></thead>
<tbody>${zeilen}</tbody><tfoot><tr><td>Gesamt</td><td>${gesamt}</td><td colspan="2"></td></tr></tfoot></table>
<script>window.onload=()=>window.print();</script></body></html>`;
  const fenster = window.open("", "_blank");
  if (!fenster) return;
  fenster.document.write(html);
  fenster.document.close();
}

export function SprechzettelTool() {
  const { eintraege, isLoaded, speichereEintrag, loescheEintrag, findeEintrag } = useSprechzettel();

  const [recordState, setRecordState] = useState<RecordState>("idle");
  const [aufnahmeFehler, setAufnahmeFehler] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [formularOffen, setFormularOffen] = useState(false);
  const [entwurf, setEntwurf] = useState<Entwurf>({});
  const [urspruenglichesDatum, setUrspruenglichesDatum] = useState<string | null>(null);

  const gesamtstunden = eintraege.reduce((s, e) => s + e.stunden, 0);

  const werteAus = useCallback(async (text: string) => {
    if (!text.trim()) {
      setEntwurf({});
      setUrspruenglichesDatum(null);
      setFormularOffen(true);
      setRecordState("idle");
      return;
    }

    setRecordState("auswertend");
    try {
      const res = await fetch("/api/sprechzettel-extrahieren", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      setEntwurf({
        datum: data.datum ?? undefined,
        stunden: typeof data.stunden === "number" ? data.stunden : undefined,
        baustelle: data.baustelle ?? undefined,
        taetigkeit: data.taetigkeit ?? undefined,
      });
    } catch {
      setEntwurf({});
    } finally {
      setUrspruenglichesDatum(null);
      setFormularOffen(true);
      setRecordState("idle");
    }
  }, []);

  const handleMic = useCallback(async () => {
    if (recordState === "recording") {
      mediaRecorderRef.current?.stop();
      return;
    }

    setAufnahmeFehler(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/ogg";
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecordState("transkribiert");

        const blob = new Blob(chunksRef.current, { type: mimeType });
        const ext = mimeType.includes("webm") ? "webm" : "ogg";
        const formData = new FormData();
        formData.append("audio", blob, `aufnahme.${ext}`);

        try {
          const res = await fetch("/api/transcribe", { method: "POST", body: formData });
          const data = await res.json();
          if (!data.text) {
            setAufnahmeFehler("Konnte nichts erkennen. Bitte Felder manuell ausfüllen.");
          }
          await werteAus(data.text ?? "");
        } catch {
          setAufnahmeFehler("Transkription fehlgeschlagen. Bitte Felder manuell ausfüllen.");
          await werteAus("");
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecordState("recording");
    } catch {
      setAufnahmeFehler("Mikrofonzugriff nicht möglich.");
      setRecordState("idle");
    }
  }, [recordState, werteAus]);

  function handleEdit(eintrag: SprechzettelEintrag) {
    setEntwurf(eintrag);
    setUrspruenglichesDatum(eintrag.datum);
    setFormularOffen(true);
  }

  function handleNeuerEintrag() {
    setEntwurf({});
    setUrspruenglichesDatum(null);
    setFormularOffen(true);
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Diktieren</CardTitle>
          <CardDescription>
            Mikrofon antippen und den Arbeitstag beschreiben, z.B. &bdquo;Heute 8 Stunden auf
            Baustelle Müller, Dachstuhl aufgerichtet&ldquo;.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3 py-6">
          <button
            type="button"
            onClick={handleMic}
            disabled={recordState === "transkribiert" || recordState === "auswertend"}
            aria-label={recordState === "recording" ? "Aufnahme stoppen" : "Diktieren"}
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full text-[#1a0800] shadow-lg transition-shadow hover:shadow-xl disabled:opacity-50"
            style={{
              background:
                recordState === "recording"
                  ? "linear-gradient(145deg, #d95c4a, #8a2f22)"
                  : "linear-gradient(145deg, #d4a44f, #9a6828)",
            }}
          >
            {recordState === "recording" ? <Square size={28} /> : <Mic size={28} />}
          </button>
          <p className="text-sm font-semibold text-tx">
            {recordState === "recording"
              ? "Aufnahme läuft – zum Stoppen tippen"
              : recordState === "transkribiert"
                ? "Transkribiere …"
                : recordState === "auswertend"
                  ? "Werte Diktat aus …"
                  : "Zum Diktieren tippen"}
          </p>
          {aufnahmeFehler && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-xs text-destructive">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{aufnahmeFehler}</span>
            </div>
          )}
          <button
            type="button"
            onClick={handleNeuerEintrag}
            className="text-xs font-semibold text-mu hover:text-tx"
          >
            oder Eintrag manuell anlegen
          </button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Erfasste Tage</CardTitle>
              {eintraege.length > 0 && (
                <CardDescription>{gesamtstunden} Stunden gesamt</CardDescription>
              )}
            </div>
            {eintraege.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={() => exportiereCsv(eintraege)}
                  className="flex items-center gap-1.5 rounded-md border border-border bg-s2 px-3 py-1.5 text-xs font-semibold text-mu hover:bg-s3 hover:text-tx"
                >
                  <FileDown className="h-3.5 w-3.5" /> CSV
                </button>
                <button
                  onClick={() => exportierePdf(eintraege)}
                  className="flex items-center gap-1.5 rounded-md border border-border bg-s2 px-3 py-1.5 text-xs font-semibold text-mu hover:bg-s3 hover:text-tx"
                >
                  <FileText className="h-3.5 w-3.5" /> PDF
                </button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!isLoaded ? (
            <p className="text-sm text-mu">Wird geladen …</p>
          ) : eintraege.length === 0 ? (
            <p className="rounded-md bg-s2 px-4 py-6 text-center text-sm text-mu">
              Noch keine Stunden erfasst.
            </p>
          ) : (
            <div className="space-y-2">
              {eintraege.map((eintrag) => (
                <div
                  key={eintrag.datum}
                  className="flex items-center justify-between gap-3 rounded-md bg-s2 px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-bold text-tx">{formatDatum(eintrag.datum)}</span>
                      <span className="text-sm font-semibold text-oak">{eintrag.stunden} Std.</span>
                    </div>
                    {(eintrag.baustelle || eintrag.taetigkeit) && (
                      <p className="mt-0.5 truncate text-sm text-mu">
                        {[eintrag.baustelle, eintrag.taetigkeit].filter(Boolean).join(" – ")}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => handleEdit(eintrag)}
                      aria-label="Eintrag bearbeiten"
                      className="flex h-8 w-8 items-center justify-center rounded text-mu hover:bg-s3 hover:text-tx"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => loescheEintrag(eintrag.datum)}
                      aria-label="Eintrag löschen"
                      className="flex h-8 w-8 items-center justify-center rounded text-mu hover:bg-s3 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <SprechzettelFormular
        open={formularOffen}
        onOpenChange={setFormularOffen}
        entwurf={entwurf}
        urspruenglichesDatum={urspruenglichesDatum}
        pruefeVorhandenenEintrag={findeEintrag}
        onSave={(eintrag) => {
          speichereEintrag(eintrag);
          setFormularOffen(false);
        }}
      />
    </div>
  );
}

interface SprechzettelFormularProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entwurf: Entwurf;
  urspruenglichesDatum: string | null;
  pruefeVorhandenenEintrag: (datum: string) => SprechzettelEintrag | undefined;
  onSave: (eintrag: Omit<SprechzettelEintrag, "updatedAt">) => void;
}

function SprechzettelFormular({
  open, onOpenChange, entwurf, urspruenglichesDatum, pruefeVorhandenenEintrag, onSave,
}: SprechzettelFormularProps) {
  const [datum, setDatum] = useState(entwurf.datum ?? "");
  const [stunden, setStunden] = useState(entwurf.stunden != null ? String(entwurf.stunden) : "");
  const [baustelle, setBaustelle] = useState(entwurf.baustelle ?? "");
  const [taetigkeit, setTaetigkeit] = useState(entwurf.taetigkeit ?? "");

  // Formular bei jedem Öffnen mit dem aktuellen Entwurf neu befüllen
  const [letzterEntwurf, setLetzterEntwurf] = useState(entwurf);
  if (open && entwurf !== letzterEntwurf) {
    setLetzterEntwurf(entwurf);
    setDatum(entwurf.datum ?? "");
    setStunden(entwurf.stunden != null ? String(entwurf.stunden) : "");
    setBaustelle(entwurf.baustelle ?? "");
    setTaetigkeit(entwurf.taetigkeit ?? "");
  }

  const stundenZahl = parseFloat(stunden.replace(",", "."));

  const fehler = useMemo((): string | null => {
    if (!datum) return "Datum ist erforderlich.";
    if (!stunden || isNaN(stundenZahl) || stundenZahl <= 0) return "Stunden müssen größer als 0 sein.";
    return null;
  }, [datum, stunden, stundenZahl]);

  const vorhandenerEintrag = datum ? pruefeVorhandenenEintrag(datum) : undefined;
  const wirdUeberschrieben = !!vorhandenerEintrag && vorhandenerEintrag.datum !== urspruenglichesDatum;
  const unrealistischeStunden = !isNaN(stundenZahl) && stundenZahl > 16;

  function handleSave() {
    if (fehler) return;
    onSave({ datum, stunden: stundenZahl, baustelle: baustelle.trim(), taetigkeit: taetigkeit.trim() });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Stundenzettel-Eintrag prüfen</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="sz-datum">Datum</Label>
            <Input id="sz-datum" type="date" value={datum} onChange={(e) => setDatum(e.target.value)} />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="sz-stunden">Stunden</Label>
            <Input
              id="sz-stunden"
              type="number"
              step="0.5"
              placeholder="z.B. 8"
              value={stunden}
              onChange={(e) => setStunden(e.target.value)}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="sz-baustelle">Baustelle / Projekt</Label>
            <Input
              id="sz-baustelle"
              placeholder="z.B. Baustelle Müller"
              value={baustelle}
              onChange={(e) => setBaustelle(e.target.value)}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="sz-taetigkeit">Tätigkeit</Label>
            <Textarea
              id="sz-taetigkeit"
              placeholder="z.B. Dachstuhl aufgerichtet"
              value={taetigkeit}
              onChange={(e) => setTaetigkeit(e.target.value)}
            />
          </div>

          {fehler && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{fehler}</span>
            </div>
          )}
          {!fehler && wirdUeberschrieben && (
            <div className="rounded-md border border-oak/40 bg-oak-alpha px-3 py-2 text-xs text-oak">
              Für dieses Datum existiert bereits ein Eintrag. Er wird beim Speichern überschrieben.
            </div>
          )}
          {!fehler && unrealistischeStunden && (
            <div className="rounded-md border border-oak/40 bg-oak-alpha px-3 py-2 text-xs text-oak">
              Ungewöhnlich hohe Stundenzahl. Prüfe den Wert.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Verwerfen
          </Button>
          <Button
            type="button"
            disabled={!!fehler}
            onClick={handleSave}
            className="font-bold text-[#1a0800]"
            style={{ background: "linear-gradient(145deg, #d4a44f, #9a6828)" }}
          >
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
