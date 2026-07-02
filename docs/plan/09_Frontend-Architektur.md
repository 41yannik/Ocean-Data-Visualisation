# Paket 09 — Frontend-Architektur (bindend für Pakete 04–07)

**Status:** beschlossen 2026-07-02 · **Zweck:** Strikt modularer Aufbau — jede Komponente wird **einzeln** gecodet, isoliert verifiziert und erst dann komponiert. Anpassungen bleiben dadurch immer lokal (eine Datei), niemals gesamtheitlich.

---

## 1. Der eine Komponentenvertrag (gilt ausnahmslos)

```js
createX(container, ctx) → { update(state, patch), destroy() }

// ctx = { data, meta, bus, config }
//   data   = { events, tracks, land, index: { bySid: Map<sid, event[]>, byId: Map<id, event>, centroids } }
//   meta   = meta.json (Fits beider Modi, n, Caveats)
//   bus    = Store — Komponenten nutzen AUSSCHLIESSLICH bus.set(patch) für Outputs
//   config = Konstanten (Farben, Dauern, Breakpoint) aus core/config.js
```

**Regeln:**
1. **Input nur über `update(state, patch)`** — aufgerufen vom Kompositor (`main.js`) bzw. der Harness. `patch === undefined` ⇒ Vollrender. Komponenten entscheiden selbst per Patch-Check, ob sie reagieren (Delta-Rendering, Klassen-Toggles).
2. **Output nur über `bus.set(patch)`.** Nie direkter Aufruf einer anderen Komponente, **keine Quer-Imports** zwischen Komponenten.
3. **Kein Selbst-Subscribe.** Nur `main.js`/Harness subscriben am Store und verteilen Updates in **deterministischer Reihenfolge** — in der Harness ist jede Komponente damit ohne App direkt ansteuerbar (`component.update(fixtureState)`).
4. **Layer-Komposition als einzige Ausnahme:** Karte und Scatter sind dünne Kompositoren, die Kind-Layern einen erweiterten `layerCtx` geben (`{...ctx, geo}` bzw. `{...ctx, scales}`). Eltern-Kind, kein Quer-Import; Layer kennen einander nicht.

## 2. Zentraler Store (`core/state.js`)

```js
createStore(initial) → { get(), set(patch), subscribe(fn) }   // fn(state, patch)
// shallow-merge + Shallow-Equality-Guard (No-Op-Patches lösen kein Notify aus)
```

State-Shape:

```js
{
  hover: null | { sid, eventId|null, x, y, source: 'map'|'scatter' },  // EIN Objekt = EIN Patch pro Mausbewegung
  selectedEventIds: null | Set,   // Brush — immer ERSETZEN (neues Set), nie mutieren (Equality-Guard!)
  detailSid: null | sid,
  mode: 'perCapita' | 'absolute', // pro Kopf = Default (C3)
  filters: { yearRange: [2001, 2026], categories: null, countries: null },
  step: -1,                       // -1 = frei; 0..7 = Story (0 = SST-Intro)
  exploreUnlocked: false,
  reducedMotion: bool             // einmalig aus matchMedia
}
```

Bewusst **nicht** im State: Daten-Indizes (`ctx.data.index`), Skalen, Projektionen, DOM-Referenzen.

## 3. Komponenten & Verantwortungen

| Komponente | Verantwortung | abonnierte Felder | löst aus | bewusst NICHT |
|---|---|---|---|---|
| `map/index.js` | SVG-Skelett, `<g>`-Reihenfolge **land→graticule→tracks→centroids→labels**, Projektion+`geoPath` (Besitz), Resize | durchreichen | — | rendert nichts Sichtbares; keine Interaktionslogik |
| `map/basemapLayer` | Land (110m) + Graticule, einmalig | — | — | kleine Atolle (macht centroids) |
| `map/tracksLayer` | ~67 Pfade; Opazität 0,3; **Kategorie = Strichstärke**; Highlight-Klassen | `hover`, `selectedEventIds`, `detailSid`, `filters`, `step` | `hover`, `detailSid` | Tooltip-Inhalt; Scatter-Kenntnis (1:n via `index.bySid`) |
| `map/centroidsLayer` | 22 PICT-Zentroide + Story-Labels | `filters.countries`, `hover` | — | Klick-Filter (Kür) |
| `scatter/index.js` | SVG-Skelett, `<g>`-Reihenfolge **band→trend→connectors→brush→points→annotations**, **besitzt `scales`**, aktualisiert sie bei `mode` VOR Layer-Delegation | `mode`, Rest durchreichen | — | Fits berechnen (kommen aus meta.json!) |
| `scatter/axesLayer` | Achsen + Labels + **n-Caption**, Mode-Transition | `mode`, `filters` | — | Punkte/Trend |
| `scatter/pointsLayer` | Punkte (`data-key`=disno), Tote=Radius, Fallback=gestrichelt, Multi-Country-Connectors, Rug-Leiste, Tab/Enter | `hover`, `selectedEventIds`, `detailSid`, `mode`, `filters`, `step` | `hover`, `detailSid` | Trend; Brush; Karten-Kenntnis |
| `scatter/trendLayer` | Linie + Quantilband + R²/n/p-Annotation aus `meta.fits[mode]` | `mode`, `step` | — | selbst fitten; Residuum-Farbe (entfällt, E2) |
| `scatter/brushLayer` | `d3.brush` → Event-IDs | `mode` (Reset), `exploreUnlocked` | `selectedEventIds` | Karten-Dimming (macht tracksLayer) |
| `ui/tooltip` | Singleton-Div, Inhalt + Position aus `hover` | `hover` | — | eigene SVG-Listener |
| `ui/detailPanel` | `role="dialog"`, Mini-Track (**eigene** Projektions-Instanz!), Ländertabelle je Sturm, Esc/× | `detailSid` | `detailSid: null` | Haupt-Projektion wiederverwenden (verboten) |
| `ui/legend` | Strichstärke=Kategorie, gestrichelt=Fallback, Akzent=Highlight, Größe=Tote | `mode`, `step` | — | zweite Farbskala |
| `ui/modeToggle` | Umschalter + „re-fitted"-Hinweis | `mode` | `mode` | die Transition (Ownership: Scatter-Kompositor) |
| `ui/filterPanel` | Jahr/Kategorie/Land; erst ab `exploreUnlocked` | `filters`, `exploreUnlocked` | `filters` (komplett ersetzen) | Anwenden (machen Layer) |
| `ui/progressNav` | Punkte-Leiste, Prev/Next, Pfeiltasten | `step` | `step` | Scroll-Beobachtung |
| `story/steps.js` | reine Daten: `[{id, title, html, apply(state)→patch}]`; `apply` liefert **vollständigen** Story-Patch (idempotent — Rückwärts-Scrollen!) | — | — | DOM; hart getippte Zahlen (nur `{{event('heta','NIU').affected}}`-Refs) |
| `story/resolveRefs.js` | `{{…}}`-Refs gegen events.json auflösen; **wirft** bei unbekannter Referenz | — | — | Formatierung (→ format.js) |
| `story/storyRunner` | Scrollama-Wiring; bei Step-Enter `bus.set({step, ...apply(state)})`; Schritt 7 → `exploreUnlocked` | `step` (Sync bei progressNav), `reducedMotion` | `step`, Story-Patches | direkte DOM-Manipulation an Views (verboten) |
| `intro/sstStripes` | SST-Klimakontext (Schritt 0) aus `sst.json` — kleine eigenständige Komponente | `step` | — | Interaktion (rein illustrativ) |

**1:n-Semantik (Sturm ↔ Sturm-Land-Punkte):** Jeder Layer löst `hover.sid`/`hover.eventId` selbst über `ctx.data.index` auf — tracksLayer highlightet bei `hover.eventId` den einen Track; pointsLayer highlightet bei `hover.sid` alle n Punkte + Geschwister dezent. Testfälle: **Harold 2020 = 1 Track ↔ 4 Punkte, Pam 2015 = 1 ↔ 5.**

## 4. Dateibaum

```
app/
├── index.html          # sticky Panel (Karte+Scatter+UI-Leiste) + Scroll-Spalte
├── vite.config.js      # base: './' — SOFORT setzen (offline/file://-tauglich)
├── package.json        # d3, topojson-client, scrollama; devDep: world-atlas
├── public/data/        # events.json*, tracks.json, meta.json*, sst.json, land-110m.json  (* gitignored, Kurs-Variante)
└── src/
    ├── main.js         # Router: ?mount=… → Harness, sonst runApp(); EINZIGER Kompositionspunkt
    ├── core/   state.js · dataLoader.js · scales.js · format.js · config.js
    ├── map/    index.js · basemapLayer.js · tracksLayer.js · centroidsLayer.js
    ├── scatter/index.js · axesLayer.js · pointsLayer.js · trendLayer.js · brushLayer.js
    ├── ui/     tooltip.js · detailPanel.js · legend.js · modeToggle.js · filterPanel.js · progressNav.js
    ├── intro/  sstStripes.js
    ├── story/  storyRunner.js · steps.js · resolveRefs.js
    ├── harness/harness.js · registry.js · fixtures.js
    └── styles.css
```

`core/scales.js` (pure Fabriken): `makeXScale`, `makeYScale(mode,…)`, `makeRScale` (Tote, Wurzel), `makePacificProjection(w,h)` = `geoEquirectangular().rotate([-192,0])` + `fitExtent` auf PICT-Bbox, `strokeForCategory(sshs)`. `core/dataLoader.js`: lädt die 4+1 JSONs, baut `index`, wirft mit klarer Meldung („run scripts/build_track_to_toll.py --variant kurs"), wenn `events.json` fehlt (gitignored!).

## 5. Isolations-Strategie: Dev-Harness

```js
// main.js
const q = new URLSearchParams(location.search);
if (q.get('mount')) (await import('./harness/harness.js')).runHarness(q.get('mount'), q.get('fixture'));
else runApp();
```

- Harness lädt die **echten** Pipeline-JSONs (Pipeline existiert vor der App); einzige Ausnahme: handkodierte dateline-kreuzende LineString für `?mount=map.smoke`.
- Mountet **genau eine** Komponente aus `registry.js` (`data`, `map.smoke`, `map.basemap`, `map.tracks`, `map.centroids`, `map`, `scatter.axes`, `scatter.points`, `scatter.trend`, `scatter`, `tooltip`, `detail`, `legend`, `toggle`, `filters`, `nav`, `sst`, `story`).
- Rendert eine **Patch-Button-Leiste** aus `fixtures.js` (`hoverHarold`, `hoverHetaNiue`, `selectTop5`, `detailHarold`, `modeAbsolute`, `step0`…`step7`, `filter2016`) — jeder Button feuert `store.set(patch)`. Zusätzlich `window.store` für Konsolen-Patches.
- **Abnahmeregel: Eine Komponente gilt als fertig, wenn sie unter `?mount=<key>` mit allen relevanten Fixtures korrekt reagiert. Erst dann wird sie in `runApp()` registriert.** Bugfixes reproduziert man immer zuerst über die Harness-URL der einen Komponente.

## 6. Bekannte Stolpersteine (einbauen, nicht entdecken)

1. **Hover-Chattiness:** `hover` ist EIN Objekt → ein Patch pro Mausbewegung; Equality-Guard im Store. Klassen-Toggles reichen (74 Punkte / 67 Pfade), kein Quadtree.
2. **Toggle-Transition:** Skalen-Ownership beim Scatter-Kompositor; alle Layer nutzen `transition('mode').duration(config.DUR_MODE)` — benannte Transition verhindert Interrupt-Chaos bei Doppel-Toggle. `modeToggle` animiert nichts.
3. **Brush-Overlay schluckt Pointer-Events:** `<g class="brush">` VOR `<g class="points">` anlegen (Punkte oben).
4. **Story-Idempotenz:** `apply()` liefert immer den vollständigen story-relevanten Zustand (kein „zusätzlich einblenden"), gemergt über definierten `storyBaseState` — sonst bricht Rückwärts-Scrollen.
5. **Projektions-Instanzen:** `fitExtent` mutiert die Projektion — `detailPanel` bekommt zwingend eine eigene aus `scales.makePacificProjection`.
6. **Set-Identität:** `selectedEventIds` immer ersetzen, nie mutieren.
7. **Dateline:** Pazifik-Zentrierung NUR über `projection.rotate([-192,0])`; Daten bleiben [−180,180]; nie Punkte einzeln mit `xScale(lon)` projizieren. **Gate:** `?mount=map.smoke` ohne horizontalen Streifen, bevor irgendein weiterer Karten-Layer entsteht.
8. **`base: './'`** in vite.config.js von Anfang an (offline-Abgabe).
9. **110m-Karte ohne Atolle:** Zentroide sind Pflicht-Layer mit eigener Sichtprüfung.
10. **reduced-motion:** `reducedMotion` im State; alle Transitions daran gaten (E3).
