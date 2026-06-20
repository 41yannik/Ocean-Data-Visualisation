# Masterplan — Immersive 3D-Globus-Scrollytelling-Visualisierung (D3)

> **Neues Projektziel (löst das Bubble-Plot-MVP als Hauptansicht ab).**
> Eine **scroll-gesteuerte 3D-Globus-Visualisierung** der pazifischen tropischen Zyklone/Taifune und
> ihrer **Betroffenheiten** — fürs Auge **direkt verständlich**, **ohne Data-Explorer, ohne
> Einzeldiagramme**: nur Karte, Sturm-Spuren, Stärke und Impact als visuelle Form.

## 1. Leitidee & Aussage
Der Nutzer **scrollt** durch eine Erzählung: ein rotierender Pazifik-**Globus** zeigt zunächst alle
Zyklon-Spuren (Dichte sichtbar), dann **fliegt** die Ansicht nacheinander zu einzelnen **betroffenen
Gebieten** (Fiji, Vanuatu, Tonga …). Dort wird ein **Hero-Sturm** animiert gezeichnet — **Farbe =
Stärke** (Saffir-Simpson), **Linie/Glow = Wind** — und die **Insel pulsiert als Impact-Halo**, dessen
Größe die **Betroffenen** zeigt. Kurze Annotationen liefern die **Aussage** ("Cyclone Winston, 2016 —
Kategorie 5 — 633.000 Betroffene auf Fiji").

**Kernbotschaft:** Wo der Pazifik von Stürmen getroffen wird, wie stark, wie dicht — und wer es trägt.

## 2. Was bewusst entfällt / ersetzt wird
- ❌ Data-Explorer-Tabelle, ❌ Achsen-/Bubble-Diagramme (bisheriges `bubbleChart`/`dataTable`).
- ✅ Stattdessen: **eine** zusammenhängende Karten-Visualisierung (Globus) mit Spuren + Impact-Glyphen.
- Das Bubble-Plot-MVP bleibt als Artefakt im Repo/History, ist aber nicht mehr die Hauptansicht.

## 3. Technik (State of the Art, reines D3 für die Visualisierung)
| Schicht | Wahl | Begründung |
|---|---|---|
| Geo-Render | **D3 `d3-geo` Orthographic-Projektion auf `<canvas>`** | echtes 3D-Globus-Gefühl, rein D3; Canvas skaliert mit vielen Track-Punkten |
| Rotation/Flug | **versor-Slerp + `d3.timer`/`transition`** | sanfter „Flug" zwischen Gebieten (Storybench-Methode) |
| Scroll-Steuerung | **scrollama** (IntersectionObserver) | performantes, vor/zurück-fähiges Scrollytelling |
| Land-Basis | **world-atlas `land-110m`** (+ `topojson-client`) | schlanke Welt-Silhouette, gebündelt (kein Laufzeit-Netz) |
| Daten-ETL | **Python** | IBTrACS + offizielle Impacts → schlanke `cyclones.json`/`islands.json` |

> WebGL-Alternativen (three.js/globe.gl) bewusst **nicht** — Vorgabe „D3 für die Visualisierung".

## 4. Datenpipeline (`scripts/build_globe_dataset.py`)
- **IBTrACS** (SP + WP, lokal): Spuren je Sturm → `{sid,name,season,basin,maxcat,pts:[[lon,lat,cat]]}`.
  Filter Season ≥ 1980, Becken SP (+ WP nahe Mikronesien); LON auf −180…180 normalisieren; Punkte
  ausdünnen (Heroes feiner). Kategorie aus `USA_SSHS`.
- **Inseln**: 21 PICT-Koordinaten (Haupt-/Hauptstadt) + **Betroffene je Jahr** aus
  `app/public/data/ocean.json` (offiziell `VC_DSR_AFFCT`, lizenz-sauber).
- Output (committet, lizenz-sauber): `app/public/data/cyclones.json`, `islands.json`.
- **EM-DAT bleibt draußen** (CC BY-NC-ND).

## 5. Erzähl-Stationen (Scroll-Steps, datengetrieben in `steps.js`)
1. **Intro** — ganzer Pazifik, alle Spuren schwach → "Der Pazifik der Stürme" (Dichte sichtbar).
2. **Winston 2016 → Fiji** (Cat 5, 633k Betroffene).
3. **Pam 2015 → Vanuatu** (Cat 5).
4. **Harold 2020 → Vanuatu/Tonga** (Cat 5).
5. **Outro** — zurück zur Übersicht, Kernbotschaft.
Jede Station: `focus:[lon,lat]`, `scale`, `storm sid`, `island iso3`, `headline`, `message`.

## 6. Dimensionen (visuell, ohne Diagramm)
Lat · Lon (Globus) · **Stärke** (Spur-Farbe = Saffir-Simpson) · **Wind** (Linien-Glow/Breite) ·
**Zeit** (Track-Animation) · **Betroffene** (Insel-Halo-Größe) · **Dichte** (Überlagerung aller Spuren).
→ deutlich ≥ 5 Kanäle, alle als unmittelbar lesbare Form.

## 7. Architektur (Frontend)
Statisch (GitHub Pages, kein Backend). Sticky-`<canvas>`-Globus, darüber scrollende Text-Steps.
```
app/src/
  main.js     # laden, Globus init, scrollama verdrahten
  globe.js    # d3-geo Canvas-Globus: render(state), flyTo(target,scale), drawTracks, drawImpact
  scroller.js # scrollama: Step-Index → Globus-State
  steps.js    # Erzähl-Stationen (Daten)
  geo.js      # versor/Interpolation-Helfer
  styles.css  # Scrolly-Layout (sticky graphic + steps)
scripts/build_globe_dataset.py
```

## 8. Schritt-für-Schritt (MVP, durchgehend)
S1 ETL → `cyclones.json`/`islands.json`. · S2 Globus rendert (Land + Rotation, Canvas). ·
S3 Spuren zeichnen (Farbe=Kategorie) + Dichte-Backdrop. · S4 scrollama-Steps + versor-Flug zu Gebieten. ·
S5 Hero-Sturm-Highlight + Track-Animation. · S6 Impact-Halo (Betroffene, pulsierend). ·
S7 Annotationen/Botschaft + Feinschliff (Legende Kategorie, reduced-motion, responsive). ·
S8 Playwright-Test (scrollt Steps, Screenshots) + objektives Self-Review.

## 9. Verifikation
Globus rendert ohne Fehler; Scrollen wechselt Steps und fliegt zum Zielgebiet; Hero-Track erscheint
kategorie-gefärbt; Insel-Halo skaliert mit Betroffenen; keine JS-Fehler; Screenshots je Step.

## 10. Self-Review-Kriterien (objektiv)
Lesbarkeit ohne Erklärung · „Aussage" je Station klar · reine Visualisierung (kein Tabellen-/Diagramm-
Krücke) · Performance (Canvas, ausgedünnt) · Farbskala farbsehschwäche-tauglich · D3-Handwerk sichtbar.
