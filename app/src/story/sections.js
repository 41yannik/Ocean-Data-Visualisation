// Sektions-Konfiguration des linearen One-Pagers (Layout v5, 2026-07-03).
// Je Sektion: welcher Step (Text + eingefrorener Zustand aus steps.js) und welche
// Views gerendert werden. Abweichungen von den Bühnen-Layouts (dokumentiert in
// docs/plan/06): S4 zeigt Karte+Scatter nebeneinander, aber OHNE Detailpanel
// (viewport-fixes Overlay passt nicht in den Dokumentfluss); S5/S6 nur Scatter
// (die Karte trüge dort nichts bei). Die letzte Sektion ist das voll interaktive
// Dashboard (eigener entsperrter Store).
import { HETA_FOCUS } from './steps.js';

const ARIA = {
  sst: 'Warming stripes with an aligned annual line chart: Pacific sea-surface temperature anomalies since 1850',
  map: 'Map of Pacific tropical-cyclone tracks; track width shows storm category',
  scatter: 'Scatterplot of peak wind speed against share of national population affected',
};

export const SECTIONS = [
  { step: 0, views: ['sst'], aria: { sst: ARIA.sst } },
  {
    step: 1, views: ['map', 'bars'],
    mapOpts: { fitTo: HETA_FOCUS }, // gezoomte Projektion: nur ASM/NIU + Zugbahn
    aria: {
      map: 'Map zoomed to American Samoa and Niue: a shaded corridor shows the gale-force wind field covering both islands; proportional circles compare people affected',
      bars: 'Bar chart comparing people affected: American Samoa versus Niue under the same wind field',
    },
  },
  {
    step: 2, views: ['scatter'],
    aria: { scatter: 'Scatterplot: storm-country pairs appear; no trend line yet — Mawar and Percy annotated' },
  },
  {
    step: 3, views: ['scatter'],
    aria: { scatter: 'Scatterplot: nearly flat expectation line with quantile band; high-residual outliers highlighted, Cyclone Guba ringed' },
  },
  {
    step: 4, views: ['map', 'scatter'],
    overrides: { detailSid: null }, // Panel ist Explore-Feature; der Beat trägt über Fokus-Track + 4 Punkte
    aria: {
      map: 'Map focused on Cyclone Harold’s track across four countries',
      scatter: 'Scatterplot: Harold’s four connected country outcomes highlighted',
    },
  },
  {
    step: 5, views: ['scatter'],
    aria: { scatter: 'Scatterplot: Vanuatu’s repeat above-the-line storms highlighted, with Kevin, Judy and Gita annotated' },
  },
  {
    step: 6, views: ['scatter'],
    aria: { scatter: 'Scatterplot with rug ticks along the wind axis marking storms without an impact count' },
  },
  {
    step: 7, views: ['map', 'scatter'], explore: true,
    aria: { map: ARIA.map, scatter: ARIA.scatter },
  },
];
