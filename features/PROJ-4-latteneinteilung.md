# PROJ-4: Dachlatten- und Pfanneneinteilung

**Status:** Planned
**Priorität:** P0 (MVP)
**Erstellt:** 2026-05-02

## Beschreibung
Berechnung der gleichmäßigen Einteilung von Dachlatten für einen gegebenen Ziegeltyp (Pfannen). Der Nutzer gibt die Dachflächen-Länge (Traufe bis First), den Ziegeltyp bzw. das Deckmaß ein — die App berechnet die optimale Lattenweite, Anzahl der Latten und die Positionen der Trauf- und Firstlatte.

## User Stories

1. Als Zimmerer gebe ich Trauflänge und Ziegeldeckmaß ein und erhalte die exakte Lattenweite und Lattenanzahl.
2. Als Nutzer wähle ich einen gängigen Ziegeltyp aus einer Liste oder gebe eigene Deckmaße ein.
3. Als Nutzer sehe ich ob das Deckmaß im erlaubten Bereich (Min/Max) des Ziegels liegt.
4. Als Nutzer kann ich die Ergebnisse für mehrere Dachflächen berechnen (z.B. Vorder- und Rückseite).

## Acceptance Criteria

### Eingabe
- [ ] Sparrenlänge (Traufe bis First) in cm
- [ ] Deckmaß des Ziegels: Mindest- und Höchstdeckmaß in cm
- [ ] Optionale Ziegelauswahl aus Voreinstellungsliste (gängige Typen)
- [ ] Trauflattenabstand (kann vom Standard abweichen)
- [ ] Anzahl Dachflächen (1–4)

### Ausgabe
- [ ] Optimale Lattenweite in cm (auf 0,1 cm genau)
- [ ] Anzahl Latten gesamt (je Fläche)
- [ ] Gleichmäßigkeit: Liegt Lattenweite im erlaubten Deckmaß-Bereich? (Grün/Rot)
- [ ] Position der Trauflatte und Firstlatte vom Traufpunkt aus
- [ ] Tabellarische Liste aller Lattenabstände (zusammenklappbar)

### UX
- [ ] Live-Berechnung bei Eingabe
- [ ] Ampel-Anzeige: Grün = Deckmaß ok, Rot = außerhalb Toleranz
- [ ] Voreinstellungen für gängige Ziegel (z.B. Frankfurter Pfanne, Biberschwanz)

## Edge Cases

- Sparrenlänge kürzer als ein Deckmaß → Fehlermeldung
- Deckmaß-Bereich ist 0 (Min = Max) → exakte Berechnung, keine Optimierung
- Keine ganzzahlige Lattenanzahl möglich → App wählt beste Näherung mit Hinweis

## Dependencies
- Requires: PROJ-1 (App Shell)
