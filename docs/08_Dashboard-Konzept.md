# Dashboard-Konzept – „Pacific Cyclones & Their Impacts"

> Frei erkundbares **Multi-View-Dashboard** über **tropische Zyklone** im Pazifik und ihre
> Auswirkungen. Kombiniert **externe Sturm-Tracks (IBTrACS)** mit **offiziellen Pacific-Data-Hub-
> Klima-/Impact-Daten**. Umsetzung in **D3.js**. Beruht auf den Entscheidungen in
> [07_Datenexploration-und-Machbarkeit.md](07_Datenexploration-und-Machbarkeit.md) §7.

## 1. Leitidee & Domänen-Narrativ

Pazifische Inseln werden von tropischen Zyklonen getroffen, deren Intensität im Kontext steigender
Meeresoberflächentemperaturen, Meeresspiegel und veränderter Niederschläge steht. Das Dashboard
lässt Nutzer:innen **selbst erkunden**: *Wo ziehen Stürme entlang? Wie stark? Wann? Und welche
Auswirkungen (Betroffene, Schäden, Ernte, Wasser) korrelieren mit Klima-Anomalien?*

**Leitfragen (vom Nutzer erkundbar):**
- Wie haben sich Häufigkeit/Intensität tropischer Zyklone über die Zeit entwickelt?
- Welche Inseln sind am stärksten exponiert?
- Hängen Sturm-/Klima-Signale mit messbaren Auswirkungen zusammen?

## 2. Datenquellen pro Ansicht

| Quelle | Typ | Rolle | Status |
|---|---|---|---|
| **IBTrACS** (NOAA NCEI) | extern, open | Sturm-Tracks: `SID, SEASON, BASIN, NAME, ISO_TIME, LAT, LON, WMO_WIND, WMO_PRES, USA_SSHS, DIST2LAND, LANDFALL` | ✅ **validiert & lokal** |
| Pacific Data Hub – SST/SeaLvl/Rain | offiziell | Klima-Kontext (Anomalien) | ✅ vorhanden |
| Pacific Data Hub – Affected/EconLoss | offiziell | Impact (all-hazard, jährlich) | ✅ vorhanden |
| Pacific Data Hub – Crop/Water/Pop/Tourist | offiziell | Folge-Proxies | ✅ vorhanden |
| Coastline / World TopoJSON | geo | Kartenbasis | ✅/zu vereinfachen |

> **Becken-Filter IBTrACS:** `BASIN ∈ {WP (Westpazifik/Typhone), SP (Südpazifik)}` deckt das
> Pazifik-Zyklon-Geschehen ab. EM-DAT optional für gefahrentyp-getrennte Impacts.

### 2.1 IBTrACS-Validierung (2026-06-20, lokal unter `Data/external/`)
| Becken | Stürme | Track-Punkte | Saisons | Benannt | Wind (kts) | Druck (mb) | Landfall/Küste |
|---|---|---|---|---|---|---|---|
| SP (Südpazifik) | 1.255 | 76.784 | 1897–2026 | 444 | 5–155 | 879–1015 | ~10.350 |
| WP (Westpazifik) | 4.228 | 247.502 | 1884–2026 | 603 | 5–185 | 870–1022 | ~23.968 |

`USA_SSHS` liefert Saffir-Simpson-Kategorien (−5…5; ≥1 = Hurrikan-/Zyklonstärke) → ideale Farbkodierung.
**Caveats:** (a) **Antimeridian** – LON enthält Werte <0 und >180 → Karte/Globus auf 180° zentrieren;
(b) Wind/Druck/Kategorie nur ~50 % belegt (v. a. vor 1980) → Intensitäts-Views **ab 1980** filtern;
(c) Zeile 2 jeder Datei ist Einheiten-Zeile (beim Parsen überspringen).
**Bezug:** NOAA NCEI IBTrACS v04r01, CSV-Access (Becken-Dateien `WP`/`SP`).

## 3. Die drei verlinkten Ansichten (Coordinated Multiple Views)

### View 1 — 🗺️ Track-Explorer (deck.gl, 2.5D)
- **deck.gl** (WebGL), leicht **gekippte Pazifik-Karte** (2.5D), zentriert auf 180° (Antimeridian gelöst).
- Zyklon-**Tracks als Pfade** (`PathLayer`/`TripsLayer`); **Höhe (Extrusion) = Windintensität**,
  **Farbe = Saffir-Simpson-Kategorie** (`USA_SSHS`, D3-Skala).
- **Interaktion:** Zeit-/Saison-Slider & Play (`TripsLayer`-Animation), Hover = Name/Datum/Peak-Wind,
  Klick = Sturm auswählen → filtert andere Views; optionaler SST-Anomalie-Layer (Choropleth/Heatmap).
- **Dimensionen:** Lat, Lon, Zeit, Intensität (Höhe), Kategorie/Sturm-Identität (Farbe) → **≥5**.

### View 2 — 📈 Impact-über-Zeit (Temporal)
- Pro Land: **Zeitreihen** der **Hero-Kennzahl = Betroffene Personen** (`VC_DSR_AFFCT`, 21 Länder,
  2005–2023) + Zyklon-Anzahl/Jahr (aus IBTrACS) + Regen-/SST-Anomalie als überlagerte Linien.
  Wirtschaftsschaden als optionale Sekundärmetrik.
- **Interaktion:** Landauswahl (von Karte oder Dropdown) filtert; Brushing über Zeit.
- **Dimensionen:** Zeit, Land, Impact-Kennzahl, Klima-Anomalie.

### View 3 — 🔵 Multivariate Ansicht (5D-Kern)
- **Bubble-Plot** *oder* **Parallel Coordinates**: SST × Meeresspiegel × Regen × Impact × Land/Zeit.
- **Interaktion:** Brushing/Filter, Jahr-Slider, Land-Highlight (synchron mit anderen Views).
- **Dimensionen:** die geforderten **5 Kanäle** (Position X, Y, Größe, Farbe, Zeit).

**Verlinkung (Kursbezug):** Auswahl/Filter in einer Ansicht propagiert in die anderen
(*linked brushing*, Shneiderman „Overview → Zoom/Filter → Details on demand").

## 4. Abdeckung der 5-Dimensionen-Anforderung
Erfüllt v. a. in View 3 (5 Kanäle) und View 1 (Lat, Lon, Zeit, Intensität, Identität). Das Dashboard
übertrifft die Mindestanforderung, da über Views hinweg >5 Attribute koordiniert erkundbar sind.

## 5. Technische Implikationen / Pipeline-Erweiterung
1. **IBTrACS beschaffen** (CSV, Becken WP+SP), auf Pazifik-Bounding-Box & relevante Jahre filtern.
2. **Track-Vereinfachung** für Web (Punkte ausdünnen, nur benötigte Spalten) → `cyclones.json`.
3. **Storm→Land-Zuordnung** (für Impact-Verknüpfung): räumlicher Join „Sturm passiert < X km an Insel/EEZ"
   → Zyklon-Anzahl je Land/Jahr. *(nicht-trivialer Preprocessing-Schritt – einplanen)*
4. **Offizielle Daten** wie in [02_Datendokumentation.md](02_Datendokumentation.md) §6 zu Tidy-Tabellen.
5. **Gemeinsames Schema** für die Views: `country, year, [storm metrics], [climate anomalies], [impacts]`.

## 6. Offene Detailfragen (nächste Iteration)
- **Hero-Kennzahl** für Impact: Betroffene Personen vs. Wirtschaftsschaden vs. Folge-Proxy?
- **Zeitfenster** des Dashboards (z. B. 1980–2023, gemeinsamer dichter Bereich)?
- **Visuelle Identität** (Farbschema, Ton: sachlich-analytisch vs. erzählerisch)?
- **Layout** des Dashboards (Tabs vs. Scrollytelling vs. nebeneinander)?
- **IBTrACS jetzt beschaffen** (Sample ziehen, Struktur validieren)?

## 7. Risiken (neu durch externe Daten)
| Risiko | Gegenmaßnahme |
|---|---|
| IBTrACS-Größe/Detailtiefe | auf Becken/Jahre/Spalten filtern, Tracks ausdünnen |
| Storm→Land-Join komplex | großzügiger Radius/EEZ-Näherung; oder zunächst rein visueller Geo-Bezug |
| Impact-Daten all-hazard (nicht zyklon-rein) | transparent kennzeichnen; optional EM-DAT für Sturm-Isolation |
| Datumslinie/Längengrad-Wrap (Pazifik bei 180°) | Karte auf Pazifik zentrieren (Antimeridian-Projektion) |
