# Product Requirements Document — Zimmerer-Toolbox

## Vision
Eine modulare Web-App für Zimmerer, Gesellen und Meister, die häufige Berechnungen auf der Baustelle schnell und zuverlässig durchführt. Die Toolbox wächst mit der Zeit: Jedes Tool ist eine eigenständige Mini-App, erreichbar über ein zentrales Dashboard.

Langfristig: Installierbar auf dem Smartphone (PWA), mit Cloud-Speicherung der Ergebnisse.

## Target Users

**Primär: Zimmerer auf der Baustelle**
- Gesellen und Meister, die schnell rechnen müssen
- Handy oder Tablet in der Hand, oft schmutzig, brauchen große Buttons
- Kennen die Fachbegriffe (Schmiege, Kehle, Grat, Pfanneneinteilung, etc.)

**Sekundär: Zimmerer-Auszubildende**
- Lernen die Berechnungen und profitieren von klarer Erklärung der Ergebnisse

## Core Features (Roadmap)

| Priorität | ID | Feature | Status |
|-----------|-----|---------|--------|
| P0 (MVP) | PROJ-1 | App Shell & Dashboard | Planned |
| P0 (MVP) | PROJ-2 | Benutzer-Auth (Login & Registrierung) | Planned |
| P0 (MVP) | PROJ-3 | Gauenwangen aufdoppeln | Planned |
| P0 (MVP) | PROJ-4 | Dachlatten- und Pfanneneinteilung | Planned |
| P0 (MVP) | PROJ-5 | Plattenschmiegen in Kehle/Grat | Planned |
| P1 | PROJ-6 | Ergebnisse speichern & Verlauf | Planned |
| P1 | PROJ-7 | PWA-Support (Offline, Installierbar) | Planned |

## Success Metrics

- **Geschwindigkeit:** Ergebnis in unter 30 Sekunden nach Eingabe der Werte
- **Korrektheit:** Berechnungen stimmen mit manueller Zimmermann-Berechnung überein
- **Nutzbarkeit:** Bedienbar mit einer Hand auf dem Smartphone

## Constraints

- Solo-Projekt, kein festes Budget
- Web-Technologie (Next.js) — später PWA
- Backend: Supabase (Auth + Cloud-Speicherung)
- MVP mit Login, aber Tools auch ohne Login nutzbar (Ergebnisse nicht gespeichert)

## Non-Goals

- **Statik-Berechnungen** (Lastannahmen, Querschnittsnachweise)
- **CAD / Zeichnungen exportieren**
- **CNC-Maschinensteuerung**
- **Kaufmännische Funktionen** (Angebote, Rechnungen)
