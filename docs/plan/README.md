# Umsetzungsplan — „From Track to Toll" (Schritt-für-Schritt)

> **Zweck:** Dieser Ordner übersetzt die Befunde der Multi-Agenten-Prüfung vom 2026-07-02 (Datenverifikation mit pandas, realer Join-Test, Statistik-Nachrechnung, Viz-/Technik-/Challenge-Gutachten, Red Team) in priorisierte, abarbeitbare Arbeitspakete. Jedes Dokument ist eigenständig: Ziel → Warum (Befund) → Schritte → Definition of Done.
>
> Übergeordnete Dokumente: [../../KONZEPT.md](../../KONZEPT.md) · [../Feinkonzept_Thema2_Track-to-Toll.md](../Feinkonzept_Thema2_Track-to-Toll.md)

**Stand:** 2026-07-02 · **Phase 1 — Kursabgabe: 24.07.2026 (22 Tage!)** · Phase 2 — Challenge-Einreichung: bis 31.08.2026, 23:00 Fidschi-Zeit (= 13:00 MESZ), erfolgt **nach** der Kursabgabe.

**Grundsatzentscheidung (2026-07-02):** Kompletter Neuaufbau — die 33 gelöschten Dateien der alten Umsetzung werden **nicht wiederhergestellt**, sondern als Löschung committet (Historie bleibt in Git einsehbar, Commit `368c70e`).

---

## Reihenfolge & Status

| # | Paket | Priorität | Aufwand | Hängt ab von | Status |
|---|---|---|---|---|---|
| 00 | [Repo-Neustart & OneDrive-Auszug](00_Repo-Sicherung.md) | 🔴 KRITISCH — vor allem anderen | ~1 h | — | ☐ |
| 01 | [Datenquellen-Entscheidung (EM-DAT-Blocker)](01_Datenquellen-Entscheidung.md) | 🔴 Teil A (Hygiene + Pipeline-Schalter) vor M1 · Teil B (Challenge-Quelle) nach 24.07. | A: ~1 h · B: 2–4 h | 00 | ☐ |
| 02 | [Feinkonzept-Korrekturen (Hook, Statistik, Einheit)](02_Feinkonzept-Korrekturen.md) | 🔴 HOCH — vor M1 | 2–3 h | 01A | ☐ |
| 03 | [M1: Datenpipeline](03_M1_Datenpipeline.md) | 🟠 HOCH | 6–12 h | 01A, 02 | ☐ |
| 04 | [M2: Basiskarte & Scatter (Kern-MVP)](04_M2_Basiskarte-und-Scatter.md) | 🟠 HOCH | 12–20 h | 03 | ☐ |
| 05 | [M3: Interaktion & CMV-Verknüpfung](05_M3_Interaktion-CMV.md) | 🟡 MITTEL | 8–14 h | 04 | ☐ |
| 06 | [M4: Scrollytelling & Story](06_M4_Scrollytelling-Story.md) | 🟡 MITTEL | 12–20 h | 05 | ☐ |
| 07 | [M5: Feinschliff & Barrierefreiheit](07_M5_Feinschliff-Barrierefreiheit.md) | 🟡 MITTEL — bei Zeitnot kürzbar | 8–14 h | 06 | ☐ |
| 08 | [M6: Abgabe, Deployment & Challenge](08_M6_Abgabe-Challenge.md) | 🟢 Kursteil bis 24.07. · Challenge-Teil bis 31.08. | 8–14 h | 07 | ☐ |
| 10 | [Scrollytelling: Gesamterzählung & Fluss](10_Scrollytelling-Narrativ-und-Fluss.md) | 🟡 MITTEL — nach M4, vor Feinschliff-Abnahme | 10–18 h | 06 | ☐ |

**Summe Phase 1 (00–07 + Kursteil 08):** ≈ 55–90 h auf 22 Tage ≈ **2,5–4 h/Tag — straff, aber machbar.** **Kritischer Pfad:** 00 → 01A → 02 → 03 (Pipeline) → 04 (Dateline-Karte = einziges technisches Neuland) → Rest ist additiv.

## Zeitplan (rückwärts von der Kursabgabe 24.07.)

| Zeitraum | Pakete |
|---|---|
| 02.–04.07. | 00 (Repo, ~1 h) · 01 Teil A (Lizenz-Hygiene + `--variant`-Schalter) · 02 (Feinkonzept-Fix) |
| 05.–08.07. | 03 — Pipeline mit Assertions |
| 09.–13.07. | 04 — Karte + Scatter (Dateline-Smoke-Test zuerst!) |
| 14.–16.07. | 05 — Interaktion/CMV |
| 17.–19.07. | 06 — Scrollytelling + Story-Texte |
| 20.–21.07. | 07 — Feinschliff (Kürzungskandidaten bei Zeitnot: Think-aloud auf 1 Person, 50m-Karte, Karten-Lasso streichen) |
| 22.–24.07. | 08 Kursteil — Recording, Doku, Paperwork + Puffer |
| 25.07.–31.08. | **Phase 2 (Challenge):** 01 Teil B (offene y-Quelle final), Challenge-Variante bauen, Deployment/URL, Registrierung, Einreichung mit ≥ 1 Woche Puffer |

**Nicht-verhandelbar trotz Zeitdruck:** korrekter Hook (Paket 02), Pipeline-Assertions (03), Missing-Data-Sichtbarkeit + n-Angabe (07) — das sind die Punkte, die direkt benotet werden.

## Die 6 kritischen Befunde, die dieser Plan löst

1. **EM-DAT-Lizenz-/Regel-Blocker** (Challenge §9 open data, §13 IP; kein offizieller PDH-Datensatz im Kerndesign) → Paket 01.
2. **Story-Hook faktisch falsch** (Mawar: 100.000 Betroffene, nicht ~700; Maila 2026 außerhalb C6-Fenster) → Paket 02, 06.
3. **Erwartungslinie absolut statistisch hohl** — pro Kopf signifikant (Pipeline-final: p=0,025, R²=0,065, n=78) → Pro-Kopf als Default → Paket 02, 03, 04.
4. **IBTrACS-Join ist Pflicht** (6 der Top-10-Events ohne EM-DAT-magnitude) + **USA_WIND einheitlich** (WMO/USA-Mix: bis ~15 % Bias) → Paket 03.
5. **Analyseeinheit ungeklärt** (99 Zeilen = 73 Stürme; Sturm-Land-Paar festschreiben) → Paket 02, 03.
6. **OneDrive-/Repo-Risiko akut** (33 unkommittierte Löschungen, .gitignore fehlt, neue Docs untracked) → Paket 00.

## Verifizierte Referenzzahlen (für alle Pakete)

| Kennzahl | Wert (geprüft 2026-07-02) |
|---|---|
| EM-DAT-Zeilen (= Sturm-**Land**-Paare) | 99 (2001–2026; 2025 leer) · 73 distinkte Stürme |
| Join EM-DAT↔IBTrACS (Name+Saison ±1) | 94/99 Zeilen; mit Apostroph-/Alias-Fix 97/99; 0 Mehrdeutigkeiten |
| Scatter-fähig (Intensität + Betroffene) | 74–78 Zeilen (nur EM-DAT-magnitude: 48) |
| Regression absolut / pro Kopf | **Pipeline-final (USA_WIND-Achse, n=78):** R²=0,006 (p=0,50) / **R²=0,065 (p=0,025)** · vorläufige Review-Werte auf EM-DAT-magnitude (n=45–48): 0,010 / 0,145 |
| Track-Volumen (gematchte Stürme) | ~5.800 Punkte → tracks.json 59 KB roh / 16 KB gzip |
| WPP-Bevölkerung | 21 Länder, 1950–**2023** → 7 Event-Zeilen (2024/2026) brauchen Forward-Fill |
| Top-Event | Winston 2016/FJI: 540.558 Betroffene — **kein** EM-DAT-magnitude, nur via Join |
| Hook-Fakten | Mawar 2023/GUM: 295 km/h, **100.000** Betroffene (60 % Guams) · Heta 2004: 300–310 km/h, ASM 23.060 vs. NIU 702 |
