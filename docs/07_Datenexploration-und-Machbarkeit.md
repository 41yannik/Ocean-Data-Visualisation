# Datenexploration & Machbarkeit – Thema „Typhoons & ihre Auswirkungen"

> Tiefe Exploration aller 25 Datensätze (2026-06-20) mit dem Ziel: **Ist eine multidimensionale,
> frei erkundbare Visualisierung von Typhonen und ihren Auswirkungen mit diesen Daten machbar?**
>
> **Kurzfazit:** ⚠️ **Mit den offiziellen Daten allein NICHT als echte Typhon-Visualisierung machbar.**
> Es gibt **keine Sturm-/Zyklon-Daten** (keine Tracks, keine Windgeschwindigkeit/Kategorie) und in den
> Katastrophen-Datensätzen **keine Gefahrentyp-Aufschlüsselung** (Typhon nicht von Dürre/Erdbeben trennbar).
> → Es gibt aber **drei tragfähige Wege** (siehe §5).

## 1. Methodik der Exploration

- Keyword-Suche über **alle** CSVs nach `typhoon|cyclone|storm|hazard` → **0 Treffer**.
- Vollständiges Profiling aller 25 Datensätze (Spalten, Zeit-, Länder-, Werteabdeckung).
- Voll-Dump der beiden Katastrophen-Datensätze (alle Breakdown-Spalten, Quellen, Dichte).
- Land × Datensatz Verfügbarkeits-Matrix + Fokus NW-Pazifik (Typhon-Region).

## 2. Zentrale Befunde

### 2.1 Keine Typhon-spezifischen Daten
- **Kein Track-Datensatz**: keine Koordinaten, kein Zeitverlauf, keine Windstärke/Kerndruck/Kategorie eines Sturms.
- **Disaster-Datensätze sind über ALLE Gefahren aggregiert.** Alle Breakdown-Spalten
  (`SEX`, `AGE`, `URBANIZATION`, `INCOME`, … `DISABILITY`) sind durchgängig `_T` (Total); es existiert
  **keine** `HAZARD`/`DISASTER_TYPE`-Spalte. Ein Typhon-Effekt ist also **nicht isolierbar**.

### 2.2 Disaster-Daten sind klein & dünn
| Datensatz | Zeilen | Länder | Zeitraum | Granularität |
|---|---|---|---|---|
| Direct disaster economic loss | **39** | 12 | 2007–2020 | Jahres-Aggregat, alle Gefahren, USD |
| Number of directly affected persons | **174** | 21 | 2005–2023 | Jahres-Aggregat, alle Gefahren |

Quelle beider: **UNDRR / Sendai Framework Monitor** (für Zitation). Beispiel Lücken:
Samoa hat bei „economic loss" nur **1** Wert, Guam bei „affected persons" nur **1** Jahr (2015).

### 2.3 Klima-Kontextdaten sind dagegen reich & dicht
| Indikator | Zeitraum | Länder | Eignung |
|---|---|---|---|
| SST-Anomalie (`SST_ANOM`) | 1850–2025 | 21 | ⭐ sehr dicht, längste Reihe |
| Meeresspiegel (`SEA_LVL`) | 1993–2023 | 21 | ⭐ dicht |
| Niederschlags-Anomalie (`RAIN_ANOM`) | 1979–2025 | 22 | ⭐ dicht – Proxy für Sturm-/Regensaison |

### 2.4 Geografisches Kernproblem: „Typhoon" ≠ ganzer Pazifik
„**Typhoon**" bezeichnet tropische Wirbelstürme **nördlich des Äquators im Westpazifik**. Das betrifft
unter den PICTs nur **5 Gebiete: GU, MP, PW, FM, MH** (★ unten). Die *impact-reichen* Inseln
(**Fiji, Vanuatu, Tonga, Samoa, Solomon, PNG**) liegen im **Südpazifik** – dort heißen sie
„**tropische Zyklone**", nicht Typhone. **Spannung:** Die strikte Typhon-Region ist gerade die
**impact-datenärmste**.

### 2.5 Verfügbarkeits-Matrix (Auszug)
```
Land   SST  SeaLvl Rain  Affected EconLoss Crop  Water PopGr Tourist GHG
★FM     X    X      X      X        X       X     X     X      ·      X
★GU     X    X      X      X        ·       ·     ·     X      X      X
★MH     X    X      X      X        X       X     X     X      X      X
★MP     X    X      X      X        ·       ·     X     X      X      X
★PW     X    X      X      X        X       ·     X     X      ·      X
 FJ     X    X      X      X        X       X     X     X      X      X   (Südpazifik, impact-reich)
 VU     X    X      X      X        X       X     X     X      X      X   (Südpazifik, impact-reich)
```
NW-Pazifik-Impact ist dünn: GU „affected" = 1 Jahr, MP = 2 Jahre, PW = 7, FM = 11, MH = 13.

## 3. Was ist mit offiziellen Daten machbar?
**Machbar:** „Klima-Exposition & Katastrophen-Auswirkungen im Pazifik" über Zeit/Land/Kennzahl –
mit Anomalien (SST, Meeresspiegel, Regen) + **all-hazard** Betroffene/Schäden + Folge-Proxies
(Ernteertrag, Trinkwasser, Tourismus, Bevölkerung). **Nicht machbar:** echte Typhon-Tracks oder
Typhon-isolierte Wirkung **ohne externe Daten**.

## 4. Benötigte externe Open-Data (Challenge erlaubt offene Zusatzdaten)
| Quelle | Liefert | Lizenz | Relevanz |
|---|---|---|---|
| **IBTrACS** (NOAA NCEI) | Wirbelsturm-**Tracks** weltweit: Zeit, Lat/Lon, Wind, Druck, Kategorie, Name | Open | ⭐ Kern für „Typhon"-Story, WP- & SP-Becken |
| **EM-DAT** (CRED) | Katastrophen **je Ereignis mit Gefahrentyp** + Tote/Betroffene/Schaden | Reg. nötig, akad. frei | isoliert Sturm-Impacts |
| DesInventar / Pacific (PDH) | nationale Verlust-Datenbanken | Open | feinere Impacts |
| ReliefWeb / GLIDE | Ereignis-Metadaten, benannte Stürme | Open | Annotationen |

> IBTrACS + Pacific Data Hub deckt „Tracks (extern) × Klima/Impact-Kontext (offiziell)" ab und
> erfüllt die Regel „mind. 1 offizieller Datensatz".

## 5. Drei tragfähige Projektwege

### Weg A – „Typhon-Tracks × Klima-Kontext" (externe Daten) ⭐ am nächsten am Wunschthema
IBTrACS-Tracks auf Pazifik-Karte + offizielle Klima-/Impact-Layer. Dimensionen: Lat, Lon, Zeit,
Windstärke/Kategorie, + Kontext (SST/Regen/Betroffene). **Pro:** echtes Typhon-Narrativ, sehr
„dashboard-tauglich". **Contra:** externe Datenintegration, mehr Aufwand, Geo-Daten.

### Weg B – „Klimagefahren & Auswirkungen im Pazifik" (nur offizielle Daten)
Reframing weg von Einzel-Typhonen hin zu **all-hazard Klimafolgen**. Dichte Anomalie-Daten +
Betroffene/Schäden + Folge-Proxies. **Pro:** sofort machbar, kein Datenrisiko, datenehrlich.
**Contra:** nicht „Typhon"-spezifisch.

### Weg C – „Tropische Zyklone im Süd- & Westpazifik" (Hybrid, breiter gefasst)
Begriff von „Typhoon" auf **tropische Zyklone** erweitern → ganze Region + impact-reiche Südpazifik-
Inseln nutzbar; IBTrACS South-Pacific-Becken. **Pro:** beste Daten-Deckung + echtes Sturm-Thema.
**Contra:** Titel/Framing muss „Zyklone" statt strikt „Typhone" heißen.

## 6. Empfehlung
**Weg C** (oder A), falls externe Open-Data ok sind – das verbindet das gewünschte Sturm-Thema mit
den datenreichsten Inseln. **Weg B** als risikofreier Fallback rein auf offiziellen Daten.
Offene Entscheidungen → siehe Fragen an den Nutzer (unten / [06_Arbeitsplan.md](06_Arbeitsplan.md) §3).

## 7. Getroffene Scoping-Entscheidungen (2026-06-20)
1. **Scope:** ✅ **Tropische Zyklone (ganzer Pazifik)** – Süd- + Westpazifik, inkl. impact-reicher
   Inseln (Fiji, Vanuatu, Tonga, Samoa). Titel/Framing = „Zyklone", nicht strikt „Typhone".
2. **Datenquellen:** ✅ **Externe Open-Data erlaubt** → IBTrACS-Tracks (+ ggf. EM-DAT) **plus**
   mind. 1 offizieller Pacific-Data-Hub-Datensatz (Challenge-Regel erfüllt).
3. **Dashboard-Fokus:** ✅ **Multi-View-Dashboard** mit allen drei Ansichten (Karte + Zeit +
   multivariat), verlinkt/koordiniert.

→ Daraus folgt **Weg C (Hybrid)**. Detaillierte Spezifikation:
[08_Dashboard-Konzept.md](08_Dashboard-Konzept.md).
