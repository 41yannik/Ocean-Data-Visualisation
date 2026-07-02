# Paket 00 — Repo-Neustart & OneDrive-Auszug

**Priorität:** 🔴 KRITISCH — vor jeder weiteren Arbeit · **Aufwand:** ~1 h · **Abhängigkeiten:** keine

## Ziel

Sauberer Neustart-Stand im Git: Die alte Umsetzung ist als Löschung **festgeschrieben** (nicht wiederhergestellt — Entscheidung 2026-07-02: kompletter Neuaufbau), der neue Konzept-/Planstand ist committet und gepusht, die Arbeitskopie liegt außerhalb des OneDrive-Sync-Ordners, und lizenzgeschützte Rohdaten können nicht versehentlich committet werden.

> **Klarstellung:** Hier wird **nichts Altes zurückgeholt.** Die 33 als gelöscht angezeigten Dateien (alte App, alte Docs, alte Skripte) bleiben gelöscht; der Commit macht die Löschung nur offiziell. Die alte Umsetzung bleibt über die Git-Historie (Commit `368c70e`) einsehbar, falls je etwas nachgeschlagen werden soll.

## Warum (Befund)

- Das Projekt liegt im OneDrive-Ordner, der am 01.07. bereits `app/`, `docs/`, `scripts/`, `README.md` und `.gitignore` vom Datenträger gelöscht hat (KONZEPT §8).
- Aktueller Git-Zustand: 33 unkommittierte Löschungen, alle neuen Konzeptdokumente **untracked**, keine `.gitignore` auf der Platte — dadurch erscheinen `Data/` (inkl. EM-DAT, lizenzgeschützt; IBTrACS-CSVs 35+114 MB; Coastlines 2,3 GB) und `Developer API/` fälschlich als committbar.
- Ein zweiter Sync-Konflikt würde den gesamten Neustart-Stand (KONZEPT, Feinkonzept, Mockups, diesen Plan) vernichten — die neuen Dokumente existieren aktuell **nur** auf der OneDrive-Platte.

## Schritte

- [ ] **1. Frische `.gitignore` schreiben** (Neuaufbau — die alte wird nicht wiederhergestellt):
  ```gitignore
  .DS_Store
  node_modules/
  dist/
  /Data/
  /Developer API/
  # EM-DAT-Derivate nicht in ein öffentliches Repo (Lizenz, siehe Paket 01):
  app/public/data/events*.json
  ```
  Die letzte Zeile wird in Paket 01/03 verfeinert (Kurs-Variante privat vs. Challenge-Variante ohne EM-DAT).
- [ ] **2. Kontrolle vor dem Commit:** `git status` — es dürfen **keine** Dateien aus `Data/` oder `Developer API/` als "untracked" zum Adden erscheinen.
- [ ] **3. Neustart-Commit** (Löschungen festschreiben + neuen Stand aufnehmen, ein ehrlicher Schnitt):
  ```bash
  git add -A
  git commit -m "Neustart: alte Umsetzung entfernt; Konzept, Feinkonzept Track-to-Toll, Mockups, Umsetzungsplan"
  ```
  (Kein Co-Authored-By — Repo-Konvention: keine KI als Contributor.)
- [ ] **4. Push** zu `origin main` (machst du selbst, wie gewohnt) — damit liegt der Stand off-site.
- [ ] **5. Arbeitskopie aus OneDrive ausziehen:**
  ```bash
  mkdir -p ~/dev && cd ~/dev
  git clone <repo-url> pacific-dataviz
  ```
  Ab jetzt wird **nur noch in `~/dev/pacific-dataviz` entwickelt** (v. a. `node_modules` mit zehntausenden Kleindateien niemals in OneDrive). Die OneDrive-Kopie bleibt als Ablage für `Data/` (Rohdaten, nicht im Repo) und finale Abgabe-Artefakte.
- [ ] **6. Daten verfügbar machen:** `Data/` liegt nicht im Repo. Im Klon einen Verweis einrichten — entweder Symlink auf den OneDrive-`Data/`-Ordner oder einmalige lokale Kopie (~150 MB ohne Coastlines reicht; das 2,3-GB-GeoPackage wird nicht gebraucht).
- [ ] **7. Routine festlegen:** Nach jeder Arbeitssitzung Commit + Push. Story-/Konzeptdokumente sind ab jetzt genauso versioniert wie Code.

## Definition of Done

- `git status` ist sauber; die 33 Löschungen sind committet (nicht wiederhergestellt); Remote enthält den aktuellen Stand (KONZEPT.md, docs/ inkl. docs/plan/, Tools.md).
- Kein EM-DAT-/IBTrACS-/Coastlines-Rohdatensatz ist im Repo (Kontrolle: `git ls-files | grep -i data` liefert nur `app/public/data/`-Artefakte, sobald es sie gibt).
- Entwicklungs-Arbeitskopie existiert unter `~/dev/` außerhalb von OneDrive; ein Test-Commit von dort erreicht das Remote.
