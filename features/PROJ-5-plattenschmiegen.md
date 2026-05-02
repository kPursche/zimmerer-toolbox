# PROJ-5: Plattenschmiegen in Kehle/Grat

**Status:** Planned
**Priorität:** P0 (MVP)
**Erstellt:** 2026-05-02

## Beschreibung
Berechnung der Schmiegen (zusammengesetzte Schnittwinkel) für Platten oder Bretter, die in eine Dachkehle oder einen Dachgrat einlaufen. Eingabe sind die Dachneigungen der beiden aneinandergrenzenden Dachflächen — Ausgabe sind die Sägewinkel (Längsschmiege und Querschmiege).

## User Stories

1. Als Zimmerer gebe ich die Neigungen beider Dachflächen ein und erhalte beide Schmiegenwinkel für die Säge.
2. Als Nutzer wähle ich zwischen Kehle (einspringend) und Grat (vorspringend).
3. Als Nutzer sehe ich die Winkel mit einer kurzen Beschriftung (z.B. "Winkel Kreissäge kippen").
4. Als Auszubildender verstehe ich durch eine Skizze, welcher Winkel wo am Holz angezeichnet wird.

## Acceptance Criteria

### Eingabe
- [ ] Dachneigung Fläche 1 (α₁) in Grad (1°–89°)
- [ ] Dachneigung Fläche 2 (α₂) in Grad (1°–89°)
- [ ] Typ: Kehle oder Grat (Toggle/Switch)
- [ ] Plattendicke in cm (optional, für Versatzberechnung)

### Ausgabe
- [ ] Längsschmiege (Winkel in der Längsebene der Platte) in Grad
- [ ] Querschmiege (Winkel quer zur Platte, Sägeblatt kippen) in Grad
- [ ] Grundrisswinkel (Winkel der Grat/Kehllinie in der Draufsicht) in Grad
- [ ] Bei symmetrischem Dach (α₁ = α₂): vereinfachte Ausgabe mit Hinweis
- [ ] Alle Winkel auf 0,1° gerundet

### UX
- [ ] Live-Berechnung
- [ ] Einfache SVG-Skizze zeigt, wo welcher Winkel sitzt
- [ ] Voreinstellung: symmetrisches Dach (α₁ = α₂)

## Edge Cases

- α₁ oder α₂ = 0° oder 90° → Fehlermeldung "Ungültige Dachneigung"
- Sehr unterschiedliche Neigungen (Differenz > 40°) → Warnhinweis
- Symmetrischer Fall (α₁ = α₂) → optimierte Formel, Hinweis anzeigen

## Formeln (Referenz)
```
Grundrisswinkel γ:   tan(γ) = tan(α₁) / tan(α₂)   [bei Kehle/Grat]
Längsschmiege λ:     tan(λ) = sin(γ) × tan(α₁)
Querschmiege χ:      tan(χ) = cos(γ) × tan(α₁)
```

## Dependencies
- Requires: PROJ-1 (App Shell)
