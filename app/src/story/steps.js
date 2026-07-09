// Deklaratives Schritt-Array der Story (docs/plan/06 + Umsetzungsentscheidung 2026-07-02:
// Fullscreen-Morph, Heta-Hook, Guba-Beat in Step 3). Reine Daten + Funktionen, kein DOM.
//
// Vertrag: buildSteps(ctx) → [{ id, layout, title, html, source, apply() → patch }]
//  - html/source sind fertig aufgelöst (alle Zahlen via resolveRefs - nie getippt).
//  - Optionale Editorial-Felder (Paket Editorial-Pass): transition (kursive Übergabe
//    an die nächste Sektion), hint ("How to read"-Lesehilfe), questions (Explore-
//    Leitfragen als Liste). Gerendert von sectionTextHtml() in main.js.
//  - apply() liefert bei jedem Aufruf FRISCHE Objekte (Store-Konvention: nie mutieren)
//    und setzt flüchtigen State (hover/selection/detail/mode) explizit - Steps müssen
//    auch beim Rückwärts-Scrollen und per Deep-Link deterministisch sein.
//  - exploreUnlocked schaltet NUR Schritt 7 (der storyRunner sperrt beim Start).
import { resolveRefs } from './refs.js';
import { isScatterable } from '../core/filters.js';

export const SID_HETA = '2003359S15177';
export const SID_HAROLD = '2020092S09155';
export const SID_GUBA = '2007317S10150';

// Sturmwind-Radius (R34, max. Quadrant) für Heta aus IBTrACS-Rohdaten: median 370 km,
// nahe Peak 407 km (geprüft 2026-07-03). Damit liegen ASM (287 km Trackabstand) und
// NIU (84 km) beide belegbar im Sturmwindfeld - Grundlage des Wind-Korridors im Hook.
export const HETA_R34_KM = 370;

// Fokus-Ausschnitt des Hooks: ASM, Niue und die Zugbahn dazwischen (inkl. Korridor-Luft).
export const HETA_FOCUS = {
  type: 'MultiPoint',
  coordinates: [[-176.5, -10.5], [-164.5, -23]],
};
export const HETA_FLY_MS = 1600;

// Layout je Step - statisch, damit der layoutController ohne Daten-ctx auskommt.
export const STEP_LAYOUTS = ['intro', 'intro', 'map', 'scatter', 'dual', 'dual', 'dual', 'explore'];
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
  swath: null,         // { sid, radiusKm } - Wind-Korridor um eine Zugbahn
  impactBubbles: null, // [{ eventId }] - flächenproportionale Betroffenen-Kreise
  camera: null,        // { flyMs } - Kamera-Einflug auf eine gezoomte Karte (opts.fitTo)
  focusOnly: false,    // true = Nicht-Fokus-Tracks KOMPLETT ausblenden (statt faden)
  hideConnectors: false, // true = Multi-Country-Connectors ausblenden (Rausch-Reduktion, Step 3)
  hoverPoints: false,  // true = Punkt-Hover trotz Story-Gate frei (Tooltip + Residuum-Linie, Step 3)
  ...over,
});
const fx = makeStoryFx;

// Flüchtigen State je Step deterministisch setzen (Rückwärts-Scrollen, Deep-Links).
// exploreUnlocked: false gehört dazu - wer von Step 7 zurückscrollt, ist wieder gesperrt.
const base = (over = {}) => ({
  hover: null, selectedEventIds: null, detailSid: null, mode: 'perCapita',
  exploreUnlocked: false,
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
      html: r(`The Pacific has warmed for more than a century — in {{sst:latest.year}},
        sea-surface temperatures ran {{sst:latest.anom}} above the long-term average. Warmer
        water fuels tropical cyclones, but it doesn't decide who suffers. So this story asks a
        narrower question: once a cyclone exists, does its <strong>wind speed</strong> explain
        who is affected?`),
      hint: r(`Each stripe is one year's sea-surface temperature — blue below, red above the
        long-term average; the line below traces the same anomaly. Temperature reaches back to
        {{sst:first.year}}, but the wind and human-impact records this story analyses begin only
        in {{stat:yearMin}} — where the orange marker sits.`),
      source: 'Sea-surface temperature anomalies: Pacific Data Hub (SPC)',
      apply: () => base({ storyFx: fx() }),
    },
    {
      // no-trend-Beat (Paket „storm-trend"): der wärmere Ozean macht die Stürme HIER weder
      // häufiger noch stärker. Klartext statt Statistik-Jargon; Zahlen aus trends.json via
      // {{trend:...}}; die Sektion ist eingefroren (eigenes Chart, kein bus).
      id: 'storm-trend',
      layout: 'intro',
      title: r('Not more storms, not stronger'),
      html: r(`If a warmer ocean meant worse cyclones, we would expect more of them — or
        stronger ones. Counting every Pacific tropical storm from {{trend:yearMin}} to
        {{trend:yearMax}}, neither shows up. The number of storms each year is
        <strong>flat</strong>: the first five seasons averaged {{trend:count.first5}}, the last
        five {{trend:count.last5}}. Their <strong>average strength has not risen</strong> either.
        So the growing human toll in this story is not because the storms themselves got worse —
        it is about who stands in their way.`),
      source: r('Every Pacific tropical storm, {{trend:yearMin}}–{{trend:yearMax}} · IBTrACS / NOAA'),
      apply: () => base({ storyFx: fx() }),
    },
    {
      id: 'hook-heta',
      layout: 'map',
      title: r('One storm, two ways to count impact'),
      html: r(`In January {{event:2004-0004-NIU.year}}, Cyclone Heta swept past both American
        Samoa and Niue — both inside its gale-force wind field. By raw count, American Samoa was
        hit <strong>{{stat:affectedRatio.2004-0004-ASM.2004-0004-NIU}}× harder</strong>; but
        measured against each island's population, the two were struck at almost the same scale.
        That is why the rest of this story counts storms by <strong>share of population
        affected</strong>, not by raw totals.`),
      hint: "Left: the pale band is Heta's gale-force wind field over both islands; the orange line is its track. Right: the same two tolls — first as raw counts, then as a share of each island's population.",
      source: 'Track & wind field: IBTrACS / NOAA · Reported impacts: EM-DAT / CRED',
      apply: () => base({
        storyFx: fx({
          focusSids: [SID_HETA], drawSid: SID_HETA, emphasisIso3: ['ASM', 'NIU'],
          swath: { sid: SID_HETA, radiusKm: HETA_R34_KM },
          impactBubbles: [{ eventId: '2004-0004-ASM' }, { eventId: '2004-0004-NIU' }],
          camera: { flyMs: HETA_FLY_MS },
          focusOnly: true,
        }),
      }),
    },
    {
      // Evidence-Panel (Plan „delightful-harbor"): die früheren Steps expectation+reveal
      // als EIN interaktives Kapitel - Text links, Chart mit Controls rechts (chartControls).
      id: 'evidence',
      layout: 'scatter',
      title: r('The line is almost flat'),
      html: r(`Now zoom out from that one night. Each dot is one storm-country pair:
        {{stat:scatterCount}} of them, maximum sustained wind against the share of
        the national population reported affected. The dashed line is the
        <strong>wind-only baseline</strong> — what wind alone would predict — and it
        is almost flat: per capita, wind explains only
        <strong>{{fit:perCapita.r2pct}}</strong> of the variance
        (p = {{fit:perCapita.p}}); in absolute numbers {{fit:absolute.r2pct}}
        (p = {{fit:absolute.p}}). Reported impacts vary far more than wind speed alone
        suggests. Exposure and vulnerability likely shape the toll — and so does the
        reporting itself.`),
      transition: 'If wind explains only a small part of the outcome, the most important cases are the deviations.',
      hint: 'Right = stronger wind; higher = larger reported share of the population affected; dot size = reported deaths. A dot above the wind-only baseline means more reported impact than wind alone would suggest; a dashed outline marks a wind reconstructed from disaster records. Hover any dot for details.',
      apply: () => base({
        storyFx: fx({
          // Band bewusst aus: die flache gestrichelte Linie IST die Aussage - das
          // wellige Quantilband würde sie visuell verwässern. R²-Label bleibt.
          showPoints: true, showTrend: true, showBand: false, showFitLabel: true,
          hideConnectors: true, hoverPoints: true,
        }),
      }),
    },
    {
      id: 'harold',
      layout: 'dual',
      title: r('One storm, four countries'),
      html: r(`Cyclone Harold ({{event:2020-0132-FJI.year}},
        {{event:2020-0132-FJI.category:cat}}) crossed four countries at the same measured
        intensity. By raw count the toll ran from
        <strong>{{event:2020-0132-FJI.affected:int}}</strong> reported affected in Fiji
        down to <strong>{{event:2020-0132-TON.affected:int}}</strong> in Tonga —
        {{stat:affectedRatio.2020-0132-FJI.2020-0132-TON}}× apart. But Fiji has far more
        people. Measured against each population — the lens the rest of this story uses —
        the ranking <strong>flips</strong>: Vanuatu ({{event:2020-0132-VUT.affected_pc:pct}})
        and Tonga ({{event:2020-0132-TON.affected_pc:pct}}) were hit hardest, Fiji
        ({{event:2020-0132-FJI.affected_pc:pct}}) least. One wind speed — and the metric
        decides who looks worst hit.`),
      transition: 'Harold is not an exception: some countries land above the baseline again and again.',
      hint: 'All four bubbles share one wind speed; their vertical spread is the gap in population share affected. The largest raw toll — Fiji — sits lowest.',
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
      html: r(`Some countries sit above the wind-only baseline again and again:
        <strong>{{stat:aboveShare.VUT}}</strong> of Vanuatu's storm-country pairs show
        more reported impact than wind alone would suggest. In
        {{event:2023-0128-VUT.year}}, cyclones Judy and Kevin struck Vanuatu within a
        single week; together they reached about
        <strong>{{event:2023-0128-VUT.affected_pc:pct}} of the population</strong> —
        the two reported tolls overlap the same people. Gita
        ({{event:2018-0042-TON.year}}) reached {{event:2018-0042-TON.affected_pc:pct}} of
        Tonga. Part of this is exposure — how many people live in a storm's path — and
        part is likely vulnerability. The data suggests this; it does not prove it.`),
      transition: 'Before interpreting the pattern, the missing records matter.',
      apply: () => base({
        formation: 'scatter', // Bühnen-Gruppe dots2 (Paket 10 Task 8)
        storyFx: fx({
          showPoints: true, showTrend: true, showBand: true,
          focusEventIds: [...vutAboveIds, '2018-0042-TON'],
          annotations: [
            // Judy + Kevin sind Zwillinge (eine Woche, überlappende Betroffene): nur Judy
            // trägt den Anteil, Kevin verweist auf denselben Treffer - sonst läse es sich
            // als zwei unabhängige 78%-Schläge (Doppelzählung).
            { eventId: '2023-0119-VUT', text: r('Judy {{event:2023-0119-VUT.year}} · {{event:2023-0119-VUT.affected_pc:pct}} of Vanuatu') },
            { eventId: '2023-0128-VUT', text: r('Kevin {{event:2023-0128-VUT.year}} · same week as Judy') },
            { eventId: '2018-0042-TON', text: r('Gita {{event:2018-0042-TON.year}} · {{event:2018-0042-TON.affected_pc:pct}} of Tonga') },
          ],
        }),
      }),
    },
    {
      id: 'honesty',
      layout: 'dual',
      title: r('What the data hides'),
      html: r(`Only <strong>{{stat:scatterCount}} of {{stat:eventCount}}</strong>
        storm-country pairs have both a measured wind speed and a reported impact count.
        For {{stat:missingToll}} of them the human toll was never recorded, and
        {{stat:missingWind}} had a recorded toll but no measured wind. These are
        <em>reported</em> impacts: they depend on the institutions doing the counting,
        the dashed circle marks a wind reconstructed from disaster records rather than
        a satellite track, and the most recent seasons may still be revised.
        <strong>Missing data is not missing suffering.</strong>`),
      transition: 'The story has shown the logic. The final view lets you inspect it yourself.',
      apply: () => base({
        formation: 'unit', unitSort: 'chrono', // Formations-Morph (Paket 10 Task 8)
        storyFx: fx({ showPoints: true, showTrend: true, showBand: true, showRug: true }),
      }),
    },
    {
      id: 'explore',
      layout: 'explore',
      title: r('From track to toll'),
      html: r(`Every dot on this page is a night like Heta's. Since {{stat:yearMin}},
        these storms add up to <strong>{{stat:totalAffected}} reported people
        affected</strong> across the island countries — a running total, so anyone hit by
        two storms is counted twice. A cyclone's track tells you where it goes, not what
        it costs the people beneath it. Preparedness has to target exposure and
        vulnerability, not just forecast wind speeds.
        <strong>Now explore the evidence yourself.</strong>`),
      questions: [
        'Which storms sit far above the wind-only baseline?',
        'Which countries are repeatedly affected?',
        'Where do strong storm tracks cluster across the Pacific?',
      ],
      hint: 'Hover or click any storm to highlight it across the map, scatterplot, yearly view and profile comparison. Use the filters to narrow by year, country or storm category.',
      apply: () => base({ storyFx: null, exploreUnlocked: true }),
    },
  ];
}
