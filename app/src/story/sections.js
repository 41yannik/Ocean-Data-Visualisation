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
  stormTrend: 'Two stacked line charts, 2001 to 2025: the number of Pacific tropical storms per year '
    + 'and their average wind strength, both essentially flat with a near-horizontal trend line — no clear trend',
  map: 'Map of Pacific tropical-cyclone tracks; track width shows storm category',
  scatter: 'Scatterplot of maximum sustained wind against share of national population reported affected',
};

// Drei erzählerische Akte statt Schrittzähler (Paket 10 §B1) - der Kicker ist
// Wegweiser, der h2-Titel der Kapitelname.
export const SECTIONS = [
  { step: 0, act: 'The question', views: ['sst'], aria: { sst: ARIA.sst } },
  { step: 1, act: 'The question', views: ['stormTrend'], aria: { stormTrend: ARIA.stormTrend } },
  {
    step: 2, act: 'The question', views: ['map', 'bars'],
    // gezoomte Projektion auf ASM/NIU; labelScope 'story' blendet ablenkende Nachbar-
    // Labels (Tonga/Samoa) aus - nur die zwei Vergleichsinseln (via Impact-Bubbles).
    mapOpts: { fitTo: HETA_FOCUS, labelScope: 'story' },
    aria: {
      map: 'Map zoomed to American Samoa and Niue: a shaded band marks Heta’s gale-force wind field covering both islands; circle area shows reported affected people, labels also give the affected share of each island’s population',
      bars: 'Comparison for American Samoa versus Niue: tall bars show reported affected people (a 33× gap), short bars below show the affected share of population (about 41% vs 38%) — nearly equal',
    },
  },
  {
    // Evidence-Panel: EIN interaktives Kapitel (Text links, Chart + Controls rechts) -
    // ersetzt die frühere Bühnen-Gruppe 'dots' mit zwei Scroll-Beats.
    step: 3, act: 'The evidence', split: true, views: ['scatter'],
    aria: { scatter: 'Interactive scatterplot of maximum sustained wind against share of national '
      + 'population reported affected, with an almost flat dashed wind-only baseline. Buttons above the '
      + 'chart highlight Mawar 2023, Percy, Cyclone Guba or the high-residual outliers; '
      + 'a dropdown filters the dots by country' },
  },
  {
    step: 4, act: 'The evidence', views: ['haroldMorph'],
    aria: {
      haroldMorph: 'Animated sequence: Cyclone Harold’s track is drawn across four countries; '
        + 'impact bubbles pop at Solomon Islands, Vanuatu, Fiji and Tonga, then fly onto a '
        + 'scatterplot where all four share the same wind speed but land several times apart in people reported affected',
    },
  },
  {
    step: 5, act: 'The evidence', stage: 'dots2', views: ['scatter'],
    aria: { scatter: 'Scatterplot: Vanuatu’s repeat above-the-baseline storms highlighted, with Kevin, Judy and Gita annotated' },
  },
  {
    step: 6, act: 'The people', stage: 'dots2', views: ['unitChart'], controls: 'unitSort',
    aria: { unitChart: 'Unit chart of all 99 storm-country pairs: filled dots are complete records; '
      + 'hollow dots are pairs whose human impact was never recorded; one half-filled dot had a recorded '
      + 'impact but no measured wind. A button re-sorts them into two blocks by data completeness' },
  },
  {
    step: 7, act: 'Your turn', views: ['map', 'scatter'], explore: true,
    aria: { map: ARIA.map, scatter: ARIA.scatter },
  },
];
