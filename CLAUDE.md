# Pacific-Datanvisualisierung — Agent-Leitfaden

Interaktive D3-Scrollytelling-Visualisierung „From Track to Toll": Pazifik-Wirbelstürme
2001–2026, Windstärke vs. menschliche/ökonomische Schäden. Studienprojekt (HSD Visual
Analytics) und Beitrag zur Pacific Dataviz Challenge 2026.

## Stack & Befehle
- Vanilla JS (ES Modules) + Vite 6 + D3 7 + scrollama. npm-Root ist `app/`, NICHT das
  Repo-Root: alle npm-Befehle in `app/` ausführen.
- Dev: `npm run dev` (Port 5173) · Build: `npm run build` · Tests: `npm test`
  (Node-nativer Runner, testet `../tests/*.test.mjs`)
- Vor jedem Commit: `npm run check` (Test + Build)
- Browser-Audit: `npm run test:browser` (Playwright via Python)
- Datenpipeline (aus Repo-Root, Anaconda-Python):
  `python3 scripts/build_track_to_toll.py --variant kurs|challenge|beide`
  Python-Deps (pandas, numpy, scipy, playwright) sind nirgends deklariert.
- Kein Lint-Setup.

## Struktur
- `app/src/`: `core/` (state, dataLoader, scales, config), `map/`, `scatter/`,
  `story/`, `ui/`, `harness/`. `main.js` ist der einzige Kompositionspunkt.
- `scripts/pipeline/`: Python-Pipeline, schreibt JSON nach `app/public/data/`
  (eingecheckt: das Frontend läuft auch ohne Pipeline-Lauf).
- `Data/`: Rohdaten, gitignored (EM-DAT-Lizenz). Ohne lokale Rohdaten schlägt die
  Pipeline fehl.
- `docs/`: maßgeblich sind `Feinkonzept_Thema2_Track-to-Toll.md` und `docs/plan/`.
  `KONZEPT.md` ist teils veraltet (breiterer Alt-Plan), `Tools.md` nur Kurs-Linkliste.

## Regeln & Stolperfallen
- Zwei Pipeline-Varianten: `kurs` (EM-DAT) und `challenge` (nur offene Daten,
  `*.challenge.json`). Output-Limit < 300 KB (assert im Build-Skript).
- Dev-Harness per URL-Query: `?mount=<key>&fixture=<key>`, `?step=N`, `?story=off`.
- Deploy: Push auf `main` → GitHub Actions → GitHub Pages
  (ozeanvisualisierung.yannik-h-huber.de).
