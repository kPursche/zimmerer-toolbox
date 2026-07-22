# PROJ-9: Holzrahmenbau-Wandplaner

**Status:** In Review
**Priorität:** P2
**Erstellt:** 2026-07-22
**Aktualisiert:** 2026-07-22

## Beschreibung
Seitenansicht (Elevation) einer Holzrahmenbauwand planen: Breite, Schwellenhöhe, Rähmhöhe und Wandhöhe links/rechts eingeben (unterschiedliche Höhen ergeben ein geneigtes Rähm, z. B. für Giebelwände). Die Pfosten werden im festen Raster ab der linken Kante verteilt (Soll-Abstand konfigurierbar, Standard 62,5 cm), das letzte Feld ist der Rest. Jeder Pfosten kann einzeln in der Position überschrieben werden. Ausgabe: maßstäbliche SVG-Seitenansicht, Stückliste (Position/Länge/Winkel je Pfosten) sowie CSV- und PDF-Export.

## User Stories
1. Als Zimmerer gebe ich Breite, Schwellen-/Rähmhöhe und Wandhöhe links/rechts ein und sehe sofort die Seitenansicht der Wand.
2. Als Zimmerer bekomme ich eine Stückliste mit Position, Länge und Kopfschnittwinkel für jeden Pfosten — wichtig bei geneigtem Rähm, da jeder Pfosten eine andere Länge hat.
3. Als Zimmerer kann ich einzelne Pfosten manuell verschieben, wenn der Standardabstand nicht passt (z. B. wegen einer späteren Öffnung).
4. Als Zimmerer exportiere ich die Stückliste als CSV oder PDF für die Werkstatt/Baustelle.

## Acceptance Criteria

### Eingabe & Berechnung
- [x] Eingaben: Breite, Schwellenhöhe, Rähmhöhe, Wandhöhe links, Wandhöhe rechts, Pfostenabstand (Soll, Default 62,5 cm) — alle in cm
- [x] Pfosten im festen Raster ab der linken Kante (x=0, x=Abstand, 2×Abstand, …), Restfeld am Ende; Randpfosten bei x=0 und x=Breite immer enthalten
- [x] Wandhöhe wird linear zwischen linker und rechter Kante interpoliert → Pfostenlänge = interpolierte Wandhöhe − Schwellenhöhe − Rähmhöhe
- [x] Kopfschnittwinkel konstant für alle Pfosten (nur das Rähm ist geneigt, die Schwelle bleibt immer waagerecht)
- [x] Validierung: negative/Null Pfostenlänge (Wandhöhe zu gering) wird als Fehlerhinweis angezeigt, keine Stückliste

### Pfosten-Überschreibung
- [x] Jeder Pfosten in der Stückliste hat ein editierbares Positionsfeld; Änderung wirkt sofort auf Zeichnung und Länge/Winkel
- [x] Zurücksetzen-Button pro Zeile, sobald eine manuelle Position gesetzt wurde

### Ausgabe
- [x] SVG-Seitenansicht: Schwelle (waagerecht), Rähm (waagerecht oder geneigt), Pfosten als vertikale Linien an ihren Positionen, Maßketten für Breite und Höhe
- [x] Stückliste als Tabelle: Nr., Position, Länge, Winkel
- [x] Export als CSV (Blob-Download) und PDF (Browser-Druckfenster), analog zu PROJ-8

## Technische Umsetzung
- `src/lib/wandplaner.ts` — reine, einheiten-agnostische Berechnungsfunktionen (`pfostenPositionen`, `wandhoeheAnPosition`, `pfostenLaenge`, `raehmWinkelGrad`, `berechneWand`), analog zu `src/lib/latten.ts`
- `src/lib/__tests__/wandplaner.test.ts` — 13 Tests (Raster mit/ohne Restfeld, Interpolation, Winkel, Überschreibung, Fehlerfall)
- `src/components/tools/wandplaner.tsx` — Eingabeformular, SVG-Zeichnung (Muster `dach-ausmittlung.tsx`/`boden-deckelschalung.tsx`), Stückliste, CSV/PDF-Export (Muster `sprechzettel.tsx`)
- Registrierung in `src/lib/tools.ts` (Slug `wandplaner`, Icon `Columns3`, Kategorie „Holz“, Status `available`) und `src/app/tools/[slug]/page.tsx`
- Kein neues NPM-Paket nötig
- Keine Persistenz/localStorage — reines Rechentool wie Latteneinteilung/Boden-Deckelschalung

## Bekannte Einschränkungen / offen
- Nur Seitenansicht (Elevation), keine Tiefe/3D
- Nur das Rähm kann geneigt sein; die Schwelle bleibt immer waagerecht (kein „doppelt geneigter" Fall)
- Keine Öffnungen (Fenster/Türen) berücksichtigt — geplanter Folgeschritt, siehe `whatsNext` in `tools.ts`
- Manuelle Pfosten-Positionsüberschreibungen sind an den Array-Index gebunden: ändert sich Breite oder Soll-Abstand, kann sich die Zuordnung einer Überschreibung zu einem anderen Pfosten verschieben. Für die aktuelle Einzelplanung ohne größere Nacheditierung akzeptabel.
- Keine Pfostenbreite/-tiefe für eine echte Materialliste (nur Länge/Winkel je Pfosten)
