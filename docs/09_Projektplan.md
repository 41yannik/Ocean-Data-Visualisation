# Projektplan & Compliance – „Pacific Cyclones & Their Impacts"

> Konsolidierter Gesamtplan: **Idee → Visualisierung → Dimensionen → Umsetzung → Ergebnis**,
> plus **Abgleich gegen das offizielle Reglement** (Pacific Dataviz Challenge 2026,
> `Recherche Data/Pacific-Dataviz-Challenge-2026-rules-reglement.pdf`).
> Baut auf [03_Visualisierungskonzept.md](03_Visualisierungskonzept.md), [07_Datenexploration-und-Machbarkeit.md](07_Datenexploration-und-Machbarkeit.md),
> [08_Dashboard-Konzept.md](08_Dashboard-Konzept.md) und der Datenpipeline ([02_Datendokumentation.md](02_Datendokumentation.md) §7) auf.

---

## 1. Die Idee

**Domänenproblem.** Pazifische Inselstaaten tragen minimal zu globalen Emissionen bei, gehören aber
zu den am stärksten von Klimaextremen betroffenen Regionen. Tropische Zyklone treffen sie im Kontext
**steigender Meeresoberflächentemperatur, Meeresspiegelanstieg und veränderter Niederschläge**.

**Leitfrage.** *Wo, wann und wie stark ziehen tropische Zyklone durch den Pazifik – und wie hängen
Sturm-/Klimasignale mit messbaren Auswirkungen (Betroffene, Schäden) auf den Inseln zusammen?*

**Beitrag.** Ein frei erkundbares **Multi-View-Dashboard** verbindet erstmals **externe Sturm-Tracks
(IBTrACS)** mit **offiziellen Pacific-Data-Hub-Klimadaten** und **zyklon-spezifischen Impacts
(EM-DAT)** – und löst damit die in [07](07_Datenexploration-und-Machbarkeit.md) dokumentierte Lücke
(offizielle Daten enthalten keine Tracks und keine gefahrentyp-getrennten Impacts).

**Scope-Entscheidung:** „Zyklone" (Süd- + Westpazifik), nicht strikt „Typhone" – das verbindet das
Sturm-Thema mit den impact-reichen Südpazifik-Inseln (Fiji, Vanuatu, Tonga, Samoa).

---

## 2. Die Visualisierung

**Frei erkundbares Dashboard mit drei verlinkten Ansichten** (Coordinated Multiple Views – Auswahl in
einer Ansicht filtert die anderen; Shneiderman: *Overview → Zoom/Filter → Details-on-demand*).

| View | Technik | Zeigt | Hauptinteraktion |
|---|---|---|---|
| **1 · Track-Explorer** 🗺️ | **deck.gl** (WebGL, 2.5D) | Zyklon-Tracks auf Pazifik-Karte (180°-zentriert), Höhe = Windintensität, Farbe = Saffir-Simpson-Kategorie | Zeit-/Saison-Slider & Play, Hover, Klick = Sturm wählen |
| **2 · Impact-über-Zeit** 📈 | **D3.js** (SVG) | Zeitreihen je Land: Betroffene/Schäden (offiziell PDH) + Zyklon-Anzahl/Jahr (IBTrACS) + SST-/Regen-Anomalie | Landauswahl, Brushing über Zeit |
| **3 · Multivariate 5D-Ansicht** 🔵 | **D3.js** (SVG) | Bubble-Plot: SST × Meeresspiegel × Regen × Impact × Land/Zeit | Jahr-Slider, Land-Highlight, Filter |

**Begründung der Technik** (Mackinlay – Expressiveness/Effectiveness): wichtigste quantitative
Attribute auf die genauesten Kanäle (**Position** > Größe > Farbe). Der animierte Bubble-Plot
(Gapminder-Stil) erzählt eine Zeitgeschichte und nutzt D3-Transitions als Kern; deck.gl trägt die
performante Track-Ansicht (76k + 247k Punkte).

---

## 3. Die Dimensionen (5D-Anforderung erfüllt)

Eine „Dimension" = eine visuelle Kodierungsachse (visual channel). Die 5-Dimensionen-Anforderung wird
**doppelt** abgedeckt:

**View 3 – multivariater Kern (5 Kanäle):**

| # | Kanal | Attribut | Quelle |
|---|---|---|---|
| 1 | Position X | SST-Anomalie | Pacific Data Hub `SST_ANOM` ⭐ offiziell |
| 2 | Position Y | Meeresspiegel-Anomalie | Pacific Data Hub `SEA_LVL` ⭐ offiziell |
| 3 | Größe (Radius) | Betroffene Personen **oder** Bevölkerung | PDH `VC_DSR_AFFCT` / UN WPP |
| 4 | Farbe | Land/Region | `GEO_PICT` (21 PICTs) |
| 5 | Zeit (Animation/Slider) | Jahr | `TIME_PERIOD` |

**View 1 – Track-Ansicht (ebenfalls ≥5):** Lat · Lon · Zeit · Windintensität (Höhe) · Saffir-Simpson-
Kategorie/Sturm-Identität (Farbe). → Das Dashboard **übertrifft** die Mindestanforderung.

---

## 4. Die Umsetzung

### 4.1 Tech-Stack (gesetzt, siehe [04](04_Tools-und-Tech-Stack.md))
**D3.js** (Kern, alle 2D-Views) · **deck.gl** (Track-View) · **MapLibre/World-TopoJSON** (Kartenbasis) ·
**Python/pandas** (Daten-Wrangling) · **VS Code** · **Hosting: GitHub Pages**.

### 4.2 Datenpipeline
```
Pacific Data Hub (SDMX-CSV)  ─┐
IBTrACS WP+SP (CSV, Data/external/) ─┼─ Python/pandas ─►  schlanke JSON/CSV für die App
EM-DAT + UN WPP (Recherche Data) ────┘   (Data/processed/, scripts/prepare_pacific_data.py)
                                          │
   gemeinsames Schema:  country, year, [climate anomalies], [storm metrics], [impacts]
                                          ▼
   D3/deck.gl: Skalen → SVG/WebGL → Interaktion (linked brushing) → Animation
                                          ▼
   Öffentliche Veröffentlichung (URL) + Screen Recording + Short Paper
```
**Status der Aufbereitung:** EM-DAT- & WPP-Subsets liegen bereits in [../Data/processed/](../Data/processed/)
([02](02_Datendokumentation.md) §7). Offen: SDMX-Ozean-CSVs → `ocean.json`, IBTrACS-Track-Ausdünnung
→ `cyclones.json`, Storm→Land-Zuordnung je Land/Jahr.

### 4.3 Aufgelöste offene Entscheidungen (Empfehlung)
| Frage (aus [06](06_Arbeitsplan.md) §3) | Empfehlung |
|---|---|
| Hero-Impact-Kennzahl | **Betroffene Personen** (offiziell `VC_DSR_AFFCT`, all-hazard) + **IBTrACS-Zyklon-Anzahl/Jahr** für Sturm-Spezifik (EM-DAT nur intern, s. §6) |
| Zeitfenster | **1980–2023** (IBTrACS-Intensität ab 1980 verlässlich; Meeresspiegel ab 1993; EM-DAT-Pazifik ab 2000) |
| Geodaten | **World-TopoJSON (vereinfacht)** statt 2-GB-Coastline |
| Wrangling-Sprache | **Python/pandas** (bereits genutzt) |
| Hosting | **GitHub Pages** (statisch, kostenlos, langfristig erreichbar – wichtig für Regel §10) |

### 4.4 Meilensteine (Restweg)
M2 Pipeline (`ocean.json`/`cyclones.json`) → M3 D3/deck.gl-Grundgerüst → M4 5D-Kodierung →
M5 Interaktion (Slider/Play, Tooltip, linked brushing) → M6 Feinschliff (ColorBrewer, Annotationen,
Responsivität, **EN/FR-Texte**) → M7 Evaluation (Heuristiken) → M8 Abgabe (Recording, README, Paper,
Veröffentlichung, Einreichung). Detail: [06](06_Arbeitsplan.md) §2.

---

## 5. Das Ergebnis (Deliverables)

| Artefakt | Beschreibung |
|---|---|
| **Interaktive Dataviz** | öffentlich erreichbares D3/deck.gl-Dashboard (URL) |
| **Statische Dataviz** *(optional 2. Einreichung)* | Poster/Infografik (PDF/PNG) als Zusatzbeitrag |
| **Code/Pipeline** | lauffähige App + `scripts/`-Aufbereitung, README mit Run-Anleitung |
| **Screen Recording** | Bildschirmaufnahme der Interaktion |
| **Short Paper** | 2–3 S. (hart ≤5 S.): Problem, Technik-Begründung, Evaluation, Quellen + KI-Nutzung |

**Erwartete Erkenntnis für Nutzer:innen:** welche Inseln am stärksten exponiert sind, wie sich
Häufigkeit/Intensität der Zyklone über die Zeit entwickeln und ob Sturm-/Klimasignale mit den
gemessenen Auswirkungen zusammenfallen.

---

## 6. Compliance-Check gegen das Reglement

> Geprüft gegen `Pacific-Dataviz-Challenge-2026-rules-reglement.pdf` (Abschnitte 1–19).
> Legende: ✅ erfüllt · ⚠️ Handlungsbedarf · ℹ️ zur Kenntnis.

| § | Anforderung | Status | Konsequenz für uns |
|---|---|---|---|
| 4 | Zeitraum **1. Juni – 31. Aug 2026, 23:00 Fiji-Zeit** | ⚠️ | Deadline ≈ **31.08.2026, 13:00 CEST** (Fiji = UTC+12). Vorher einreichen. |
| 5–6 | Hauptwettbewerb, offen für jede Nationalität | ✅ | HSD-Team (Deutschland) ist im **Hauptwettbewerb** teilnahmeberechtigt. |
| 7 | Max. 4 Einreichungen (statisch/interaktiv × individuell/Team) | ℹ️ | Plan: **1 interaktiv** (Kern) + optional **1 statisch**; als **Team** mit einer Kontaktperson. |
| 8 | **Arbeitssprache Englisch oder Französisch** | ⚠️ **wichtig** | **Dataviz-UI + Problembeschreibung müssen EN (oder FR) sein.** Unsere `docs/` sind intern Deutsch – Output-Texte separat auf Englisch. |
| 9 | **≥1 offizieller Datensatz**; Zusatzdaten nur als Open Data; **alle zitieren**; Lizenzen einhalten | ✅/⚠️ | Pacific Data Hub (SST/SeaLvl/Rain + offizielle Impact-Daten) = offiziell ✅. IBTrACS (NOAA, public domain) ✅, UN WPP (CC BY 3.0 IGO, kommerziell + Bearbeitung erlaubt) ✅. **EM-DAT = CC BY-NC-ND 4.0 → NICHT in die Wettbewerbs-Dataviz** (siehe Auflösung unten). |
| 9 | **Originalität**: eigens für den Challenge, **nicht vorab veröffentlicht** | ⚠️ | Dataviz **nicht vor Einreichung** öffentlich/woanders publizieren (Repo bis dahin privat oder „unlisted"). |
| 9 | **KI nur unterstützend** (Code/Narrativ/Visuals); **nicht den Kern** ersetzen; übermäßige/primär KI-generierte Beiträge = Disqualifikation | ⚠️ **wichtig** | Claude Code nur als Hilfsmittel (Datenaufbereitung, Code-Gerüst, Textentwurf). **Analyse-, Design- und Gestaltungsentscheidungen menschlich treffen & dokumentieren** ([05](05_Bewertung-und-Abgabe.md) §4). |
| 10 | **Problembeschreibung** (Problem + wie die Dataviz antwortet) im Anmeldeformular | ✅ | Aus §1 dieses Plans ableitbar – auf Englisch formulieren. |
| 10 | **Interaktiv: öffentliche URL, erreichbar bis ≥ 31. Aug 2029** | ⚠️ **wichtig** | **GitHub-Pages-Seite 3 Jahre online halten** (öffentliches Repo, kein Ablauf). Statisch: ≤100 MB Upload. |
| 11 | Jury-Entscheidungen final, nicht anfechtbar | ℹ️ | – |
| 12 | Preise: **Pacific-Preise nur für Pacific Islanders**; **„Global Mention" (1.500 USD) international offen** | ℹ️ | Realistisches Ziel für uns: **Global Mention** (die Pacific-/Youth-Preise sind uns verschlossen). |
| 13 | IP: Veranstalter erhält weltweite, gebührenfreie Lizenz an der **Dataviz** (auch kommerziell); wir behalten Urheberrecht; Lizenzen Dritter einhalten | ✅ **gelöst** | EM-DAT (CC BY-NC-ND) ist mit der kommerziellen IP-Klausel **unvereinbar** → **aus der Wettbewerbs-Dataviz entfernt** (Auflösung unten). Verbleibende Quellen (PDH, IBTrACS, WPP) erlauben kommerzielle Nutzung + Bearbeitung. |
| 14–16 | Vertraulichkeit, Bild-/Datenrechte, personenbezogene Daten | ✅ | Standard-Zustimmung bei Anmeldung; keine Minderjährigen im Team. |
| 17–19 | Veröffentlichung, Vorbehalte, anwendbares Recht | ℹ️ | Kein Handlungsbedarf. |

### Auflösung: EM-DAT-Lizenz (geprüft 2026-06-20)
**Befund.** EM-DAT-Public-Daten stehen unter **CC BY-NC-ND 4.0** (Namensnennung – Nicht-kommerziell –
keine Bearbeitung); kommerzielle Nutzung erfordert ein **separates, kostenpflichtiges** „Database
License Agreement". Quelle: CRED/UCLouvain, [doc.emdat.be/docs/legal](https://doc.emdat.be/docs/legal/),
[emdat.be/terms-and-conditions](https://www.emdat.be/terms-and-conditions/).

**Konflikt.** Reglement §13 verlangt, dass wir SPC eine **kommerzielle** Lizenz an der eingereichten
Dataviz gewähren. Eine Dataviz, die EM-DAT-Werte einbettet, verletzt damit sowohl **NC**
(nicht-kommerziell) als auch **ND** (keine Bearbeitung/Derivate).

**Entscheidung.**
- **EM-DAT NICHT in die eingereichte/öffentliche Dataviz einbetten.**
- **Ersatz für die Impact-Schicht:** offizielle Pacific-Data-Hub-Datensätze **„Number of directly
  affected persons" (`VC_DSR_AFFCT`)** + **„Direct disaster economic loss" (`VC_DSR_AALT`)** (open,
  challenge-konform) – plus **IBTrACS-abgeleitete Zyklon-Anzahl je Insel/Jahr** für die Sturm-Spezifik
  (NOAA, public domain).
- **EM-DAT bleibt zulässig** für **interne Analyse/Cross-Check** und als **zitierte Kennzahl im
  akademischen Short Paper** (nicht-kommerzieller Kontext, mit Quellenangabe + Hyperlink) – die
  aufbereiteten Subsets in [../Data/processed/](../Data/processed/) bleibt dafür erhalten, fließen aber
  **nicht** in die App-Daten der Wettbewerbs-Dataviz ein.

### Die kritischen To-dos (aus dem Check)
1. **Sprache:** Dataviz-Oberfläche + Problembeschreibung auf **Englisch** (ggf. zusätzlich FR).
2. **Hosting-Langlebigkeit:** öffentliche URL **bis 31.08.2029** garantieren (GitHub Pages).
3. **KI-Disziplin:** KI nur unterstützend, eigener kreativer/analytischer Anteil sichtbar & dokumentiert.
4. ✅ **EM-DAT-Lizenz gelöst:** aus der Wettbewerbs-Dataviz entfernt, durch offizielle PDH-Impactdaten
   + IBTrACS-Counts ersetzt; EM-DAT nur intern/im Paper.

---

## 7. Nächster konkreter Schritt
➡️ **M2 – Pipeline vervollständigen:** `ocean.json` aus den drei SDMX-Ozean-CSVs erzeugen und mit den
bereits aufbereiteten EM-DAT-/WPP-Subsets über `(country, year)` zu einem gemeinsamen App-Datensatz
joinen – dann das D3/deck.gl-Grundgerüst (M3) aufsetzen.
