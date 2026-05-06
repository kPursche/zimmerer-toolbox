"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";
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

function speakText(text: string) {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'de-DE'; // Deutsche Sprache
    utterance.rate = 0.8; // Etwas langsamer
    speechSynthesis.speak(utterance);
  }
}

function parseVoiceCommand(command: string, abstaende: LattenAbstand[]): string | null {
  const cmd = command.toLowerCase().trim();

  // "erstes Maß" oder "erstes lattenmaß"
  if (cmd.includes('erstes') && (cmd.includes('maß') || cmd.includes('lattenmaß'))) {
    if (abstaende.length > 0) {
      return `Erstes Lattenmaß: ${abstaende[0].position.toFixed(1)} Zentimeter`;
    }
  }

  // "nächstes" oder "weiter"
  if (cmd.includes('nächstes') || cmd.includes('weiter')) {
    // Hier würde ein State für den aktuellen Index benötigt werden
    return "Nächstes Maß: Implementierung folgt";
  }

  // "nach X cm" oder "nach X,Y cm"
  const nachMatch = cmd.match(/nach\s+([\d,.]+)\s*cm/);
  if (nachMatch) {
    const targetMass = parseFloat(nachMatch[1].replace(',', '.'));
    const gefunden = abstaende.find(a => Math.abs(a.position - targetMass) < 0.1);
    if (gefunden) {
      const nextIndex = abstaende.indexOf(gefunden) + 1;
      if (nextIndex < abstaende.length) {
        return `Nach ${targetMass.toFixed(1)} cm kommt: ${abstaende[nextIndex].position.toFixed(1)} Zentimeter`;
      }
    }
  }

  return null;
}

// ─── Haupt-Komponente ─────────────────────────────────────────────────────────

export function LatteneinteilungTool() {
  const [eingaben, setEingaben] = useState<Eingaben>({
    gesamtMass: '',
    anzahlLatten: '',
  });

  const [isListening, setIsListening] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Berechnung der Lattenabstände
  const abstaende = useMemo(() => {
    const mass = parseFloat(eingaben.gesamtMass.replace(',', '.'));
    const anzahl = parseInt(eingaben.anzahlLatten);

    if (isNaN(mass) || isNaN(anzahl) || mass <= 0 || anzahl <= 1) {
      return [];
    }

    return berechneLattenAbstaende(mass, anzahl);
  }, [eingaben]);

  // Audio-Setup beim Mount
  useEffect(() => {
    if ('speechSynthesis' in window) {
      setAudioEnabled(true);
    }

    // Speech Recognition Setup
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'de-DE';
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event) => {
        const command = event.results[0][0].transcript;
        const response = parseVoiceCommand(command, abstaende);
        if (response) {
          speakText(response);
        } else {
          speakText("Befehl nicht verstanden. Versuche: 'erstes Maß', 'nächstes' oder 'nach 99,8 cm'");
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      speechSynthesis.cancel();
    };
  }, [abstaende]);

  // Eingabe-Handler
  const handleInputChange = useCallback((field: keyof Eingaben, value: string) => {
    setEingaben(prev => ({ ...prev, [field]: value }));
  }, []);

  // Audio-Steuerung
  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) {
      speakText("Spracherkennung nicht verfügbar in diesem Browser");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, [isListening]);

  const speakAllMasse = useCallback(() => {
    if (abstaende.length === 0) {
      speakText("Keine Maße berechnet");
      return;
    }

    let text = "Lattenmaße: ";
    abstaende.forEach((abstand, index) => {
      text += `${abstand.position.toFixed(1)}`;
      if (index < abstaende.length - 1) text += ", ";
    });
    text += " Zentimeter";

    speakText(text);
  }, [abstaende]);

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
          <div className="flex gap-2">
            <Button
              onClick={speakAllMasse}
              disabled={!audioEnabled || abstaende.length === 0}
              variant="outline"
            >
              <Volume2 className="w-4 h-4 mr-2" />
              Alle Maße vorlesen
            </Button>
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
              <strong>Sprachbefehle:</strong> "erstes Maß", "nächstes", "nach 99,8 cm"
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Ergebnis-Karte */}
      {abstaende.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ergebnis</CardTitle>
            <CardDescription>
              Lattenabstände vom Startpunkt
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {abstaende.map((abstand) => (
                <Badge key={abstand.nr} variant="secondary" className="text-sm">
                  Latte {abstand.nr}: {abstand.position.toFixed(1)} cm
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}