# Paket 05 — M3: Interaktion & CMV-Verknüpfung

**Priorität:** 🟡 MITTEL · **Aufwand:** 8–14 h · **Abhängigkeiten:** 04

## Ziel

Karte und Scatter sind bidirektional verknüpft (Hover, Brushing, Klick → Detailpanel); das 1:n-Mapping zwischen Track (je Sturm) und Scatter-Punkten (je Sturm-Land-Paar) ist sauber definiert.

## Architektur: ein zentraler State

Alle Interaktion läuft über `state.js` (Publish/Subscribe, kein Framework nötig):

```js
{
  hoveredSid: null,          // Sturm unter dem Cursor (Karte ODER Scatter)
  selectedEventIds: Set,     // Brush-Auswahl (Event-Ebene)
  detailSid: null,           // geöffnetes Detailpanel
  mode: 'perCapita',         // 'perCapita' | 'absolute'
  filters: { yearRange, categories, countries },  // freie Erkundung
  step: 0                    // aktueller Story-Schritt (Paket 06)
}
```

`map.js`, `scatter.js`, `detail.js`, `story.js` subscriben und rendern nur Deltas (Klassen-Toggles — bei 74 Punkten/67 Pfaden verifiziert performant, kein Quadtree nötig).

## Das 1:n-Mapping (wichtigste Design-Regel)

Ein **Track** (SID) gehört zu **n Scatter-Punkten** (Sturm-Land-Paare, z. B. Harold 2020 → 4 Punkte). Verbindliche Semantik:

| Aktion | Effekt |
|---|---|
| Hover Track (Karte) | Track hebt sich + **alle n** zugehörigen Scatter-Punkte highlighten |
| Hover Punkt (Scatter) | Punkt hebt sich + der **eine** Track highlightet + Geschwister-Punkte desselben Sturms dezent mit-markiert |
| Brush im Scatter | Auswahl-Set von Event-IDs → Karte zeigt die Tracks aller Stürme, die **mindestens einen** ausgewählten Punkt haben |
| Klick (Track oder Punkt) | Detailpanel des **Sturms** (aggregiert über alle Länderzeilen) |

Highlight-Kanal: ausschließlich der **eine reservierte Akzentton** + Halo/Outline in beiden Views gleichzeitig (löst das Identitätsproblem zweier Farbskalen, siehe Paket 07).

## Schritte

- [ ] **1. `state.js`** mit subscribe/notify und den Feldern oben; alle Module anschließen.
- [ ] **2. Hover-Linking** Karte↔Scatter inkl. 1:n-Regeln und Geschwister-Markierung; Tooltip (Name, Jahr, Land, Wind kt + Quelle, Betroffene absolut & pro Kopf, Tote falls gemeldet).
- [ ] **3. Brushing:** `d3.brush` im Scatter → `selectedEventIds`; Karte dimmt nicht-selektierte Tracks. Umgekehrt reicht fürs MVP Hover auf der Karte (Karten-Lasso ist optionale Kür).
- [ ] **4. Detailpanel (`detail.js`):** bei Klick — Mini-Zugbahn (kleine eigene Projektion, Track + betroffene Insel-Zentroide), Kennzahlen-Tabelle **je Land** (Harold: 4 Zeilen mit 25.000–180.000 Betroffenen — der Verwundbarkeits-Vergleich im Kleinen), Peak-Wind + Kategorie + `intensity_source`, Schließen per Esc/×.
- [ ] **5. Toggle pro Kopf ↔ absolut:** Umschalter mit animierter y-Achsen-Transition (Objektkonstanz über `data-key`); **beide Modi haben eigene Fits aus `meta.json`** — Linie, Band und Trend-Annotation transitionieren mit; kurze Einblendung „expectation re-fitted for this scale", damit Seitenwechsel von Punkten nicht wie ein Bug wirkt.
- [ ] **6. Filter für die freie Erkundung** (Endzustand der Story): Jahr-Range, Kategorie, Land/Subregion — wirken auf beide Views über den State.
- [ ] **7. Performance-/Robustheitscheck:** Hover-Wechsel < 16 ms (Klassen-Toggles), kein Re-Layout der SVG-Pfade; Tastatur-Fokus für Punkte (Tab + Enter öffnet Panel — zahlt auf E3 ein).

## Definition of Done

- Hover, Brush, Klick funktionieren in beide Richtungen mit korrekter 1:n-Semantik (Testfall: Harold 2020 — 1 Track ↔ 4 Punkte; Pam 2015 — 1 Track ↔ 5 Punkte).
- Detailpanel aggregiert je Sturm und zeigt die Länder-Differenzen; Toggle transitioniert sauber inkl. neu gefitteter Linie.
- Alles bedienbar ohne Maus (Tab/Enter/Esc) für die Kernaktionen.
