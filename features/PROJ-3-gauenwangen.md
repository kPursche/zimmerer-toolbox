# PROJ-3: Gauenwangen aufdoppeln

**Status:** Planned
**Priorität:** P0 (MVP)
**Erstellt:** 2026-05-02

## Beschreibung
Berechnung der Maße und Schnittwinkel für das Aufdoppeln von Gauenwangen (Seitenwände einer Gaube/Lukarne). Der Nutzer gibt die Dachneigung, Gaubenbreite und Wangenhöhe ein — die App berechnet die erforderlichen Zuschnittmaße und Schnittwinkel.

## User Stories

1. Als Zimmerer gebe ich Dachneigung, Gaubenbreite und Wangenhöhe ein und erhalte alle Schnittwinkel auf einen Blick.
2. Als Nutzer sehe ich die Ergebnisse (Winkel, Längen) klar beschriftet mit Fachbegriff und Wert.
3. Als Nutzer kann ich die Werte direkt am Handy ablesen und ans Holz anreißen.
4. Als Auszubildender sehe ich eine kurze Erklärung, was jeder Winkel bedeutet.

## Acceptance Criteria

### Eingabe
- [ ] Dachneigung α in Grad (Eingabe 5°–80°)
- [ ] Gaubenbreite in cm
- [ ] Wangenhöhe (senkrecht) in cm
- [ ] Wandstärke / Holzdicke in cm (für Aufdoppelung)

### Ausgabe (Berechnungsergebnisse)
- [ ] Schifterschnittwinkel (Schnitt der Wange am Hauptdach)
- [ ] Fußwinkel der Wange
- [ ] Länge der aufgedoppelten Wange entlang der Dachschräge
- [ ] Länge der Wange senkrecht (= Wangenhöhe, als Kontrolle)
- [ ] Alle Winkel auf 0,1° gerundet
- [ ] Alle Längen auf 0,5 cm gerundet

### UX
- [ ] Formular mit Live-Berechnung (Ergebnis aktualisiert sich bei Eingabe)
- [ ] Alle Felder haben sinnvolle Standardwerte (z.B. α = 35°)
- [ ] Fehlermeldung bei ungültigen Eingaben (z.B. α = 0°)

## Edge Cases

- Dachneigung 0° oder 90° → Fehlermeldung "Ungültige Dachneigung"
- Gaubenbreite = 0 → Fehlermeldung
- Sehr flache Neigung (< 10°) → Warnhinweis (unüblich für Gauben)

## Dependencies
- Requires: PROJ-1 (App Shell)
