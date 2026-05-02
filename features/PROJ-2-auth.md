# PROJ-2: Benutzer-Auth (Login & Registrierung)

**Status:** Planned
**Priorität:** P0 (MVP)
**Erstellt:** 2026-05-02

## Beschreibung
Nutzer können sich registrieren und einloggen (E-Mail + Passwort via Supabase Auth). Eingeloggte Nutzer können ihre Berechnungsergebnisse in der Cloud speichern (vorbereitet für PROJ-6).

## User Stories

1. Als neuer Nutzer registriere ich mich mit E-Mail und Passwort.
2. Als bestehender Nutzer logge ich mich ein und bleibe eingeloggt (Session persistiert).
3. Als eingeloggter Nutzer kann ich mich ausloggen.
4. Als Nutzer ohne Account kann ich alle Tools ohne Login nutzen.
5. Als Nutzer sehe ich in der Navigation meinen Login-Status.

## Acceptance Criteria

- [ ] Registrierung mit E-Mail + Passwort (Passwort-Bestätigung)
- [ ] Login mit E-Mail + Passwort
- [ ] Fehlermeldungen bei falschem Passwort / nicht vorhandener E-Mail
- [ ] Session bleibt nach Browser-Neustart erhalten
- [ ] Logout löscht Session
- [ ] Nicht eingeloggte Nutzer können alle Tools nutzen (kein Redirect zum Login)
- [ ] Passwort-Reset per E-Mail

## Edge Cases

- Falsche E-Mail-Adresse → Validierung vor Absenden
- Passwort zu kurz (< 8 Zeichen) → Inline-Fehlermeldung
- E-Mail bereits registriert → Klare Fehlermeldung
- Netzwerk offline beim Login → Fehlermeldung, App weiter nutzbar

## Dependencies
- Requires: PROJ-1 (App Shell) — Navigation und Layout müssen existieren

## Tech Notes
- Supabase Auth (E-Mail + Passwort)
- Später erweiterbar: Google OAuth, Magic Link
