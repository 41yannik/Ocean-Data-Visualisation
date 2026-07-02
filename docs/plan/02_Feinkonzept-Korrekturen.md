# Paket 02 — Feinkonzept-Korrekturen (Hook, Statistik, Analyseeinheit)

**Priorität:** 🔴 HOCH — vor M1, weil Hook/Einheit/Statistik die Pipeline-Spezifikation bestimmen · **Aufwand:** 2–3 h · **Abhängigkeiten:** 01

## Ziel

Das Feinkonzept ist faktisch korrekt, in sich konsistent und statistisch verteidigbar — jede Zahl darin hält einer Prüfung gegen die echten Daten stand.

## Warum (Befund)

Die Prüfung fand im Feinkonzept vier belegte Fehler/Inkonsistenzen: (1) Hook-Zahlen falsch (Mawar „~700" → real **100.000**; Faktor 143), (2) Anker-Beispiel Maila (2026) liegt außerhalb des eigenen Zeitfensters C6 (2000–2024), (3) die „Erwartungslinie" ist absolut nicht signifikant (R²=0,010, p=0,49; KI der Steigung schließt 0 ein), pro Kopf aber schon (R²=0,145, p=0,0099), (4) die Analyseeinheit ist als [OFFEN] markiert, obwohl der Status „vollständig definiert" behauptet.

## Schritte (konkrete Änderungen am Feinkonzept)

### A. Hook & Story-Fakten (§1, §4 Schritt 1)

- [ ] **Neuer Hook — Empfehlung Heta 2004** (intensitätskontrolliert, stärkste Erzählung): *Ein einziger Zyklon, ~300 km/h — 23.060 Betroffene in Amerikanisch-Samoa, 702 auf Niue.* Gleicher Sturm, zwei Gesellschaften → der Unterschied ist nicht der Sturm.
  - Alternative: Winston 2016/Fidschi (540.558 Betroffene — größtes Event; Achtung: Intensität nur via IBTrACS-Join, kein EM-DAT-magnitude) vs. Mawar 2023/Guam (295 km/h, stärkster gemessener Wind, 100.000 Betroffene).
- [ ] **Falsche Zahlen entfernen:** „Mawar ~700 Betroffene" streichen (real 100.000 = 60 % der Bevölkerung Guams — pro Kopf Platz 5!); „Heta/Ami schwächer als Mawar" streichen (Heta war mit 300–310 km/h stärker; nur Ami mit 150 km/h war schwächer).
- [ ] **Beleg-Absatz §1 neu schreiben** mit verifizierten Zahlen; Verweis auf das Mockup entfernen oder Mockup neu rendern (das PNG enthält die falschen Labels).

### B. Zeitfenster C6 konsistent machen

- [ ] Entscheiden und überall einheitlich eintragen — zwei saubere Optionen:
  - **Empfehlung: 2001–2026** („alle verfügbaren Ereignisse") mit explizitem Caveat: 2025 leer, 2026er-Einträge jung und revisionsanfällig (EM-DAT kann Maila-Zahlen noch ändern), WPP-Bevölkerung wird ab 2024 mit dem 2023-Wert fortgeschrieben. Gewinn: Maila (340.641 Betroffene, Platz 2) und Kevin/Judy bleiben in der Story.
  - Konservativ: 2001–2023 (faktisches Datenende) — dann **alle** 2026er-Beispiele (Maila, Sinlaku) konsequent aus Story und Texten streichen.
  - Nicht haltbar: „2000–2024" (Daten beginnen 2001, 2024 hat 1 namenlose Zeile, und Maila läge draußen).

### C. Statistik & Encoding (C2, C3)

- [ ] **C3 ändern: Pro Kopf wird Default**, absolut wird der Toggle. Begründung ins Dokument: pro Kopf ist die Intensitätsbeziehung signifikant (R²=0,145, p=0,0099, n=45) und kleine Inseln werden nicht systematisch unterdrückt.
- [ ] **C2 umformulieren:** Statt „Residuum = Verwundbarkeit" → „Abweichung vom Intensitätstrend als Hinweis auf **Verwundbarkeit und Exposition**". Ergänzen: Residuum korreliert r=0,45 mit log(Bevölkerung) — große Länder liegen strukturell oben; ein Satz Konfundierungs-Ehrlichkeit gehört in Story-Schritt 3, nicht nur in Schritt 6.
- [ ] **Die flache Absolut-Linie zur Pointe machen:** „Windstärke erklärt ~1 % der Varianz" ist der Befund, nicht ein Makel. Linie mit R²/n annotieren; statt reiner OLS-Linie ein Quantil-/Konfidenzband vorsehen.
- [ ] **C4 präzisieren:** Intensitätsachse = durchgängig **USA_WIND** (1-min, kt) — bei 100 % der gematchten Stürme vorhanden; WMO nicht mischen (basin-abhängiger Bias bis ~15 %). EM-DAT-magnitude (km/h ÷ 1,852) nur als markierter Fallback (bringt netto nur ~4 Punkte).

### D. Analyseeinheit festschreiben (§2 [OFFEN] auflösen)

- [ ] **Sturm-Land-Paar = Grundeinheit** (99 Zeilen; 73 distinkte Stürme; Pam 5×, Heta/Harold je 4×). Konsequenzen dokumentieren:
  - Scatter: vertikale Punktstapel bei Multi-Country-Stürmen sind **Feature, nicht Bug** — gleicher Sturm, unterschiedliche Folgen (Harold 2020: 25.000–180.000 Betroffene in 4 Ländern) ist das beste Argument der These. Punkte eines Sturms optional dünn verbinden.
  - Detailpanel: aggregiert je **Sturm** (alle Länderzeilen + eine Zugbahn).
  - Brushing: Mapping Track↔Punkte ist 1:n — explizit ins Interaktionskonzept (Paket 05).
  - Regression: Punkte sind nicht unabhängig (Cluster je Sturm) — als Limitation in Paperwork/Schritt 6 erwähnen.

### E. Kleinere Konsistenz-Fixes

- [ ] Join-Abdeckung im Dokument aktualisieren: real 94/99 (97 % der Stürme), mit Namens-Fixes 97/99 — nicht „~84/99".
- [ ] Mehrdimensionalitäts-Claim ehrlich herleiten: Residuum ist aus x/y abgeleitet, Kategorie korreliert mit x, Zeit läuft sequenziell → einen echten unabhängigen Kanal zurückholen (Empfehlung: **Tote als Punktgröße**, 44/99; fehlend = Minimalgröße + „nicht gemeldet"-Marker) — Details Paket 07.
- [ ] Status-Zeile des Feinkonzepts erst wieder auf „vollständig definiert" setzen, wenn A–D eingearbeitet sind.
- [ ] Änderungshistorie des Feinkonzepts um einen Eintrag „Review-Korrekturen 2026-07" ergänzen (gut für die Paperwork: zeigt adversariale Selbstprüfung).

## Definition of Done

- Kein Zahlenwert im Feinkonzept widerspricht den CSVs (Stichprobe: Hook-Zahlen, Join-Quote, n-Angaben, Zeitfenster).
- C2/C3/C4 sind umformuliert (Pro-Kopf-Default, Trend-Framing, USA_WIND); Analyseeinheit ist entschieden und nicht mehr [OFFEN].
- Story-Schritte in §4 referenzieren nur noch Ereignisse innerhalb des gewählten Zeitfensters.
