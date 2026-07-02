# Paket 04 — M2: Basiskarte & Scatter (Kern-MVP)

**Priorität:** 🟠 HOCH — größter Einzelblock, enthält das einzige technische Neuland (Dateline) · **Aufwand:** 12–20 h · **Abhängigkeiten:** 03

## Ziel

Das statische Verbund-Panel steht: links dateline-zentrierte Pazifikkarte mit IBTrACS-Zugbahnen und Insel-Punkten, rechts Scatter (Intensität × Betroffene pro Kopf, log) mit Trend/Quantilband — beide aus den Pipeline-JSONs gerendert.

## Projekt-Setup (mit erledigen)

- [ ] **Vite + D3 v7 Gerüst** in `app/` (im Klon unter `~/dev/`, nicht in OneDrive!): `npm create vite@latest`, `npm i d3 topojson-client`, `npm i -D world-atlas`.
- [ ] **Basiskarte:** `land-110m.json` aus `world-atlas` (~110 KB, Natural Earth, public domain) nach `app/public/data/` kopieren und einchecken. ⚠️ 110m enthält kleine PICTs (Tuvalu, Niue, Tokelau, Atolle) **nicht** — die 22 Insel-**Zentroid-Punkte** aus der Pipeline sind daher Pflicht-Layer, nicht Deko. Optional später `land-50m` (~600 KB) auf den Kartenausschnitt zugeschnitten.
- [ ] **Modulstruktur** (Module kommunizieren nur über den State, Details Paket 05):
  ```
  app/src/main.js · state.js · scales.js · map.js · scatter.js · detail.js · story.js · steps.js · styles.css
  ```

## Schritte — Karte (`map.js`)

- [ ] **1. Projektion:** `d3.geoEquirectangular()` (oder `geoNaturalEarth1`) mit **`rotate([-192, 0])`** für Dateline-Zentrierung. **Regel: Pazifik-Zentrierung ausschließlich über die Projektion**, niemals Daten verschieben oder Punkte einzeln mit `xScale(lon)` platzieren — D3 interpoliert Track-Segmente über die Datumsgrenze korrekt als Großkreis und clippt am Antimeridian.
- [ ] **2. Smoke-Test zuerst** (De-Risking): einen einzelnen dateline-kreuzenden SP-Sturm als `LineString` durch `d3.geoPath` rendern. Kein horizontaler Streifen quer über die Karte = bestanden. Erst dann alle Tracks.
- [ ] **3. Alle Tracks rendern:** ~67 SVG-Pfade (verifiziert unkritisch, kein Canvas nötig). Grundzustand entsättigt/dünn (Opazität ~0,3); Kategorie sparsam kodieren (Strichstärke oder gedämpfte sequenzielle Rampe — **nicht** als kräftige zweite Farbskala, siehe Farbarchitektur Paket 07).
- [ ] **4. Insel-Layer:** 22 PICT-Zentroide als Punkte + Land aus TopoJSON; dezente Beschriftung der Story-relevanten Inseln (Fidschi, Vanuatu, Niue, Guam, …).
- [ ] **5. Kartenausschnitt:** auf PICT-Region beschneiden (`fitExtent` auf Bounding Box ~[130°E … 130°W, 25°S … 25°N]), Graticule dezent.

## Schritte — Scatter (`scatter.js`)

- [ ] **6. Achsen:** x = `intensity_kt` (linear, Label „max. sustained wind (USA agency, kt)"), y = Betroffene **pro Kopf** (log) als Default (Paket 02); `log10(x+1)`-Absicherung ist datenseitig unkritisch (kein affected=0, verifiziert).
- [ ] **7. Punkte:** ~74–78 Events als Kreise; `data-key` = Event-ID (`disno`) für Objektkonstanz bei Transitions. Fallback-Intensitäten (`intensity_source == "emdat_fallback"`) mit gestricheltem/offenem Umriss.
- [ ] **8. Trend + Band statt nackter OLS-Linie:** Linie aus `meta.json`-Fit-Parametern zeichnen + Quantil-/Konfidenzband; Annotation direkt an der Linie: `R² = 0.15, n = 45, p < 0.01` (pro Kopf) bzw. `R² = 0.01 — wind alone predicts almost nothing` (absolut). Die Flachheit der Absolut-Linie ist die Pointe, nicht ein Fehler.
- [ ] **9. Multi-Country-Stapel:** Punkte desselben Sturms (gleiche x-Position) optional mit hauchdünner vertikaler Verbindungslinie („gleicher Sturm — unterschiedliche Folgen"); minimales x-Jitter nur falls nötig.
- [ ] **10. n-Anzeige:** sichtbare Angabe „n = 74 of 99 storm-country entries shown" unter dem Scatter (Missing-Data-Ehrlichkeit, wird in Paket 07 zur Rug-Leiste ausgebaut).

## Definition of Done

- `npm run dev` zeigt Karte + Scatter nebeneinander aus echten Pipeline-Daten; Dateline-Smoke-Test bestanden; keine Streifen-Artefakte.
- Pro-Kopf ist die Default-y-Achse; Trendlinie + Band + R²/n-Annotation sind sichtbar; Winston/Heta/Harold/Mawar sind als Punkte auffindbar und korrekt platziert.
- Statischer Build (`npm run build`) läuft offline; Gesamtgröße `dist/` < 1 MB.
