# Think-aloud-Leitfaden — Mini-Evaluation „From Track to Toll"

**Zweck:** Paket 07, Punkt 16 (Red-Team-Blindspot). 2–3 Kommilitonen, je ~10 Minuten.
Die protokollierten Befunde wandern als Evaluationsabschnitt in die Paperwork (Paket 08) —
ein starkes Bewertungsargument, auch wenn Probleme gefunden werden (gerade dann!).

## Setup (vor jeder Sitzung)

- App lokal starten: `cd app && npm run dev` → `http://localhost:5173/` (Story-Modus, Standardfall).
- Bildschirm + Ton aufzeichnen oder mitschreiben; Browser-Fenster ≥ 1280 px breit.
- Einleitungssatz (vorlesen): *„Ich teste die Visualisierung, nicht dich. Bitte denke laut:
  sag alles, was du siehst, erwartest und nicht verstehst. Es gibt keine falschen Antworten."*
- **Nichts erklären** — auch nicht auf Nachfrage („Was denkst du, was es bedeutet?").

## Ablauf

### Teil A — 5-Sekunden-Test des Hooks (~2 min)

Bis **Step 1** (Heta-Karte) scrollen lassen, nach 5 Sekunden Laptop-Deckel halb schließen / Tab wechseln.

| Frage | Antwort P1 | P2 | P3 |
|---|---|---|---|
| „Was hast du gesehen?" | | | |
| „Worum geht es hier vermutlich?" | | | |
| Kommt „ein Sturm, zwei sehr unterschiedliche Folgen" an? (ja/teilweise/nein) | | | |

### Teil B — Geführter Durchlauf mit 3 Aufgaben (~6 min)

Frei weiterscrollen lassen. Bei den passenden Steps stellen:

**Aufgabe 1 (Step 3): „Was sagt dir die schwarze Linie — und was bedeutet es, dass sie so flach ist?"**
Erwartung: Windstärke erklärt den Schaden kaum. Protokollieren: Wird das Quantilband verstanden
oder für einen Fehler/eine Wolke gehalten? Wird die R²-Annotation gelesen?

**Aufgabe 2 (Step 7, freie Erkundung): „Finde den Zyklon Harold und sage mir, wie viele Länder er getroffen hat."**
Erwartung: Hover/Klick auf Track oder Punkt → Detailpanel → 4 Länder. Protokollieren:
Erster Klickversuch wohin? Wird die 1-Sturm-n-Länder-Idee (Connector-Linien) verstanden?

**Aufgabe 3 (Step 7): „Schalte auf absolute Zahlen um — was ändert sich, und welcher Ansicht traust du mehr?"**
Erwartung: Toggle gefunden, „re-fitted"-Hinweis bemerkt, pro Kopf als fairer erkannt (kleine Inseln).
Protokollieren: Wird „not significant" bei absolut wahrgenommen?

**Zusatzbeobachtungen (nebenbei):** Versteht die Person die Rug-Ticks unten („wind known, impact
not reported")? Fällt die gestrichelte Fallback-Markierung auf? Nutzt sie die Punkte-Navigation rechts?

### Teil C — Abschlussfragen (~2 min)

1. „Fasse die Kernaussage in einem Satz zusammen." (Ziel: Verwundbarkeit/Exposition > Windstärke)
2. „Was war am verwirrendsten?"
3. „Was würdest du zuerst ändern?"

## Protokoll-Raster (pro Person eine Kopie)

```
Person: ___  Datum: ___  Dauer: ___  Vorkenntnisse (VA-Kurs? Meteorologie?): ___

5-Sek-Test bestanden:        ja / teilweise / nein
A1 Linie/Flachheit:          verstanden / teilweise / nicht   Notizen: ___
A2 Harold gefunden über:     Karte / Scatter / Filter / nicht   Zeit: ___s
A3 Toggle + Deutung:         verstanden / teilweise / nicht   Notizen: ___
Rug-Ticks gedeutet:          ja / nein / nicht bemerkt
Kernaussage (wörtlich):      "___"
Top-Verwirrung:              ___
Änderungswunsch:             ___
```

## Auswertung (für die Paperwork)

- Je Aufgabe: x/3 verstanden; wörtliche Zitate für Befunde.
- **Fix-Kriterium:** Was ≥ 2 von 3 Personen verwirrt, wird vor Abgabe behoben (in Paket 08 einplanen);
  Einzelfälle nur notieren.
- 3–5 Sätze Fazit: Was trägt (Hook? Linie? Toggle?), was wurde geändert, was bewusst nicht (Begründung).
