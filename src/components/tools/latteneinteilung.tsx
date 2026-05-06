"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Mic, MicOff, Volume2, VolumeX, ChevronDown, ChevronUp } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

// ─── Typen ────────────────────────────────────────────────────────────────────

interface Eingaben {
  gesamtMass: string; // Gesamtmaß in cm
  anzahlLatten: string; // Anzahl der Latten
}

interface LattenAbstand {
  nr: number;
  abstand: number; // Abstand von der vorherigen Latte in cm
  position: number; // Position vom Startpunkt in cm
}

interface KiContext {
  gesamtMass: number | null;
  anzahlLatten: number | null;
  lattenMass: number | null;
  abstaende: Array<{ nr: number; position: number }>;
}

// ─── Berechnung ───────────────────────────────────────────────────────────────

function berechneLattenAbstaende(gesamtMass: number, anzahlLatten: number): LattenAbstand[] {
  if (anzahlLatten <= 1 || gesamtMass <= 0) return [];

  const abstand = gesamtMass / (anzahlLatten - 1);
  const abstaende: LattenAbstand[] = [];

  for (let i = 0; i < anzahlLatten; i++) {
    abstaende.push({
      nr: i + 1,
      abstand: i === 0 ? 0 : abstand,
      position: i * abstand,
    });
  }

  return abstaende;
}

// ─── Audio-Funktionen ─────────────────────────────────────────────────────────

function speakText(text: string, voice: SpeechSynthesisVoice | null) {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'de-DE';
    utterance.rate = 0.95;
    utterance.pitch = 1.05;
    utterance.volume = 1;
    if (voice) {
      utterance.voice = voice;
    }
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  }
}

async function askKi(prompt: string, context: KiContext) {
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
  return data.text as string;
}

// ─── Haupt-Komponente ─────────────────────────────────────────────────────────

export function LatteneinteilungTool() {
  const [eingaben, setEingaben] = useState<Eingaben>({
    gesamtMass: '',
    anzahlLatten: '',
  });

  const [isListening, setIsListening] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [kiAntwort, setKiAntwort] = useState<string | null>(null);
  const [kiLoading, setKiLoading] = useState(false);
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);
  const [collapsed, setCollapsed] = useState(true);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const standbyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Berechnung der Lattenabstände
  const abstaende = useMemo(() => {
    const mass = parseFloat(eingaben.gesamtMass.replace(',', '.'));
    const anzahl = parseInt(eingaben.anzahlLatten);

    if (isNaN(mass) || isNaN(anzahl) || mass <= 0 || anzahl <= 1) {
      return [];
    }

    return berechneLattenAbstaende(mass, anzahl);
  }, [eingaben]);

  const lattenMass = useMemo(() => {
    if (abstaende.length <= 1) return 0;
    return abstaende[1].position - abstaende[0].position;
  }, [abstaende]);

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
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'de-DE';
      recognitionRef.current.continuous = true; // Kontinuierliche Erkennung
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = async (event) => {
        const command = event.results[event.results.length - 1][0].transcript;
        if (command.trim()) {
          try {
            setKiLoading(true);
            setKiAntwort(null);
            const response = await askKi(command, {
              gesamtMass: parseFloat(eingaben.gesamtMass.replace(',', '.')) || null,
              anzahlLatten: parseInt(eingaben.anzahlLatten, 10) || null,
              lattenMass: abstaende.length > 1 ? abstaende[1].position - abstaende[0].position : null,
              abstaende: abstaende.map((a) => ({ nr: a.nr, position: a.position })),
            });
            setKiAntwort(response);
            if (audioEnabled) speakText(response, voice);

            // Standby-Timeout zurücksetzen
            if (standbyTimeoutRef.current) {
              clearTimeout(standbyTimeoutRef.current);
            }
            standbyTimeoutRef.current = setTimeout(() => {
              if (recognitionRef.current) {
                recognitionRef.current.stop();
              }
            }, 60000); // 1 Minute Standby
          } catch (error) {
            const fallback = "Entschuldigung, die KI konnte die Anfrage nicht verarbeiten.";
            setKiAntwort(fallback);
            if (audioEnabled) speakText(fallback, voice);
          } finally {
            setKiLoading(false);
          }
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        if (standbyTimeoutRef.current) {
          clearTimeout(standbyTimeoutRef.current);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (standbyTimeoutRef.current) {
        clearTimeout(standbyTimeoutRef.current);
      }
    };
  }, [audioEnabled, eingaben, abstaende, voice]);

  // Eingabe-Handler
  const handleInputChange = useCallback((field: keyof Eingaben, value: string) => {
    setEingaben(prev => ({ ...prev, [field]: value }));
  }, []);

  // Audio-Steuerung
  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) {
      speakText("Spracherkennung nicht verfügbar in diesem Browser", voice);
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      if (standbyTimeoutRef.current) {
        clearTimeout(standbyTimeoutRef.current);
      }
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, [isListening, voice]);

  const toggleAudio = useCallback(() => {
    setAudioEnabled(prev => !prev);
    if (audioEnabled) {
      speechSynthesis.cancel();
    }
  }, [audioEnabled]);

  return (
    <div className="space-y-6">
      {/* Eingabe-Karte */}
      <Card>
        <CardHeader>
          <CardTitle>Eingabe</CardTitle>
          <CardDescription>
            Geben Sie das Gesamtmaß und die Anzahl der Latten ein
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="gesamtMass">Gesamtmaß (cm)</Label>
              <Input
                id="gesamtMass"
                type="number"
                step="0.1"
                value={eingaben.gesamtMass}
                onChange={(e) => handleInputChange('gesamtMass', e.target.value)}
                placeholder="z.B. 500.5"
              />
            </div>
            <div>
              <Label htmlFor="anzahlLatten">Anzahl Latten</Label>
              <Input
                id="anzahlLatten"
                type="number"
                min="2"
                value={eingaben.anzahlLatten}
                onChange={(e) => handleInputChange('anzahlLatten', e.target.value)}
                placeholder="z.B. 10"
              />
            </div>
          </div>

          {lattenMass > 0 && (
            <div className="pt-2 border-t">
              <Badge variant="default" className="text-lg font-semibold">
                Errechnetes Lattenmaß: {lattenMass.toFixed(1)} cm
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audio-Steuerung */}
      <Card>
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

          <Alert className="mt-4">
            <AlertDescription>
              <strong>KI-Sprachsteuerung:</strong> Starte die Spracherkennung und stelle natürliche Fragen. Die KI bleibt 1 Minute im Lauschmodus. Funktioniert auch bei ausgeschaltetem Bildschirm.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {kiAntwort && (
        <Card>
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
        <Card>
          <Collapsible.Root open={!collapsed} onOpenChange={(open) => setCollapsed(!open)}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Ergebnis</CardTitle>
                  <CardDescription>
                    Berechnetes Lattenmaß und Abstände.
                  </CardDescription>
                </div>
                <Collapsible.Trigger asChild>
                  <Button variant="ghost" size="sm">
                    {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                  </Button>
                </Collapsible.Trigger>
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