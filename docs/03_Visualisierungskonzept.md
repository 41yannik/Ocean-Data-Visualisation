# Visualisierungskonzept – 5 Dimensionen in D3

> Ziel: **fünf Datendimensionen** gleichzeitig, kohärent und interaktiv mit **D3.js** darstellen –
> auf Basis der pazifischen Ozean-/Klimadaten. Dieses Dokument hält Kandidaten-Techniken,
> das Dimensions-Mapping und eine begründete Empfehlung fest.

## 1. Was zählt als „Dimension“?

In der multivariaten Visualisierung ist eine Dimension eine **visuelle Kodierungsachse** (visual
channel), über die ein Datenattribut abgebildet wird. Typische Kanäle: Position X, Position Y,
Farbe, Größe, Form, Zeit (Animation), Winkel, Helligkeit. Eine „5D-Visualisierung“ bildet also
**fünf Attribute auf fünf unterscheidbare Kanäle** ab.

**Verfügbare Datenattribute (Ozean-Fokus, pro `country` × `year`):**

| # | Attribut | Quelle | Typ | Einheit |
|---|---|---|---|---|
| A | Meeresoberflächentemperatur-Anomalie | `SST_ANOM` | quantitativ | °C |
| B | Meeresspiegel-Anomalie | `SEA_LVL` | quantitativ | m |
| C | Niederschlags-Anomalie | `RAIN_ANOM` | quantitativ | mm |
| D | Land/Territorium | `GEO_PICT` | kategorial | 21 PICTs |
| E | Jahr | `TIME_PERIOD` | ordinal/zeitlich | Jahr |
| F | Unsicherheit (optional) | `ERROR_VAL` (SST) | quantitativ | °C |
| G | Bevölkerungswachstum / GHG (optional) | weitere CSV | quantitativ | % / t |

## 2. Kandidaten-Techniken

### Option 1 – Animierter Bubble-Plot (Gapminder-Stil) ⭐ Empfehlung
Klassische 5D-Technik nach Hans Rosling; in D3 sehr gut umsetzbar (Transitions, `d3.scale`, Force).

| Kanal | Attribut |
|---|---|
| Position X | SST-Anomalie (A) |
| Position Y | Meeresspiegel-Anomalie (B) |
| Größe (Radius) | Niederschlags-Anomalie \|C\| oder Bevölkerung (G) |
| Farbe | Land/Region (D) |
| Zeit (Animation/Slider) | Jahr (E) |

**Pro:** intuitiv, erzählt eine Zeitgeschichte, starke Interaktion (Play/Pause, Hover, Land-Highlight),
nutzt D3-Transitions zentral. **Contra:** Bubble-Overplotting bei vielen Ländern → Lösung: Filter,
Trails, Hervorhebung.

### Option 2 – Parallele Koordinaten (Parallel Coordinates)
Mehrere parallele Achsen (SST, Sea level, Rainfall, GHG, Population …), jede Linie = ein Land(-Jahr).

| Kanal | Attribut |
|---|---|
| Achse 1..n | je ein quantitatives Attribut (A,B,C,G,F) |
| Linienfarbe | Land oder Jahr (D/E) |
| Brushing | interaktive Filterung pro Achse |

**Pro:** zeigt beliebig viele Dimensionen + Korrelationen, lehrbuchnah für „multidimensional“.
**Contra:** für Laien schwerer lesbar, Achsenreihenfolge beeinflusst Interpretation.

### Option 3 – Karte + Glyphen (Geo-Multivariate)
Pazifik-Karte (Coastline-Geodaten), pro Land ein **Glyph** (Star-/Radial-Glyph oder mehrfarbiger Kreis).

| Kanal | Attribut |
|---|---|
| Position X/Y | Geografie (Lat/Long) = 2 Dimensionen |
| Glyph-Segmente/Farbe | SST, Sea level, Rainfall (A,B,C) |
| Zeit-Slider | Jahr (E) |

**Pro:** geografischer Bezug stark, „Pazifik“ wird sichtbar; nutzt Coastline-Daten. **Contra:**
Glyph-Lesbarkeit begrenzt, Geo nimmt 2 der 5 Kanäle ein.

### Option 4 – Small Multiples / Heatmap-Matrix
Raster `Land × Jahr`, Zellfarbe = Wert; mehrere Kennzahlen als Facetten nebeneinander.
**Pro:** dichte, exakte Übersicht. **Contra:** Animation/Storytelling schwächer, „nur“ Farbe als Hauptkanal.

## 3. Empfehlung

**Primär: Option 1 (animierter Bubble-Plot)** als Hauptansicht – stark in Interaktion, Storytelling
und D3-Transitions, klar auf das Klima-Narrativ pazifischer Inseln einzahlend.
**Ergänzend** kann eine zweite, verlinkte Ansicht (Option 2 *oder* 3) als „Detail/Explore“-Tab dienen
(Coordinated Multiple Views), falls Zeit bleibt – das stärkt „Einbezug der Kursinhalte“ und
„Qualität der Lösung“.

> 🟡 **Offene Entscheidung** – bitte bestätigen/auswählen, bevor die D3-Implementierung startet.
> Siehe [06_Arbeitsplan.md](06_Arbeitsplan.md).

## 4. Designprinzipien (Kursbezug)

- **Expressiveness & Effectiveness** (Mackinlay): wichtigste Attribute auf die genauesten Kanäle
  (Position > Größe/Farbe).
- **Farbe:** sequenziell für Anomalie-Stärke, kategorial für Länder; farbsichere Paletten
  (ColorBrewer) – siehe [04_Tools-und-Tech-Stack.md](04_Tools-und-Tech-Stack.md).
- **Interaktion:** Overview first → Zoom/Filter → Details-on-demand (Shneiderman Mantra) via
  Tooltip, Slider, Land-Auswahl/Highlight.
- **Unsicherheit:** SST-`ERROR_VAL` als optionale Kodierung (z. B. Ringdicke/Transparenz).
- **Annotation:** Schlüsselereignisse/Extremjahre erläutern (kritische Domänen-Auseinandersetzung).

## 5. Daten-Voraussetzung

Die App benötigt eine schlanke Tidy-Tabelle (`country, year, sst_anom, sea_level, rain_anom, …`),
erzeugt durch die Pipeline aus [02_Datendokumentation.md](02_Datendokumentation.md) §6 – **nicht**
die SDMX-Rohdaten direkt im Browser parsen.
