# Paket 06 — M4: Scrollytelling & Story

**Priorität:** 🟡 MITTEL · **Aufwand:** 12–20 h · **Abhängigkeiten:** 05 (jeder Story-Schritt ist nur ein State-Zustand des fertigen CMV)

## Ziel

Die geführte Erzählung (Englisch) läuft als Scroll-Sequenz über dem fixen CMV-Panel — mit faktisch korrekten, **skriptgestützt aus den Daten generierten** Zahlen und robusten Fallbacks.

## Grundprinzip: Story-Zahlen niemals hart codieren

**Befund:** Der alte Hook war um Faktor 143 falsch, und die 2026er-EM-DAT-Einträge (Maila) können bis zur Abgabe revidiert werden. Deshalb: Alle Zahlen in Story-Texten kommen als Platzhalter aus `events.json`/`meta.json` (z. B. `{{event('heta','NIU').affected}}`), nie als getippter Text. Ändert die Pipeline die Daten, ändern sich die Texte mit — und die Assertions aus Paket 03 schlagen Alarm, wenn ein referenziertes Event fehlt.

## Technik

- [ ] **1. Scrollama** (`npm i scrollama`, IntersectionObserver-basiert, offline bundlebar) statt Eigenbau oder Scroll-Hijacking — natives Scrollen bleibt erhalten.
- [ ] **2. Deklaratives Schritt-Array** in `steps.js`: `{id, title, html, apply(state)}` — `apply` setzt nur State-Felder (Filter, Highlights, Modus, Annotationen). Kein Schritt manipuliert DOM direkt.
- [ ] **3. Robustheit (konsistent zu E3):** Schritt-Navigation zusätzlich per Buttons/Pfeiltasten; Fortschrittsanzeige (Punkte-Leiste); `prefers-reduced-motion` → Transitions aus; Breakpoint < ~1000 px → gestapeltes Layout (Panel oben, Text darunter); Recording-Durchlauf auf der Zielauflösung proben.

## Story-Bogen (7 Schritte, korrigierte Fassung)

> Beispiele gelten für das empfohlene Zeitfenster 2001–2026 (Paket 02 B); Zahlen = verifizierter Datenstand 2026-07, final immer aus der Pipeline.

- [ ] **Schritt 1 — Hook (Heta 2004):** Karte zoomt auf Hetas Zugbahn, zwei Punkte erscheinen. *„One cyclone, ~300 km/h. In American Samoa it affected 23,060 people. On Niue: 702. Same storm — different societies."*
- [ ] **Schritt 2 — Die Streuung:** Alle ~74 Punkte erscheinen (pro Kopf, log). *„Across 25 years of Pacific cyclones, wind speed barely predicts human toll."* Gegenbeispiele annotiert: Mawar (295 km/h — 100.000 Betroffene = 60 % Guams) vs. Percy/Tokelau (249 km/h — 26 Betroffene).
- [ ] **Schritt 3 — Der Trend & seine Grenzen:** Linie + Quantilband einblenden, `R², n, p` als Annotation. Ehrlichkeitssatz direkt hier (nicht erst Schritt 6): *„Per capita, intensity explains only ~6–7 % of the variance (significant, p ≈ 0.02). In absolute terms: ~1 % — not significant. And part of what remains is exposure — how many people live in a storm's path — not only vulnerability."* (Werte IMMER aus `meta.fits` generieren — Pipeline-final, USA_WIND-Achse, n=78.)
- [ ] **Schritt 4 — Ein Sturm, vier Länder (Harold 2020):** Track highlighten, die 4 Punkte (FJI 180.000 / SLB 150.000 / VUT 130.120 / TON 25.000) vertikal verbunden; Detailpanel öffnet sich. Der Multi-Country-Stapel als stärkstes Argument: gleiche Intensität, Folgen um Faktor 7 verschieden.
- [ ] **Schritt 5 — Muster & Toggle:** Länder-Highlights: wer liegt wiederholt über dem Trend (Vanuatu 71 %, Fidschi 70 % der Events über der Linie) — mit dem Expositions-Caveat aus Schritt 3. Toggle-Moment pro Kopf: Tuvalu (Median ~47 % der Bevölkerung betroffen), Gita/Tonga 82 %, Kevin & Judy/Vanuatu je 78 %.
- [ ] **Schritt 6 — Datenehrlichkeit (visuell, nicht nur Text):** Rug-Leiste der Events ohne Betroffenenzahl einblenden (~20 %), Fallback-Punkte (gestrichelt) erklären, Join-Abdeckung und 2026er-Revisionsvorbehalt nennen, `n` je Ansicht anzeigen.
- [ ] **Schritt 7 — Aussage + freie Erkundung:** *„Preparedness must target vulnerability and exposure — not just forecast wind speeds."* Danach Filter/Brush/Toggle freigeschaltet; Startzustand: entsättigte Tracks (Opazität ~0,3), alle Filter offen.

## Weitere Schritte

- [ ] **4. Text-Pass:** Englische Texte kurz halten (2–4 Sätze/Schritt), Fachbegriffe erden („expectation line" → „what wind speed alone would predict").
- [ ] **5. Zahlen-Validierung:** Build-Schritt, der alle `{{…}}`-Referenzen gegen `events.json` auflöst und bei fehlenden IDs failt.
- [ ] **6. Probelauf** des kompletten Scroll-Flows als künftiges Recording-Drehbuch (Paket 08).

## Definition of Done

- Alle 7 Schritte laufen per Scroll UND per Buttons/Tastatur; Layout funktioniert auch gestapelt (< 1000 px) und mit `prefers-reduced-motion`.
- Kein Story-Text enthält eine hart getippte Datenzahl; der Referenz-Resolver failt bei unbekannten Events.
- Die Story enthält keine Beispiele außerhalb des gewählten Zeitfensters und keinen der widerlegten Alt-Fakten (Mawar ~700, „Heta schwächer als Mawar").

## Umsetzungsstand (2026-07-02, Tag `m4-done`) — FERTIG, mit dokumentierten Abweichungen

Umgesetzt in 10 Commits (S1–S10), jede Komponente einzeln im Harness abgenommen. Abweichungen/Präzisierungen gegenüber der Spezifikation oben:

1. **Layout = Fullscreen-Morph** (Nutzer-Entscheidung, inspiriert von der Gemini-Analyse): Sticky-Bühne 100vh, Textkarten scrollen darüber; `data-layout` (`intro|map|scatter|dual|explore`) morpht je Step per CSS. Statt Seitenspalte.
2. **Step 0 = SST-Intro** (Warming Stripes, PDH-Pflichtdatensatz) vor dem 7-Schritt-Bogen → 8 Steps (0–7), `story/sstIntro.js`.
3. **Guba-Beat neu in Schritt 3:** Guba 2007/PNG ist real in den Daten (`2007-0557-PNG`: 162.140 Betroffene, 172 Tote = Maximum im Fenster, nur Kat. 1) — der fehlende Quadrant „schwacher Wind, hoher Toll". Heta bleibt Hook (Schritt 1) mit Track-Einzeichnen + Puls-Ringen ASM/NIU.
4. **Schritt 5 mit Pipeline-finalen Werten:** über der Linie real VUT 80 % (nicht 71 %), FJI nur 53 % (nicht 70 %) → Text fokussiert Vanuatu (inkl. Judy+Kevin 2023, je ~78 % der Bevölkerung, binnen einer Woche); Tuvalu-Median entfiel (n = 2).
5. **Residuen-Reveal:** Schwelle `residual_pc > 1.0` (= Faktor 10 über der Erwartung) → 9 leuchtende Punkte; `config.REVEAL_RESIDUAL_MIN`.
6. **Mechanik:** State-Feld `storyFx` (einzige Brücke Steps→Komponenten), `story/steps.js` + Resolver `story/refs.js` (wirft bei unbekannter Referenz; Negativ-Selbsttest in `?mount=story.text`), storyRunner besitzt das `exploreUnlocked`-Gate (Rückwärts-Scrollen sperrt wieder), Deep-Link `?step=N`, Dashboard-Modus `?story=off`.
7. **Rug-Leiste (Schritt 6):** nur als Flag `storyFx.showRug` vorbereitet — der Layer selbst kommt planmäßig in Paket 07; der Step degradiert sauber (Text + n-Caption).
8. **Verifikation:** 78 Playwright-Checks grün (46 Story-Durchlauf inkl. rückwärts/Deep-Link/story=off, 20 Explore-Regression, 8 reduced-motion, 4 Preview-Build); dist 356 KB; `git ls-files public/data` = nur tracks/sst/land-110m.
9. **Offen für Paket 07:** Label-Überlappung Samoa/„Am. Samoa" im Hook, Rug-Layer, finale Palette. Hero-Kicker „2001–2026"/„25 years" ist statisches HTML (Designkonstante des Zeitfensters, keine Pipeline-Zahl).

### Hook v3 (2026-07-03): Kamera-Zoom + Vergleichs-Balken

Dritter Ausbau des Hooks: Die Karte der Sektion nutzt eine **eigene, auf ASM/Niue+Zugbahn gefittete Projektion** (`makeFittedProjection`/`opts.fitTo` — Strichstärken bleiben px-ehrlich, der R34-Korridor füllt die Ansicht) mit **Kamera-Einflug** von der Beckensicht (`map/cameraLayer.js`, `storyFx.camera`, gCamera-Wrapper im Kompositor). `storyFx.focusOnly` blendet alle 68 Fremd-Tracks komplett aus; Land/Gitter leicht verblasst. **Sequenz:** Einflug (1,6 s) → Einzeichnen (2 s) → Bubble-Pop → Balken. Rechts flankiert ein **Vergleichs-Balkendiagramm** (`story/impactBars.js`, Höhe ∝ affected, gleiche Bubble-Farbe) mit **generierter** Headline „Same wind field — 33× the people affected" (round(23.060/702)) und Werten direkt an den Balken. 134 Checks grün.

### Hook-Upgrade v2 (2026-07-03, nach Layout v5): Wind-Korridor + Impact-Bubbles

Die Heta-Sektion verknüpft Wind und Betroffenheit jetzt visuell: **Wind-Korridor** (`map/swathLayer.js`, `storyFx.swath`) als halbtransparenter Akzent-Stroke um die Bahn — Radius **datengedeckt 370 km** (IBTrACS USA_R34 max-Quadrant, median; nahe Peak 407 km; ASM liegt 287 km, NIU 84 km vom Track → beide belegbar im Sturmwindfeld, die E2E-Suite prüft die Überdeckung geometrisch). **Impact-Bubbles** (`map/impactLayer.js`, `storyFx.impactBubbles`): Fläche ∝ Betroffene (23.060 vs. 702, generierte Direktlabels), Ozeanblau als Kontrast zum Korridor; ASM/NIU-Namenslabels im Hook unterdrückt (Bubble trägt den Namen). **Sequenz** beim Lazy-Mount: Linie+Korridor zeichnen sich synchron ein (DUR_DRAW), danach poppen die Bubbles (easeBackOut), Labels faden nach; reducedMotion alles instant. Quellenzeile des Steps um „gale-wind radius (R34): IBTrACS" erweitert.

### Layout v5 (2026-07-03, Briefing „linearer One-Pager") — FINAL

Fünfte Iteration, Architekturwechsel: **kein Sticky, kein Scrollama** — nativer Dokumentfluss. Je Step eine `<section>` (Text max. 700 px ÜBER der zentrierten Grafik, 11vh Weißraum). Umsetzung über **Mehrfach-Instanziierung** (der Fabrik-Vertrag aus plan/09 zahlt sich aus): je Sektion eigene Map-/Scatter-/SST-Instanzen mit **eingefrorenem Zustand** aus `steps[i].apply()` (lokaler Store, Gate zu); die letzte Sektion ist das voll interaktive Dashboard. **Lazy-Mount per IntersectionObserver** (30 % der Grafikzeile) → Einstiegsanimationen (Stripes, Linien-Draw, Heta-Track-Draw-in, neuer Punkte-Stagger) feuern beim Sichtbarwerden; `.viz-frame` mit `aspect-ratio` = null Layout-Shift. Abweichungen: S4 ohne Detailpanel (Overlay passt nicht in den Fluss), S5/S6 nur Scatter. `?step=N` = Anker, `?story=off` = nur Dashboard. storyRunner/Caption/progressNav/layoutController leben nur noch im Harness. Tag `layout-v4` sichert die Bühnen-Variante. 117 Checks grün; Hauptbundle 139 KB.

### Layout v4 (2026-07-03, „Master-Prompt"-Briefing) — Vollbild-Bühne (abgelöst durch v5)

Vierte und finale Layout-Iteration (v1 Overlay-Karten → v2 Papier-Bänder → v3 Side-by-Side → **v4 Vollbild-Bühne**): großzügige **Hero-Section** ohne Daten (großer Titel, drei sehr einfache Sätze mit `<strong>`-Kernbegriffen), danach je Step ein 100vh-Erlebnis — Grafik groß und mittig, Erklärtext als **Caption fest unten links** (eigene Grid-Zeile der Bühne `[Viz 1fr | Caption | UI-Bar]`, per Konstruktion überschneidungsfrei). Dual/Explore wieder **gleichwertig nebeneinander** (identische 3 %-Ränder), mobil gestapelt. Neue Komponente `story/storyCaption.js` (reine View, Fade-Wechsel des Step-Texts); storyRunner rendert nur noch unsichtbare 100vh-Trigger. Steps/storyFx/Mechanik unverändert; 133 Playwright-Checks grün.

### Layout-Revision v2 (2026-07-03, Nutzer-Briefing) — Papier-Bänder statt Overlay-Karten

Nach Sichtung des Overlay-Layouts entschied der Nutzer: keine schwebenden Textkarten über den Diagrammen. Neues Muster **„Papier-Bänder + Viz-Fenster"** (NYT-Stil): je Step ein solides Textband in voller Breite (zentrierte Spalte 640 px, linksbündig, Kicker „Step i of 8") ÜBER einem transparenten Fenster (~85vh), durch das die sticky Bühne als **zentrierter Vollbild-Held** sichtbar ist (map 4 %-Ränder, scatter 14 %, dual 2/51–53/2). Scrollama triggert auf dem Fenster (Step aktiv = Viz frei sichtbar); UI-Leiste weiterhin UNTERHALB der Views, nur im Explore-Modus. Mobile-Sonderfall entfiel (einheitliches Muster). Steps/storyFx/Komponenten/Mechanik unverändert — reiner Umbau von index.html, styles.css, storyRunner-Rendering. Alle 109 Checks nach Selektor-Anpassung grün.
