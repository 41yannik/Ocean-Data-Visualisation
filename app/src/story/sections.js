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
    step: 2, act: 'The question', views: ['genesisTrend'],
    aria: { genesisTrend: 'Two stacked line charts, 2001 to 2025, on one shared latitude scale: '
      + 'the average latitude where storms first reach tropical-storm strength. The Northwest Pacific '
      + 'panel trends clearly poleward, about 322 kilometres; the South Pacific panel is flat — no clear trend' },
  },
  {
    step: 3, act: 'The question', views: ['map', 'bars'],
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
    step: 4, act: 'The evidence', split: true, views: ['scatter'],
    aria: { scatter: 'Interactive scatterplot of maximum sustained wind against share of national '
      + 'population reported affected, with a dashed average fit from wind alone. Buttons above the '
      + 'chart highlight Tino, Daman or the records farthest from the fit; '
      + 'hovering a dot links all country records from the same storm, and a dropdown filters the dots by country' },
  },
  {
    step: 5, act: 'The evidence', views: ['pamMorph'],
    aria: {
      pamMorph: 'Stable map of Cyclone Pam with one blue point per affected country. Each point is '
        + 'labelled with the country name, affected population share and reported number of people; '
        + 'hovering, focusing or tapping it opens a short explanation of the reported exposure. '
        + 'Orange shows Pam’s track, observed gale-force wind extent and its 150-knot peak near Vanuatu.',
    },
  },
  {
    step: 6, act: 'The evidence', stage: 'dots2', views: ['scatter'],
    aria: { scatter: 'Scatterplot: Vanuatu’s repeat above-the-baseline storms fully highlighted with '
      + 'thin lines dropping to the dashed wind-only line; hovering a dot names the storm and its toll' },
  },
  {
    // Residual-Beat: gleiche Bühne (stage dots2), die Punkte morphen vom Scatter in
    // eine Zeile je Land - konsekutiv gleiche stage-Keys bleiben EINE Stage-Gruppe.
    step: 7, act: 'The evidence', stage: 'dots2', views: ['scatter'],
    aria: { scatter: 'Dot plot of the same storm records, one row per country: dots right of a dashed '
      + 'vertical line took a heavier toll than the wind-only expectation, dots left of it a lighter one; '
      + 'Vanuatu’s row sits almost entirely to the right, with eight of ten storms above the line' },
  },
  {
    // Subregion-Beat: gleiche Bühne, die Zeilen falten auf die drei Subregionen.
    // Pointe = Vermeidung des ökologischen Fehlschlusses (Vanuatus Signal verschwindet
    // in Melanesiens Balance) - das Muster lebt auf Länderebene.
    step: 8, act: 'The evidence', stage: 'dots2', views: ['scatter'],
    aria: { scatter: 'Dot plot of the same storm records folded into one row per Pacific subregion: '
      + 'Polynesia leans right of the dashed wind-only line with twelve of seventeen records above it, '
      + 'Melanesia splits almost evenly, Micronesia leans slightly left; a short vertical stroke marks '
      + 'each group’s median' },
  },
  {
    // views ist in Bühnen-Gruppen wirkungslos (groupHtml rendert die geteilte Scatter-
    // Bühne); 'scatter' statt des toten 'unitChart'-Eintrags, die Unit-Formation
    // liefert formationLayer. Die aria-Beschreibung bleibt dokumentierend erhalten.
    step: 9, act: 'The people', stage: 'dots2', views: ['scatter'], controls: 'unitSort',
    aria: { unitChart: 'Unit chart of all 99 storm-country pairs: filled dots are complete records; '
      + 'hollow dots are pairs whose human impact was never recorded; one half-filled dot had a recorded '
      + 'impact but no measured wind. A button re-sorts them into two blocks by data completeness' },
  },
  {
    step: 10, act: 'The conclusion', views: ['conclusionSynthesis'], conclusion: true,
    aria: {
      conclusionSynthesis: 'Linked conclusion with two top-five lists and paired vertical cold-to-warm thermometers. Low values sit at the bottom and high values at the top; an order switch compares wind with affected share',
    },
  },
  {
    step: 11, act: 'Your turn', views: ['map', 'scatter'], explore: true,
    aria: { map: ARIA.map, scatter: ARIA.scatter },
  },
];
