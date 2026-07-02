# Feinkonzept — Thema ②: „From Track to Toll"

> **Arbeitstitel:** *From Track to Toll — Warum der stärkste Sturm nicht den größten Schaden anrichtet.*
> Lebendes Spezifikationsdokument. Übergeordnetes Dokument: [../KONZEPT.md](../KONZEPT.md) · Datenlage: [../KONZEPT.md §2–§3](../KONZEPT.md) · Visualisierungsvergleich: [Visualisierungsmoeglichkeiten.md](Visualisierungsmoeglichkeiten.md) · Umsetzungsplan: [plan/README.md](plan/README.md) · Datenquellen-Entscheidung: [decisions/2026-07-02_datenquellen.md](decisions/2026-07-02_datenquellen.md)

**Stand:** 2026-07-02 · **Status:** ✅ Konzept vollständig definiert; Review-Korrekturen vom 2026-07-02 eingearbeitet (Hook, Zeitfenster, Pro-Kopf-Default, USA_WIND, Analyseeinheit, Farbarchitektur) — in Umsetzung (Paket 03: Datenpipeline).

---

## 1. Kernthese & Ziel

**These:** Die gemessene Intensität eines tropischen Wirbelsturms (Wind/Kategorie) erklärt den menschlichen Schaden nur schwach. Was den Ausschlag gibt, sind **Verwundbarkeit und Exposition** der getroffenen Gesellschaften (wie viele Menschen im Pfad leben, Vorbereitung, Infrastruktur, Meldewege) — nicht die Windstärke allein.

**„So what":** Wer Katastrophenschutz plant, darf nicht nur auf die Sturmstärke schauen. Die Visualisierung zeigt die **Abweichung vom Intensitätstrend** — die Lücke zwischen dem, was Windstärke allein erwarten ließe, und dem, was ein Sturm tatsächlich anrichtet. Diese Abweichung wird ehrlich als Mischung aus Verwundbarkeit, Exposition und Meldepraxis eingeordnet (das Residuum korreliert r≈0,45 mit der Landesbevölkerung — eine reine „Verwundbarkeits"-Kausalität wäre eine Überdehnung).

**Beleg, dass die Daten das tragen** (verifiziert 2026-07-02 gegen `Data/processed/emdat_pacific_storms_events.csv`): Zyklon *Heta* (2004, ~300–310 km/h) — **ein** Sturm, zwei Gesellschaften: **23.060 Betroffene in Amerikanisch-Samoa, 702 auf Niue.** Daneben *Maila* (2026, 185 km/h): **340.641 Betroffene** auf den Salomonen. Auf der finalen Intensitätsachse (USA_WIND via Join, n=78, Pipeline 2026-07-02): absolut ist die Beziehung statistisch null (**R²=0,006, p=0,50**); **pro Kopf wird sie signifikant (R²=0,065, p=0,025)** — klein, aber real; deshalb ist pro Kopf die Standardansicht. *(Vorläufige Review-Werte auf der EM-DAT-magnitude-Achse, n=45–48: R²=0,010/0,145 — überholt durch C4.)* ⚠️ Das alte Preview-Mockup ([mockups/t02_track_to_toll.png](mockups/t02_track_to_toll.png)) ist **superseded** — es enthält die widerlegte Zahl „Mawar ~700 Betroffene" (real: 100.000 = 60 % der Bevölkerung Guams; die 702 gehören zu Heta/Niue).

---

## 2. Datengrundlage (konkret für dieses Thema)

| Rolle | Quelle | Abdeckung / Hinweis |
|---|---|---|
| **Sturm-Intensität** | IBTrACS SP+WP: **USA_WIND-Peak (kt, 1-min)** + Kategorie max(USA_SSHS) via Join; Fallback `emdat…events.magnitude` (km/h ÷ 1,852), markiert | **Kein WMO/USA-Mix** (basin-abhängiger Bias bis ~15 %); USA_WIND bei 100 % der gematchten Stürme; Fallback bringt netto ~4 Punkte |
| **Sturm-Bahn (Karte)** | IBTrACS SP+WP LAT/LON | ~100 % gefüllt — Karten immer aus IBTrACS, **nie** aus EM-DAT (dort nur 2/99 Koordinaten) |
| **Schaden — Betroffene** | `emdat…events.total_affected` | **79/99** — beste Abdeckung |
| **Schaden — Tote** | `total_deaths` | ~44/99 |
| **Schaden — Sachschaden** | `total_damage_kusd` (+ inflationsbereinigt) | ~32/99 |
| **Normalisierung** | `wpp_pacific_population` (pro Kopf) | via ISO3↔GEO_PICT-Crosswalk |
| **Verwundbarkeits-Kontext (optional)** | Trinkwasser %, TB, BIP-Proxy, Bevölkerungsdichte | pro Land, join über country/year |
| **Klimakontext (PDH-Pflichtdatensatz)** | SPC/PDH „Mean sea surface temperature anomalies" (21 PICTs, 1850–2025) | Story-Intro („warming backdrop"); erfüllt Challenge-Regel §9 → `sst.json` (siehe [Decision Record](decisions/2026-07-02_datenquellen.md)) |
| **Storm↔Impact-Verknüpfung** | Namens- + Saison-Join (±1 Jahr) IBTrACS↔EM-DAT | real **94/99 Zeilen** (97,1 % der Stürme), mit Apostroph-/Alias-Fix **97/99**; 0 Mehrdeutigkeiten (verifiziert 2026-07-02) |

**Analyse-Einheit (entschieden 2026-07-02): Sturm-Land-Paar.** Die 99 EM-DAT-Zeilen entsprechen 73 distinkten Stürmen; 16 Stürme treffen mehrere Länder (Pam 2015 = 5 Zeilen, Heta 2004 und Harold 2020 = je 4). Konsequenzen: (a) vertikale Punktstapel gleicher Intensität sind **Feature** — „ein Sturm, unterschiedliche Folgen" (Harold: 25.000–180.000 Betroffene in 4 Ländern), optional dünn verbunden; (b) Detailpanel aggregiert je **Sturm** über alle Länderzeilen; (c) Brushing-Mapping Track↔Punkte ist 1:n; (d) Punkte sind nicht unabhängig (Cluster je Sturm) → Limitation in Story-Schritt „Ehrlichkeit" und Paperwork.

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
- ✅ **C1 — Schadensmaß (y-Achse):** **Betroffene Personen** (entschieden 2026-07-01). Beste Abdeckung (79/99), menschzentriert. **Varianten-Zusatz (2026-07-02):** Kurs-Variante = EM-DAT `total_affected` (intern, Abgabe 24.07.); Challenge-Variante = offene Quelle, Entscheidung nach dem 24.07. — siehe [Decision Record](decisions/2026-07-02_datenquellen.md).
- ✅ **C2 — Abweichung sichtbar machen (revidiert 2026-07-02):** **Intensitätstrend + Quantilband; Abweichung über Position + Annotation**, nicht mehr als divergierende Residuum-Farbe (redundant zur y-Position). Framing „**Abweichung vom Intensitätstrend**" (Verwundbarkeit **und** Exposition), nicht kausal „Verwundbarkeit". R²/n/p direkt an der Linie; die fast flache Absolut-Linie (R²=0,010, p=0,49) ist selbst der Befund („wind alone predicts almost nothing").
- ✅ **C3 — Normalisierung (revidiert 2026-07-02):** **Pro Kopf = Standardansicht**, absolut = Toggle. Pro Kopf ist die Beziehung signifikant (Pipeline-final auf USA_WIND-Achse: **R²=0,065, p=0,025, n=78**; absolut R²=0,006, p=0,50) und kleine Inseln werden nicht unterdrückt; je Modus eigener Fit (aus der Pipeline), Achse/Punkte/Linie/Band transitionieren gemeinsam.
- ✅ **C4 — Intensitätsquelle (präzisiert 2026-07-02):** durchgängig **IBTrACS `USA_WIND` (1-min, kt)** via Namens+Saison-Join — bei 100 % der gematchten Stürme vorhanden; **kein Mischen mit WMO_WIND** (10-min; basin-abhängiger Bias bis ~15 %). EM-DAT-`magnitude` (÷ 1,852 → kt) nur als markierter Fallback (`intensity_source`). Join real 94/99, mit Fixes 97/99. Der Join ist **Pflicht, kein Fallback**: 6 der Top-10-Schadensevents (u. a. Winston, 540.558 Betroffene) haben kein EM-DAT-magnitude.
- ✅ **C5 — Becken/Umfang:** **Alle Pazifik-Inselstaaten (SP+WP)** (entschieden 2026-07-01). Alle ~99 EM-DAT-Ereignisse; Intensität aus beiden Becken.
- ✅ **C6 — Zeitraum (revidiert 2026-07-02):** **2001–2026** — alle verfügbaren Ereignisse (Daten beginnen real 2001). Caveats transparent in UI/meta.json: 2025 leer, 2024 nur 1 Zeile, 2026er-Einträge jung und revisionsanfällig (Maila!), Bevölkerung ab 2024 als Forward-Fill des 2023-WPP-Werts (`pop_extrapolated`). Story-Zahlen werden skriptgestützt aus `events.json` generiert, nie hart getippt.

### D. Interaktion
- ✅ **D1/D2 — Interaktionsgrad:** **Interaktive Schritte + freie Erkundung am Ende** (entschieden 2026-07-01). Geführte Story als Rückgrat; Hover/Tooltips in jedem Schritt; abschließender frei erkundbarer Zustand (Filter/Brushing). Nutzt CMV voll.
- ✅ **D3 — Detail-Ansicht je Sturm:** **Detailpanel mit Mini-Track** bei Klick (entschieden 2026-07-01). Mini-Karte der Zugbahn + Kennzahlen (Kategorie, Wind, Betroffene, Tote, Schaden, Land, Jahr).

### E. Gestaltung
- ✅ **E1 — Stil/Stimmung:** **Nüchtern-wissenschaftlich** (entschieden 2026-07-01). Zurückhaltend, klassisch, maximale Lesbarkeit; ein einziger kräftiger Akzent bleibt für „hohe Verwundbarkeit" reserviert.
- ✅ **E2 — Farbkonzept (revidiert 2026-07-02):** **Eine bedeutungstragende Farbskala gleichzeitig.** Karte im Grundzustand entsättigt; Sturmkategorie als **Strichstärke** (keine zweite Farbskala); die divergierende Residuum-Farbe entfällt (redundant zur Position). Der eine kräftige Akzentton ist **exklusiv** für das view-übergreifende Hover-/Brush-/Story-Highlight reserviert (sichert Objektidentität im CMV). Freigewordener Kanal: **Tote als Punktgröße** (44/99; fehlend = Minimalgröße + „nicht gemeldet"-Marker). Farbenblind-sicher (ColorBrewer/Viridis, simulatorgeprüft).
- ✅ **E3 — Barrierefreiheit:** **Ja** (entschieden 2026-07-01) — Kontrast, Alt-Texte, keine reine Farbkodierung. Zählt als Kursinhalt.

### F. Technik & Umfang
- ✅ **F1 — Stack:** **D3 v7 + Vite, Vanilla-JS-Module** (entschieden 2026-07-01).
- ✅ **F2 — Datenpipeline:** **Python/pandas → schlanke JSON/CSV** (entschieden 2026-07-01), reproduzierbares `scripts/`-Skript.
- ✅ **F3 — Betrieb:** **Rein statisch/offline lauffähig** (entschieden 2026-07-01).
- ✅ **F4 — Ambition/Umfang:** **Fokussiertes MVP zuerst** (entschieden 2026-07-01). Kern (Scatter + Karte + Erwartungslinie + Brushing + Story-Schritte) solide, dann optional ausbauen.
- ✅ **F5 — Screen-Recording:** **2–3 min, geführter Durchlauf** entlang der Story-Schritte (übernommen).

---

## 4. Zielbild (final, revidiert 2026-07-02)

Eine **einseitige, geführte Scrollytelling-Anwendung** (Englisch), nüchtern-wissenschaftlich. Ein **fixes Verbund-Grafik-Panel** aus zwei verknüpften Ansichten bleibt beim Scrollen sichtbar; daneben laufen die Story-Texte. Der Einstieg setzt einen kurzen **SST-Klimakontext** (PDH-Pflichtdatensatz, „warming backdrop").

```
┌──────────────────────────┬────────────────────────────────┐
│   FLACHE PAZIFIKKARTE     │   SCATTER                       │
│   (dateline-zentriert)    │   y = Betroffene PRO KOPF (log) │
│   ~ IBTrACS-Zugbahnen ~   │      ●     ● ← Ausreißer (Anno) │
│   Strichstärke=Kategorie  │    ●˙·˙●●˙·˙ Trend + Quantilband│
│        ●Insel-Punkte      │      R²=0.07 · n=78 · p=0.02    │
│   ◄──── Brushing ────►    │   x = Intensität (USA_WIND, kt) │
├──────────────────────────┴────────────────────────────────┤
│ [Toggle: pro Kopf ↔ absolut]  [Klick Sturm → Detailpanel]  │
└─────────────────────────────────────────────────────────────┘
```

- **Links — flache Pazifikkarte:** IBTrACS-Zugbahnen, im Grundzustand entsättigt (Opazität ~0,3); **Kategorie = Strichstärke** (keine zweite Farbskala); 22 PICT-Zentroide als Pflicht-Layer (kleine Atolle fehlen in der 110m-Basiskarte).
- **Rechts — Scatter:** x = USA_WIND-Spitzenwind (kt), y = **Betroffene pro Kopf** (log, Default). **Trendlinie + Quantilband** (Fits aus der Pipeline; `R²/n/p` direkt annotiert); Abweichung nach oben wird über Position + Annotation gelesen, nicht über Farbe. **Tote = Punktgröße** (fehlend: Minimalgröße + Marker); Fallback-Intensität = gestrichelter Umriss; Multi-Country-Stapel dünn vertikal verbunden.
- **Verknüpfung (CMV):** Hover/Brushing verbindet Karte ↔ Scatter (1:n je Sturm; Akzent-Highlight identisch in beiden Views); **Klick** öffnet ein **Detailpanel je Sturm** (Mini-Zugbahn + Kennzahlen-Tabelle je Land).
- **Toggle:** **pro Kopf ↔ absolut** — je Modus eigener Fit; Achse, Punkte, Linie und Band transitionieren gemeinsam („expectation re-fitted for this scale").
- **Missing Data sichtbar:** Rug-Leiste für Events mit Intensität, aber ohne Betroffenenzahl; dynamische n-Angabe je Story-Schritt.
- **Abschluss:** frei erkundbarer Zustand (Filter Jahr/Land/Kategorie, Brushing).

**Mehrdimensionalität (ehrlich hergeleitet):** Unabhängig gleichzeitig lesbar: **Intensität (x) · Betroffene pro Kopf (y) · Tote (Punktgröße) · Sturm/Land/Raum (Karte + CMV-Verknüpfung) · Zeit (Filter/Story)**. Abgeleitet/sequenziell (nicht mitgezählt): Trend-Abweichung (aus x/y), Kategorie (Strichstärke, korreliert mit x), Modus-Toggle (Transformation). Diese Herleitung geht so in die Paperwork ein.

**Story-Bogen (Scroll-Schritte; alle Zahlen skriptgestützt aus `events.json`/`meta.json`, nie hart getippt):**
0. **Klimakontext (SST):** Der Pazifik erwärmt sich (PDH-SST-Anomalien 1850–2025) — die Bühne, auf der Stürme auf exponierte Inselgesellschaften treffen.
1. **Hook (Heta 2004):** Ein Zyklon, ~300 km/h — **23.060 Betroffene in Amerikanisch-Samoa, 702 auf Niue.** Gleicher Sturm, andere Folgen.
2. **Streuung:** alle ~74–78 Punkte (pro Kopf, log) → **keine Diagonale**; annotiert: *Mawar* (295 km/h → 100.000 Betroffene = 60 % Guams) vs. *Percy*/Tokelau (249 km/h → 26).
3. **Trend & Grenzen:** Linie + Quantilband erscheinen; „pro Kopf erklärt Intensität nur ~6–7 % der Varianz (signifikant, p≈0,02), absolut ~1 % (nicht signifikant) — und ein Teil des Rests ist Exposition, nicht Verwundbarkeit."
4. **Ein Sturm, vier Länder (Harold 2020):** Track-Highlight, 4 verbundene Punkte (FJI 180.000 / SLB 150.000 / VUT 130.120 / TON 25.000), Detailpanel öffnet sich.
5. **Muster & Toggle:** Länder wiederholt über dem Trend (Vanuatu 71 %, Fidschi 70 % der Events über der Linie — mit Expositions-Caveat); Toggle-Moment: Gita/Tonga 82 % der Bevölkerung, Tuvalu-Median ~47 %.
6. **Datenehrlichkeit (visuell):** Rug-Leiste, gestrichelte Fallback-Punkte, Join-Abdeckung, 2026er-Revisionsvorbehalt, n je Ansicht.
7. **Aussage + freie Erkundung:** „Preparedness must target vulnerability and exposure — not just forecast wind speeds."

## 5. Datenpipeline-Plan (revidiert 2026-07-02 — Detail-Spezifikation: [plan/03_M1_Datenpipeline.md](plan/03_M1_Datenpipeline.md))

**Rohquellen → `scripts/build_track_to_toll.py --variant kurs|challenge` (modulare Module unter `scripts/pipeline/`) → schlanke Frontend-Dateien.** Jedes Modul einzeln lauffähig (Smoke-Main), Ausführung bricht bei verletzten Assertions laut ab.

1. **EM-DAT-Ereignisse** (`Data/processed/emdat_pacific_storms_events.csv`, 2001–2026): Sturm-**Land**-Zeilen mit Name, Jahr, ISO3, Betroffenen, Toten, Schaden.
2. **IBTrACS SP+WP:** je SID Peak **USA_WIND (kt)** + max(USA_SSHS); ausgedünnte Zugbahn (6h-Hauptsynoptik, 2 Dezimalstellen), **LON normalisiert auf [−180, 180]**.
3. **Join:** normalisierter Name (Präfixe/Quotes entfernen, Apostroph **löschen** → „CHATAAN", Alias ULLA→ULA, Klammer-Alternativnamen als Kandidaten) + Saison ±1 → erwartet **94–97/99, 0 Mehrdeutigkeiten**. Unverknüpft: Fallback `magnitude` ÷ 1,852, Flag `intensity_source`.
4. **Bevölkerung:** WPP-Join (ISO3+Jahr), **Forward-Fill 2023 → 2024ff** (Flag `pop_extrapolated`), `affected_pc`.
5. **Fits (in Python, nie im Frontend):** zwei Regressionen `log10(y+1) ~ Intensität` (absolut + pro Kopf) mit Steigung/Intercept/R²/p/n, Residuen je Zeile, Quantilband-Stützpunkte.
6. **SST-Intro:** mittlere SST-Anomalie je Jahr (PDH-Datensatz, 1850–2025) → `sst.json`.
7. **Crosswalk/Referenz:** ISO3↔GEO_PICT, Subregion, Insel-Zentroide (`scripts/pipeline/reference.py`).
8. **Validierung (`validate.py`):** Join ≥ 94/99 · scatterfähig ≥ 74 · Winston 2016/FJI mit `intensity_source=="ibtracs"` · Harold 2020 = 4 Länderzeilen · kein `affected == 0` · Maila mit `affected_pc` · **p_pc < 0,05 und R²_pc > R²_abs** (final: R²_pc≈0,065) · alle Track-Lons ∈ [−180, 180] · Challenge-Variante ohne EM-DAT-Felder (Lizenz-Assertion).

**Ausgabeschema (`app/public/data/`):**
- `events.json` — `[{id, sid, name, year, iso3, country, subregion, intensity_kt, intensity_source, category, affected, affected_pc, pop, pop_extrapolated, deaths, damage_kusd, residual_abs, residual_pc}]` *(Kurs-Variante EM-DAT-basiert → via `.gitignore` vom Repo ausgeschlossen)*
- `tracks.json` — `{SID: [[lon, lat, wind, sshs], …]}` (nur gematchte Stürme; real ~59 KB)
- `meta.json` — Fits beider Modi, n je Ansicht, Join-Abdeckung, Zeitraum, Caveats, Quellen/Lizenzen
- `sst.json` — `[{year, anom}]` (PDH-SST fürs Story-Intro)
- `land-110m.json` — Basiskarte (world-atlas / Natural Earth, public domain; kommt in Paket 04 dazu, Zentroide aus `reference.py`)

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
| 2026-07-02 | **Review-Korrekturen eingearbeitet** (Multi-Agenten-Prüfung, siehe [plan/README.md](plan/README.md)): §1-Hook → **Heta 2004** (Mawar-Zahl widerlegt: 100.000 Betroffene, nicht ~700); C6 → **2001–2026** mit Caveats; C3 → **pro Kopf als Default** (R²=0,145 vs. 0,010); C2 → **Trend + Quantilband** statt Residuum-Farbe, Framing „Verwundbarkeit & Exposition"; C4 → durchgängig **USA_WIND**, Join real 94–97/99; **Analyseeinheit = Sturm-Land-Paar** (entschieden); E2 → eine Farbskala, Akzent nur fürs Highlight, **Tote als Punktgröße**; §2 um **SST-PDH-Kerndatensatz** und Zwei-Varianten-Strategie ergänzt ([decisions/2026-07-02_datenquellen.md](decisions/2026-07-02_datenquellen.md)); §4/§5 neu gefasst (Story-Schritt 0 = SST-Intro, Missing-Data-Sichtbarkeit, Story-Zahlen skriptgestützt); Mockup t02 als superseded markiert. |
