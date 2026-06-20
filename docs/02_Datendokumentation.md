# Datendokumentation

> Datenstand gesichtet: 2026-06-20. Quelle: **Pacific Data Hub – `.Stat` Explorer (SPC)**, SDMX-CSV-Export.
> Ablage: [../Data/](../Data/) (25 CSV-Datensätze + Coastline-Geodaten), Vorschaubilder: [../Developer API/](../Developer%20API/)

## 1. Gemeinsames Datenformat (SDMX)

Alle CSVs folgen dem **SDMX**-Schema des `.Stat`-Exports. Auffälligkeit: Zwischen jeder
inhaltlichen Spalte steht eine **leere Label-Spalte** (im Export ungefüllt → erscheint als
doppeltes Komma `,,`). Diese Spalten müssen beim Parsen ignoriert oder entfernt werden.

**Relevante Kernspalten (über fast alle Datensätze hinweg):**

| Spalte | Bedeutung | Beispielwerte |
|---|---|---|
| `FREQ` | Frequenz | `A` = jährlich |
| `CLIMATE_CHANGE_INDICATORS` / `INDICATOR` | Indikator-Code | `SST_ANOM`, `SEA_LVL`, `RAIN_ANOM` |
| `GEO_PICT` | Land/Territorium (PICT) | `FJ`, `KI`, `TV`, … (siehe §4) |
| `TIME_PERIOD` | Jahr | `1850` … `2025` |
| `OBS_VALUE` | **Messwert** | numerisch |
| `UNIT_MEASURE` | Einheit | `CELSIUS`, `METER`, `MM`, `PERCENT`, `GWH`, … |
| `OBS_STATUS` | Status | z. B. `SE` (Schätzung) |
| `ERROR_TYPE` / `ERROR_VAL` | Fehler/Unsicherheit | z. B. Standardfehler |
| `OBS_COMMENT` | Kommentar/Methodik | Freitext |

**Datensatz-Familien (Strukturvarianten):**
- `DF_CLIMATE_CHANGE` – einheitliche Klima-Indikatoren (SST, Sea level, Rainfall, GHG, …)
- `DF_SDG_*` – SDG-Indikatoren mit vielen Disaggregations-Spalten (`SEX`, `AGE`, `INCOME`, …; meist `_T` = total)
- `DF_POWER_GEN`, `DF_AGRICULTURAL_PRODUCTION`, `DF_TOURISM_ARRIVALS`, `DF_METEO_MONITOR_NET`, `DF_ENV_TAXES` – fachspezifische Disaggregationen

## 2. Ozean-Kerndatensätze (Fokus dieses Projekts)

| Datensatz | Indikator | Einheit | Zeit | Länder | Zeilen | Eignung |
|---|---|---|---|---|---|---|
| **Mean sea surface temperature anomalies** | `SST_ANOM` | °C | **1850–2025** (jährl.) | 21 | 3.697 | ⭐ längste Zeitreihe, mit Fehlerwert |
| **Sea level anomalies** | `SEA_LVL` | m | 1993–2023 | 21 | 652 | ⭐ Kern-Klimasignal |
| **Rainfall anomalies** | `RAIN_ANOM` | mm | ab 1979 | 22 (inkl. PN) | 1.035 | ⭐ 3. Ozean-/Klimaachse |
| Climate altering land cover index | `ALT_LAND_COVER` | % | ab 1992 | – | 682 | Kontext Landbedeckung |
| Coastline | – (Geodaten) | – | – | – | – | Kartenbasis / Küstenlänge |

**Beobachtungen zu den Ozeandaten:**
- `GEO_PICT` ist über SST, Sea level und Rainfall **nahezu deckungsgleich** → sauberer Join über
  `(GEO_PICT, TIME_PERIOD)`.
- SST reicht bis **1850** zurück, Sea level erst ab **1993** → für eine gemeinsame Darstellung ist das
  **überlappende Zeitfenster ab 1993** (bzw. 1979 bei Rainfall) maßgeblich; ältere SST-Werte eignen
  sich für eine separate „Langzeit“-Ansicht.
- Sea-level-Werte sind grob gerundet (z. B. −0.2 … 0.2 m) → Wertebereich beim Skalieren beachten.
- SST enthält `ERROR_VAL` (Standardfehler) → Unsicherheit kann als zusätzliche Kodierung dienen.

## 3. Coastline-Geodaten

Verzeichnis [../Data/dep_ls_coastlines/](../Data/dep_ls_coastlines/):

| Datei | Format | Größe | Nutzung |
|---|---|---|---|
| `geopackage sqlite3` | GeoPackage (SQLite) | ~1,97 GB | präzise Küstenliniengeometrie (GIS) |
| `vnd.pmtiles` | PMTiles | ~389 MB | webtaugliche Vektor-Tiles für Karten |
| `WMTS Service for this Collection.wmts` | WMTS-Capabilities | klein | gehosteter Karten-Tile-Dienst |

> ⚠️ Für eine D3-Webvisualisierung sind die Rohdateien **zu groß**. Optionen: per `pmtiles`/`tippecanoe`
> stark vereinfachen, in GeoJSON/TopoJSON mit reduzierter Auflösung exportieren, oder Küste nur als
> grobe Kontext-Silhouette nutzen. Für ein punkt-/landbasiertes Diagramm ist die Geometrie ggf. gar
> nicht nötig (Länder als Punkte/Glyphen genügen).

## 4. Ländercodes (`GEO_PICT`)

Pazifische Inselstaaten & Territorien (PICTs), ISO-2-ähnliche Codes:

| Code | Land/Territorium | Code | Land/Territorium |
|---|---|---|---|
| AS | American Samoa | NU | Niue |
| CK | Cook Islands | PF | French Polynesia |
| FJ | Fiji | PG | Papua New Guinea |
| FM | Micronesia (Fed. States) | PN | Pitcairn |
| GU | Guam | PW | Palau |
| KI | Kiribati | SB | Solomon Islands |
| MH | Marshall Islands | TK | Tokelau |
| MP | Northern Mariana Islands | TO | Tonga |
| NC | New Caledonia | TV | Tuvalu |
| NR | Nauru | VU | Vanuatu |
| | | WF | Wallis & Futuna |
| | | WS | Samoa |

## 5. Vollständige Datensatzliste (alle 25 CSV)

| Datei | Indikator/Struktur | Einheit(en) | ~Zeilen |
|---|---|---|---|
| Mean sea surface temperature anomalies | `SST_ANOM` | °C | 3.697 |
| Sea level anomalies | `SEA_LVL` | m | 652 |
| Rainfall anomalies | `RAIN_ANOM` | mm | 1.035 |
| Climate altering land cover index | `ALT_LAND_COVER` | % | 682 |
| Greenhouse gas emissions per capita | `GHG_EMI_CAPITA` | t | 936 |
| Power generation | `POWER_GEN` | GWh | 433 |
| Power generation – disaggregated | `ENERGY_SOURCE`×`GRID_CONN` | GWh | 5.301 |
| Renewable energy share | `EG_FEC_RNEW` | % | 462 |
| Environmental taxes | `ENV_TAXES` | % | 60 |
| Environmental taxes – disaggregated | `ENV_TAXES` | % | 520 |
| Population growth | `NMDI0002` | % | 793 |
| Crop yield | `CROP_YIELD` | kg/ha | 901 |
| Crop yield – disaggregated | nach Produkt | kg/ha | 20.726 |
| Livestock yield | `LVST_YIELD` | kg/Tier | 867 |
| Livestock yield – disaggregated | nach Produkt | kg/ha | 20.726 |
| Tourist arrivals | `TRSM_ARR` | Anzahl | 230 |
| Tourist arrivals – disaggregated | nach Aufenthaltsdauer | Anzahl | 708 |
| Tuberculosis incidence | `SH_TBS_INCD` | /100.000 | 505 |
| Safely managed drinking water | `SH_H2O_SAFE` | % | 431 |
| Red List Index | `ER_RSK_LST` | Index | 705 |
| Directly affected persons (disasters) | `VC_DSR_AFFCT` | Anzahl | 175 |
| Direct disaster economic loss | `VC_DSR_AALT` | USD | 40 |
| Meteorological monitoring network | `METEO_MONITOR_NET` | Anzahl | 1.651 |
| Meteorological monitoring network – disagg. | nach Stationstyp | Anzahl | 1.651 |
| Fisheries management measures | `FISH_MNGT_MULT_BILAT_ARGMT` | Anzahl | 1.564 |

## 6. Aufbereitungs-Hinweise (Pipeline)

1. **Parsen:** SDMX-CSV einlesen, leere Spalten verwerfen, nur Kernspalten behalten.
2. **Filtern:** auf `FREQ = A`, sinnvolle `OBS_STATUS`, Total-Disaggregationen (`_T`).
3. **Typisieren:** `TIME_PERIOD` → Integer/Date, `OBS_VALUE` → Float, fehlende Werte markieren.
4. **Joinen:** Ozean-Datensätze über `(GEO_PICT, TIME_PERIOD)` zu einer Tidy-Tabelle:
   `country, year, sst_anom, sea_level, rain_anom, [unit/error]`.
5. **Export:** schlankes `ocean.json` / `ocean.csv` für die D3-App (statt der 2-GB-Rohdaten).

## 7. Externe Zusatzquellen (Recherche Data, gesichtet 2026-06-20)

Aus dem Ordner [../Recherche Data/](../Recherche%20Data/) wurden zwei Quellen als brauchbar
bewertet und per [../scripts/prepare_pacific_data.py](../scripts/prepare_pacific_data.py) auf den
Pazifik gefiltert und ins gemeinsame View-Schema (`country, year, …`) überführt. Outputs in
[../Data/processed/](../Data/processed/):

| Output-CSV | Quelle | Inhalt | Zeilen | Nutzung |
|---|---|---|---|---|
| `emdat_pacific_storms_events.csv` | **EM-DAT** (`public_emdat_2026-06-15.xlsx`) | 1 Zeile je Sturm-Event (Name, Subtyp, Wind-Magnitude, Tote, Betroffene, Schaden) | 99 | View 1/2 (Kreuzbezug, Karte) |
| `emdat_pacific_storms_by_country_year.csv` | EM-DAT | aggregiert je Land/Jahr: `storm_events, deaths, affected, damage_kusd` | 83 | **View 2 (Impact), View 3 (Impact-Achse)** |
| `wpp_pacific_population.csv` | **UN WPP 2024** (`WPP2024_GEN_F01_*.xlsx`) | Bevölkerung je Land/Jahr 1950–2023 | 1.554 | Normalisierung (pro Kopf) / Bubble-Größe |

**EM-DAT** schließt inhaltlich die in [08_Dashboard-Konzept.md](08_Dashboard-Konzept.md) §7
dokumentierte Lücke (Pacific-Data-Hub-Impacts sind *all-hazard*): gefiltert auf `Disaster Type = Storm`
(98× Tropical cyclone, 1× Storm surge) über 20 Inselstaaten, 2000–2026.
- **Caveat:** `Latitude/Longitude` ist in EM-DAT für die meisten Pazifik-Events **leer**.
- ⚠️ **Lizenz (CC BY-NC-ND 4.0):** EM-DAT darf **NICHT in die eingereichte Wettbewerbs-Dataviz**
  eingebettet werden (Konflikt mit der kommerziellen IP-Klausel §13 des Reglements, siehe
  [09_Projektplan.md](09_Projektplan.md) §6). Das Subset bleibt nur für **interne Analyse/Cross-Check**
  und als **zitierte Kennzahl im akademischen Short Paper**. Für die Dataviz-Impact-Schicht stattdessen
  die offiziellen PDH-Datensätze `VC_DSR_AFFCT`/`VC_DSR_AALT` + IBTrACS-Zyklon-Counts nutzen.

**Verworfen** (per Papierkorb entfernt, da off-scope / nur Verzeichnis-Listings):
`ld_in_risk_data_hub_report_online.pdf` (EU-JRC, Europa-Fokus), `Index of …CDC.html` (DWD, DE/EU),
`Index of …stormevents…html` (NOAA SWDI, USA).

**Nicht ins Datenmodell** (redundant zu IBTrACS, nur Westpazifik): `bst_all.txt` (JMA RSMC Best-Track,
1.954 Stürme 1951–2026) – als Backup belassen, IBTrACS (WP+SP, mit Saffir-Simpson) bleibt primär.
