# Paket 08 — M6: Abgabe, Deployment & Challenge-Einreichung

**Priorität:** 🟢 Kursteil bis **24.07.** · Challenge-Teil bis 31.08. · **Aufwand:** 8–14 h · **Abhängigkeiten:** 07 (für die finale Abgabe)

## Ziel

Beide Abgaben sind vollständig und regelkonform — in zwei Phasen:
- **(a) Kursabgabe am 24.07.2026** (Code-Pipeline, Screen-Recording, Doku, 2–3 Seiten Paperwork) — die primäre, harte Deadline.
- **(b) Challenge-Einreichung danach** (öffentliche URL, Problem Statement, Quellen, Registrierung — Deadline **31.08.2026, 23:00 Fidschi-Zeit = 13:00 MESZ**), auf Basis der Challenge-Variante aus Paket 01 Teil B.

## Rahmen klären

- [x] **1. Kurs-Abgabetermin:** ✅ geklärt — **24.07.2026** (22 Tage ab Planerstellung; Zeitplan siehe [README](README.md)). Noch offen: Einzel- vs. Teamleistung, geforderter Paperwork-Umfang, Form des Recordings — beim Dozenten/Kursmaterial verifizieren.
- [ ] **2. Challenge-Registrierung anschauen** (pacificdatavizchallenge.org, kann nach dem 24.07. erfolgen): Formularfelder (Problem Statement EN/FR ist Pflicht, §10), Einzel/Team-Kontaktperson, Einreichungsmodalitäten. Puffer ≥ 1 Woche vor Deadline einplanen.

## Kursabgabe

- [ ] **3. Screen-Recording (2–3 min):** Drehbuch = Story-Durchlauf aus Paket 06 + kurzer Toggle-/Detailpanel-Moment; auf Zielauflösung proben (Layout-Breakpoint!); Ton/Untertitel je nach Kursvorgabe.
- [ ] **4. Dokumentation:** README (Setup, Pipeline reproduzieren: `python scripts/build_track_to_toll.py --variant kurs`, `npm run build`), Datenherkunft, bekannte Grenzen.
- [ ] **5. Paperwork (2–3 Seiten, Deutsch)** — die Gliederung schreibt sich aus dem Projektverlauf fast von selbst:
  1. Domänenproblem & These (inkl. Confounder-Ehrlichkeit: Verwundbarkeit *und* Exposition),
  2. Datenlage & kritische Prüfung (Join-Verifikation, widerlegter Alt-Hook, Fallstricke aus KONZEPT §4.8),
  3. Design-Entscheidungen & verworfene Alternativen (16 Entscheidungen; Warum ② statt ①/⑨; warum Pro-Kopf-Default; warum keine Residuum-Farbe),
  4. Dimensionsherleitung (welche Kanäle unabhängig/abgeleitet/sequenziell — aus Paket 07),
  5. Evaluation (Think-aloud-Befunde) & Grenzen,
  6. KI-Transparenz-Statement (Kurs-Pflicht — und zugleich Absicherung gegen die Challenge-KI-Klausel: KI „supportive in nature", Eigenleistung = Themenwahl, Designentscheidungen, adversariale Datenprüfung; Entscheidungsdoku als Beleg).

## Challenge-Einreichung

- [ ] **6. Deployment:** GitHub Pages (statisch, kostenlos, langzeitstabil) mit der **Challenge-Variante** der Daten (Paket 01/03 — ohne EM-DAT). Verfügbarkeits-Pflicht: URL muss bis **31.08.2029** erreichbar bleiben (§10) — GitHub Pages erfüllt das realistisch; Repo öffentlich erst zur Einreichung schalten (Originalitätsklausel: vorher nicht anderweitig publizieren).
- [ ] **7. Sichtbarer Quellen-/Lizenzblock in der App** (Footer oder „About the data"-Panel, Zitierpflicht §9): IBTrACS v04r01 (NOAA/NCEI, public domain) · UN WPP (CC BY 3.0 IGO) · SPC/PDH-Datensätze (offizielle Liste, inkl. des Pflicht-Datensatzes aus Paket 01) · Basiskarte Natural Earth (public domain). Kurs-Variante zusätzlich: EM-DAT-Zitat (CRED/UCLouvain) mit Vermerk „internal/educational use".
- [ ] **8. Problem Statement (Englisch, ~1 Absatz):** Welches Problem adressiert die Viz, wie antwortet sie darauf, welche offiziellen Datensätze nutzt sie — aus These + Paket-01-Entscheidung destillieren; ins Registrierungsformular.
- [ ] **9. Compliance-Endkontrolle vor dem Absenden:**
  - Kein EM-DAT-Feld in deployten JSONs / im öffentlichen Repo (Assertion aus Paket 03 + Handstichprobe).
  - ≥ 1 offizieller Challenge-Datensatz nachweisbar im Kerndesign und im Problem Statement benannt.
  - Sprache der Viz/Erläuterungen: Englisch (§8 erfüllt).
  - UI-Texte enthalten keine Alt-Fakten (Grep nach „700", „Maila" je nach Fensterentscheidung).
  - Screenshot-/URL-Check auf einem fremden Gerät (Cache-frei).

## Zeitplan

Der verbindliche Zwei-Phasen-Zeitplan steht zentral in der [Plan-Übersicht](README.md): **Phase 1 (Kurs)** 02.–24.07. mit Recording/Doku/Paperwork am 22.–24.07.; **Phase 2 (Challenge)** 25.07.–31.08. mit Paket 01 Teil B, Challenge-Variante, Deployment und Registrierung (≥ 1 Woche Puffer vor der Deadline).

## Definition of Done

- **Phase 1 (24.07.):** Kursabgabe vollständig — Recording, Doku, Paperwork mit KI-Statement; Pipeline reproduzierbar (`--variant kurs`).
- **Phase 2 (31.08.):** öffentliche URL live (ohne EM-DAT), Quellenblock sichtbar, Problem Statement eingereicht, Registrierung bestätigt — vor dem 31.08.2026, 13:00 MESZ.
