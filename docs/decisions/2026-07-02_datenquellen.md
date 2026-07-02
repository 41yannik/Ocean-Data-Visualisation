# Decision Record — Datenquellen & Varianten-Strategie

**Datum:** 2026-07-02 · **Status:** beschlossen · **Bezug:** [docs/plan/01_Datenquellen-Entscheidung.md](../plan/01_Datenquellen-Entscheidung.md), Review-Befunde vom 2026-07-02

## Entscheidung 1 — Zwei-Varianten-Strategie (eine Codebasis, austauschbare y-Quelle)

| | Variante **Kurs** (Abgabe 24.07.2026) | Variante **Challenge** (Einreichung bis 31.08.2026) |
|---|---|---|
| y-Achse (Schaden) | EM-DAT `total_affected`, Ereignisebene | Offene Quelle — Auswahl in **Teil B nach dem 24.07.** (Kandidat A: PDH `VC_DSR_AFFCT`; Kandidat B: IBTrACS+WPP-Exposition) |
| Veröffentlichung | intern/nicht-öffentlich (edukative EM-DAT-Nutzung mit Zitat zulässig) | öffentliche URL + Repo, **ohne jedes EM-DAT-Derivat** |
| Pipeline | `--variant kurs` | `--variant challenge` (Lizenz-Assertion: keine EM-DAT-Felder im Output) |

**Begründung:** EM-DAT-Terms (keine Weiterverbreitung/Derivate, nicht-kommerziell) kollidieren mit Challenge-Regelwerk §9 (Zusatzdaten müssen open data sein) und §13 (kommerzielle IP-Lizenz an Organisator/Datenproduzenten). Bestätigt die interne Compliance-Entscheidung vom 2026-06-20 („EM-DAT internal-only"), die beim Neuaufbau verloren gegangen war.

## Entscheidung 2 — Offizieller PDH-Pflichtdatensatz: SST-Anomalien als Klimakontext-Intro

Gewählt (Nutzer, 2026-07-02): **„Mean sea surface temperature anomalies"** (SPC/PDH, 21 PICTs, 1850–2025) wird fester Bestandteil des Kerndesigns **beider** Varianten — als Klimakontext-Layer im Story-Einstieg („der Pazifik erwärmt sich — und Stürme treffen auf exponierte, verwundbare Inselgesellschaften"). Eigenständige, kleine Frontend-Komponente; Pipeline liefert dafür `sst.json` (mittlere Anomalie je Jahr).

**Begründung:** Erfüllt die Muss-Regel §9 („must use one or more datasets from the list published by the Organiser") sichtbar, mit geringem Aufwand und erzählerischem Mehrwert. Alternative (`VC_DSR_AFFCT` als Nebenansicht) bleibt Kandidat für die Challenge-y-Achse in Teil B.

## Entscheidung 3 — Lizenz-Hygiene ab sofort

- `.gitignore` schließt aus: `/Data` (Rohdaten inkl. EM-DAT, auch als Symlink), `/Developer API/`, sowie die EM-DAT-haltigen Pipeline-Outputs `app/public/data/events*.json` und `meta*.json`.
- Konsequenz: Ein frischer Klon rendert erst nach lokalem Pipeline-Lauf (`python scripts/build_track_to_toll.py --variant kurs`) — bewusst in Kauf genommen; Hinweis gehört ins App-README.
- Für die Abgabe wird das gebaute Artefakt (inkl. Daten) separat und nicht-öffentlich gepackt.

## Konsequenzen

1. Pipeline (Paket 03) wird von Beginn an mit `--variant`-Schalter gebaut; die y-Quelle ist eine austauschbare Funktion, kein hartverdrahteter Spaltenname.
2. Feinkonzept §2 wird um die Varianten-Markierung und den SST-Kerndatensatz ergänzt (Paket 02).
3. Teil B (Challenge-Quelle final prüfen/entscheiden, Story-Anpassung, Deployment) startet nach der Kursabgabe — siehe [docs/plan/01](../plan/01_Datenquellen-Entscheidung.md) Schritte B1–B4.
