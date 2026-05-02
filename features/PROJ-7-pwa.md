# PROJ-7: PWA-Support (Offline, Installierbar)

**Status:** Planned
**Priorität:** P1
**Erstellt:** 2026-05-02

## Beschreibung
Die App wird als Progressive Web App (PWA) installierbar gemacht — sowohl auf Android als auch iOS. Berechnungen funktionieren offline (alle Rechenlogik ist lokal).

## User Stories

1. Als Nutzer installiere ich die App auf meinem Smartphone über den Browser ("Zum Startbildschirm hinzufügen").
2. Als Nutzer nutze ich alle Berechnungs-Tools auch ohne Internetverbindung.
3. Als Nutzer sehe ich ein App-Icon und einen Splash-Screen beim Öffnen.

## Acceptance Criteria

- [ ] `manifest.json` mit Icon, Name, Theme-Color
- [ ] Service Worker cacht alle statischen Assets und Berechnungsseiten
- [ ] Offline-Indikator in der Navigation wenn keine Verbindung
- [ ] Install-Prompt wird angezeigt (wo vom Browser unterstützt)
- [ ] Lighthouse PWA-Score ≥ 90

## Dependencies
- Requires: PROJ-1 (App Shell)
- Alle Tools müssen vor PWA-Aktivierung implementiert sein
