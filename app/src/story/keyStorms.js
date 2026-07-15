// Die drei Vergleichs-Stürme - EINE Quelle für IDs + Anzeigenamen (einziger
// Konsument: ui/profileBars.js, nur im Dev-Harness gemountet):
//   Mawar (Guam 2023)   - stärkster Wind UND hoher Impact
//   Percy (Tokelau 2005) - starker Wind, minimaler Impact
//   Guba (PNG 2007)      - schwacher Wind, tödlichster Sturm des Zeitraums
export const STORY_STORMS = [
  { key: 'mawar', eventId: '2023-0300-GUM', label: 'Mawar 2023' },
  { key: 'percy', eventId: '2005-0102-TKL', label: 'Percy' },
  { key: 'guba', eventId: '2007-0557-PNG', label: 'Cyclone Guba' },
];

// Serienfarben der Vergleichs-Kacheln (CVD-taugliches Trio aus der bestehenden Palette;
// dokumentierte Ausnahme der Akzent-Exklusivität: im Direktvergleich sind die drei
// Stürme gleichrangige Kategorien, kein Highlight).
export const STORM_COLORS = {
  mawar: 'var(--accent)',
  percy: 'var(--track)',
  guba: 'var(--point)',
};
