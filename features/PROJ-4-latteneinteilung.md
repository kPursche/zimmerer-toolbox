# PROJ-4: Dachlatten- und Pfanneneinteilung

**Status:** In Progress
**Priorität:** P0 (MVP)
**Erstellt:** 2026-05-02
**Aktualisiert:** 2026-05-06

## Beschreibung
Umfassendes Tool für die Berechnung von Dachlatten- und Pfanneneinteilung. Beinhaltet Auswahl von Dachpfannen gängiger Hersteller mit integrierten Produktkatalogen, automatische Berechnung von Lattenmaßen, Pfanneneinteilung in der Breite mit Berücksichtigung von Ortgangsteinen und Gauben/Dachfenstern. Besonderes Feature: Auditive KI-Unterhaltung für Maßausgaben, funktioniert auch bei ausgeschaltetem Bildschirm.

## User Stories

1. Als Zimmerer wähle ich Dachpfannen aus Katalogen gängiger Hersteller aus und lade Datenblätter herunter.
2. Als Nutzer gebe ich Trauf- und Firstdetail ein und erhalte automatisch berechnete Lattenmaße.
3. Als Nutzer gebe ich Maß und Anzahl Latten ein und erhalte eine Liste aller Lattenabstände.
4. Als Nutzer kann ich mich auditiv mit der KI unterhalten: "Gebe mir das erste Lattenmaß", "weiter", "welches Maß kam nach 99,8cm".
5. Als Nutzer funktioniert die auditive Ausgabe auch bei ausgeschaltetem Bildschirm (z.B. auf der Baustelle).
6. Als Zimmerer berechne ich Pfanneneinteilung in der Breite mit Ortgangsteinen, Deckbreite und Abschnürung (jede 3./4. Pfanne).
7. Als Nutzer kann ich Gauben und Dachfenster in die Berechnung einbeziehen.

## Acceptance Criteria

### Eingabe (Phase 1: Lattenmaß)
- [ ] Maß der Dachfläche (Traufe bis First) in cm
- [ ] Anzahl der Latten
- [ ] Option: Feste Position der 1. Latte (Traufdetail)
- [ ] Option: Feste Position der letzten Latte (Firstdetail)

### Ausgabe (Phase 1)
- [ ] Liste aller Lattenabstände (auditiv und visuell)
- [ ] KI-Unterhaltung für Maßabfragen
- [ ] Offline-Audiofunktion (Bildschirm aus)

### Eingabe (Phase 2: Pfannen)
- [ ] Auswahl Dachpfannen-Hersteller und Typ aus Katalogen
- [ ] Maße Ortgangsteine und Deckbreite Flächensteine
- [ ] Abschnürungsintervall (jede n-te Pfanne)
- [ ] Gauben/Dachfenster-Positionen und -Maße

### Ausgabe (Phase 2)
- [ ] Vollständige Pfanneneinteilung mit Abschnürungen
- [ ] Berücksichtigung von Gauben und Dachfenstern

### UX
- [ ] Auditive KI-Interaktion: Natürliche Sprachbefehle
- [ ] Offline-Modus für Audio (kein Bildschirm nötig)
- [ ] Hersteller-Kataloge als herunterladbare PDFs
- [ ] Live-Berechnung bei Eingabeänderungen

## Edge Cases

- Ungleichmäßige Lattenverteilung → Warnung mit Optimierungsvorschlag
- Gauben überschneiden Latten → automatische Anpassung
- Audio nicht verfügbar → Fallback auf Text

## Dependencies
- Requires: PROJ-1 (App Shell)
- Requires: PROJ-2 (Auth) für Benutzer-spezifische Kataloge
