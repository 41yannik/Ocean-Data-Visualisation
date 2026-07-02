# Feinkonzept — Thema ②: „From Track to Toll"

> **Arbeitstitel:** *From Track to Toll — Warum der stärkste Sturm nicht den größten Schaden anrichtet.*
> Lebendes Spezifikationsdokument. Offene Entscheidungen sind mit **[OFFEN]** markiert und werden per Rückfrage geklärt; meine Empfehlung steht jeweils dabei.
> Übergeordnetes Dokument: [../KONZEPT.md](../KONZEPT.md) · Datenlage: [../KONZEPT.md §2–§3](../KONZEPT.md) · Visualisierungsvergleich: [Visualisierungsmoeglichkeiten.md](Visualisierungsmoeglichkeiten.md)

**Stand:** 2026-07-01 · **Status:** ✅ Konzept vollständig definiert (16 Entscheidungen in 4 Runden) — bereit für die Umsetzung ab Meilenstein M0.

---

## 1. Kernthese & Ziel

**These:** Die gemessene Intensität eines tropischen Wirbelsturms (Wind/Kategorie) erklärt den menschlichen Schaden nur schwach. Was den Ausschlag gibt, ist die **Verwundbarkeit** der getroffenen Gesellschaft (Bevölkerungsdichte, Vorbereitung, Infrastruktur, Armut, Inselgröße).

**„So what":** Wer Katastrophenschutz plant, darf nicht nur auf die Sturmstärke schauen. Die Visualisierung macht den „**Verwundbarkeits-Rest**" sichtbar — die Lücke zwischen dem, was ein Sturm physikalisch „sein müsste", und dem, was er tatsächlich anrichtet.

**Beleg, dass die Daten das tragen** (bereits gerendert, siehe [Preview ②](mockups/t02_track_to_toll.png)): Ein 185-km/h-Sturm (*Maila*) traf 350.000 Menschen; der stärkste (*Mawar*, ~295 km/h) nur ~700. Keine Diagonale — großer Streuungsrest.

---

## 2. Datengrundlage (konkret für dieses Thema)

| Rolle | Quelle | Abdeckung / Hinweis |
|---|---|---|
| **Sturm-Intensität** | IBTrACS SP+WP (Spitzenwind WMO/USA, Kategorie USA_SSHS) **oder** `emdat…events.magnitude` (km/h) | IBTrACS: geometrisch vollständig, Wind aber erst ab Satelliten-Ära; EM-DAT-magnitude: 56/99 Ereignisse |
| **Sturm-Bahn (Karte)** | IBTrACS SP+WP LAT/LON | ~100 % gefüllt — Karten immer aus IBTrACS, **nie** aus EM-DAT (dort nur 2/99 Koordinaten) |
| **Schaden — Betroffene** | `emdat…events.total_affected` | **79/99** — beste Abdeckung |
| **Schaden — Tote** | `total_deaths` | ~44/99 |
| **Schaden — Sachschaden** | `total_damage_kusd` (+ inflationsbereinigt) | ~32/99 |
| **Normalisierung** | `wpp_pacific_population` (pro Kopf) | via ISO3↔GEO_PICT-Crosswalk |
| **Verwundbarkeits-Kontext (optional)** | Trinkwasser %, TB, BIP-Proxy, Bevölkerungsdichte | pro Land, join über country/year |
| **Storm↔Impact-Verknüpfung** | Namens- + Saison-Join (±1 Jahr) IBTrACS↔EM-DAT | ~84/99 Treffer |

**Analyse-Einheit [OFFEN]:** Ereignis (ein Sturm) vs. Sturm-Land-Paar vs. Land-Jahr-Aggregat. → *Empfehlung: Ereignis als Grundeinheit, optional nach Land gefärbt/gefiltert.*

---

## 3. Offene Entscheidungen (Rückfragen-Katalog)

> Gruppen A–F. **Runde 1** (⭐) wird sofort per Auswahl gestellt; die übrigen folgen in weiteren Runden oder werden mit der Empfehlung übernommen, falls du zustimmst.

### A. Erzählung & Nutzung
- ✅ **A1 — Erzählmodus:** **Geführtes Scrollytelling** (entschieden 2026-07-01). Fest inszenierte Story, Schritt für Schritt; die Kernaussage wird klar geführt.
- ✅ **A2 — Zielgruppe & Tonalität:** **Jury & Fachpublikum, sachlich** (entschieden 2026-07-01). Präzise, datenehrlich, ein klarer emotionaler Anker.
- ✅ **A3 — Sprache:** **Englisch (UI), Dokumentation/Paperwork Deutsch** (entschieden 2026-07-01).

### B. Visuelle Architektur
- ✅ **B1 — Leitansicht:** **Verknüpfte Karte + Scatter (CMV)** (entschieden 2026-07-01). Pazifik-Karte mit Bahnen ↔ Intensität-vs-Betroffene-Scatter, gegenseitig gebrusht.
- ✅ **B2 — Geografie-Form:** **Flache Pazifikkarte** (entschieden 2026-07-01), dateline-zentriert (`geoEquirectangular`/`geoNaturalEarth`). Nüchtern, lesbar, performant.
- ✅ **B3 — Nebenansichten:** **Minimal — nur Karte + Scatter** (entschieden 2026-07-01). Keine Dauer-Zusatzpanels; maximaler Fokus. (Ranking/Verteilung ggf. als optionaler Ausbau.)

### C. Daten & Analyse
- ✅ **C1 — Schadensmaß (y-Achse):** **Betroffene Personen** (entschieden 2026-07-01). Beste Abdeckung (79/99), menschzentriert.
- ✅ **C2 — Verwundbarkeit sichtbar machen:** **Residuum einer Erwartungslinie** (entschieden 2026-07-01). Regressionslinie „erwarteter Schaden bei Intensität"; Abweichung nach oben = hohe Verwundbarkeit, farblich markiert.
- ✅ **C3 — Normalisierung:** **Beides umschaltbar** (absolut ↔ pro Kopf) (entschieden 2026-07-01). Macht kleine, hochverwundbare Inseln ehrlich sichtbar.
- ✅ **C4 — Intensitätsquelle:** **IBTrACS-Spitzenwind via Namens+Saison-Join** (entschieden 2026-07-01), EM-DAT-`magnitude` als Fallback für unverknüpfte Ereignisse. Authoritativ + höhere Abdeckung (~84/99).
- ✅ **C5 — Becken/Umfang:** **Alle Pazifik-Inselstaaten (SP+WP)** (entschieden 2026-07-01). Alle ~99 EM-DAT-Ereignisse; Intensität aus beiden Becken.
- ✅ **C6 — Zeitraum:** **2000–2024** (übernommen). Aktuellste 1–2 Jahre wegen Meldeverzug/Unvollständigkeit ausgeklammert; wird im UI transparent vermerkt.

### D. Interaktion
- ✅ **D1/D2 — Interaktionsgrad:** **Interaktive Schritte + freie Erkundung am Ende** (entschieden 2026-07-01). Geführte Story als Rückgrat; Hover/Tooltips in jedem Schritt; abschließender frei erkundbarer Zustand (Filter/Brushing). Nutzt CMV voll.
- ✅ **D3 — Detail-Ansicht je Sturm:** **Detailpanel mit Mini-Track** bei Klick (entschieden 2026-07-01). Mini-Karte der Zugbahn + Kennzahlen (Kategorie, Wind, Betroffene, Tote, Schaden, Land, Jahr).

### E. Gestaltung
- ✅ **E1 — Stil/Stimmung:** **Nüchtern-wissenschaftlich** (entschieden 2026-07-01). Zurückhaltend, klassisch, maximale Lesbarkeit; ein einziger kräftiger Akzent bleibt für „hohe Verwundbarkeit" reserviert.
- ✅ **E2 — Farbkonzept:** **Farbenblind-sichere ColorBrewer-Paletten** (entschieden 2026-07-01), getrennte Skalen für Sturmintensität (sequenziell) vs. Verwundbarkeits-Rest (divergierend). Ein kräftiger Akzent für „hohe Verwundbarkeit".
- ✅ **E3 — Barrierefreiheit:** **Ja** (entschieden 2026-07-01) — Kontrast, Alt-Texte, keine reine Farbkodierung. Zählt als Kursinhalt.

### F. Technik & Umfang
- ✅ **F1 — Stack:** **D3 v7 + Vite, Vanilla-JS-Module** (entschieden 2026-07-01).
- ✅ **F2 — Datenpipeline:** **Python/pandas → schlanke JSON/CSV** (entschieden 2026-07-01), reproduzierbares `scripts/`-Skript.
- ✅ **F3 — Betrieb:** **Rein statisch/offline lauffähig** (entschieden 2026-07-01).
- ✅ **F4 — Ambition/Umfang:** **Fokussiertes MVP zuerst** (entschieden 2026-07-01). Kern (Scatter + Karte + Erwartungslinie + Brushing + Story-Schritte) solide, dann optional ausbauen.
- ✅ **F5 — Screen-Recording:** **2–3 min, geführter Durchlauf** entlang der Story-Schritte (übernommen).

---

## 4. Zielbild (final)

Eine **einseitige, geführte Scrollytelling-Anwendung** (Englisch), nüchtern-wissenschaftlich. Ein **fixes Verbund-Grafik-Panel** aus zwei verknüpften Ansichten bleibt beim Scrollen sichtbar; links daneben/darüber laufen die Story-Texte:

```
┌──────────────────────────┬───────────────────────────────┐
│   FLACHE PAZIFIKKARTE     │   SCATTER                      │
│   (dateline-zentriert)    │   y = Betroffene (log)         │
│   ~ IBTrACS-Zugbahnen ~   │        ●  ● ← hoher Rest (rot) │
│   Farbe = Kategorie       │     ● ●●  ·                    │
│        ●Insel-Punkte      │   ─────── Erwartungslinie      │
│   ◄──── Brushing ────►    │   x = Intensität (Spitzenwind) │
├──────────────────────────┴───────────────────────────────┤
│  [Toggle: absolut ↔ pro Kopf]   [Klick Sturm → Detailpanel]│
└────────────────────────────────────────────────────────────┘
```

- **Links – flache Pazifikkarte:** IBTrACS-Zugbahnen der im Schritt betrachteten Stürme; Farbe = Saffir-Simpson-Kategorie; Inselstaaten als Punkte.
- **Rechts – Scatter:** x = Sturmintensität (IBTrACS-Spitzenwind, kt), y = **betroffene Personen** (log). Eine **Erwartungslinie** (Regression) zeigt den „normalen" Schaden je Intensität; das **Residuum nach oben = Verwundbarkeit** wird divergierend eingefärbt, hoher Rest im Akzentton.
- **Verknüpfung (CMV):** Hover/Brushing verbindet Karte ↔ Scatter; **Klick auf einen Sturm** öffnet ein **Detailpanel** (Mini-Zugbahn + Kennzahlen).
- **Toggle:** Betroffene **absolut ↔ pro Kopf** (kleine Inseln wie Tuvalu/Niue werden pro Kopf dramatisch sichtbar).
- **Abschluss:** frei erkundbarer Zustand (Filter Jahr/Land/Kategorie, Brushing).

**Mehrdimensionalität (Challenge-Anforderung):** Intensität (x) · Betroffene (y) · Verwundbarkeits-Rest (Farbe) · Kategorie (Bahnfarbe) · Land/Subregion (Karte+Detail) · Zeit (Story-Schritte/Filter) · Skalierung absolut/pro Kopf (Toggle) → **≥ 5 gleichzeitig lesbare Dimensionen**.

**Story-Bogen (Scroll-Schritte):**
1. **Hook:** „Der stärkste Sturm ist nicht der schlimmste." — Typhoon *Mawar* (~295 km/h, ~700 Betroffene) vs. Zyklon *Heta/Ami* (schwächer, Zehntausende Betroffene).
2. **Streuung:** alle Ereignisse erscheinen → sichtbar **keine Diagonale**.
3. **Erwartungslinie:** eingeblendet → der **Verwundbarkeits-Rest** wird benannt und eingefärbt.
4. **Karten-Verknüpfung:** Bahn eines Ausreißers hervorheben, Detailpanel öffnen (z.B. *Pam* 2015 / *Winston* 2016).
5. **Muster:** welche Länder wiederholt über der Linie liegen; **Toggle auf pro Kopf** → kleine Inseln treten hervor.
6. **Ehrlichkeit:** kurze Einordnung der Datengrenzen (Namens-Join-Abdeckung, Meldelücken).
7. **Aussage + freie Erkundung:** Katastrophenschutz muss Verwundbarkeit adressieren, nicht nur Windstärke — danach frei erkunden.

## 5. Datenpipeline-Plan

**Rohquellen → Verarbeitung (`scripts/build_track_to_toll.py`, Python/pandas) → schlanke Frontend-Dateien.**

1. **EM-DAT-Pazifik-Ereignisse** (`Data/processed/emdat_pacific_storms_events.csv`, gefiltert 2000–2024): Name, Jahr, Land/ISO3, Betroffene, Tote, Schaden (+adj.), Subtyp.
2. **IBTrACS SP+WP**: pro Sturm (SID) Spitzenwind (WMO/USA, kt), Spitzen-Kategorie (USA_SSHS), ausgedünnte Zugbahn (LAT/LON), Becken.
3. **Join:** normalisierter **Name + Saison ±1** (EM-DAT ↔ IBTrACS) → Intensität & Bahn anhängen (~84/99). Unverknüpft: **Fallback** EM-DAT-`magnitude` (km/h→kt), markiert.
4. **Normalisierung:** Join mit `wpp_pacific_population` (ISO3+Jahr) → Betroffene **pro Kopf**.
5. **Erwartungslinie:** Regression `log10(Betroffene+1) ~ Intensität`; **Residuum** je Ereignis → Verwundbarkeits-Maß.
6. **Crosswalk/Referenz:** ISO3↔GEO_PICT, Subregion, Insel-Zentroide (einmalig, aus KONZEPT §9).

**Ausgabeschema (fürs Frontend):**
- `events.json` — `[{id, name, year, iso3, country, subregion, intensity_kt, intensity_source, category, affected, affected_pc, deaths, damage_kusd, residual, above_line}]`
- `tracks.json` — `{ SID: [[lon,lat], …] }` (ausgedünnt, nur verknüpfte Stürme)
- `pacific_land.topo.json` — Basiskarte (Natural Earth 110m Land, pazifik-zentriert; **leichtgewichtig**, nicht das 1,9-GB-GeoPackage)
- `meta.json` — Fit-Parameter, Abdeckungszahlen, Zeitraum, Datenhinweise/Caveats

## 6. Umsetzungsschritte / Meilensteine (MVP-first)

- **M0 – Setup:** Repo-Gerüst (Vite + D3 v7), Pipeline-Skelett, Crosswalk + Zentroide.
- **M1 – Daten:** `build_track_to_toll.py` → `events.json` + `tracks.json` + `meta.json`; Join-Abdeckung validieren.
- **M2 – Statisches CMV:** Scatter (Intensität × Betroffene, log) + Erwartungslinie + Residuum-Farbe; flache Pazifikkarte + Bahnen. *(Kern-MVP)*
- **M3 – Verknüpfung:** Hover-Tooltips, Brushing Karte↔Scatter, Klick → Sturm-Detailpanel.
- **M4 – Scrollytelling:** Scroll-gesteuertes Schritt-Framework, 6–7 annotierte Schritte, Übergänge.
- **M5 – Toggles & Feinschliff:** absolut/pro-Kopf-Umschalter, farbenblind-sichere Palette, Alt-Texte, Legende, Caveats; freie-Erkundung-Endzustand.
- **M6 – Abgabe:** Screen-Recording (2–3 min), Dokumentation, 2–3-Seiten-Paperwork.
- **Optionaler Ausbau:** Länder-Ranking/Rest-Histogramm, WP-Kontext-Toggle, Jahr-Filter-Animation.

---

## 7. Änderungshistorie
| Datum | Änderung |
|---|---|
| 2026-07-01 | Feinkonzept angelegt; Kernthese, Datengrundlage und vollständiger Entscheidungskatalog (A–F) erfasst. Runde 1 der Rückfragen gestellt. |
| 2026-07-01 | **Runde 1 entschieden:** A1=Geführtes Scrollytelling · B1=Karte+Scatter (CMV) · C1=Betroffene Personen · C2=Verwundbarkeit als Residuum. Zielbild-Entwurf (§4) mit 6-Schritt-Story-Bogen ergänzt. |
| 2026-07-01 | **Runde 2 entschieden:** A2=Jury/Fachpublikum · A3=Englisch (Doku DE) · C5=alle Pazifikstaaten (SP+WP) · E1=nüchtern-wissenschaftlich. Zusätzlich C4=IBTrACS-Spitzenwind via Join festgelegt. |
| 2026-07-01 | **Runde 3 entschieden:** C3=absolut/pro Kopf umschaltbar · B2=flache Pazifikkarte · D1/D2=interaktive Schritte + freies Ende · F4=fokussiertes MVP zuerst. |
| 2026-07-01 | **Runde 4 entschieden:** B3=minimal (nur Karte+Scatter) · D3=Detailpanel mit Mini-Track · E2/E3=farbenblind-sicher + Alt-Texte · F1–F3=D3 v7 + Vite + Python-Pipeline, offline. Übernommen: C6=2000–2024, F5=2–3 min. **Finales Zielbild (§4), Datenpipeline-Plan (§5) und Meilensteine (§6) geschrieben. Konzept vollständig.** |
