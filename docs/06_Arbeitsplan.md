# Arbeitsplan & Pipeline

> Vom Rohdatensatz zur eingereichten Dataviz. Praktischer Fahrplan mit Meilensteinen und offenen
> Entscheidungen. Wettbewerbsfenster: **1. Juni – 31. August 2026**.

## 1. Pipeline (Data → Interactive Graphics)

```
SDMX-CSV (Pacific Data Hub)
   │  parse, leere Spalten verwerfen, FREQ=A, _T-Totals
   ▼
Tidy-Tabelle  (country, year, sst_anom, sea_level, rain_anom, …)
   │  join über (GEO_PICT, TIME_PERIOD), Typisierung, Missing-Handling
   ▼
ocean.json / ocean.csv  (schlank, web-tauglich)
   │  d3.json / d3.csv laden
   ▼
D3-App: Skalen → SVG-Elemente → Interaktion → Animation
   │
   ▼
Öffentliche Veröffentlichung + Screen Recording + Short Paper
```

## 2. Meilensteine

| # | Meilenstein | Ergebnis | Status |
|---|---|---|---|
| M0 | Rahmen & Daten gesichtet | `docs/` angelegt | ✅ |
| M1 | **Konzept final** | 5D-Technik + Mapping entschieden | ☐ ← *nächster Schritt* |
| M2 | Datenaufbereitung | `ocean.json` aus SDMX erzeugt, validiert | ☐ |
| M3 | D3-Grundgerüst | HTML/JS/CSS, Daten laden, statische Achsen/Skalen | ☐ |
| M4 | 5D-Kodierung | alle 5 Kanäle umgesetzt (X, Y, Größe, Farbe, Zeit) | ☐ |
| M5 | Interaktion | Slider/Play, Tooltip, Highlight/Filter | ☐ |
| M6 | Feinschliff | Farben (ColorBrewer), Annotationen, Legende, Responsivität | ☐ |
| M7 | Evaluation | informelles Feedback, Heuristik-Check | ☐ |
| M8 | Abgabe | Recording, README, Short Paper, Veröffentlichung, Einreichung | ☐ |

## 3. Entscheidungen

**Getroffen (2026-06-20):**
- ✅ **Thema:** Tropische Zyklone im Pazifik & ihre Auswirkungen (Weg C).
- ✅ **Datenquellen:** externe Open-Data erlaubt → IBTrACS-Tracks + offizielle Pacific-Data-Hub-Daten.
- ✅ **Format:** frei erkundbares **Multi-View-Dashboard** (Karte + Zeit + multivariat, verlinkt).
- → Spezifikation: [08_Dashboard-Konzept.md](08_Dashboard-Konzept.md).

**Noch offen (nächste Iteration):**
1. **Hero-Impact-Kennzahl:** Betroffene Personen vs. Wirtschaftsschaden vs. Folge-Proxy.
2. **Zeitfenster** des Dashboards (z. B. 1980–2023).
3. **Geodaten:** Coastline (2 GB) vereinfachen vs. World-TopoJSON als Kartenbasis.
4. **Visuelle Identität & Layout** (Tabs vs. Scrollytelling vs. nebeneinander).
5. **Daten-Wrangling-Sprache:** Python (pandas) vs. Node/`d3-dsv`.
6. **Hosting:** GitHub Pages vs. Observable vs. Netlify.

## 4. Risiken & Gegenmaßnahmen

| Risiko | Gegenmaßnahme |
|---|---|
| Coastline-Geodaten zu groß für Web | vereinfachen (tippecanoe/pmtiles) oder weglassen |
| Overplotting bei 21 Ländern | Filter, Highlight, Trails, Regionen-Gruppierung |
| Unterschiedliche Zeitabdeckung der Datensätze | gemeinsames Zeitfenster + Missing-Handling |
| Lesbarkeit der 5D-Kodierung | Position für wichtigste Attribute, klare Legende, Tooltip |
| Scope zu groß | erst eine starke Hauptansicht, Zusatzansicht nur bei Zeit |

## 5. Nächster konkreter Schritt

➡️ **M1 entscheiden:** Technik + Dimensions-Mapping bestätigen, dann **M2** (Pipeline-Skript
`data-prep/build_ocean_dataset.*`) bauen, das aus den drei Ozean-CSVs ein `ocean.json` erzeugt.
