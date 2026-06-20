# Projektübersicht – Visual Analytics

> **Kurzfassung:** Eine interaktive, **fünfdimensionale Visualisierung** von **Ozeandaten** des
> pazifischen Raums, umgesetzt in **D3.js**, eingereicht zur **Pacific Dataviz Challenge 2026**
> (Thema: *Climate Change*) und benotet im Kurs **Visual Analytics** (HSD, 4. Semester).

## Einordnung

| Aspekt | Inhalt |
|---|---|
| Kurs | Visual Analytics, Hochschule Düsseldorf (HSD), 4. Semester |
| Aufgabe | Multidimensionale (5D) Visualisierung auf bestehenden Daten |
| Datendomäne | Ozean / Klimawandel im Pazifik |
| Externer Rahmen | Pacific Dataviz Challenge 2026 – Thema *Climate Change* |
| Haupttechnologie | **D3.js** (SVG, datengetriebene DOM-Manipulation, Interaktion, Animation) |
| Daten | Pacific Data Hub – `.Stat` Explorer (SDMX-CSV) + Coastline-Geodaten |

## Doppelte Zielsetzung

Das Projekt erfüllt zwei Kontexte gleichzeitig:

1. **Akademisch (Benotung):** Nachweis kritischer Auseinandersetzung mit einem Domänenproblem,
   methodisch begründete Wahl der Visualisierungstechnik, Einbezug der Kursinhalte sowie ein
   begleitendes Short Paper. → siehe [05_Bewertung-und-Abgabe.md](05_Bewertung-und-Abgabe.md)
2. **Wettbewerb (Sichtbarkeit):** Öffentlich publizierte Dataviz, die mindestens einen offiziellen
   Datensatz der Challenge nutzt. → siehe [01_Challenge-Kontext.md](01_Challenge-Kontext.md)

## Kernidee

Pazifische Inselstaaten gehören zu den am stärksten vom Klimawandel betroffenen Regionen der Welt –
bei minimalem eigenen Beitrag zu den Emissionen. Die Visualisierung soll diese **Mehrfachbelastung**
(steigende Meeresoberflächentemperatur, Meeresspiegelanstieg, Niederschlagsanomalien u. a.) pro Land
und über die Zeit in **einer kohärenten 5-dimensionalen Darstellung** erfahrbar machen.

→ Konkretes Konzept und Dimensions-Mapping: [03_Visualisierungskonzept.md](03_Visualisierungskonzept.md)

## Dokumentenstruktur (`docs/`)

| Datei | Inhalt |
|---|---|
| [00_Projektuebersicht.md](00_Projektuebersicht.md) | Dieses Dokument – Rahmen & Einstieg |
| [01_Challenge-Kontext.md](01_Challenge-Kontext.md) | Pacific Dataviz Challenge 2026: Regeln, Timeline, offizielle Datensätze |
| [02_Datendokumentation.md](02_Datendokumentation.md) | Datenstruktur (SDMX), alle Datensätze, Ozean-Fokus, Ländercodes |
| [03_Visualisierungskonzept.md](03_Visualisierungskonzept.md) | 5D-Konzept, Dimensions-Mapping, Technikvergleich |
| [04_Tools-und-Tech-Stack.md](04_Tools-und-Tech-Stack.md) | Werkzeuge, Bibliotheken, Farb- & Dev-Tools |
| [05_Bewertung-und-Abgabe.md](05_Bewertung-und-Abgabe.md) | Bewertungskriterien, Abgabeartefakte, Short Paper |
| [06_Arbeitsplan.md](06_Arbeitsplan.md) | Pipeline, Meilensteine, offene Entscheidungen |
| [07_Datenexploration-und-Machbarkeit.md](07_Datenexploration-und-Machbarkeit.md) | Machbarkeitsanalyse aller Datensätze, drei Projektwege |
| [08_Dashboard-Konzept.md](08_Dashboard-Konzept.md) | Multi-View-Dashboard „Pacific Cyclones & Their Impacts" |
| [09_Projektplan.md](09_Projektplan.md) | **Gesamtplan** (Idee→Viz→Dimensionen→Umsetzung→Ergebnis) + Compliance-Check |

## Status

- [x] Daten gesichtet (25 CSV-Datensätze + Coastline-Geodaten)
- [x] Projektrahmen dokumentiert
- [ ] Visualisierungskonzept final entschieden
- [ ] Datenaufbereitungs-Pipeline gebaut
- [ ] D3-Prototyp
- [ ] Short Paper
