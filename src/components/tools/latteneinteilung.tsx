"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Mic, MicOff, Volume2, VolumeX, ChevronDown, ChevronUp, Printer } from "lucide-react";
import * as Collapsible from "@radix-ui/react-collapsible";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import dynamic from "next/dynamic";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

const PfannenAuswahl = dynamic(
  () => import("@/components/tools/pfannen-auswahl").then((m) => m.PfannenAuswahl),
  { ssr: false }
);

// ─── Typen ────────────────────────────────────────────────────────────────────

import type { Modell } from "@/components/tools/pfannen-auswahl";

interface Eingaben {
  dachneigung: string;
  dachlattung: string;         // "40x60" | "30x50"
  put: string;                 // Plattenüberstand in mm
  lat: string;                 // Lattenabstand Traufe in mm (= lat_base − PÜT)
  laf: string;                 // Lattenabstand First in mm
  einzuteilendeLaenge: string; // in mm
}

interface LattenAbstand {
  nr: number;
  abstand: number; // in cm
  position: number; // in cm
}

interface KiContext {
  gesamtMass: number | null;
  anzahlLatten: number | null;
  lattenMass: number | null;
  letzteLatte: number | null;
  abstaende: Array<{ nr: number; position: number }>;
}

// ─── Berechnung ───────────────────────────────────────────────────────────────

interface BerechnungErgebnis {
  la: number; // Lattenmaß in mm
  n: number;  // Anzahl Felder
  ok: boolean;
}

function berechneLattenmass(L: number, la_min: number, la_max: number): BerechnungErgebnis {
  const la_ziel = (la_min + la_max) / 2;
  let n = Math.max(1, Math.round(L / la_ziel));
  let la = L / n;
  while (la > la_max && n < 10000) { n++; la = L / n; }
  while (la < la_min && n > 1)    { n--; la = L / n; }
  return { la, n, ok: la >= la_min && la <= la_max };
}

function lattenPositionen(n: number, la: number): LattenAbstand[] {
  const laCm = la / 10;
  const result: LattenAbstand[] = [];
  for (let i = 1; i <= n; i++) {
    result.push({ nr: i, abstand: laCm, position: i * laCm });
  }
  return result;
}

// ─── Audio-Funktionen ─────────────────────────────────────────────────────────

async function speakText(text: string, audioRef: { current: HTMLAudioElement | null }, setLastAudioUrl: (url: string | null) => void = () => {}) {
  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error('TTS failed');
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);

    if (audioRef.current) {
      audioRef.current.pause();
      URL.revokeObjectURL(audioRef.current.src);
      audioRef.current.src = audioUrl;
      audioRef.current.muted = false;
      audioRef.current.load();
      try {
        await audioRef.current.play();
        setLastAudioUrl(null); // Clear if played successfully
      } catch (playError) {
        console.error('Audio playback failed:', playError);
        setLastAudioUrl(audioUrl); // Set for manual play
        throw playError;
      }
    } else {
      const audio = new Audio(audioUrl);
      audio.volume = 1;
      audio.preload = 'auto';
      audio.autoplay = true;
      audio.muted = false;
      try {
        await audio.play();
      } catch (playError) {
        console.error('Audio playback failed:', playError);
        throw playError;
      }
    }
  } catch (error) {
    console.error('TTS error:', error);
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'de-DE';
      utterance.rate = 0.95;
      utterance.pitch = 1.05;
      utterance.volume = 1;
      speechSynthesis.cancel();
      speechSynthesis.speak(utterance);
    }
  }
}

async function askKi(prompt: string, context: KiContext): Promise<{ text: string; letzteLatte: number | null }> {
  const response = await fetch('/api/latten-ki', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, context }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error?.error ?? 'KI-Fehler');
  }

  const data = await response.json();
  return { text: data.text as string, letzteLatte: (data.letzteLatte as number | null) ?? null };
}

// ─── Haupt-Komponente ─────────────────────────────────────────────────────────

export function LatteneinteilungTool() {
  const [eingaben, setEingaben] = useState<Eingaben>({
    dachneigung: '',
    dachlattung: '40x60',
    put: '',
    lat: '',
    laf: '',
    einzuteilendeLaenge: '',
  });
  const [selectedModell, setSelectedModell] = useState<Modell | null>(null);
  const selectedModellRef = useRef<Modell | null>(null);
  useEffect(() => { selectedModellRef.current = selectedModell; }, [selectedModell]);

  const [isListening, setIsListening] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [kiAntwort, setKiAntwort] = useState<string | null>(null);
  const [kiLoading, setKiLoading] = useState(false);
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);
  const [collapsed, setCollapsed] = useState(true);
  const [lastAudioUrl, setLastAudioUrl] = useState<string | null>(null);
  const [pauseDauer, setPauseDauer] = useState(2);
  const [isReadingAll, setIsReadingAll] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const standbyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wantListenRef = useRef(false);
  const awaitingInactivityRef = useRef(false);
  const letzteLatteRef = useRef<number | null>(null);
  const pauseDauerRef = useRef(2);
  const isReadingAllRef = useRef(false);
  const eingabenRef = useRef(eingaben);
  const abstaendeRef = useRef<LattenAbstand[]>([]);

  const berechnung = useMemo((): BerechnungErgebnis | null => {
    const L = parseFloat(eingaben.einzuteilendeLaenge.replace(',', '.'));
    if (isNaN(L) || L <= 0 || !selectedModell?.la_min || !selectedModell?.la_max) return null;
    return berechneLattenmass(L, selectedModell.la_min, selectedModell.la_max);
  }, [eingaben.einzuteilendeLaenge, selectedModell]);

  const abstaende = useMemo(() => {
    if (!berechnung) return [];
    return lattenPositionen(berechnung.n, berechnung.la);
  }, [berechnung]);

  const lattenMass = berechnung ? berechnung.la / 10 : 0; // cm

  // Refs mit aktuellem State synchron halten
  useEffect(() => { eingabenRef.current = eingaben; }, [eingaben]);
  useEffect(() => { abstaendeRef.current = abstaende; }, [abstaende]);
  useEffect(() => { pauseDauerRef.current = pauseDauer; }, [pauseDauer]);

  const waitForAudioEnd = useCallback((): Promise<void> => {
    return new Promise(resolve => {
      const audio = audioRef.current;
      if (!audio || audio.paused || audio.ended) { resolve(); return; }
      audio.addEventListener('ended', resolve as () => void, { once: true });
      audio.addEventListener('error', resolve as () => void, { once: true });
      setTimeout(resolve, 30_000);
    });
  }, []);

  const stopVorlesen = useCallback(() => {
    isReadingAllRef.current = false;
    setIsReadingAll(false);
    audioRef.current?.pause();
  }, []);

  const startVorlesen = useCallback(async (maxCm?: number) => {
    const latten = maxCm
      ? abstaendeRef.current.filter(a => a.position <= maxCm)
      : [...abstaendeRef.current];
    if (latten.length === 0) return;

    isReadingAllRef.current = true;
    setIsReadingAll(true);

    for (const latte of latten) {
      if (!isReadingAllRef.current) break;
      const pos = latte.position.toFixed(1).replace('.', ',');
      await speakText(`Latte ${latte.nr}, ${pos} Zentimeter`, audioRef);
      await waitForAudioEnd();
      letzteLatteRef.current = latte.nr;
      if (!isReadingAllRef.current) break;
      if (pauseDauerRef.current > 0) {
        await new Promise(r => setTimeout(r, pauseDauerRef.current * 1000));
      }
    }

    isReadingAllRef.current = false;
    setIsReadingAll(false);
  }, [waitForAudioEnd]);

  const resetInactivityTimer = useCallback(() => {
    if (standbyTimeoutRef.current) clearTimeout(standbyTimeoutRef.current);
    awaitingInactivityRef.current = false;
    standbyTimeoutRef.current = setTimeout(() => {
      if (!wantListenRef.current) return;
      awaitingInactivityRef.current = true;
      const frage = "Kein Befehl seit einer Minute. Soll der Sprachmodus beendet werden?";
      setKiAntwort(frage);
      speakText(frage, audioRef);
    }, 60_000);
  }, []);

  useEffect(() => {
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        const voices = speechSynthesis.getVoices();
        const preferred = voices.find(
          (v) => v.lang.startsWith('de') && !v.name.toLowerCase().includes('google'),
        );
        setVoice(preferred ?? voices.find((v) => v.lang.startsWith('de')) ?? voices[0] ?? null);
      };

      loadVoices();
      speechSynthesis.onvoiceschanged = loadVoices;
      setAudioEnabled(true);

      return () => {
        speechSynthesis.onvoiceschanged = null;
      };
    }

    return;
  }, []);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
        audioRef.current = null;
      }
    };
  }, []);

  // Wake Lock für Bildschirm-aus-Funktionalität
  useEffect(() => {
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator && isListening) {
        try {
          const lock = await navigator.wakeLock.request('screen');
          setWakeLock(lock);

          lock.addEventListener('release', () => {
            setWakeLock(null);
          });
        } catch (err) {
          console.log('Wake Lock nicht verfügbar:', err);
        }
      }
    };

    const releaseWakeLock = () => {
      if (wakeLock) {
        wakeLock.release();
        setWakeLock(null);
      }
    };

    if (isListening) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    return () => {
      releaseWakeLock();
    };
  }, [isListening, wakeLock]);

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) return;

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    recognitionRef.current = rec;
    rec.lang = 'de-DE';
    rec.continuous = true;
    rec.interimResults = false;

    rec.onresult = async (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript.trim();
      if (!transcript) return;

      resetInactivityTimer();

      // Feierabend-Befehl
      if (transcript.toLowerCase().includes('feierabend')) {
        wantListenRef.current = false;
        if (standbyTimeoutRef.current) clearTimeout(standbyTimeoutRef.current);
        rec.stop();
        setIsListening(false);
        const msg = "Feierabend! Sprachmodus beendet.";
        setKiAntwort(msg);
        if (audioEnabled) speakText(msg, audioRef);
        return;
      }

      // Antwort auf Inaktivitäts-Frage
      if (awaitingInactivityRef.current) {
        awaitingInactivityRef.current = false;
        const lower = transcript.toLowerCase();
        if (lower.includes('ja') || lower.includes('beenden') || lower.includes('stopp') || lower.includes('aus')) {
          wantListenRef.current = false;
          if (standbyTimeoutRef.current) clearTimeout(standbyTimeoutRef.current);
          rec.stop();
          setIsListening(false);
          if (audioEnabled) speakText("Sprachmodus beendet.", audioRef);
        } else {
          if (audioEnabled) speakText("Gut, ich höre weiter.", audioRef);
          resetInactivityTimer();
        }
        return;
      }

      // Pause-Geschwindigkeit per Stimme
      const lower = transcript.toLowerCase();
      if (lower.includes('schneller')) {
        const neu = Math.max(0, pauseDauerRef.current - 1);
        pauseDauerRef.current = neu;
        setPauseDauer(neu);
        if (audioEnabled) speakText(`Pause ${neu} Sekunden`, audioRef);
        resetInactivityTimer();
        return;
      }
      if (lower.includes('langsamer')) {
        const neu = pauseDauerRef.current + 1;
        pauseDauerRef.current = neu;
        setPauseDauer(neu);
        if (audioEnabled) speakText(`Pause ${neu} Sekunden`, audioRef);
        resetInactivityTimer();
        return;
      }

      // Normale KI-Anfrage
      try {
        setKiLoading(true);
        setKiAntwort(null);
        const abs = abstaendeRef.current;
        const result = await askKi(transcript, {
          gesamtMass: parseFloat(eingabenRef.current.einzuteilendeLaenge.replace(',', '.')) / 10 || null,
          anzahlLatten: abs.length || null,
          lattenMass: abs.length > 0 ? abs[0].abstand : null,
          letzteLatte: letzteLatteRef.current,
          abstaende: abs.map((a) => ({ nr: a.nr, position: a.position })),
        });
        letzteLatteRef.current = result.letzteLatte;
        setKiAntwort(result.text);
        if (audioEnabled) speakText(result.text, audioRef);
      } catch {
        const fallback = "Entschuldigung, die KI konnte die Anfrage nicht verarbeiten.";
        setKiAntwort(fallback);
        if (audioEnabled) speakText(fallback, audioRef);
      } finally {
        setKiLoading(false);
      }
    };

    rec.onend = () => {
      if (wantListenRef.current) {
        setTimeout(() => {
          if (wantListenRef.current && recognitionRef.current) {
            try { recognitionRef.current.start(); } catch { /* bereits aktiv */ }
          }
        }, 300);
      } else {
        setIsListening(false);
      }
    };

    rec.onerror = (event) => {
      if (event.error === 'not-allowed') {
        wantListenRef.current = false;
        setIsListening(false);
      }
      // Andere Fehler: onend feuert und startet neu falls gewünscht
    };

    return () => {
      rec.onresult = null;
      rec.onend = null;
      rec.onerror = null;
      try { rec.stop(); } catch { /* ignorieren */ }
      recognitionRef.current = null;
      if (standbyTimeoutRef.current) clearTimeout(standbyTimeoutRef.current);
    };
  }, [audioEnabled, resetInactivityTimer]);

  // Eingabe-Handler
  const handleInputChange = useCallback((field: keyof Eingaben, value: string) => {
    setEingaben(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleDachneigungChange = useCallback((value: string) => {
    setEingaben(prev => {
      const dn = parseFloat(value);
      const modell = selectedModellRef.current;
      const lafTable = modell?.laf_tables?.[prev.dachlattung] ?? modell?.laf_table;
      if (!isNaN(dn) && lafTable) {
        const eintrag = lafTable.find(e => dn <= e.bis_grad);
        if (eintrag) return { ...prev, dachneigung: value, laf: String(eintrag.laf) };
      }
      return { ...prev, dachneigung: value };
    });
  }, []);

  const handleDachlattungChange = useCallback((value: string) => {
    setEingaben(prev => {
      const modell = selectedModellRef.current;
      const lafTable = modell?.laf_tables?.[value] ?? modell?.laf_table;
      const dn = parseFloat(prev.dachneigung);
      if (!isNaN(dn) && lafTable) {
        const eintrag = lafTable.find(e => dn <= e.bis_grad);
        if (eintrag) return { ...prev, dachlattung: value, laf: String(eintrag.laf) };
      }
      return { ...prev, dachlattung: value };
    });
  }, []);

  const handlePutChange = useCallback((value: string) => {
    setEingaben(prev => {
      const put = parseFloat(value);
      const latBase = selectedModellRef.current?.lat_base;
      if (!isNaN(put) && latBase !== undefined) {
        return { ...prev, put: value, lat: String(latBase - put) };
      }
      return { ...prev, put: value };
    });
  }, []);

  const handleLatChange = useCallback((value: string) => {
    setEingaben(prev => {
      const lat = parseFloat(value);
      const latBase = selectedModellRef.current?.lat_base;
      if (!isNaN(lat) && latBase !== undefined) {
        return { ...prev, lat: value, put: String(latBase - lat) };
      }
      return { ...prev, lat: value };
    });
  }, []);

  const handleModellSelect = useCallback((modell: Modell | null) => {
    setSelectedModell(modell);
    setEingaben(prev => {
      const updates: Partial<Eingaben> = {};
      if (modell?.put_min !== undefined && modell?.put_max !== undefined && modell?.lat_base !== undefined) {
        const put = modell.put_default ?? Math.round((modell.put_min + modell.put_max) / 2);
        updates.put = String(put);
        updates.lat = String(modell.lat_base - put);
      } else {
        updates.put = '';
        updates.lat = '';
      }
      let dachlattung = prev.dachlattung;
      if (modell?.laf_tables && !modell.laf_tables[dachlattung]) {
        dachlattung = '40x60';
        updates.dachlattung = dachlattung;
      }
      const dn = parseFloat(prev.dachneigung);
      const lafTable = modell?.laf_tables?.[dachlattung] ?? modell?.laf_table;
      if (lafTable) {
        if (!isNaN(dn)) {
          const eintrag = lafTable.find(e => dn <= e.bis_grad);
          updates.laf = eintrag ? String(eintrag.laf) : '';
        }
      } else {
        updates.laf = '';
      }
      return { ...prev, ...updates };
    });
  }, []);

  // Audio-Steuerung
  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) {
      speakText("Spracherkennung nicht verfügbar in diesem Browser", audioRef);
      return;
    }

    if (isListening) {
      wantListenRef.current = false;
      if (standbyTimeoutRef.current) clearTimeout(standbyTimeoutRef.current);
      setIsListening(false);
      try { recognitionRef.current.stop(); } catch { /* ignorieren */ }
    } else {
      wantListenRef.current = true;
      setIsListening(true);
      resetInactivityTimer();
      try { recognitionRef.current.start(); } catch { /* bereits aktiv */ }
    }
  }, [isListening, resetInactivityTimer]);

  const toggleAudio = useCallback(() => {
    setAudioEnabled((prev) => {
      const next = !prev;
      if (!next && audioRef.current) {
        audioRef.current.pause();
      }
      return next;
    });
    if (audioEnabled) {
      speechSynthesis.cancel();
    }
  }, [audioEnabled]);

  const handlePrint = useCallback(() => {
    setCollapsed(false);
    setTimeout(() => window.print(), 80);
  }, []);

  return (
    <div className="space-y-6">
      {/* ─── Druckansicht (nur @media print sichtbar) ─── */}
      {abstaende.length > 0 && (
        <div className="hidden print:block space-y-3 text-black">
          <h1 className="text-lg font-bold border-b pb-1">Latteneinteilung – Ergebnis</h1>
          <div className="grid grid-cols-3 gap-x-6 gap-y-0.5 text-xs">
            {selectedModell && <div><span className="font-semibold">Modell:</span> {selectedModell.name}</div>}
            {eingaben.dachneigung && <div><span className="font-semibold">Dachneigung:</span> {eingaben.dachneigung} °</div>}
            {eingaben.einzuteilendeLaenge && <div><span className="font-semibold">Einzut. Länge:</span> {eingaben.einzuteilendeLaenge} mm</div>}
            {eingaben.put && <div><span className="font-semibold">PÜT:</span> {eingaben.put} mm</div>}
            {eingaben.lat && <div><span className="font-semibold">LAT:</span> {eingaben.lat} mm</div>}
            {eingaben.laf && <div><span className="font-semibold">LAF:</span> {eingaben.laf} mm</div>}
            {selectedModell?.laf_tables && <div><span className="font-semibold">Lattung:</span> {eingaben.dachlattung} mm</div>}
          </div>
          {berechnung && (
            <div className="font-semibold text-sm border-t pt-1">
              LA = {berechnung.la.toFixed(1)} mm ({(berechnung.la / 10).toFixed(1)} cm) · {berechnung.n} Felder
              {!berechnung.ok && " ⚠ außerhalb des zulässigen Bereichs!"}
            </div>
          )}
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-400 font-semibold">
                <td className="py-0.5 pr-6">Latte</td>
                <td className="text-right py-0.5">Position (cm)</td>
                <td className="py-0.5 pr-6 pl-10">Latte</td>
                <td className="text-right py-0.5">Position (cm)</td>
                <td className="py-0.5 pr-6 pl-10">Latte</td>
                <td className="text-right py-0.5">Position (cm)</td>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: Math.ceil(abstaende.length / 3) }, (_, row) => (
                <tr key={row} className="border-b border-gray-200">
                  {[0, 1, 2].map(col => {
                    const a = abstaende[row * 3 + col];
                    return a ? (
                      <>
                        <td key={`${col}-nr`} className="py-0.5 pr-6 pl-0">{a.nr}</td>
                        <td key={`${col}-pos`} className="text-right py-0.5 pr-0 pl-10">{a.position.toFixed(1)}</td>
                      </>
                    ) : (
                      <><td key={`${col}-nr`} /><td key={`${col}-pos`} /></>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Dachpfannen-Auswahl */}
      <div className="print:hidden">
        <PfannenAuswahl onSelect={handleModellSelect} />
      </div>

      {/* Eingabe-Karte */}
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>Eingabe</CardTitle>
          <CardDescription>
            Maße aus dem Datenblatt der gewählten Dachpfanne und der Baustelle
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dachneigung">Dachneigung (°)</Label>
              <Input
                id="dachneigung"
                type="number"
                min="10"
                max="75"
                value={eingaben.dachneigung}
                onChange={(e) => handleDachneigungChange(e.target.value)}
                placeholder="z.B. 30"
              />
            </div>
            {selectedModell?.laf_tables ? (
              <div>
                <Label htmlFor="dachlattung">Dachlattung</Label>
                <select
                  id="dachlattung"
                  value={eingaben.dachlattung}
                  onChange={(e) => handleDachlattungChange(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {Object.keys(selectedModell.laf_tables).map(l => (
                    <option key={l} value={l}>{l.replace('x', ' × ')} mm</option>
                  ))}
                </select>
              </div>
            ) : <div />}

            {(() => {
              const dn = parseFloat(eingaben.dachneigung);
              const dnOk = !isNaN(dn) && dn > 0;
              const modellOk = selectedModell?.lat_base !== undefined;
              return (
                <>
                  <div>
                    <Label htmlFor="put">PÜT – Plattenüberstand (mm)</Label>
                    <Input
                      id="put"
                      type="number"
                      disabled={!modellOk}
                      value={eingaben.put}
                      onChange={(e) => handlePutChange(e.target.value)}
                      placeholder={selectedModell?.put_min !== undefined ? `${selectedModell.put_min}–${selectedModell.put_max}` : "z.B. 40"}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lat">LAT – Lattenabstand Traufe (mm)</Label>
                    <Input
                      id="lat"
                      type="number"
                      disabled={!modellOk}
                      value={eingaben.lat}
                      onChange={(e) => handleLatChange(e.target.value)}
                      placeholder="z.B. 363"
                    />
                  </div>

                  <div>
                    <Label htmlFor="laf">
                      LAF – Lattenabstand First (mm)
                      {(selectedModell?.laf_table || selectedModell?.laf_tables) && dnOk && (
                        <span className="ml-1 text-xs font-normal text-muted-foreground">(automatisch aus Dachneigung)</span>
                      )}
                    </Label>
                    <Input
                      id="laf"
                      type="number"
                      disabled={!dnOk}
                      value={eingaben.laf}
                      onChange={(e) => handleInputChange('laf', e.target.value)}
                      placeholder="z.B. 40"
                    />
                  </div>
                  <div>
                    <Label htmlFor="einzuteilendeLaenge">
                      Einzuteilende Länge (mm)
                      <span className="ml-1 text-xs font-normal text-muted-foreground">(Kons.länge – LAT – LAF)</span>
                    </Label>
                    <Input
                      id="einzuteilendeLaenge"
                      type="number"
                      disabled={!dnOk}
                      value={eingaben.einzuteilendeLaenge}
                      onChange={(e) => handleInputChange('einzuteilendeLaenge', e.target.value)}
                      placeholder="z.B. 4500"
                    />
                  </div>

                  {!dnOk && (
                    <p className="col-span-2 text-xs text-muted-foreground">
                      Bitte zuerst die Dachneigung eingeben.
                    </p>
                  )}
                </>
              );
            })()}
          </div>

          {selectedModell?.la_min && selectedModell?.la_max && (
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
              <span>LA {selectedModell.la_min}–{selectedModell.la_max} mm</span>
              {selectedModell.put_min !== undefined && selectedModell.put_max !== undefined && (
                <span>PÜT {selectedModell.put_min}–{selectedModell.put_max} mm</span>
              )}
              {selectedModell.lat_base !== undefined && (
                <span>LAT-Basis {selectedModell.lat_base} mm</span>
              )}
              {selectedModell.laf_tables && (
                <span>Lattung: {Object.keys(selectedModell.laf_tables).join(' / ')} mm</span>
              )}
              {!selectedModell.laf_tables && selectedModell.laf_table && selectedModell.laf_table.length > 0 && (
                <span>
                  LAF{selectedModell.laf_table.length === 1
                    ? ` ${selectedModell.laf_table[0].laf} mm`
                    : ` ${selectedModell.laf_table.map(e => e.laf).join('/')} mm`}
                </span>
              )}
            </div>
          )}

          {berechnung && (
            <div className="pt-2 border-t space-y-1">
              <Badge
                variant={berechnung.ok ? "default" : "destructive"}
                className="text-base font-semibold"
              >
                LA = {berechnung.la.toFixed(1)} mm ({(berechnung.la / 10).toFixed(1)} cm)
              </Badge>
              <p className="text-sm text-muted-foreground">
                {berechnung.n} Felder
                {!berechnung.ok && " – außerhalb des zulässigen Bereichs!"}
              </p>
            </div>
          )}

          {!selectedModell?.la_min && selectedModell && (
            <p className="text-xs text-muted-foreground">
              Für {selectedModell.name} sind noch keine Lattenabstandswerte hinterlegt.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Audio-Steuerung */}
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>Audio-Steuerung</CardTitle>
          <CardDescription>
            Auditive Ausgabe und Sprachbefehle
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            <Button
              onClick={toggleListening}
              disabled={!recognitionRef.current}
              variant={isListening ? "destructive" : "outline"}
            >
              {isListening ? (
                <MicOff className="w-4 h-4 mr-2" />
              ) : (
                <Mic className="w-4 h-4 mr-2" />
              )}
              {isListening ? "Stoppe Spracherkennung" : "Starte Spracherkennung"}
            </Button>
            <Button onClick={toggleAudio} variant="outline">
              {audioEnabled ? (
                <VolumeX className="w-4 h-4 mr-2" />
              ) : (
                <Volume2 className="w-4 h-4 mr-2" />
              )}
              {audioEnabled ? "Audio aus" : "Audio an"}
            </Button>
          </div>
          <audio ref={audioRef} hidden playsInline />

          <Alert className="mt-4">
            <AlertDescription>
              <strong>Sprachbefehle:</strong> Fragen stellen · „Feierabend" stoppt · „schneller" / „langsamer" ändert die Vorlese-Pause
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Alle Maße vorlesen */}
      {abstaende.length > 0 && (
        <Card className="print:hidden">
          <CardHeader>
            <CardTitle>Alle Maße vorlesen</CardTitle>
            <CardDescription>Maße werden nacheinander vorgelesen</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Label htmlFor="pauseDauer" className="shrink-0">Pause zwischen Maßen</Label>
              <Input
                id="pauseDauer"
                type="number"
                min={0}
                max={10}
                step={0.5}
                value={pauseDauer}
                onChange={e => {
                  const v = Math.max(0, Number(e.target.value));
                  setPauseDauer(v);
                  pauseDauerRef.current = v;
                }}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">Sek.</span>
            </div>
            <div className="flex flex-col gap-2">
              {!isReadingAll ? (
                <>
                  <Button onClick={() => startVorlesen()} variant="outline">
                    Alle Maße vorlesen ({abstaende.length} Latten)
                  </Button>
                  <Button onClick={() => startVorlesen(200)} variant="outline">
                    Alle Maße bis max. 2 m ({abstaende.filter(a => a.position <= 200).length} Latten)
                  </Button>
                </>
              ) : (
                <Button onClick={stopVorlesen} variant="destructive">
                  Vorlesen stoppen
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {kiAntwort && (
        <Card className="print:hidden">
          <CardHeader>
            <CardTitle>KI-Antwort</CardTitle>
            <CardDescription>
              Die Antwort der Dachlatten-KI auf deine Frage.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>{kiAntwort}</p>
            {kiLoading && <p className="text-sm text-muted-foreground">KI antwortet...</p>}
          </CardContent>
        </Card>
      )}

      {abstaende.length > 0 && (
        <Card className="print:hidden">
          <Collapsible.Root open={!collapsed} onOpenChange={(open) => setCollapsed(!open)}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Ergebnis</CardTitle>
                  <CardDescription>
                    Berechnetes Lattenmaß und Abstände.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" onClick={handlePrint}>
                    <Printer className="h-4 w-4 mr-1" />
                    Als PDF
                  </Button>
                  <Collapsible.Trigger asChild>
                    <Button variant="ghost" size="sm">
                      {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                    </Button>
                  </Collapsible.Trigger>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {(collapsed ? abstaende.slice(0, 3) : abstaende).map((abstand) => (
                  <Badge key={abstand.nr} variant="secondary" className="text-sm">
                    Latte {abstand.nr}: {abstand.position.toFixed(1)} cm
                  </Badge>
                ))}
                {collapsed && abstaende.length > 3 && (
                  <Badge variant="outline" className="text-sm">
                    ... und {abstaende.length - 3} weitere
                  </Badge>
                )}
              </div>
            </CardContent>
          </Collapsible.Root>
        </Card>
      )}
    </div>
  );
}