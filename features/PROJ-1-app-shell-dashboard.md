# PROJ-1: App Shell & Dashboard

**Status:** In Review
**Priorität:** P0 (MVP)
**Erstellt:** 2026-05-02

## Beschreibung
Das zentrale Dashboard zeigt alle verfügbaren Tools als Kacheln an. Die App Shell enthält Navigation, Layout und das Design-System für alle weiteren Features.

## User Stories

1. Als Zimmerer öffne ich die App und sehe sofort alle verfügbaren Tools auf einen Blick.
2. Als Nutzer kann ich ein Tool per Klick/Tap öffnen und gelange direkt zur Eingabemaske.
3. Als Nutzer sehe ich in der Navigation, wo ich mich befinde, und kann jederzeit zum Dashboard zurück.
4. Als eingeloggter Nutzer sehe ich meinen Namen/Avatar in der Navigation.
5. Als nicht eingeloggter Nutzer kann ich alle Tools trotzdem nutzen (Ergebnisse nur lokal).

## Acceptance Criteria

- [ ] Dashboard zeigt alle Tools als Kacheln (Icon + Name + Kurzbeschreibung)
- [ ] Kacheln sind auf Mobile (375px), Tablet (768px) und Desktop (1440px) korrekt dargestellt
- [ ] Klick auf Kachel navigiert zur Tool-Seite
- [ ] Top-Navigation mit App-Logo und Auth-Status (eingeloggt/nicht eingeloggt)
- [ ] Aktive Seite ist in der Navigation hervorgehoben
- [ ] "Zurück zum Dashboard"-Link auf jeder Tool-Seite
- [ ] Dark Mode mit Holz-Design-Tokens (Oak, Pine, Steel — wie zimmerer-app)
- [ ] Ladezeiten < 2s auf mobiler Verbindung

## Edge Cases

- Tool noch nicht implementiert → Kachel ausgegraut mit "Kommt bald"-Badge
- App ohne Internet → Dashboard zeigt verfügbare (gecachte) Tools
- Sehr viele Tools (20+) → Grid scrollt vertikal, kein horizontales Scrollen

## Dependencies
Keine (dieses Feature ist die Basis für alle anderen)

## Recommended Build Order
PROJ-1 → PROJ-2 → PROJ-3 → PROJ-4 → PROJ-5

---

## Tech Design (Solution Architect)

### Komponentenstruktur

```
App (Root Layout — src/app/layout.tsx)
├── TopNavigation
│   ├── Logo ("Zimmerer-Toolbox")
│   ├── Breadcrumb (aktive Seite, ausgeblendet auf Dashboard)
│   └── AuthButton (Platzhalter "Anmelden" — in PROJ-2 verdrahtet)
│
├── Dashboard (src/app/page.tsx)
│   ├── PageHeader ("Deine Werkzeugkiste")
│   └── ToolGrid
│       └── ToolKachel (wird für jeden Eintrag aus der Tool-Registry gerendert)
│           ├── Icon (lucide-react)
│           ├── Tool-Name
│           ├── Kurzbeschreibung
│           └── "Kommt bald"-Badge (wenn status = "coming-soon")
│
└── Tool-Seite (src/app/tools/[slug]/page.tsx)
    ├── BackLink ("← Zurück zur Übersicht")
    ├── ToolHeader (Name + Beschreibung)
    └── [Tool-Inhalt] (wird von PROJ-3/4/5 implementiert)
```

### Datenmodell

**Tool-Registry** (statische Liste im Code, keine Datenbank):
Jedes Tool hat:
- `slug` — URL-freundlicher Kurzname (z.B. "gauenwangen")
- `name` — Anzeigename (z.B. "Gauenwangen aufdoppeln")
- `description` — Kurzbeschreibung für die Kachel
- `icon` — Icon-Name aus lucide-react
- `status` — "available" oder "coming-soon"
- `category` — Kategorie für spätere Gruppierung (z.B. "Dach", "Holz")

Diese Registry ist die einzige Stelle, die gepflegt werden muss, wenn ein neues Tool hinzukommt.

**Kein Backend für PROJ-1** — alle Daten sind statisch im Code definiert.

### Seitenstruktur (Routen)

| Route | Seite |
|-------|-------|
| `/` | Dashboard mit Tool-Grid |
| `/tools/[slug]` | Dynamische Tool-Seite |
| `/login` | Login-Seite (Platzhalter, implementiert in PROJ-2) |

### Design-System

Die Design-Tokens aus der Zimmerer-App werden übernommen:

| Token | Farbe | Verwendung |
|-------|-------|-----------|
| `oak` | `#c9924a` | Primärfarbe, CTAs, aktive Nav |
| `pine` | `#7fb87a` | Erfolg, verfügbare Tools |
| `steel` | `#6fa8d4` | Info, neutrale Elemente |
| `bg` | `#0f0d0a` | Haupt-Hintergrund |
| `s1` | `#1a1814` | Karten-Hintergrund |
| `tx` | `#ede5d0` | Haupttext |
| `mu` | `#8a8070` | Sekundärtext |

Tailwind Custom-Colors in `tailwind.config.ts` definiert.

### Tech-Entscheidungen

| Entscheidung | Warum |
|---|---|
| Next.js 15 App Router | Server Components = schnelle Ladezeiten, gut für Mobile |
| Dynamisches Routing `/tools/[slug]` | Neue Tools brauchen nur Registry-Eintrag, keine neue Seite |
| shadcn/ui für Karten, Buttons, Badges | Kein eigenes Design-System bauen — bewährte Basis |
| Tool-Registry als statische Liste | Keine DB-Abfrage für Metadaten, funktioniert offline |
| Supabase-Client vorbereiten (aber nicht aktivieren) | PROJ-2 kann nahtlos aufsetzen ohne Refactoring |

### Abhängigkeiten (npm-Pakete)

| Paket | Zweck |
|-------|-------|
| `next` + `react` + `typescript` | Basis-Framework |
| `tailwindcss` | Styling mit Custom Design-Tokens |
| `shadcn/ui` (via CLI) | UI-Komponenten: Card, Badge, Button |
| `lucide-react` | Icons für Tool-Kacheln |
| `@supabase/supabase-js` + `@supabase/ssr` | Auth-Client (vorbereitet für PROJ-2) |
