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

// Drei erzählerische Akte statt Schrittzähler (Paket 10 §B1) - der Kicker ist
// Wegweiser, der h2-Titel der Kapitelname.
export const SECTIONS = [
  { step: 0, act: 'The question', views: ['sst'], aria: { sst: ARIA.sst } },
  {
    step: 1, act: 'The question', views: ['map', 'bars'],
    mapOpts: { fitTo: HETA_FOCUS }, // gezoomte Projektion: nur ASM/NIU + Zugbahn
    aria: {
      map: 'Map zoomed to American Samoa and Niue: a shaded corridor shows the gale-force wind field covering both islands; proportional circles compare people affected',
      bars: 'Bar chart comparing people affected: American Samoa versus Niue under the same wind field',
    },
  },
  {
    step: 2, act: 'The evidence', views: ['scatter'],
    aria: { scatter: 'Scatterplot: storm-country pairs appear; no trend line yet; Mawar and Percy annotated' },
  },
  {
    step: 3, act: 'The evidence', views: ['scatter'], controls: 'revealToggles',
    aria: { scatter: 'Scatterplot: nearly flat expectation line; high-residual outliers highlighted. Toggle buttons highlight the ten most-affected storms or the ten strongest storms' },
  },
  {
    step: 4, act: 'The evidence', views: ['haroldMorph'],
    aria: {
      haroldMorph: 'Animated sequence: Cyclone Harold’s track is drawn across four countries; '
        + 'impact bubbles pop at Solomon Islands, Vanuatu, Fiji and Tonga, then fly onto a '
        + 'scatterplot where all four share the same wind speed but land 7× apart in people affected',
    },
  },
  {
    step: 5, act: 'The evidence', views: ['scatter'],
    aria: { scatter: 'Scatterplot: Vanuatu’s repeat above-the-line storms highlighted, with Kevin, Judy and Gita annotated' },
  },
  {
    step: 6, act: 'The people', views: ['unitChart'], controls: 'unitSort',
    aria: { unitChart: 'Unit chart of all 99 storm-country pairs: 78 filled dots are complete records, '
      + '21 ghost dots are pairs whose human impact was never recorded. A button re-sorts them into two blocks by data quality' },
  },
  {
    step: 7, act: 'Your turn', views: ['map', 'scatter'], explore: true,
    aria: { map: ARIA.map, scatter: ARIA.scatter },
  },
];
