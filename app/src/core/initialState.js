// Initialzustand - konzeptionell Teil des Kompositionspunkts (main.js), als eigenes Modul,
// damit die Harness ihn ohne Router-Seiteneffekte importieren kann.
//
// Bewusste Abweichung von docs/plan/09 (dort exploreUnlocked: false): Ohne Story (Paket 06)
// wären Brush/Filter sonst tot. Der storyRunner setzt beim Start selbst exploreUnlocked: false
// und schaltet im Explore-Schritt 8 frei.
export function makeInitialState() {
  return {
    hover: null,               // { sid, eventId|null, x, y, source: 'map'|'scatter' } | null
    selectedEventIds: null,    // Set<eventId> | null - immer ersetzen
    detailSid: null,
    mode: 'perCapita',         // C3: pro Kopf = Default
    filters: { yearRange: [2001, 2026], categories: null, countries: null },
    // Zeit-Scrubber (Explore, Hero-Map): activeYear = null → „Alle Jahre" (Grundzustand,
    // keine Regression); Zahl → genau dieses Jahr wird auf der Karte gespotlightet, Rest gedimmt.
    // playing = läuft der Autoplay-Timer. Einziger Schreiber: ui/timeScrubber.js.
    activeYear: null,
    playing: false,
    // Geführtes Evidence Lab (Explore): eine Frage/Ansicht zur Zeit. Kartenlayer und
    // Hot-Zone-Metrik bleiben beim Ansichtswechsel erhalten.
    exploreView: 'outliers',  // 'outliers' | 'countries' | 'geography'
    mapLayer: 'tracks',       // 'tracks' | 'hotzones'
    hotZoneMetric: 'frequency', // 'frequency' | 'averageWind'
    step: -1,                  // -1 = freie Erkundung; 0..8 = Story
    // Story-Choreografie (Paket 06): null = neutral (alles sichtbar, keine Effekte).
    // Nicht-null nur während der Story; Shape siehe story/steps.js fx().
    storyFx: null,
    // Heta-Hook (Step 2) - flüchtige Choreografie-Signale, vom geteilten Sektions-Store
    // getragen (die Sektion subscribed dafür, siehe main.js). hetaReached = welche Inseln
    // der wandernde Windkreis schon berührt hat (Pop-Trigger für Bubble+Balken);
    // hetaFocusIso3 = Cross-Highlight Karte↔Balken; hetaAnimDone = Track-kt-Tooltip frei.
    hetaReached: {},
    hetaFocusIso3: null,
    hetaAnimDone: false,
    // Step 4 (reveal) - interaktive Beweismittel: highlight = persistenter Toggle-Filter
    // ({ key, ids } | null, aus revealToggles), textSet = flüchtiges Set aus Text-Hover
    // ({ ids, pulse } | null; „Category 1"/„glowing outliers").
    highlight: null,
    textSet: null,
    // Evidence-Panel: per Klick fixierte 1:n-Gruppe (ein Sturm, mehrere Länderpunkte).
    stormPin: null,
    // Step 6 (unit chart) - Sortierung: 'chrono' (chronologisch) | 'quality' (zwei Blöcke).
    unitSort: 'chrono',
    // Evidence-Lab „Beyond the wind line": Zeilen-Gruppierung
    // 'country' | 'subregion' | 'sizeClass'.
    residualGroupBy: 'country',
    // Bühnen-Gruppe dots2: 'scatter' | 'residualRows' | 'subregion' | 'unit' -
    // Ziel-Formation der 99 Kreise.
    formation: 'scatter',
    exploreUnlocked: true,
    reducedMotion: typeof matchMedia !== 'undefined'
      && matchMedia('(prefers-reduced-motion: reduce)').matches,
  };
}
