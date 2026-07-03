// Benannte State-Patches = Testfall-Katalog (echte IDs/SIDs aus events.json, verifiziert 2026-07-02).
// Als Funktionen, damit Sets/Objekte bei jedem Klick frisch sind (Store-Konvention: nie mutieren).
import { makeStoryFx } from '../story/steps.js';

export const FIXTURES = {
  // --- Hover (1:n-Semantik) ---
  hoverHarold:    () => ({ hover: { sid: '2020092S09155', eventId: null, x: 480, y: 300, source: 'map' } }),
  hoverHaroldFJI: () => ({ hover: { sid: '2020092S09155', eventId: '2020-0132-FJI', x: 700, y: 220, source: 'scatter' } }),
  hoverHetaNiue:  () => ({ hover: { sid: '2003359S15177', eventId: '2004-0004-NIU', x: 640, y: 260, source: 'scatter' } }),
  hoverPamTuvalu: () => ({ hover: { sid: '2015066S08170', eventId: '2015-0093-TUV', x: 620, y: 200, source: 'scatter' } }),
  hoverFallback:  () => ({ hover: { sid: null, eventId: '2004-0153-FJI', x: 400, y: 400, source: 'scatter' } }),
  clearHover:     () => ({ hover: null }),

  // --- Selektion (Brush-Ergebnis; Top-5 nach affected_pc = 5 verschiedene Stürme) ---
  selectTop5: () => ({
    selectedEventIds: new Set([
      '2018-0042-TON', '2023-0128-VUT', '2023-0119-VUT', '2015-0093-VUT', '2023-0300-GUM',
    ]),
  }),
  clearSelection: () => ({ selectedEventIds: null }),

  // --- Detailpanel ---
  detailHarold: () => ({ detailSid: '2020092S09155' }), // 4 Länderzeilen
  detailPam:    () => ({ detailSid: '2015066S08170' }), // 5 Länderzeilen
  detailHeta:   () => ({ detailSid: '2003359S15177' }), // Track kreuzt die Dateline!
  closeDetail:  () => ({ detailSid: null }),

  // --- Modus ---
  modeAbsolute:  () => ({ mode: 'absolute' }),
  modePerCapita: () => ({ mode: 'perCapita' }),

  // --- Filter (immer komplettes Objekt ersetzen) ---
  filter2016:    () => ({ filters: { yearRange: [2016, 2016], categories: null, countries: null } }),
  filterVanuatu: () => ({ filters: { yearRange: [2001, 2026], categories: null, countries: ['VUT'] } }),
  filterCat45:   () => ({ filters: { yearRange: [2001, 2026], categories: [4, 5], countries: null } }),
  filtersReset:  () => ({ filters: { yearRange: [2001, 2026], categories: null, countries: null } }),

  // --- Story-Platzhalter (Paket 06): 04/05-Abnahme = "crasht nicht, ignoriert step" ---
  step0: () => ({ step: 0 }), step1: () => ({ step: 1 }), step2: () => ({ step: 2 }),
  step3: () => ({ step: 3 }), step4: () => ({ step: 4 }), step5: () => ({ step: 5 }),
  step6: () => ({ step: 6 }), step7: () => ({ step: 7 }),
  stepOff: () => ({ step: -1 }), // freie Erkundung ohne Story (?story=off)

  // --- storyFx-Choreografie (Paket 06): Spiegel der Step-apply()-Zustände ---
  fxNeutral: () => ({ storyFx: null }),
  fxHookHeta: () => ({
    storyFx: makeStoryFx({
      focusSids: ['2003359S15177'], drawSid: '2003359S15177', emphasisIso3: ['ASM', 'NIU'],
      swath: { sid: '2003359S15177', radiusKm: 370 },
      impactBubbles: [{ eventId: '2004-0004-ASM' }, { eventId: '2004-0004-NIU' }],
    }),
  }),
  fxStreuung: () => ({
    storyFx: makeStoryFx({
      showPoints: true,
      annotations: [
        { eventId: '2023-0300-GUM', text: 'Mawar 2023 · 60% of Guam' },
        { eventId: '2005-0102-TKL', text: 'Percy 2005 · 26 people' },
      ],
    }),
  }),
  fxReveal: () => ({
    storyFx: makeStoryFx({
      showPoints: true, showTrend: true, showBand: true, residualReveal: true,
      annotations: [{ eventId: '2007-0557-PNG', text: 'Guba 2007 · Category 1 · 172 deaths' }],
    }),
  }),
  fxHarold: () => ({
    storyFx: makeStoryFx({
      focusSids: ['2020092S09155'],
      focusEventIds: ['2020-0132-FJI', '2020-0132-SLB', '2020-0132-TON', '2020-0132-VUT'],
      showPoints: true, showTrend: true, showBand: true,
    }),
  }),
  fxHonesty: () => ({
    storyFx: makeStoryFx({ showPoints: true, showTrend: true, showBand: true, showRug: true }),
  }),
};
