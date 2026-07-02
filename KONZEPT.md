# Konzept & Projektplan — Pacific Ocean Data Visualization

> **Zentrales Arbeitsdokument.** Hier werden alle Informationen, Entscheidungen, Konzepte und Pläne gebündelt und fortlaufend aktualisiert. Kurs: *Visual Analytics* (HSD, 4. Semester). Wettbewerb: **Pacific Dataviz Challenge 2026** (<https://pacificdatavizchallenge.org>).

**Stand:** 2026-07-01 · **Status:** Neuausrichtung nach Datenverlust (siehe §8) — kompletter Neuaufbau der Visualisierung auf Basis der vorhandenen Daten.

---

## 1. Projektrahmen

| Aspekt | Vorgabe |
|---|---|
| **Aufgabe** | Visualisierung mit **mehreren Dimensionen** in **D3** |
| **Domäne** | Ozean-/Klimadaten des pazifischen Raums (Pacific Dataviz Challenge 2026) |
| **Pflicht-Tool** | D3.js |
| **Abgaben** | (1) Code-Pipeline · (2) Screen-Recording · (3) Dokumentation · (4) 2–3 Seiten Paperwork (Begründung/Reflexion) |

### Bewertungskriterien (maßgeblich für jede Design-Entscheidung)
1. **Kritische Auseinandersetzung mit dem Domänenproblem**
2. **Klarheit und Angemessenheit der Methoden**
3. **Qualität und Eignung der Lösung**
4. **Logische Kohärenz**
5. **Einbezug der Kursinhalte** (Visualisierungstechniken, Encodings, Interaktion, Farbtheorie)
6. **Einhaltung formaler Vorgaben**

> **Leitgedanke:** Nicht „schöne Grafik", sondern eine *argumentierende* Visualisierung, die ein echtes Domänenproblem des Pazifiks kritisch beleuchtet und dabei mehrere Datendimensionen sinnvoll verknüpft.

---

## 2. Datenbestand (verifizierte Inventur)

Alle Daten liegen in `Data/`. Profiliert mit pandas (Zeilen, Spalten, Zeit-/Länderabdeckung, Wertebereiche). Die meisten CSVs sind **SPC `.Stat`-Exporte (SDMX)** mit gemeinsamem Schema `GEO_PICT × TIME_PERIOD × OBS_VALUE (+ UNIT_MEASURE)` → **join-fähig über Land + Jahr**.

**Geografie:** 22 Pacific Island Countries & Territories (PICTs) — siehe Ländercode-Legende in §9.

### 2.1 Klima & Ozean
| Datensatz | Code | Länder | Zeitraum | Einheit | Wertebereich |
|---|---|---|---|---|---|
| Mean sea surface temperature anomalies | `SST_ANOM` | 21 | **1850–2025** | °C | −2.0 … 1.1 |
| Sea level anomalies | `SEA_LVL` | 21 | 1993–2023 | m | −0.2 … 0.2 (Ø +0.045) |
| Rainfall anomalies | `RAIN_ANOM` | 22 | 1979–2025 | mm | −54 … 67 |
| Climate altering land cover index | `ALT_LAND_COVER` | 22 | 1992–2022 | % | 51 … 668 |
| Greenhouse gas emissions per capita | `GHG_EMI_CAPITA` | 17 | 1970–2024 | t | 0 … 210 (Nauru-Ausreißer) |

### 2.2 Energie
| Datensatz | Code | Länder | Zeitraum | Detail |
|---|---|---|---|---|
| Power generation | `POWER_GEN` | 18 | 2000–2023 | GWh |
| Power generation – disaggregated | — | 18 | 2000–2023 | nach **Energiequelle** (Solar, Wind, Hydro, Geo, Bio, Öl, Gas, Kohle) × Netzanbindung |
| Renewable energy share | `EG_FEC_RNEW` | 20 | 2000–2023 | % (0 … 66) |
| Environmental taxes (+disagg.) | `ENV_TAXES` | 5–6 | 1995–2021 | % BIP, nach Steuerart |

### 2.3 Landwirtschaft & Ernährung
| Datensatz | Code | Länder | Zeitraum | Detail |
|---|---|---|---|---|
| Crop yield (+disaggregated) | `CROP_YIELD` | 15 | 1961–2024 | kg/ha, nach Feldfrucht |
| Livestock yield (+disaggregated) | `LVST_YIELD` | 14 | 1961–2024 | kg/Tier |

### 2.4 Biodiversität & Umwelt
| Datensatz | Code | Länder | Zeitraum | Detail |
|---|---|---|---|---|
| Red List Index | `ER_RSK_LST` | 22 | 1993–2024 | Index 0.36 … 0.95 (1.0 = kein Artensterberisiko) |
| Fisheries management measures | `FISH_MNGT_...` | 22 | 1903–2026 | Anzahl 1 … 93 |
| Meteorological monitoring network (+disagg.) | — | 18 | 1889–2026 | Stationsanzahl 0 … 8 |

### 2.5 Mensch, Entwicklung & Gesundheit
| Datensatz | Code | Länder | Zeitraum | Detail |
|---|---|---|---|---|
| Population growth | `NMDI0002` | 22 | 1990–2025 | % p.a. (−30 … 65) |
| Tuberculosis incidence | `SH_TBS_INCD` | 21 | 2000–2023 | pro 100.000 (0 … 1180) |
| Safely managed drinking water | `SH_H2O_SAFE` | 19 | 2000–2022 | % (32 … 100) |
| Tourist arrivals (+disaggregated) | `TRSM_ARR` | 13–18 | 1995–2024 | Anzahl (35 … 1,67 Mio.), nach Besuchertyp |

### 2.6 Katastrophen
| Datensatz | Code | Länder | Zeitraum | Detail |
|---|---|---|---|---|
| Direct disaster economic loss | `VC_DSR_AALT` | 12 | 2007–2020 | USD (bis 374 Mio.) |
| Number of directly affected persons | `VC_DSR_AFFCT` | 21 | 2005–2023 | Anzahl (bis 634k) |

### 2.7 Aufbereitete Daten (`Data/processed/`, sofort nutzbar)
- **`emdat_pacific_storms_events.csv`** — 99 Sturmereignisse 2001–2026 (Tropical cyclone / Storm surge) mit lat/lon, Toten, Betroffenen, Schaden (kUSD + inflationsbereinigt).
- **`emdat_pacific_storms_by_country_year.csv`** — 83 Land-Jahr-Zeilen: Sturmzahl, Tote, Betroffene, Schaden.
- **`wpp_pacific_population.csv`** — 21 Länder, 1950–2023, jährliche Bevölkerung (UN WPP).

### 2.8 Große Rohquellen
- **EM-DAT** (`public_emdat_2026-06-15.xlsx`) — 16.853 Katastrophen weltweit, 2000–2026, 47 Spalten (Disaster Type/Subtype, lat/lon, Tote, Betroffene, Schaden, Region *Oceania*). Pazifik = Filter Region = Oceania.
- **IBTrACS South Pacific** (`ibtracs.SP.list.v04r01.csv`) — **1.255 Stürme, 1897–2026**, 445 benannt, 76.784 6-Stunden-Trackpunkte; Felder: LAT/LON, Wind (bis 150 kt), Druck, **Saffir-Simpson-Kategorie −5…5**, Windradien pro Quadrant, Zugbahn­geschwindigkeit/-richtung, Küstendistanz, Landfall.
- **IBTrACS West Pacific** (`ibtracs.WP.list.v04r01.csv`) — **4.228 Stürme, 1884–2026**, 247.502 Trackpunkte; deckt Guam/FSM/Palau/Nördl. Marianen ab.

### 2.9 Geodaten
- **`dep_ls_coastlines`** (Digital Earth Pacific) — Küstenlinien als GeoPackage (1,9 GB), PMTiles (389 MB), WMTS. Sehr groß; als Basiskarte oder für Küstenveränderung nutzbar (Performance beachten).

---

## 3. Datenqualität & Verknüpfbarkeit

- **Gemeinsamer Join-Key:** `GEO_PICT` (ISO-2 der PICTs) + `TIME_PERIOD` (Jahr). Ermöglicht das Zusammenführen beliebiger SDMX-Indikatoren zu einem multidimensionalen Land-Jahr-Panel.
- **Bevölkerung als Normalisierer:** `wpp_pacific_population` erlaubt Pro-Kopf-/Pro-Fläche-Betrachtungen und Bubble-Größen.
- **Räumliche Daten:** IBTrACS (Punkt-/Liniengeometrie) + EM-DAT (Punkte mit lat/lon) + Küstenlinien → echte Kartografie/Globus möglich.
- **Lücken beachten:** Environmental taxes nur 5–6 Länder; Disaster-Loss nur 12 Länder/2007–2020; Länderzahl variiert je Indikator (13–22). Bei länderübergreifenden Vergleichen ehrlich mit fehlenden Werten umgehen (Kursinhalt: Umgang mit Missing Data).
- **Einheiten-Heterogenität:** °C, m, mm, %, GWh, USD, Counts — pro Dimension eigene Skala/Legende nötig.

---

## 4. Visualisierungsthemen-Katalog

> Erarbeitet über eine Mehr-Perspektiven-Analyse: 5 Fach-Lenses (Klima/Ozean, Mensch/SDG, Naturgefahren, Viz-Design, Challenge-Jury) generierten **33 Themen**; jedes wurde **adversarial gegen die echten Daten geprüft** (unterstützt die Datenlage jede behauptete Dimension wirklich?). **16 bestanden**, zusammengefasst zu 11 distinkten Themen in 7 Clustern. Score 0–100 = Gesamteignung für dieses Projekt.
>
> 🖼️ **Visuelle Vorschauen (aus echten Daten gerendert) für jedes Thema:** siehe [docs/Visualisierungsmoeglichkeiten.md](docs/Visualisierungsmoeglichkeiten.md) — je Thema Datengrundlage, Encoding und ein Preview-Bild (`docs/mockups/`).

### 4.1 Cluster: Zyklone & Sturmgefahr (räumlich/zeitlich)

**① Storm Highways of the Pacific — Zyklonbahnen auf animiertem Globus** · Score **78** · Aufwand: hoch
- *Kernfrage:* Welche Inseln liegen immer wieder in der Zugbahn der Stürme?
- *Daten:* IBTrACS SP + WP (1.255 + 4.228 Stürme), PICT-Zentroide.
- *Dimensionen:* Bahn-Geometrie (LAT/LON → Pfad auf Globus) · Kategorie USA_SSHS → Farbe · Saison/Jahr → Zeit-Animation + Scrubber · Zuggeschwindigkeit → Kometen-Schweif.
- *Form:* Rotierbarer `d3.geoOrthographic`-Globus, intensitätsgefärbte Tracks, wandernde Sturmköpfe, Saison-Timeline, Jahres-Häufigkeits-Streifen.
- *Warum:* Stellt den warmen Pazifik buchstäblich in den Mittelpunkt; die Kern-Datenfelder sind **zu 100 % gefüllt**. Visuell stark.
- *Leitplanken:* Windradien-„Fußabdruck" weglassen (nur ~8 % gefüllt); Längengrad-Konventionen vor `geoClipAntimeridian` normalisieren; 324k Punkte ausdünnen; **keine** falsche „Jahrhundert-Trend"-Aussage (Beobachtungs-Bias vor 1970).

**② From Track to Toll — Sagt Sturmstärke den menschlichen Schaden voraus?** · Score **74** · Aufwand: mittel
- *Kernfrage:* Bestimmt die gemessene Sturmintensität wirklich Tote/Betroffene/Schaden — oder entscheidet Verwundbarkeit?
- *Daten:* IBTrACS (Spitzenintensität via Namen+Saison-Join) × `emdat_pacific_storms_events` × Bevölkerung.
- *Dimensionen:* Intensität → x · Betroffene → y · Schaden → Blasengröße · Tote → Farbe · Land → verknüpfte Karte.
- *Form:* Coordinated Multiple Views: Scatter ↔ IBTrACS-Trackkarte ↔ Länder-Balken, Ausreißer annotiert (Winston, Yasa, Harold, Heta).
- *Warum:* Starker kritischer Aufhänger („schwacher Sturm, riesiger Schaden = Verwundbarkeit"); bester echter Cross-Source-Join (~84/99 Ereignisse). Passt ideal als **Detail-Ansicht zu Thema ①**.

**③ A Century of Storms — Saisonalität der Zyklone (Bias-ehrlich)** · Score 55 · Aufwand: mittel
- Ridgeline/Horizon-Small-Multiples pro Dekade × Becken; macht den **Satelliten-Ära-Beobachtungsbias zum Thema** statt zur Fußnote. Nur stark, wenn die Untererfassung vor 1970 offen adressiert wird.

### 4.2 Cluster: Klimagerechtigkeit (Emissionen vs. Schaden)

**④ Emitting Almost Nothing, Losing Almost Everything — Pacific Climate-Justice Ledger** · Score **66** · Aufwand: mittel
- *Kernfrage:* Wie groß ist die Kluft zwischen den geringen Emissionen der Pazifikstaaten und dem Klimaschaden, den sie tragen?
- *Daten:* GHG pro Kopf × Katastrophen-Betroffene × Wirtschaftsschaden (Blasen) × Bevölkerung.
- *Form:* Log-x-Quadranten-Scatter mit markierter „wenig-emit / viel-leidend"-Zone, Jahr-Brush.
- *Warum:* Das moralische Rückgrat pazifischer Klima-Advocacy → höchste reine Challenge-Passung.
- ⚠️ *Pflicht-Korrektur:* Der Emissions-Ausreißer ist **Palau (209,5 t), NICHT Nauru (0,1 t)** — vier Entwürfe hatten das falsch. n=12 Länder ehrlich benennen; ISO3↔GEO_PICT-Crosswalk bauen.

### 4.3 Cluster: Ozean-Klimasignal (SST / Regen / Meeresspiegel)

**⑤ The Meridian Ribbon — breitengrad-sortierte Anomalie-Heatmap** · Score 58 · Aufwand: mittel
- Nach Breitengrad sortierte Anomalie-Heatmaps (SST, Regen, Meeresspiegel) auf gemeinsamer Zeitachse; ehrlicher Kontrast **kohärentes SST-Signal (r≈0,60) vs. inkohärenter Regen (r≈0,10)**. Brush → synchrone Detail-Linie, ENSO-Jahre annotiert.

**⑥ The 175-Year Warming Backdrop — SST-Rückgrat (als Komponente)** · Score 45 · Aufwand: niedrig
- Längste Reihe (1850–2025) als „Warming-Stripes"/Ridgeline. Als **Erzähl-Intro/Hintergrundschicht**, nicht als eigenständige Abgabe (0,1 °C-Quantisierung, Einzelquelle → allein Klischee).

**⑦ Islands Between Two Anomalies — bivariate Regen × SST-Karte** · Score 52 · Aufwand: mittel
- Bivariate Choropleth/Dorling-Kartogramm (Inseln sind winzig) mit 3×3-Legende und Jahr-Scrubber. SST ersetzt den quantisierten Meeresspiegel als zweite kontinuierliche Achse.

### 4.4 Cluster: Energiewende / Mitigation

**⑧ The Uneven Energy Transition — Wer entkommt dem Diesel?** · Score **63** · Aufwand: mittel
- *Daten:* Power generation (disaggregiert, 18 PICTs, volle Abdeckung 2000–2023).
- *Form:* Sortierbares Slopegraph (Erneuerbaren-Trajektorie) + normierte Stacked-Area-Small-Multiples; Hover für On/Off-Grid.
- *Warum:* Solide datengestützt. **Schwächster Ozean-Bezug** der Auswahl → als Mitigations-Gegenkapitel positionieren. RENTOT/NRENTOT (Subtotale) beim Stacking ausschließen.

### 4.5 Cluster: Biodiversität & Naturschutz

**⑨ Silent Extinctions — Artensterben trotz steigender Schutzbemühungen** · Score **70** · Aufwand: mittel
- *Kernfrage:* Warum sinkt der Red List Index weiter, obwohl Fischerei-Managementabkommen zunehmen?
- *Daten:* Red List Index × Fischerei-Management × Klima-Landbedeckungs-Index.
- *Form:* Connected-Scatter Aufwand (x) vs. Ergebnis (RLI, y) mit Länder-Trails; Landbedeckung als Blasenfarbe.
- *Warum:* **Die zentrale These hält der Prüfung stand** (RLI sinkt in 20/22 PICTs, Abkommen steigen überall); exzellente Joins (659 Land-Jahre). Kausalität als Nebeneinanderstellung halten, Fischerei-Zahl als kumulativ behandeln.

### 4.6 Cluster: Multi-SDG-Verwundbarkeitsportrait

**⑩ Pacific Lives Ledger — Multi-Indikator-Portrait je Insel** · Score 60 · Aufwand: mittel
- Small-Multiple-Radar/Stern-Glyphen je Insel über 6 SDG-Achsen (Wasser, TB, Erneuerbare, RLI, Meeresspiegel, Betroffene), sortierbar nach (offen deklariertem) Verwundbarkeits-Score. 19/22 PICTs mit vollständigem Portrait; 2–3 Snapshot-Jahre statt Animation.

### 4.7 Cluster: Bevölkerungsexposition & Demografie

**⑪ A Century of People Meets Storms (rescoped)** · Score 50 · Aufwand: mittel
- Horizon-Charts der Inselbevölkerungen + Sturm-Beeswarm (Größe = Betroffene) über den ehrlichen Überlappungszeitraum **2001–2023**. Degenerierte Subtyp-Dimension weglassen; echte Ozean-Anomalie als 5. Kanal ergänzen.

---

### 4.8 ⚠️ Kritische Daten-Fallstricke (gilt für JEDES Thema — wichtig für Kriterium „kritische Auseinandersetzung")

1. **ISO3 ↔ GEO_PICT-Crosswalk ist Pflicht.** SPC-Dateien nutzen 2-Buchstaben-Codes (FJ/TV), Bevölkerung/EM-DAT/islands nutzen ISO3 (FJI/TUV). ~22-Zeilen-Mapping nötig; Subregion (Melanesien/Mikronesien/Polynesien) ist ebenfalls externer Lookup.
2. **GHG-Ausreißer = Palau (209,5 t), nicht Nauru (0,1 t).** Verifiziert. Jede „alle emittieren fast nichts"-These muss um Palau herum neu argumentiert werden.
3. **Meeresspiegel-Anomalie hat nur 5 diskrete Werte** (−0,2 … 0,2 m, Stufenfunktion) → **kann keine kontinuierliche Positions-/Farbachse tragen**. Für „Ozeanerwärmung" stattdessen SST (27 Werte, 1850–2025) verwenden.
4. **IBTrACS: Geometrie top, Intensität lückenhaft.** LAT/LON/SEASON/STORM_SPEED ~100 %; WMO_WIND nur ~12–22 % (0 % vor 1970); USA_SSHS zu 56–76 % unklassifiziert (−5/−1); Windradien nur ~8 %. Intensitätstrends auf Satelliten-Ära beschränken; **nie** rohen Jahrhundert-Frequenztrend behaupten.
5. **IBTrACS hat kein Länderfeld** — Sturm↔Insel-Zuordnung via Zentroid-Nähe (islands.json) oder Namens+Saison-Join zu EM-DAT (~84 % Treffer). Küstenlinien-GeoPackage (1,9 GB) für einfache Joins zu schwer.
6. **EM-DAT-Koordinaten praktisch fehlend** (2 von 99 Ereignissen), Schaden nur ~32 %, Subtyp degeneriert (98:1). Karten aus IBTrACS zeichnen, EM-DAT nur als Land-Jahr-Aggregat, Subtyp nie kodieren.
7. **Wirtschaftsschaden ist sehr dünn** (12 PICTs, 39 Zeilen). Stattdessen „Betroffene Personen" (21 PICTs, 2005–2023) als Schadensmetrik.
8. **Ernteerträge sind Raten (kg/ha, kg/Tier)**, keine Produktion → durch Bevölkerung teilen ergibt **keine** gültige Pro-Kopf-Ernährungssicherheit. Solche Framings sind nicht datengestützt.
9. **Mehrere Reihen sind faktisch flach** (sicheres Trinkwasser, RLI-Interpolation, SST-Quantisierung). Encodings um das gestalten, was wirklich variiert; Achsen auf echten Wertebereich zoomen.

### 4.9 Verworfene Ideen (bewusst geprüft & aussortiert — dokumentiert für die Paperwork)

| Verworfen | Grund (Kurz) |
|---|---|
| Vulnerability Paradox (Scatter) | Nauru-210t-Fehler; y-Achse mischt m+Personen+USD ohne Gewichtung; Gapminder-Klischee |
| Living Reefs, Rising Risk | RLI↔SST r=−0,16 (kein Gleichlauf); RLI ist kein Korallen-Maß |
| Rising Tide of Thirst (Wasser) | Zielgröße flach, steigt sogar (Kiribati +15 P.); keine Salinitäts-Variable |
| Warm Seas, Rising Fevers (TB) | 4-fach-Join zerfällt zu 174 Zellen; SST intra-Jahr uniform; datenarm |
| Damage vs Wealth | Kein BIP-Feld vorhanden; Verlustschicht zu dünn; Tuvalu ohne Verlustdaten |
| Landfall Roulette | Windradien nur ~8 %; keine Inselpolygone für Choropleth |
| The Widening Wake (Polwärts-Drift) | Daten zeigen leicht *äquatorwärts*; Exposition nicht berechenbar |
| The Slow Drowning | Hängt an quantisiertem Meeresspiegel als y-Achse |
| After the Warm Water (Kaskade) | Lead-Lag nicht schätzbar; Überlappung nur 10 Länder |
| From Reef to Table | Korrelationen ≈ 0; kumulative Fischereizahl; 78 inkompatible Feldfrüchte |
| Feeding the Islands | Pro-Kopf-Ernährungsmetrik ungültig (Ertrag ≠ Produktion) |
| Force-Directed Constellation | Bei ~10–19 Knoten nur verrauschter 1D-Sort |
| Warming Ledger (Connected-Scatter) | Palau/Nauru-Fehler; 1850-Tiefe kollabiert auf 2000–2023; Spaghetti |
| Disaster Ledger | „Jahrhundert" real nur 2001–2026; Subtyp tot; besser in ② integrieren |
| Energy Sankey-Streams | Dublette zu ⑧; „Sankey" ist Fehlbenennung (keine Fluss-Topologie) |

---

## 5. Empfehlung / Shortlist

Vier Themen mit dem stärksten Gesamtprofil (Datenlage + Challenge-Passung + Machbarkeit):

1. **① Storm Highways (Globus)** — höchstes Ceiling: einziges Thema mit 100 % gefüllten Kern-Daten, macht den Ozean zur Bühne, echt 4D, visuell beeindruckend. Räumlich erzählen („welche Inseln liegen im Pfad"), nicht als Volumen-Trend.
2. **② From Track to Toll** — stärkster kritischer/analytischer Aufhänger und bester echter Cross-Source-Join. Ideal als **Impact-Detailansicht zu ①** → zusammen ein kohärentes Doppel.
3. **⑨ Silent Extinctions** — die seltene These, die den adversarialen Test *besteht*, mit exzellenten Joins und solider D3-Machbarkeit. Stark bei „kritischer Auseinandersetzung".
4. **④ Climate-Justice Ledger** — beste reine Challenge-Passung (moralisches Rückgrat), baubar — **bedingt** durch die Palau/Nauru-Korrektur und ehrliche n-Angabe.

> **Empfohlene Richtung:** ① + ② als kombinierte „Sturm→Wirkung"-Erzählung auf dem Globus bilden das visuell stärkste *und* analytisch verteidigbarste Paket und nutzen die einzigartige räumliche Datentiefe (IBTrACS) optimal aus. Entscheidung offen — siehe §7.

---

## 6. Zielbild & Funktionsumfang (geplante Visualisierung)

✅ **Gewähltes Thema: ② „From Track to Toll"** — *Warum der stärkste Sturm nicht den größten Schaden anrichtet* (Verwundbarkeit ≠ Sturmstärke).

Detailliertes Feinkonzept mit allen 16 getroffenen Entscheidungen, Zielbild, Datenpipeline-Plan und Meilensteinen: **[docs/Feinkonzept_Thema2_Track-to-Toll.md](docs/Feinkonzept_Thema2_Track-to-Toll.md)**.

**Kurzfassung:** Geführtes Scrollytelling (Englisch) mit fixem, verknüpftem Verbund-Panel aus **flacher Pazifikkarte (IBTrACS-Zugbahnen)** und **Scatter (Intensität × Betroffene, log)** samt **Erwartungslinie**; das **Residuum = Verwundbarkeit** wird farblich hervorgehoben. Umschaltbar absolut/pro Kopf, Klick → Sturm-Detailpanel, freie Erkundung am Ende. Stack: D3 v7 + Vite, Python-Pipeline, statisch/offline, farbenblind-sicher.

---

## 7. Nächste Schritte & offene Entscheidungen

> 🗂️ **Verbindlicher Umsetzungsplan:** [docs/plan/README.md](docs/plan/README.md) — 9 priorisierte Arbeitspakete (00–08) auf Basis der Multi-Agenten-Prüfung vom 2026-07-02 (Datenverifikation, Join-Test, Statistik-Nachrechnung, Viz-/Technik-/Challenge-Gutachten, Red Team).

- [x] Thema aus Katalog (§4/§5) auswählen. → **② From Track to Toll**
- [x] Zielbild + Kern-Interaktionen definieren. → [Feinkonzept §4](docs/Feinkonzept_Thema2_Track-to-Toll.md)
- [x] Tech-Stack bestätigen. → D3 v7 + Vite, Python-Pipeline, offline
- [x] Konzept objektiv geprüft (2026-07-02) → Ergebnis: machbar, aber 6 kritische Befunde; siehe [docs/plan/README.md](docs/plan/README.md)
- [ ] **Paket 00 (KRITISCH, ~1 h):** Repo sichern — `.gitignore` wiederherstellen, Neuaufbau-Commit + Push, Arbeitskopie raus aus OneDrive (§8).
- [ ] **Paket 01 (KRITISCH, vor M1):** Datenquellen-Entscheidung — EM-DAT nur intern (Kurs); Challenge-Variante mit offenem PDH-Datensatz (Regelwerk §9/§13).
- [ ] **Paket 02 (vor M1):** Feinkonzept korrigieren — Hook (Mawar real 100.000 Betroffene, neuer Hook: Heta 2004), Zeitfenster, Pro-Kopf als Default (R²=0,145 vs. 0,010), USA_WIND, Analyseeinheit = Sturm-Land-Paar.
- [ ] **Pakete 03–08:** Pipeline → CMV → Scrollytelling → Feinschliff → Abgabe. **Phase 1: Kursabgabe 24.07.2026** (harte Deadline, Zeitplan in [docs/plan/README.md](docs/plan/README.md)) · Phase 2: Challenge-Einreichung danach bis 31.08.2026, 13:00 MESZ.

---

## 8. Ereignis-Log

- **2026-07-01 — Datenverlust:** `app/`, `docs/`, `scripts/`, `README.md`, `.gitignore` sind lokal vom Datenträger verschwunden (vermutlich OneDrive-Sync-Konflikt; neuer leerer Ordner `Resources/` tauchte auf). Git-Historie (Commit `368c70e`) ist intakt; uncommittete Arbeit lag teils als „dangling blobs" in Git. **Entscheidung des Nutzers: keine Wiederherstellung, kompletter Neuaufbau** auf Basis der noch vorhandenen `Data/`. Dieses Dokument ist der frische Startpunkt.

---

## 9. Anhang — Ländercode-Legende (GEO_PICT)

`FJ` Fiji · `PG` Papua-Neuguinea · `SB` Salomonen · `VU` Vanuatu · `NC` Neukaledonien · `KI` Kiribati · `TV` Tuvalu · `NR` Nauru · `MH` Marshallinseln · `FM` Mikronesien (FSM) · `PW` Palau · `GU` Guam · `MP` Nördl. Marianen · `WS` Samoa · `AS` Amerikanisch-Samoa · `TO` Tonga · `NU` Niue · `CK` Cookinseln · `PF` Französisch-Polynesien · `WF` Wallis & Futuna · `TK` Tokelau · `PN` Pitcairn

---

## 10. Änderungshistorie

| Datum | Änderung |
|---|---|
| 2026-07-01 | Dokument neu angelegt; Projektrahmen, verifizierte Dateninventur (30 Datensätze) und Datenqualitäts-Analyse erfasst. |
| 2026-07-01 | Themenkatalog ergänzt (§4): 33 Themen generiert (5 Fach-Lenses), adversarial gegen Daten geprüft, 16 bestanden → 11 Themen in 7 Clustern + kritische Daten-Fallstricke (§4.8) + verworfene Ideen (§4.9). Shortlist (§5): ①Storm Highways, ②From Track to Toll, ⑨Silent Extinctions, ④Climate-Justice Ledger. |
| 2026-07-01 | Visuelle Vorschauen für alle 11 Themen aus echten Daten gerendert → `docs/mockups/*.png` + erläuternde Galerie `docs/Visualisierungsmoeglichkeiten.md`. |
| 2026-07-01 | **Thema ② „From Track to Toll" gewählt.** Feinkonzept in 4 Rückfrage-Runden (16 Entscheidungen) vollständig definiert → `docs/Feinkonzept_Thema2_Track-to-Toll.md`. Zielbild, Datenpipeline-Plan, Meilensteine stehen. §6/§7 aktualisiert. |
| 2026-07-02 | **Objektive Multi-Agenten-Prüfung** (Daten mit pandas verifiziert, Join real durchgeführt, Regelwerk-PDF geprüft, Red Team). Kernbefunde: Join 94/99 (besser als geplant), Tracks nur ~59 KB, MVP ≈ 48–84 h machbar — aber EM-DAT-Blocker für Challenge (§9/§13), Hook-Faktenfehler (Mawar 100.000 statt ~700), Erwartungslinie absolut nicht signifikant (pro Kopf: R²=0,145), Analyseeinheit = Sturm-Land-Paar, Repo-/OneDrive-Risiko akut. → Priorisierter Umsetzungsplan `docs/plan/` (Pakete 00–08) angelegt, §7 neu strukturiert. |
