// Sektions-Konfiguration des linearen One-Pagers (Layout v5, 2026-07-03).
// Je Sektion: welcher Step (Text + eingefrorener Zustand aus steps.js) und welche
// Views gerendert werden. Abweichungen von den Bühnen-Layouts (dokumentiert in
// docs/plan/06): S4 zeigt Karte+Scatter nebeneinander, aber OHNE Detailpanel
// (viewport-fixes Overlay passt nicht in den Dokumentfluss); S5/S6 nur Scatter
// (die Karte trüge dort nichts bei). Die letzte Sektion ist das voll interaktive
// Dashboard (eigener entsperrter Store).
import { HAROLD_FOCUS, WINSTON_FOCUS } from './steps.js';

const ARIA = {
  sst: 'Warming stripes with an aligned annual line chart: Pacific sea-surface temperature anomalies since 1850',
  stormTrend: 'Two stacked line charts, 2001 to 2025: the number of Pacific tropical storms per year '
    + 'and their average wind strength, both essentially flat with a near-horizontal trend line: no clear trend',
  map: 'Map of Pacific tropical-cyclone tracks; track width shows storm category',
  scatter: 'Scatterplot of maximum sustained wind against share of national population reported affected',
};

// Drei erzählerische Akte statt Schrittzähler (Paket 10 §B1) - der Kicker ist
// Wegweiser, der h2-Titel der Kapitelname.
// Sektions-Konfiguration der offenen 11-Beat-Story: Harold-Hook, Evidence-Panel,
// Winston-Fallstudie, dots2-Bühne (Residual/Subregion/Unit), Conclusion, Explore.
const SCATTER_ARIA = 'Interactive scatterplot of maximum sustained wind against share of national '
  + 'population reported affected in that year, with a dashed wind-only fit. Buttons above the '
  + 'chart highlight Harold, Donna or the records farthest from the fit; a dropdown filters the '
  + 'dots by country';
export const SECTIONS = [
  { step: 0, act: 'The question', views: ['sst'], methodId: 'sst', sourceIds: ['pdh-sst'], aria: { sst: ARIA.sst } },
  { step: 1, act: 'The question', views: ['stormTrend'], methodId: 'storm-trend', sourceIds: ['ibtracs'], aria: { stormTrend: ARIA.stormTrend } },
  {
    step: 2, act: 'The question', views: ['map'], methodId: 'hook-harold',
    sourceIds: ['ibtracs', 'pdh-affected', 'wpp', 'natural-earth'],
    mapOpts: { fitTo: HAROLD_FOCUS, labelScope: 'story' },
    aria: { map: 'Map zoomed to Vanuatu and Fiji: Cyclone Harold’s 2020 track crosses both; circle area shows reported people affected, labels give the affected share of each country’s population' },
  },
  {
    step: 3, act: 'The evidence', split: true, views: ['scatter'], methodId: 'open-scatter',
    sourceIds: ['ibtracs', 'pdh-affected', 'wpp'],
    aria: { scatter: SCATTER_ARIA },
  },
  {
    step: 4, act: 'The evidence', views: ['map'], methodId: 'winston',
    sourceIds: ['ibtracs', 'pdh-affected', 'wpp', 'natural-earth'],
    mapOpts: { fitTo: WINSTON_FOCUS, labelScope: 'story' },
    aria: { map: 'Map zoomed to Fiji: Cyclone Winston’s 2016 track with a circle for Fiji’s reported affected share that year' },
  },
  {
    step: 5, act: 'The evidence', stage: 'dots2', views: ['scatter'], methodId: 'open-residuals',
    sourceIds: ['ibtracs', 'pdh-affected', 'wpp'],
    aria: { scatter: 'Scatterplot: Fiji’s above-the-baseline years highlighted with thin lines dropping to the dashed wind-only line' },
  },
  {
    step: 6, act: 'The evidence', stage: 'dots2', views: ['scatter'], methodId: 'open-country-rows',
    sourceIds: ['ibtracs', 'pdh-affected', 'wpp'],
    aria: { scatter: 'Dot plot of the same country-years, one row per country: dots right of a dashed line took a heavier toll than the wind-only expectation' },
  },
  {
    step: 7, act: 'The evidence', stage: 'dots2', views: ['scatter'], methodId: 'open-subregions',
    sourceIds: ['ibtracs', 'pdh-affected', 'wpp'],
    aria: { scatter: 'Dot plot folded into one row per Pacific subregion: Micronesia leans right of the dashed wind-only line, Melanesia splits almost evenly' },
  },
  {
    step: 8, act: 'The people', stage: 'dots2', views: ['scatter'], controls: 'unitSort',
    methodId: 'open-completeness', sourceIds: ['ibtracs', 'pdh-affected'],
    aria: { unitChart: 'Unit chart of every country-year with a reported toll: filled dots also have a nearby cyclone; hollow dots had a toll but no cyclone within range' },
  },
  {
    step: 9, act: 'The conclusion', views: ['conclusionSynthesis'], conclusion: true,
    methodId: 'open-conclusion', sourceIds: ['ibtracs', 'pdh-affected', 'wpp'],
    aria: { conclusionSynthesis: 'Linked conclusion with two top-five lists and paired vertical thermometers; an order switch compares wind with affected share' },
  },
  {
    step: 10, act: 'Your turn', views: ['map', 'scatter'], explore: true,
    methodId: 'open-explore', sourceIds: ['ibtracs', 'pdh-affected', 'wpp', 'natural-earth'],
    aria: { map: ARIA.map, scatter: ARIA.scatter },
  },
];
