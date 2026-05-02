# PROJ-6: Ergebnisse speichern & Verlauf

**Status:** Planned
**Priorität:** P1
**Erstellt:** 2026-05-02

## Beschreibung
Eingeloggte Nutzer können Berechnungsergebnisse mit einem Namen/Projektbezug speichern und später wieder abrufen. Ein Verlauf zeigt die letzten Berechnungen je Tool.

## User Stories

1. Als eingeloggter Nutzer speichere ich ein Berechnungsergebnis mit einem Projektnamen.
2. Als Nutzer sehe ich in meinem Verlauf alle gespeicherten Berechnungen sortiert nach Datum.
3. Als Nutzer öffne ich eine gespeicherte Berechnung und sehe Eingabewerte und Ergebnisse.
4. Als Nutzer lösche ich nicht mehr benötigte Einträge aus dem Verlauf.

## Acceptance Criteria

- [ ] "Speichern"-Button in jedem Tool (nur für eingeloggte Nutzer sichtbar)
- [ ] Speichern mit optionalem Projektnamen (z.B. "Einfamilienhaus Müller")
- [ ] Verlaufsseite zeigt alle Einträge: Tool-Name, Projektname, Datum
- [ ] Klick auf Eintrag zeigt gespeicherte Eingaben + Ergebnisse
- [ ] Eintrag löschen mit Bestätigungs-Dialog
- [ ] Nicht eingeloggte Nutzer sehen Hinweis "Einloggen zum Speichern"

## Dependencies
- Requires: PROJ-1 (App Shell)
- Requires: PROJ-2 (Auth)
- Requires: PROJ-3, PROJ-4 oder PROJ-5 (mindestens ein Tool)
