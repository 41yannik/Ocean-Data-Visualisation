// Sektions-Konfiguration des linearen One-Pagers (Layout v5).
// Je Sektion: welcher Step (Text + eingefrorener Zustand aus steps.js) und welche
// Views gerendert werden. Die letzte Sektion ist das voll interaktive Dashboard
// (eigener entsperrter Store).
//
// 9 Beats seit dem Audit 2026-07: die drei Residuen-Beats („above the line", Länderzeilen,
// Subregionen) sind zu EINEM Landesgrößen-Beat verschmolzen, weil sie Abstände zu einer
// Linie zeigten, die nichts erklärt.
import { HOOK_FOCUS, WINSTON_FOCUS } from './steps.js';

const ARIA = {
  sst: 'Warming stripes with an aligned annual line chart: Pacific sea-surface temperature anomalies since 1850',
  stormTrend: 'Two stacked line charts, 2001 to 2025: the number of Pacific tropical storms per year '
    + 'and their average wind strength, both essentially flat with a near-horizontal trend line: no clear trend',
  map: 'Map of Pacific tropical-cyclone tracks; track width shows storm category',
  scatter: 'Scatterplot of the wind each cyclone brought to a country against the share of national '
    + 'population reported affected in that year',
};

const SCATTER_ARIA = 'Interactive scatterplot of the wind reaching each country against the share of '
  + 'national population reported affected in that year, with a median reference line and a separate '
  + 'band for country-years reported as zero affected. Buttons above the chart highlight example '
  + 'records; a dropdown filters the dots by country';

export const SECTIONS = [
  { step: 0, act: 'The question', views: ['sst'], methodId: 'sst', sourceIds: ['pdh-sst'], aria: { sst: ARIA.sst } },
  { step: 1, act: 'The question', views: ['stormTrend'], methodId: 'storm-trend', sourceIds: ['ibtracs'], aria: { stormTrend: ARIA.stormTrend } },
  {
    step: 2, act: 'The question', views: ['map', 'haroldComparison'], methodId: 'hook',
    sourceIds: ['ibtracs', 'pdh-affected', 'wpp', 'natural-earth'],
    mapOpts: { fitTo: HOOK_FOCUS, labelScope: 'story' },
    aria: {
      map: 'Map zoomed to Vanuatu and Fiji: the 2020 tracks of Harold and Yasa; circle area shows reported people affected inside a ring for the population.',
      haroldComparison: 'Comparison chart: Vanuatu and Fiji reported nearly equal absolute affected counts, but Vanuatu’s share of population was three times higher (83% vs 26%).'
    },
  },
  {
    step: 3, act: 'The evidence', split: true, views: ['scatter'], methodId: 'open-scatter',
    sourceIds: ['ibtracs', 'pdh-affected', 'wpp'],
    aria: { scatter: SCATTER_ARIA },
  },
  {
    step: 4, act: 'The evidence', views: ['map', 'winstonRank'], methodId: 'winston',
    sourceIds: ['ibtracs', 'pdh-affected', 'wpp', 'natural-earth'],
    mapOpts: { fitTo: WINSTON_FOCUS, labelScope: 'story' },
    aria: {
      map: 'Map zoomed to Fiji: Cyclone Winston’s 2016 track with a circle for Fiji’s reported affected share that year',
      winstonRank: 'Two number lines placing Winston among all 70 complete country-year records: the '
        + 'strongest local wind of all 70 (155 kt), and the 5th-highest affected share of all 70 (69%), '
        + 'each shown against 69 other records marked as a grey tick.',
    },
  },
  {
    step: 5, act: 'The evidence', stage: 'dots2', views: ['scatter'], methodId: 'country-size',
    sourceIds: ['ibtracs', 'pdh-affected', 'wpp'],
    aria: { scatter: 'Dot plot of the same country-years, one row per country ordered by population from smallest to largest: the smallest countries cluster to the right of the median share' },
  },
  {
    step: 6, act: 'The people', stage: 'dots2', views: ['scatter'], controls: 'unitSort',
    methodId: 'open-completeness', sourceIds: ['ibtracs', 'pdh-affected'],
    aria: { unitChart: 'Unit chart of every reported country-year: filled dots reported a toll with a cyclone in range, outlined dots reported exactly zero despite a cyclone, faint dots reported a toll with no cyclone nearby' },
  },
  {
    step: 7, act: 'The conclusion', views: ['conclusionSynthesis'], conclusion: true,
    methodId: 'open-conclusion', sourceIds: ['ibtracs', 'pdh-affected', 'wpp'],
    aria: { conclusionSynthesis: 'Linked conclusion with two top-five lists and paired vertical columns; an order switch compares wind with affected share' },
  },
  {
    step: 8, act: 'Your turn', views: ['map', 'scatter'], explore: true,
    methodId: 'open-explore', sourceIds: ['ibtracs', 'pdh-affected', 'wpp', 'natural-earth'],
    aria: { map: ARIA.map, scatter: ARIA.scatter },
  },
];
