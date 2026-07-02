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
- [ ] **Schritt 3 — Der Trend & seine Grenzen:** Linie + Quantilband einblenden, `R², n, p` als Annotation. Ehrlichkeitssatz direkt hier (nicht erst Schritt 6): *„Per capita, intensity explains ~15 % of the variance. In absolute terms: ~1 %. And part of what remains is exposure — how many people live in a storm's path — not only vulnerability."*
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
