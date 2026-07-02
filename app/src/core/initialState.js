// Initialzustand — konzeptionell Teil des Kompositionspunkts (main.js), als eigenes Modul,
// damit die Harness ihn ohne Router-Seiteneffekte importieren kann.
//
// Bewusste Abweichung von docs/plan/09 (dort exploreUnlocked: false): Ohne Story (Paket 06)
// wären Brush/Filter sonst tot. Der storyRunner setzt beim Start selbst exploreUnlocked: false
// und schaltet in Schritt 7 frei.
export function makeInitialState() {
  return {
    hover: null,               // { sid, eventId|null, x, y, source: 'map'|'scatter' } | null
    selectedEventIds: null,    // Set<eventId> | null — immer ersetzen
    detailSid: null,
    mode: 'perCapita',         // C3: pro Kopf = Default
    filters: { yearRange: [2001, 2026], categories: null, countries: null },
    step: -1,                  // -1 = freie Erkundung; 0..7 = Story (Paket 06)
    exploreUnlocked: true,
    reducedMotion: typeof matchMedia !== 'undefined'
      && matchMedia('(prefers-reduced-motion: reduce)').matches,
  };
}
