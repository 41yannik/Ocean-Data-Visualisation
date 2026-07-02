// Deklaratives Schritt-Array der Story (docs/plan/06 + Umsetzungsentscheidung 2026-07-02:
// Fullscreen-Morph, Heta-Hook, Guba-Beat in Step 3). Reine Daten + Funktionen, kein DOM.
//
// Vertrag: buildSteps(ctx) → [{ id, layout, title, html, source, apply() → patch }]
//  - html/source sind fertig aufgelöst (alle Zahlen via resolveRefs — nie getippt).
//  - apply() liefert bei jedem Aufruf FRISCHE Objekte (Store-Konvention: nie mutieren)
//    und setzt flüchtigen State (hover/selection/detail/mode) explizit — Steps müssen
//    auch beim Rückwärts-Scrollen und per Deep-Link deterministisch sein.
//  - exploreUnlocked schaltet NUR Schritt 7 (der storyRunner sperrt beim Start).
import { resolveRefs } from './refs.js';
import { isScatterable } from '../core/filters.js';

export const SID_HETA = '2003359S15177';
export const SID_HAROLD = '2020092S09155';
export const SID_GUBA = '2007317S10150';

// Layout je Step — statisch, damit der layoutController ohne Daten-ctx auskommt.
export const STEP_LAYOUTS = ['intro', 'map', 'scatter', 'scatter', 'dual', 'dual', 'dual', 'explore'];
export const STEP_COUNT = STEP_LAYOUTS.length;
export const stepLayout = (step) =>
  step >= 0 && step < STEP_COUNT ? STEP_LAYOUTS[step] : 'explore';

// storyFx immer als KOMPLETTES Objekt ersetzen — fehlende Flags = neutraler Zustand.
// Exportiert, damit Fixtures (Harness) dieselbe Shape garantieren.
export const makeStoryFx = (over = {}) => ({
  focusSids: null, drawSid: null, emphasisIso3: [],
  showPoints: false, showTrend: false, showBand: false,
  residualReveal: false, annotations: [], focusEventIds: null, showRug: false,
  ...over,
});
const fx = makeStoryFx;

// Flüchtigen State je Step deterministisch setzen (Rückwärts-Scrollen, Deep-Links).
const base = (over = {}) => ({
  hover: null, selectedEventIds: null, detailSid: null, mode: 'perCapita',
  ...over,
});

export function buildSteps(ctx) {
  const r = (template) => resolveRefs(template, ctx);

  const haroldIds = (ctx.data.index.bySid.get(SID_HAROLD) ?? []).map((e) => e.id);
  const vutAboveIds = ctx.data.events
    .filter((e) => e.iso3 === 'VUT' && isScatterable(e) && (e.residual_pc ?? 0) > 0)
    .map((e) => e.id);

  return [
    {
      id: 'sst-intro',
      layout: 'intro',
      title: r('A warming ocean'),
      html: r(`The Pacific has been heating for more than a century: in {{sst:latest.year}},
        sea-surface temperatures ran {{sst:latest.anom}} above the long-term average —
        and warm water is the fuel of tropical cyclones. Scroll on for
        {{stat:yearMin}}–{{stat:yearMax}} of Pacific storms, and a simple question:
        <strong>does a stronger storm mean more human suffering?</strong>`),
      source: 'Sea-surface temperature anomalies: Pacific Data Hub (SPC)',
      apply: () => base({ storyFx: fx() }),
    },
    {
      id: 'hook-heta',
      layout: 'map',
      title: r('One storm, two societies'),
      html: r(`In January {{event:2004-0004-NIU.year}}, Cyclone Heta —
        {{event:2004-0004-ASM.category:cat}}, near peak intensity — swept past both
        American Samoa and Niue. In American Samoa it affected
        {{event:2004-0004-ASM.affected:int}} people. On Niue:
        {{event:2004-0004-NIU.affected:int}}.
        <strong>Same storm — different societies.</strong>`),
      source: 'Tracks: IBTrACS (NOAA) · impacts: EM-DAT (CRED)',
      apply: () => base({
        storyFx: fx({ focusSids: [SID_HETA], drawSid: SID_HETA, emphasisIso3: ['ASM', 'NIU'] }),
      }),
    },
    {
      id: 'expectation',
      layout: 'scatter',
      title: r('What wind speed should predict'),
      html: r(`Each dot is one storm striking one country — {{stat:scatterCount}} of them,
        peak wind speed against the share of the population affected. If wind alone decided
        the toll, the dots would climb neatly to the right. They don't: Mawar
        ({{event:2023-0300-GUM.year}}) hit Guam at {{event:2023-0300-GUM.intensity_kt:kt}}
        and affected {{event:2023-0300-GUM.affected_pc:pct}} of its population, while Percy —
        also {{event:2005-0102-TKL.category:cat}} — crossed Tokelau and touched
        {{event:2005-0102-TKL.affected:int}} people.`),
      apply: () => base({
        storyFx: fx({
          showPoints: true,
          annotations: [
            { eventId: '2023-0300-GUM', text: r('Mawar {{event:2023-0300-GUM.year}} · {{event:2023-0300-GUM.affected_pc:pct}} of Guam') },
            { eventId: '2005-0102-TKL', text: r('Percy {{event:2005-0102-TKL.year}} · {{event:2005-0102-TKL.affected:int}} people') },
          ],
        }),
      }),
    },
    {
      id: 'reveal',
      layout: 'scatter',
      title: r('The line is almost flat'),
      html: r(`Per capita, wind speed explains only {{fit:perCapita.r2pct}} of the variance
        (p = {{fit:perCapita.p}}); in absolute numbers {{fit:absolute.r2pct}} — not
        statistically significant (p = {{fit:absolute.p}}). The deadliest storm between
        {{stat:yearMin}} and {{stat:yearMax}}, Cyclone Guba
        ({{event:2007-0557-PNG.year}}, {{event:2007-0557-PNG.deaths:int}} deaths in Papua
        New Guinea), was only a {{event:2007-0557-PNG.category:cat}} storm. What lifts the
        glowing outliers above the line is not wind — it is how exposed and vulnerable the
        society in the storm's path is.`),
      apply: () => base({
        storyFx: fx({
          showPoints: true, showTrend: true, showBand: true, residualReveal: true,
          annotations: [
            { eventId: '2007-0557-PNG', text: r('Guba {{event:2007-0557-PNG.year}} · {{event:2007-0557-PNG.category:cat}} · {{event:2007-0557-PNG.deaths:int}} deaths') },
          ],
        }),
      }),
    },
    {
      id: 'harold',
      layout: 'dual',
      title: r('One storm, four countries'),
      html: r(`Cyclone Harold ({{event:2020-0132-FJI.year}},
        {{event:2020-0132-FJI.category:cat}}) crossed four countries at the same measured
        intensity. It affected {{event:2020-0132-SLB.affected:int}} people in the Solomon
        Islands, {{event:2020-0132-VUT.affected:int}} in Vanuatu,
        {{event:2020-0132-FJI.affected:int}} in Fiji — and
        {{event:2020-0132-TON.affected:int}} in Tonga. One wind speed, outcomes
        {{stat:affectedRatio.2020-0132-FJI.2020-0132-TON}}× apart.`),
      apply: () => base({
        detailSid: SID_HAROLD,
        storyFx: fx({
          focusSids: [SID_HAROLD], focusEventIds: [...haroldIds],
          showPoints: true, showTrend: true, showBand: true,
        }),
      }),
    },
    {
      id: 'patterns',
      layout: 'dual',
      title: r('The repeat victims'),
      html: r(`Some countries sit above the line again and again:
        {{stat:aboveShare.VUT}} of Vanuatu's storms affected more people than wind speed
        would predict. In {{event:2023-0128-VUT.year}}, cyclones Judy and Kevin struck
        Vanuatu within a single week — each touching about
        {{event:2023-0128-VUT.affected_pc:pct}} of the population. Gita
        ({{event:2018-0042-TON.year}}) reached {{event:2018-0042-TON.affected_pc:pct}} of
        Tonga. Part of this is exposure — how many people live in a storm's path — not only
        vulnerability.`),
      apply: () => base({
        storyFx: fx({
          showPoints: true, showTrend: true, showBand: true,
          focusEventIds: [...vutAboveIds, '2018-0042-TON'],
          annotations: [
            { eventId: '2023-0128-VUT', text: r('Kevin {{event:2023-0128-VUT.year}} · {{event:2023-0128-VUT.affected_pc:pct}} of Vanuatu') },
            { eventId: '2023-0119-VUT', text: r('Judy {{event:2023-0119-VUT.year}} · {{event:2023-0119-VUT.affected_pc:pct}} of Vanuatu') },
            { eventId: '2018-0042-TON', text: r('Gita {{event:2018-0042-TON.year}} · {{event:2018-0042-TON.affected_pc:pct}} of Tonga') },
          ],
        }),
      }),
    },
    {
      id: 'honesty',
      layout: 'dual',
      title: r('What the data hides'),
      html: r(`Honesty matters: only {{stat:scatterCount}} of {{stat:eventCount}}
        storm–country pairs have both a measured wind speed and an impact count. Dashed
        circles mark storms whose wind was reconstructed from disaster records rather than
        satellite tracks, and counts for the most recent seasons may still be revised.
        <strong>Missing data is not missing suffering.</strong>`),
      apply: () => base({
        storyFx: fx({ showPoints: true, showTrend: true, showBand: true, showRug: true }),
      }),
    },
    {
      id: 'explore',
      layout: 'explore',
      title: r('From track to toll'),
      html: r(`A cyclone's track tells you where it goes — not what it costs the people
        beneath it. Preparedness has to target vulnerability and exposure, not just
        forecast wind speeds. <strong>Now explore for yourself:</strong> hover tracks and
        dots, brush the scatter, filter by year, category and country — and switch between
        per-capita and absolute impact.`),
      apply: () => base({ storyFx: null, exploreUnlocked: true }),
    },
  ];
}
