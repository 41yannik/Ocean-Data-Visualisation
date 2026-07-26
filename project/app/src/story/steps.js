// Deklaratives Schritt-Array der Story (offene Land-Jahr-Basis, lokaler Wind).
// Reine Daten + Funktionen, kein DOM.
//
// Vertrag: buildSteps(ctx) → [{ id, layout, title, html, source, apply() → patch }]
//  - html/source sind fertig aufgelöst (alle Zahlen via resolveRefs - nie getippt).
//  - Optionale Editorial-Felder: transition (kursive Übergabe an die nächste Sektion),
//    hint ("How to read"-Lesehilfe). Gerendert von sectionTextHtml() in main.js.
//  - apply() liefert bei jedem Aufruf FRISCHE Objekte (Store-Konvention: nie mutieren)
//    und setzt flüchtigen State (hover/selection/detail/mode) explizit - Steps müssen
//    auch beim Rückwärts-Scrollen und per Deep-Link deterministisch sein.
//
// Umbau nach dem Audit 2026-07 (13 → 11 → 9 Beats). Was sich geändert hat und warum:
//  - Die x-Achse ist der Wind, den der Sturm AM LAND erreichte, nicht sein globaler
//    Lifetime-Peak. Damit erklärt der Wind nachweisbar nichts (R² 0.015, p 0.31) - die
//    frühere Zahl „9,4 %" war ein Artefakt geteilter Peak-Werte.
//  - Die 75 ausdrücklich als 0 gemeldeten Land-Jahre sind Records statt Lücken.
//  - Drei Beats über Abstände zur wind-only line sind zu EINEM Beat über Landesgröße
//    verschmolzen: das ist der einzige Zusammenhang, der die Daten überlebt.
import { resolveRefs } from './refs.js';
import { isZeroLane } from '../core/filters.js';

// Hook: Vanuatu und Fiji 2020 - zwei Länder, zwei Stürme.
export const HOOK_FOCUS = {
  type: 'MultiPoint',
  coordinates: [[164, -11], [182, -21]],
};
// Fallstudie: Winston 2016 über Fiji.
export const WINSTON_FOCUS = {
  type: 'MultiPoint',
  coordinates: [[176, -15], [182, -20]],
};

// Layout je Step - statisch, damit der layoutController ohne Daten-ctx auskommt.
export const STEP_LAYOUTS = ['intro', 'intro', 'dual', 'scatter', 'dual', 'dual', 'dual', 'scatter', 'explore'];
export const STEP_COUNT = STEP_LAYOUTS.length;
export const stepLayout = (step) =>
  step >= 0 && step < STEP_COUNT ? STEP_LAYOUTS[step] : 'explore';

// storyFx immer als KOMPLETTES Objekt ersetzen - fehlende Flags = neutraler Zustand.
// Exportiert, damit Fixtures (Harness) dieselbe Shape garantieren.
export const makeStoryFx = (over = {}) => ({
  focusSids: null, drawSid: null, emphasisIso3: [],
  showPoints: false, showTrend: false, showBand: false,
  showFitLabel: false, // Befund-Label auch OHNE Band zeigen (Evidence-Panel)
  zeroReveal: false,   // Zero-Lane hervorheben (Ehrlichkeits-Beat)
  annotations: [], focusEventIds: null, showRug: false,
  impactBubbles: null, // [{ eventId }] - flächenproportionale Betroffenen-Kreise
  camera: null,        // { flyMs } - Kamera-Einflug auf eine gezoomte Karte (opts.fitTo)
  focusOnly: false,    // true = Nicht-Fokus-Tracks KOMPLETT ausblenden (statt faden)
  hideConnectors: false,
  hoverPoints: false,  // true = Punkt-Hover trotz Story-Gate frei
  stormSpine: false,   // true = ein Sturm verbindet beim Hover seine Länderpunkte
  ...over,
});
const fx = makeStoryFx;

// Flüchtigen State je Step deterministisch setzen (Rückwärts-Scrollen, Deep-Links).
const base = (over = {}) => ({
  hover: null, selectedEventIds: null, detailSid: null, mode: 'perCapita',
  highlight: null, textSet: null, stormPin: null,
  exploreUnlocked: false,
  ...over,
});

// Quellenzeile der offenen Story: alle Wirkungsdaten aus offenen Quellen.
const OPEN_IMPACT_SOURCE = 'Wind reaching each country: IBTrACS / NOAA · People affected '
  + '(annual, all disasters): PDH SDG 11.5.1 (SPC) · Population: UN World Population Prospects';

export function buildSteps(ctx) {
  const r = (template) => resolveRefs(template, ctx);

  const byId = ctx.data.index.bySid ? ctx.data.index.byId : new Map();
  const winstonSid = byId.get('FJI-2016')?.sid ?? null;
  const haroldSid = byId.get('VUT-2020')?.sid ?? null;
  const yasaSid = byId.get('FJI-2020')?.sid ?? null;
  const pamSid = byId.get('VUT-2015')?.sid ?? null;
  // Die stärksten Stürme, nach denen ein Land 0 Betroffene meldete.
  const zeroIds = ctx.data.events
    .filter(isZeroLane)
    .sort((a, b) => b.intensity_kt - a.intensity_kt)
    .map((e) => e.id);

  return [
    {
      id: 'sst-intro',
      layout: 'intro',
      title: r('A warming ocean'),
      html: r(`The Pacific has warmed for more than a century: in {{sst:latest.year}},
        sea-surface temperatures ran {{sst:latest.anom}} above the long-term reference.
        Warmer water fuels tropical cyclones, but it doesn't decide who suffers. So this
        story asks a narrower question: once a cyclone reaches a country, does the
        <strong>wind it brings</strong> explain who is affected?`),
      hint: r(`Each stripe is one year's sea-surface temperature: blue below, red above the
        long-term reference; the line below traces the same anomaly. Temperature reaches back
        to {{sst:first.year}}, but the open impact records this story analyses begin only in
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
        cyclone physics, and twenty-five seasons are a short record. It means only that the
        impact differences explored below cannot be read as a simple rise in annual storm count
        or mean peak wind in this period.`),
      source: r('Every Pacific tropical storm, {{trend:yearMin}}–{{trend:yearMax}} · IBTrACS / NOAA'),
      hint: 'Top: the line traces the number of Pacific tropical storms each season. Bottom: their average peak wind. The dashed lines show the linear trend across the period; hover to read a single season.',
      apply: () => base({ storyFx: fx() }),
    },
    {
      id: 'hook',
      layout: 'map',
      title: r('Two countries, two storms, two ways to count'),
      html: r(`In 2020 a Category 5 cyclone reached Vanuatu and another reached Fiji, at almost
        the same strength: <strong>{{event:VUT-2020.intensity_kt:kt}}</strong> over Vanuatu
        (Harold, April) and <strong>{{event:FJI-2020.intensity_kt:kt}}</strong> over Fiji
        (Yasa, December). That year each country reported almost the same number of people
        affected: <strong>{{event:VUT-2020.affected:int}}</strong> in Vanuatu and
        <strong>{{event:FJI-2020.affected:int}}</strong> in Fiji. But against each country's
        population those near-equal counts mean very different things:
        <strong>{{event:VUT-2020.affected_pc:pct}}</strong> of Vanuatu versus
        <strong>{{event:FJI-2020.affected_pc:pct}}</strong> of Fiji, a
        {{stat:affectedPcRatio.VUT-2020.FJI-2020}}× gap. That is why the rest of this story
        counts by <strong>share of population affected</strong>, not by raw totals.`),
      transition: 'Comparable winds, comparable counts, very different shares. So what does the wind explain?',
      hint: "The map shows both tracks. The circles show reported people affected; the dashed ring is each country's population, so the filled area is the share. Note the counts are annual totals for all disasters, not one storm's toll.",
      source: OPEN_IMPACT_SOURCE,
      apply: () => base({
        storyFx: fx({
          focusSids: [haroldSid, yasaSid].filter(Boolean),
          drawSid: haroldSid, emphasisIso3: ['VUT', 'FJI'],
          impactBubbles: [{ eventId: 'VUT-2020' }, { eventId: 'FJI-2020' }],
          camera: { flyMs: 1600 }, focusOnly: true,
        }),
      }),
    },
    {
      id: 'evidence',
      layout: 'scatter',
      title: r('Stronger winds, no clearer pattern'),
      html: r(`Each dot is one country in one year, placed by the strongest wind a cyclone
        actually brought to that country. Farther right means stronger wind; higher means a
        larger affected share. Across these {{stat:scatterCount}} records the wind explains
        <strong>{{fit:perCapita.r2pct}} of the differences</strong> in affected share, and the
        relationship is <strong>not statistically detectable</strong> (p = {{fit:perCapita.p}}).
        The band along the bottom holds {{stat:zeroWithStorm}} more country-years: a cyclone
        reached them, and the record says nobody was affected.`),
      source: OPEN_IMPACT_SOURCE,
      hint: 'Right = stronger wind at the country. Higher = larger affected share, each vertical step is 10×. The horizontal line is the median across all records, not a fitted trend. The separate band below holds the country-years reported as exactly zero.',
      apply: () => base({
        storyFx: fx({
          showPoints: true, showTrend: true, showBand: false, showFitLabel: true,
          showFitNote: true, uniformPoints: true, hideConnectors: true, hoverPoints: true,
          // Weder permanente Connectors NOCH die On-Demand-Storm-Spine (Audit 2026-07):
          // beide zogen eine Diagonale ueber min/max beider Achsen und lasen sich wie eine
          // Trendlinie - genau die Aussage "kein Muster" wurde so untergraben (bei Winston:
          // Fiji 69% oben-rechts zu Tonga 0 unten = dramatischer Schraegstrich ins Nichts).
          // Der Hover zeigt die Mehrlaender-Info jetzt ohne Linie: gehoverter Punkt hell,
          // gleiche-Sturm-Geschwister mit Akzent-Rand, Rest gedimmt, Tooltip listet die Laender.
          stormSpine: false,
        }),
      }),
    },
    {
      id: 'winston',
      layout: 'dual',
      title: r('The strongest storm, and one of the hardest hit'),
      html: r(`Cyclone Winston (2016) brought the strongest wind any country in this record
        experienced: <strong>{{event:FJI-2016.intensity_kt:kt}}</strong> over Fiji. That year
        Fiji reported <strong>{{event:FJI-2016.affected:int}} people affected</strong>, about
        <strong>{{event:FJI-2016.affected_pc:pct}}</strong> of its population. Here wind and
        impact line up. The next steps show why that is the exception rather than the rule.`),
      transition: 'Winston lines up wind and impact. Most records do not.',
      source: OPEN_IMPACT_SOURCE,
      hint: "The orange line is Winston's track across Fiji; the circle shows the reported affected share for Fiji in 2016. Beside the map, two lines place Winston (orange) against the other 69 complete records (grey): one for wind at landfall, one for affected share.",
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
      id: 'country-size',
      layout: 'dual',
      title: r('What does explain it: how small the country is'),
      html: r(`Line the same records up by country, smallest population at the top, and a
        pattern appears that the wind never produced. Of the records from countries under
        {{stat:smallCountryMax}} people, <strong>{{stat:smallCountryAbove}}</strong> sit above
        the overall median share of {{stat:medianShare}}. Papua New Guinea, with seven million
        people, sits far below it. Population size explains
        <strong>{{fit:popSize.r2pct}}</strong> of the differences (p = {{fit:popSize.p}}) —
        several times what the wind explains, and unlike the wind it is statistically clear.
        Part of this is arithmetic: a small denominator reaches a high share from fewer people.
        Part of it is real: a cyclone can cover a small island state entirely, while a large
        country is hit in one province and counted as a whole.`),
      transition: 'The measure carries the size of the country inside it. And the records carry gaps.',
      source: OPEN_IMPACT_SOURCE,
      hint: 'One row per country, smallest population first; the label shows each country’s population. Dots to the right of the dashed line are above the median share across all records, dots to the left below it. The short vertical stroke marks each country’s median.',
      apply: () => base({
        formation: 'sizeRows',
        storyFx: fx({ showPoints: true }),
      }),
    },
    {
      id: 'honesty',
      layout: 'dual',
      title: r('What the record does not say'),
      html: r(`Every circle is a reported country-year. <strong>{{stat:zeroCount}}</strong> of
        them report exactly <strong>zero</strong> people affected, and
        <strong>{{stat:zeroWithStorm}}</strong> of those had a cyclone in range —
        {{stat:zeroStrong}} of them at hurricane strength. The starkest case is Vanuatu in
        2015, when Cyclone Pam struck at {{event:VUT-2015.intensity_kt:kt}}, the second
        strongest wind in this whole record: the series reports
        {{event:VUT-2015.affected:int}} affected. Five years later, at a slightly weaker
        {{event:VUT-2020.intensity_kt:kt}}, the same country reported
        {{event:VUT-2020.affected_pc:pct}} of its population. A further
        <strong>{{stat:noReport}}</strong> storm-exposed country-years carry no entry at all,
        and <strong>{{stat:missingWind}}</strong> reported tolls had no cyclone within range.
        <strong>A reported zero is not proof that nobody suffered, and a missing row is not
        proof of nothing.</strong>`),
      transition: 'The records are incomplete. Even so, the pattern that remains gives a clear answer.',
      source: OPEN_IMPACT_SOURCE,
      hint: 'Each circle is one reported country-year. Filled = a toll and a cyclone in range; orange outline = a cyclone in range but zero reported; faint outline = a toll with no cyclone within 500 km. Switch the sorting to group them.',
      apply: () => base({
        formation: 'unit', unitSort: 'chrono',
        storyFx: fx({ showPoints: true, zeroReveal: false }),
      }),
    },
    {
      id: 'conclusion',
      layout: 'scatter',
      title: r('Wind is only part of the story'),
      html: r(`Rank the same records once by the wind that reached the country and once by the
        share of population reported affected, and the names at the top mostly change. In the
        full comparison the wind accounts for <strong>{{fit:perCapita.r2pct}} of the observed
        variation</strong>, and that little is within the range of chance
        (p = {{fit:perCapita.p}}). <strong>Wind describes how hard a storm hit a place. In
        these records it does not by itself determine which country reports the largest
        affected share.</strong>`),
      factorQuestion: 'Does wind speed explain who is affected?',
      factorAnswer: 'No. In these records the wind that reached a country tells us almost nothing about the share reported affected.',
      factorIntro: `Wind measures the physical hazard. The data can show that wind alone is insufficient,
        but not which conditions shaped the outcome of any single year. Who suffers, and who ends up
        in the record, also depends on four things this dataset cannot see:`,
      factors: [
        { title: 'Exposure & geography', text: 'A storm can cross open ocean, sparsely settled land or dense communities. Who and what lies in its path defines what is exposed — and a small island state can be covered entirely.' },
        { title: 'Infrastructure', text: 'The strength of homes, roads, power and communications may limit or amplify how physical hazard becomes disruption.' },
        { title: 'Preparedness & early warning', text: 'Forecast lead time, evacuation, shelters and practised plans can change how many people remain at risk when the storm arrives.' },
        { title: 'Response & reporting', text: 'Access to aid may shape recovery, while reporting capacity shapes how much of the human impact enters the record at all.' },
      ],
      transition: 'First compare the extremes, then test the pattern across every complete record.',
      source: OPEN_IMPACT_SOURCE,
      outro: `Wind measures the hazard. It does not measure who was exposed, prepared or able to recover.`,
      hint: `Blue and orange rank the two extremes. The vertical columns place every complete
        country-year from low at the bottom to high at the top. Switch the ordering between wind
        and affected share; hover or focus a top-five name to locate it in both columns. One
        share tops 100%: the affected count is an annual all-disaster total that can exceed a
        small country's resident population.`,
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
      hint: 'Choose a perspective, then hover, select or refine the data. Filters and selections carry across all views.',
      apply: () => base({ storyFx: null, exploreUnlocked: true }),
    },
  ];
}
