# Paket 07 — M5: Feinschliff, Farbarchitektur & Barrierefreiheit

**Priorität:** 🟡 MITTEL · **Aufwand:** 8–14 h · **Abhängigkeiten:** 06

## Ziel

Die Visualisierung ist visuell diszipliniert (eine Farbsemantik), ehrlich (Missing Data sichtbar), zugänglich (E3 eingelöst) — und der Mehrdimensionalitäts-Anspruch hält strenger Prüfung stand.

## Farbarchitektur (löst zwei Review-Risiken auf einmal)

**Befund:** Zwei gleichzeitige Farbskalen (Karte: Kategorie sequenziell; Scatter: Residuum divergierend) erzeugen Legendenlast, Verwechslung („rot heißt links etwas anderes als rechts") und brechen die Objektidentität beim Brushing. Zudem ist die divergierende Residuum-Farbe **redundant** — sie kodiert, was die Position relativ zur Linie schon zeigt.

- [ ] **1. Eine bedeutungstragende Farbskala gleichzeitig:** Karte im Grundzustand entsättigt (Grautöne/gedämpft), Sturmkategorie als **Strichstärke** oder sehr gedämpfte sequenzielle Rampe.
- [ ] **2. Der eine kräftige Akzentton (E1) ist exklusiv reserviert** für Hover-/Brush-/Story-Highlight — identisch in beiden Views (Halo/Outline). Damit ist „gleiche Farbe = gleicher Sturm" immer wahr.
- [ ] **3. Residuum-Farbe im Scatter streichen.** Über/unter dem Trend kommunizieren Position + Band + Annotationen. Dadurch wird der Farbkanal frei für:
- [ ] **4. Echten fünften Kanal zurückholen — Tote als Punktgröße** (`total_deaths`, 44/99): Wurzelskala, fehlend = kleinste Größe + andersartiger Marker (z. B. dünner Ring) mit Legendeneintrag „deaths not reported". Alternativ/ergänzend: Subregion als dezente Punktfarbe (kategorial, farbenblind-sicher). → Dimensionszählung danach ehrlich: Intensität (x) · Betroffene pro Kopf (y) · Tote (Größe) · Sturm/Land (Karte+Link) · Zeit (Filter) — belastbar ≥ 5.
- [ ] **5. Paletten:** ColorBrewer/Viridis-Familie, mit einem Simulator (z. B. Sim Daltonism) auf Deuteranopie/Protanopie prüfen; nie Rot-Grün-Kontrast als einziges Unterscheidungsmerkmal.

## Missing Data sichtbar machen (Kursinhalt!)

- [ ] **6. Rug-/Strip-Leiste** am unteren Scatter-Rand: Events **mit** Intensität aber **ohne** Betroffenenzahl (als kleine Striche auf der x-Achse) — sie verschwinden nicht mehr stillschweigend.
- [ ] **7. Fallback-Kennzeichnung:** `intensity_source == "emdat_fallback"` → offener/gestrichelter Kreis; Legende erklärt den Quellen-Mix (IBTrACS 1-min-Wind vs. umgerechnete EM-DAT-km/h).
- [ ] **8. Dynamische n-Angabe** je Ansicht/Story-Schritt („n = 74 of 99 storm-country entries; 20 lack impact data").
- [ ] **9. `pop_extrapolated`-Flag** (2024–2026er-Events mit fortgeschriebener Bevölkerung) im Tooltip ausweisen.

## Barrierefreiheit (E3 konkret einlösen)

- [ ] **10.** Alt-Texte/`aria-label` für beide Grafiken (je Story-Schritt aktualisiert: „Scatterplot showing…"), Detailpanel als `role="dialog"`.
- [ ] **11.** Tastaturpfad komplett: Schritte (Pfeiltasten), Punkte (Tab/Enter), Panel (Esc) — aus Paket 05/06 zusammenführen und testen.
- [ ] **12.** Kontrast ≥ 4.5:1 für Text, ≥ 3:1 für grafische Kernelemente; Fokus-Indikatoren sichtbar.
- [ ] **13.** `prefers-reduced-motion` global respektiert (Transitions → sofortige Zustandswechsel).

## Übriger Feinschliff

- [ ] **14. Legenden** je Panel verankert (nie zwei gleichfarbige Skalen mit verschiedener Bedeutung sichtbar); Einheiten überall (kt, per-capita-Definition).
- [ ] **15. Freie-Erkundung-Startzustand:** Tracks Opazität ~0,3, sinnvolle Default-Filter, Reset-Button.
- [ ] **16. Mini-Evaluation (Red-Team-Blindspot):** Think-aloud mit 2–3 Kommilitonen (je 10 min): Verstehen sie Hook, Trendband und den Toggle ohne Erklärung? 5-Sekunden-Test des Hooks. Befunde kurz protokollieren → wandert als Evaluationsabschnitt in die Paperwork (starkes Bewertungsargument).
- [ ] **17. Mockup ersetzen:** `docs/mockups/t02_track_to_toll.png` neu rendern (enthält die widerlegten Zahlen/Labels) oder als „superseded" markieren, damit der Alt-Fehler nicht in Präsentation/Doku zurückwandert.

## Definition of Done

- Nur eine bedeutungstragende Farbskala gleichzeitig sichtbar; Akzentton ausschließlich Highlight; Farbenblind-Simulation bestanden.
- Tote-als-Größe (oder Subregion-Farbe) implementiert; Dimensionsherleitung als Notiz für die Paperwork festgehalten.
- Rug-Leiste, Fallback-Markierung und n-Angaben sichtbar; Tastatur-/Reduced-Motion-/Kontrast-Checks bestanden; Mini-Evaluation durchgeführt und protokolliert.
