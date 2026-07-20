// Benannte State-Patches = Testfall-Katalog (echte IDs/SIDs aus events.json, offene Land-Jahr-Basis).
// Als Funktionen, damit Sets/Objekte bei jedem Klick frisch sind (Store-Konvention: nie mutieren).
import { makeStoryFx } from '../story/steps.js';

export const FIXTURES = {
  // --- Hover (1:n-Semantik: ein Sturm kann mehrere Land-Jahre verbinden) ---
  hoverHarold:    () => ({ hover: { sid: '2020092S09155', eventId: null, x: 480, y: 300, source: 'map' } }),
  hoverHaroldFJI: () => ({ hover: { sid: '2020092S09155', eventId: 'FJI-2020', x: 700, y: 220, source: 'scatter' } }),
  hoverWinston:   () => ({ hover: { sid: '2016041S14170', eventId: 'FJI-2016', x: 640, y: 260, source: 'scatter' } }),
  hoverDonna:     () => ({ hover: { sid: '2017122S13170', eventId: 'NCL-2017', x: 620, y: 200, source: 'scatter' } }),
  hoverNoStorm:   () => ({ hover: { sid: null, eventId: 'PNG-2006', x: 400, y: 400, source: 'scatter' } }),
  clearHover:     () => ({ hover: null }),

  // --- Selektion (Brush-Ergebnis; Top-5 nach affected_pc) ---
  selectTop5: () => ({
    selectedEventIds: new Set([
      'PLW-2021', 'MHL-2020', 'MHL-2022', 'VUT-2020', 'MHL-2019',
    ]),
  }),
  clearSelection: () => ({ selectedEventIds: null }),

  // --- Detailpanel ---
  detailHarold:  () => ({ detailSid: '2020092S09155' }), // 2 Länderzeilen (VUT + FJI)
  detailWinston: () => ({ detailSid: '2016041S14170' }),
  detailDateline: () => ({ detailSid: '2006075S14185' }), // Track kreuzt die Dateline!
  closeDetail:   () => ({ detailSid: null }),

  // --- Modus ---
  modeAbsolute:  () => ({ mode: 'absolute' }),
  modePerCapita: () => ({ mode: 'perCapita' }),

  // --- Filter (immer komplettes Objekt ersetzen; Fenster = 2005-2023) ---
  filter2016:    () => ({ filters: { yearRange: [2016, 2016], categories: null, countries: null } }),
  filterVanuatu: () => ({ filters: { yearRange: [2005, 2023], categories: null, countries: ['VUT'] } }),
  filterCat45:   () => ({ filters: { yearRange: [2005, 2023], categories: [4, 5], countries: null } }),
  filtersReset:  () => ({ filters: { yearRange: [2005, 2023], categories: null, countries: null } }),

  // --- Story-Steps: "crasht nicht, ignoriert step" ---
  step0: () => ({ step: 0 }), step1: () => ({ step: 1 }), step2: () => ({ step: 2 }),
  step3: () => ({ step: 3 }), step4: () => ({ step: 4 }), step5: () => ({ step: 5 }),
  step6: () => ({ step: 6 }), step7: () => ({ step: 7 }), step8: () => ({ step: 8 }),
  stepOff: () => ({ step: -1 }), // freie Erkundung ohne Story (?story=off)

  // --- storyFx-Choreografie: Spiegel der Step-apply()-Zustände ---
  fxNeutral: () => ({ storyFx: null }),
  fxHookHarold: () => ({
    storyFx: makeStoryFx({
      focusSids: ['2020092S09155'], drawSid: '2020092S09155', emphasisIso3: ['VUT', 'FJI'],
      impactBubbles: [{ eventId: 'VUT-2020' }, { eventId: 'FJI-2020' }],
      camera: { flyMs: 1600 },
      focusOnly: true,
    }),
  }),
  fxStreuung: () => ({
    storyFx: makeStoryFx({
      showPoints: true,
      annotations: [
        { eventId: 'VUT-2020', text: 'Harold 2020 · 83% of Vanuatu' },
        { eventId: 'NCL-2017', text: 'Donna 2017 · 4 people reported' },
      ],
    }),
  }),
  fxReveal: () => ({
    storyFx: makeStoryFx({
      showPoints: true, showTrend: true, showBand: true, residualReveal: true,
      annotations: [{ eventId: 'SLB-2015', text: 'Solo 2015 · 55 kt · 29% affected' }],
    }),
  }),
  fxHarold: () => ({
    storyFx: makeStoryFx({
      focusSids: ['2020092S09155'],
      focusEventIds: ['VUT-2020', 'FJI-2020'],
      showPoints: true, showTrend: true, showBand: true,
    }),
  }),
  fxHonesty: () => ({
    storyFx: makeStoryFx({ showPoints: true, showTrend: true, showBand: true, showRug: true }),
  }),
  fxConclusion: () => ({
    highlight: {
      key: 'conclusion',
      ids: new Set(['NCL-2017', 'VUT-2020']),
      annos: [],
    },
    storyFx: makeStoryFx({
      showPoints: true, showTrend: true, showBand: false, showFitLabel: true,
      hideConnectors: true,
    }),
  }),
};
