# PROJ-8: Sprechzettel (Stundenzettel per Diktat)

**Status:** In Review
**Priorität:** P2
**Erstellt:** 2026-07-21
**Aktualisiert:** 2026-07-21

## Beschreibung
Stundenzettel per Sprache ausfüllen. Der Zimmerer diktiert seinen Arbeitstag frei ("Heute 8 Stunden auf Baustelle Müller, Dachstuhl aufgerichtet"), die Aufnahme wird per Whisper transkribiert und per GPT-4o-mini in strukturierte Felder (Datum, Stunden, Baustelle, Tätigkeit) zerlegt. Vor dem Speichern bestätigt der Nutzer die erkannten Werte in einem Formular.

## User Stories
1. Als Zimmerer diktiere ich meinen Arbeitstag, statt ihn per Tastatur einzutippen.
2. Als Zimmerer kontrolliere und korrigiere ich die erkannten Felder vor dem Speichern.
3. Als Zimmerer sehe ich alle erfassten Tage als Liste mit Gesamtstundenzahl.
4. Als Zimmerer exportiere ich meine Stunden als CSV oder PDF für die Lohnabrechnung.

## Acceptance Criteria

### Diktat
- [x] Aufnahme per `MediaRecorder` (wie im Community-Chat), Transkription über bestehende `/api/transcribe`-Route (Whisper)
- [x] Anschließend Extraktion der Felder über neue Route `/api/sprechzettel-extrahieren` (GPT-4o-mini, JSON-Antwort, rate-limited)
- [x] Relative Datumsangaben ("heute", "gestern") werden serverseitig anhand des aktuellen Datums aufgelöst

### Bestätigung
- [x] Nach jedem Diktat öffnet sich immer ein Formular mit den erkannten Werten zur Kontrolle — kein automatisches Speichern
- [x] Pflichtfelder: Datum, Stunden (> 0). Baustelle/Tätigkeit optional
- [x] Hinweis, wenn für das Datum bereits ein Eintrag existiert (wird beim Speichern überschrieben)
- [x] Warnung bei unrealistisch hoher Stundenzahl (> 16 Std.), kein Hard-Block

### Speicherung & Übersicht
- [x] Ein Eintrag pro Kalendertag, localStorage (`zb_sprechzettel`) — kein Login, wie alle anderen Tools
- [x] Liste sortiert nach Datum absteigend, editierbar und löschbar
- [x] Export als CSV (Blob-Download) und PDF (Browser-Druckfenster)

## Technische Umsetzung
- `src/app/api/sprechzettel-extrahieren/route.ts` — OpenAI `gpt-4o-mini`, `response_format: json_object`, rate-limited (`@/lib/rate-limit`, 20 Req/Min)
- `src/hooks/use-sprechzettel.ts` — localStorage-Persistenz
- `src/components/tools/sprechzettel.tsx` — Aufnahme, Bestätigungsformular, Liste, Export
- Registrierung in `src/lib/tools.ts` (Slug `sprechzettel`, Status auf `available` gesetzt) und `src/app/tools/[slug]/page.tsx`
- Kein neues NPM-Paket nötig — nutzt bestehende `openai`-Dependency und bestehende `/api/transcribe`-Route

## Bekannte Einschränkungen / offen
- Baustelle ist Freitext, keine Verknüpfung zu einer Projektverwaltung (existiert in dieser App noch nicht)
- Kein serverseitiges Backup der Einträge (nur localStorage) — analog zu allen anderen Tools, bis PROJ-6 (Ergebnisse speichern & Verlauf) umgesetzt ist
- Lokal nicht end-to-end testbar, da `.env.local` nur den Vercel-OIDC-Token enthält und keine echten API-Keys (siehe Projekt-Memory) — Verifikation der KI-Extraktion muss nach Deploy erfolgen
