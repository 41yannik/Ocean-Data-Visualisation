// Deklaratives Schritt-Array der Story (offene Land-Jahr-Basis, Harold-Hook).
// Reine Daten + Funktionen, kein DOM.
//
// Vertrag: buildSteps(ctx) → [{ id, layout, title, html, source, apply() → patch }]
//  - html/source sind fertig aufgelöst (alle Zahlen via resolveRefs - nie getippt).
//  - Optionale Editorial-Felder (Paket Editorial-Pass): transition (kursive Übergabe
//    an die nächste Sektion), hint ("How to read"-Lesehilfe), questions (Explore-
//    Leitfragen als Liste). Gerendert von sectionTextHtml() in main.js.
//  - apply() liefert bei jedem Aufruf FRISCHE Objekte (Store-Konvention: nie mutieren)
//    und setzt flüchtigen State (hover/selection/detail/mode) explizit - Steps müssen
//    auch beim Rückwärts-Scrollen und per Deep-Link deterministisch sein.
//  - exploreUnlocked schaltet NUR Schritt 8 (der storyRunner sperrt beim Start).
import { resolveRefs } from './refs.js';
import { isScatterable } from '../core/filters.js';

// Hook: Harold 2020 über Vanuatu und Fiji.
export const HAROLD_FOCUS = {
  type: 'MultiPoint',
  coordinates: [[164, -11], [182, -21]],
};
// Fallstudie Step 4: Winston 2016 über Fiji.
export const WINSTON_FOCUS = {
  type: 'MultiPoint',
  coordinates: [[176, -15], [182, -20]],
};

// Layout je Step - statisch, damit der layoutController ohne Daten-ctx auskommt.
export const STEP_LAYOUTS = ['intro', 'intro', 'map', 'scatter', 'dual', 'dual', 'dual', 'dual', 'dual', 'scatter', 'explore'];
export const STEP_COUNT = STEP_LAYOUTS.length;
export const stepLayout = (step) =>
  step >= 0 && step < STEP_COUNT ? STEP_LAYOUTS[step] : 'explore';

// storyFx immer als KOMPLETTES Objekt ersetzen - fehlende Flags = neutraler Zustand.
// Exportiert, damit Fixtures (Harness) dieselbe Shape garantieren.
export const makeStoryFx = (over = {}) => ({
  focusSids: null, drawSid: null, emphasisIso3: [],
  showPoints: false, showTrend: false, showBand: false,
  showFitLabel: false, // R²/n/p-Label auch OHNE Band zeigen (Evidence-Panel)
  residualReveal: false, annotations: [], focusEventIds: null, showRug: false,
  residualStems: false, // vertikale Abstands-Linien Fokus-Punkt → wind-only line (Step 5)
  impactBubbles: null, // [{ eventId }] - flächenproportionale Betroffenen-Kreise
  camera: null,        // { flyMs } - Kamera-Einflug auf eine gezoomte Karte (opts.fitTo)
  focusOnly: false,    // true = Nicht-Fokus-Tracks KOMPLETT ausblenden (statt faden)
  hideConnectors: false, // true = Multi-Country-Connectors ausblenden (Rausch-Reduktion, Step 3)
  hoverPoints: false,  // true = Punkt-Hover trotz Story-Gate frei (Tooltip + Residuum-Linie, Step 3)
  stormSpine: false,   // true = ein Sturm verbindet beim Hover seine Länderpunkte (Step 3)
  ...over,
});
const fx = makeStoryFx;

// Flüchtigen State je Step deterministisch setzen (Rückwärts-Scrollen, Deep-Links).
// exploreUnlocked: false gehört dazu - wer von Step 8 zurückscrollt, ist wieder gesperrt.
const base = (over = {}) => ({
  hover: null, selectedEventIds: null, detailSid: null, mode: 'perCapita',
  highlight: null, textSet: null, stormPin: null,
  exploreUnlocked: false,
  ...over,
});

// Quellenzeile der offenen Story: alle Wirkungsdaten aus offenen Quellen.
const OPEN_IMPACT_SOURCE = 'Peak wind: IBTrACS / NOAA · People affected (annual, all disasters): '
  + 'PDH SDG 11.5.1 (SPC) · Population: UN World Population Prospects';

// 11-Beat-Story auf offener Land-Jahr-Basis: Harold-Hook (Vanuatu vs. Fiji),
// Winston-Fallstudie, Residual-/Subregion-Zeilen, Unit-Chart, Conclusion, Explore.
export function buildSteps(ctx) {
  const r = (template) => resolveRefs(template, ctx);

  const byId = ctx.data.index.bySid ? ctx.data.index.byId : new Map();
  const haroldSid = byId.get('VUT-2020')?.sid ?? null;
  const winstonSid = byId.get('FJI-2016')?.sid ?? null;
  const fjiAboveIds = ctx.data.events
    .filter((e) => e.iso3 === 'FJI' && isScatterable(e) && (e.residual_pc ?? 0) > 0)
    .map((e) => e.id);

  return [
    {
      id: 'sst-intro',
      layout: 'intro',
      title: r('A warming ocean'),
      html: r(`The Pacific has warmed for more than a century: in {{sst:latest.year}},
        sea-surface temperatures ran {{sst:latest.anom}} above the long-term average. Warmer
        water fuels tropical cyclones, but it doesn't decide who suffers. So this story asks a
        narrower question: once a cyclone exists, does its <strong>wind speed</strong> explain
        who is affected?`),
      hint: r(`Each stripe is one year's sea-surface temperature: blue below, red above the
        long-term average; the line below traces the same anomaly. Temperature reaches back to
        {{sst:first.year}}, but the open impact records this story analyses begin only in
        {{stat:yearMin}}, where the orange marker sits.`),
      source: 'Sea-surface temperature anomalies: Pacific Data Hub (SPC)',
      apply: () => base({ storyFx: fx() }),
    },
    {
      id: 'storm-trend',
      layout: 'intro',
      title: r('No clear rise in storm count or mean strength'),
      html: r(`Across Pacific tropical storms at or above 34 kt from {{trend:yearMin}} to
        {{trend:yearMax}}, neither of these two basin-wide measures shows a statistically
        detectable linear trend. The first five seasons averaged {{trend:count.first5}} storms;
        the last five averaged {{trend:count.last5}}. Mean lifetime peak wind also shows
        <strong>no clear linear rise</strong>. This does not show that warming has no effect on
        cyclone physics. It means only that the impact differences explored below cannot be read
        as a simple rise in annual storm count or mean peak wind in this period.`),
      source: r('Every Pacific tropical storm, {{trend:yearMin}}–{{trend:yearMax}} · IBTrACS / NOAA'),
      hint: 'Top: the line traces the number of Pacific tropical storms each season. Bottom: their average peak wind. The dashed lines show the linear trend across 2001–2025; hover to read a single season.',
      apply: () => base({ storyFx: fx() }),
    },
    {
      id: 'hook-harold',
      layout: 'map',
      title: r('One storm, two ways to count impact'),
      html: r(`In April 2020, Cyclone Harold, a {{event:VUT-2020.category:cat}} at its
        {{event:VUT-2020.intensity_kt:kt}} lifetime peak, crossed both Vanuatu and Fiji (its peak
        wind fell near Vanuatu; Fiji met a weaker storm). That year each country reported almost the
        same number of people affected: <strong>{{event:VUT-2020.affected:int}}</strong> in
        Vanuatu and <strong>{{event:FJI-2020.affected:int}}</strong> in Fiji. But against each
        country's population those near-equal counts mean very different things:
        <strong>{{event:VUT-2020.affected_pc:pct}}</strong> of Vanuatu versus
        <strong>{{event:FJI-2020.affected_pc:pct}}</strong> of Fiji, a
        {{stat:affectedPcRatio.VUT-2020.FJI-2020}}× gap. That is why the rest of this story counts
        by <strong>share of population affected</strong>, not by raw totals.`),
      hint: "Left: Harold's track crosses both countries; the circles show reported people affected. Right: the same two tolls, first as raw counts, then as a share of each country's population.",
      source: OPEN_IMPACT_SOURCE,
      apply: () => base({
        storyFx: fx({
          focusSids: haroldSid ? [haroldSid] : null,
          drawSid: haroldSid, emphasisIso3: ['VUT', 'FJI'],
          impactBubbles: [{ eventId: 'VUT-2020' }, { eventId: 'FJI-2020' }],
          camera: { flyMs: 1600 }, focusOnly: true,
        }),
      }),
    },
    {
      id: 'evidence',
      layout: 'scatter',
      title: r('Stronger winds, widely different impacts'),
      html: r(`Each dot is one country in one year with a reported affected count, placed by the
        strongest cyclone that reached it that year. Farther right means stronger wind; higher
        means a larger affected share. The dashed line shows the average relationship from wind
        alone. The points spread widely around it: across these {{stat:scatterCount}} records,
        wind speed accounts for only about <strong>{{fit:perCapita.r2pct}} of the differences</strong>
        in affected share. Stronger wind matters, but it does not explain the large differences on
        its own.`),
      source: OPEN_IMPACT_SOURCE,
      hint: 'Right = stronger wind. Higher = larger affected share. Each vertical step is 10×. The dashed line is the wind-only fit. All dots are equal size.',
      apply: () => base({
        storyFx: fx({
          showPoints: true, showTrend: true, showBand: false, showFitLabel: true,
          showFitNote: true, uniformPoints: true, hideConnectors: true, hoverPoints: true,
        }),
      }),
    },
    {
      id: 'winston',
      layout: 'dual',
      title: r('The strongest storm, and one of the hardest hit'),
      html: r(`Cyclone Winston (2016) was the most intense storm to reach Fiji in this record,
        with a {{event:FJI-2016.intensity_kt:kt}} lifetime peak. That year Fiji reported
        <strong>{{event:FJI-2016.affected:int}} people affected</strong>, about
        <strong>{{event:FJI-2016.affected_pc:pct}}</strong> of its population. Winston sits near
        the top of both wind and impact, but as the next steps show, most storms do not line up
        so neatly: the strongest winds and the largest affected shares rarely belong to the same
        country-year.`),
      transition: 'Winston lines up wind and impact. Most records do not.',
      source: OPEN_IMPACT_SOURCE,
      hint: "The orange line is Winston's track across Fiji; the circle shows the reported affected share for Fiji in 2016.",
      apply: () => base({
        storyFx: fx({
          focusSids: winstonSid ? [winstonSid] : null,
          drawSid: winstonSid, emphasisIso3: ['FJI'],
          impactBubbles: [{ eventId: 'FJI-2016' }],
          camera: { flyMs: 1400 }, focusOnly: true,
        }),
      }),
    },
    {
      id: 'patterns',
      layout: 'dual',
      title: r('Above the line, again and again?'),
      html: r(`Zoom out and look for countries that sit above the wind-only line repeatedly. In
        the open record the signal is weaker than a single clear repeat victim: Fiji is above the
        line in <strong>{{stat:aboveCount.FJI}}</strong> of its storm-years
        ({{stat:aboveShare.FJI}}), and Palau in <strong>{{stat:aboveCount.PLW}}</strong>. Notably
        Vanuatu, which stands out when storms are counted one by one, is above the line in only
        {{stat:aboveCount.VUT}} here: annual all-disaster counts blur the storm-specific pattern.
        A residual above the line is a hypothesis about exposure and vulnerability, not proof.`),
      transition: 'Line the countries up and the lean gets easier to read.',
      source: OPEN_IMPACT_SOURCE,
      hint: "Orange dots are Fiji's country-years; each thin line drops to the dashed wind-only line. The longer the line, the more that year's toll outran its wind. Every dot uses the same size.",
      apply: () => base({
        formation: 'scatter',
        storyFx: fx({
          showPoints: true, showTrend: true, showBand: false, showFitLabel: true,
          uniformPoints: true, focusEventIds: [...fjiAboveIds], residualStems: true,
        }),
      }),
    },
    {
      id: 'residual-rows',
      layout: 'dual',
      title: r('Country by country, above the line'),
      html: r(`Strip the wind axis away and line the same country-years up by country: each dot's
        distance to the <strong>right</strong> of the dashed line is how far its toll outran the
        wind-only expectation. Palau lands entirely on the heavy side
        (<strong>{{stat:aboveCount.PLW}}</strong>), and Fiji leans right
        (<strong>{{stat:aboveCount.FJI}}</strong>); Vanuatu, with as many records, splits the
        other way. No single country dominates the pattern.`),
      transition: 'Countries tell one story. Do whole regions tell another?',
      source: OPEN_IMPACT_SOURCE,
      hint: 'Orange dots took a heavier toll than wind alone predicts, blue dots a lighter one. The note under each country counts its orange dots; countries with fewer than four complete records are folded into “Other”.',
      apply: () => base({
        formation: 'residualRows',
        storyFx: fx({ showPoints: true }),
      }),
    },
    {
      id: 'subregion-rows',
      layout: 'dual',
      title: r('Is it a region’s fate?'),
      html: r(`Merge the same rows into the three Pacific subregions and the balance shifts.
        <strong>Micronesia</strong> leans heaviest:
        <strong>{{stat:subregionAboveCount.Micronesia}}</strong> of its country-years outran the
        wind-only expectation, and its median sits well right of the line. Polynesia leans right too
        (<strong>{{stat:subregionAboveCount.Polynesia}}</strong>), while Melanesia leans the other
        way: only <strong>{{stat:subregionAboveCount.Melanesia}}</strong> outran it, and its median
        falls left of the line. Geography sets who lies in the storm belt, but it does not assign
        the burden cleanly by region: the pattern still lives closer to countries than regions.`),
      transition: 'Before interpreting any of it, the missing records matter.',
      source: OPEN_IMPACT_SOURCE,
      hint: 'The same dots regroup into one row per subregion. Orange dots took a heavier toll than wind alone predicts, blue a lighter one; the short vertical stroke marks each group’s median.',
      apply: () => base({
        formation: 'subregion',
        storyFx: fx({ showPoints: true }),
      }),
    },
    {
      id: 'honesty',
      layout: 'dual',
      title: r('What the data hides'),
      html: r(`These records are impact-led: every one has a reported affected count. But the
        gaps run the other way. Of the <strong>{{stat:stormExposed}}</strong> country-years a
        cyclone came within 500 km, only <strong>{{stat:scatterCount}}</strong> carry a reported
        toll. And <strong>{{stat:missingWind}}</strong> of the tolls we do see had no cyclone
        within range at all: the affected count is annual and covers every disaster that year,
        floods and droughts included, not the storm alone. <strong>Missing data is not missing
        suffering, and a reported toll is not always the cyclone's.</strong>`),
      transition: 'The records are incomplete. Even so, the pattern that remains gives a clear answer.',
      source: OPEN_IMPACT_SOURCE,
      hint: 'Each circle is one country-year with a reported toll. Filled circles also have a nearby cyclone and a measured wind; hollow circles had a reported toll but no cyclone within 500 km.',
      apply: () => base({
        formation: 'unit', unitSort: 'chrono',
        storyFx: fx({ showPoints: true, showTrend: true, showBand: true }),
      }),
    },
    {
      id: 'conclusion',
      layout: 'scatter',
      title: r('Wind is only part of the story'),
      html: r(`Rank the same complete country-year records once by wind and once by the share of
        population reported affected, and the names at the top mostly change. Some of the strongest
        winds produced comparatively small reported impacts; several of the highest impacts came
        from years far below the top wind ranks. In the full comparison, wind speed accounts for
        only <strong>{{fit:perCapita.r2pct}} of the observed variation</strong>. <strong>Wind
        describes how powerful the cyclone became. In these records, it does not by itself
        determine which country reports the largest affected share.</strong>`),
      factorQuestion: 'Does wind speed explain who is affected?',
      factorAnswer: 'No. Stronger winds do not automatically mean greater human impact.',
      factorIntro: `Wind measures the physical hazard. The data can show that wind alone is insufficient,
        but not which conditions shaped the outcome of any single year. Who suffers also depends
        on four things this dataset cannot see:`,
      factors: [
        { title: 'Exposure & geography', text: 'A storm can cross open ocean, sparsely settled land or dense communities. Who and what lies in its path defines what is exposed.' },
        { title: 'Infrastructure', text: 'The strength of homes, roads, power and communications may limit or amplify how physical hazard becomes disruption.' },
        { title: 'Preparedness & early warning', text: 'Forecast lead time, evacuation, shelters and practised plans can change how many people remain at risk when the storm arrives.' },
        { title: 'Response & reporting', text: 'Access to aid may shape recovery, while reporting capacity shapes how much of the human impact enters the record.' },
      ],
      transition: 'First compare the extremes, then test the pattern across every complete record.',
      source: OPEN_IMPACT_SOURCE,
      outro: `Wind measures the hazard. It does not measure who was exposed, prepared or able to recover.`,
      hint: `Blue and orange rank the two extremes. The vertical thermometers place every complete
        country-year from low at the bottom to high at the top. Switch the ordering between wind
        and affected share; hover or focus a top-five name to locate it in both columns. A few
        shares top 100%: the affected count is an annual all-disaster total that can exceed a small
        country's resident population.`,
      apply: () => base({ storyFx: fx() }),
    },
    {
      id: 'explore',
      layout: 'explore',
      title: r('From track to toll'),
      html: r(`The story has answered its question. Now test the same relationship across the
        underlying country-year table. Since {{stat:yearMin}}, these records contain
        <strong>{{stat:totalAffected}} reported people affected</strong> across all disasters.
        This is a running total: each country-year is counted once.`),
      source: OPEN_IMPACT_SOURCE,
      hint: 'Choose a perspective, then hover, select or refine the data. Filters and selections carry across all three views.',
      apply: () => base({ storyFx: null, exploreUnlocked: true }),
    },
  ];
}
