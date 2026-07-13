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
//  - exploreUnlocked schaltet NUR Schritt 8 (der storyRunner sperrt beim Start).
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
export const STEP_LAYOUTS = ['intro', 'intro', 'map', 'scatter', 'dual', 'dual', 'dual', 'dual', 'scatter', 'explore'];
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
// exploreUnlocked: false gehört dazu - wer von Step 8 zurückscrollt, ist wieder gesperrt.
const base = (over = {}) => ({
  hover: null, selectedEventIds: null, detailSid: null, mode: 'perCapita',
  highlight: null, textSet: null,
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
      html: r(`Now zoom out from that one night. Each dot is one storm hitting one country —
        {{stat:scatterCount}} in all — placed by how strong its wind was (left to right) against
        the share of that country's people reported affected (bottom to top). If wind decided the
        toll, the dots would climb one clear line. Instead the dashed <strong>wind-only line stays
        almost flat</strong>: a much stronger storm barely lifts the share of people affected.
        What a storm does to a population depends far more on who is exposed and how prepared they
        are — and on who does the counting.`),
      transition: 'If wind explains only a small part of the outcome, the most telling cases are the exceptions.',
      hint: 'Right = stronger wind; higher = a larger share of people reported affected; bigger dot = more reported deaths. A dot above the dashed line took a heavier toll than its wind alone would predict. Hover any dot for the storm and country.',
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
      html: r(`Cyclone Harold ({{event:2020-0132-FJI.year}}, {{event:2020-0132-FJI.category:cat}})
        crossed four countries at the same measured intensity — a rare natural experiment, with
        the wind held constant. By raw count Fiji looks worst hit:
        <strong>{{event:2020-0132-FJI.affected:int}}</strong> reported affected, the most of the
        four. But Fiji also has the most people. Measured against each population — the metric
        this story uses — the ranking <strong>flips</strong>: Fiji falls to the smallest share
        ({{event:2020-0132-FJI.affected_pc:pct}}), while Vanuatu tops the four
        ({{event:2020-0132-VUT.affected_pc:pct}}). Same wind — and the metric alone decides who
        looks worst hit.`),
      transition: 'Harold is not an exception: some countries land above the baseline again and again.',
      hint: 'All four bubbles share one wind speed, so their vertical spread is pure population share — bigger population, smaller share. The biggest raw toll, Fiji, ends up lowest.',
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
      html: r(`Zoom out, and a pattern appears: some countries sit above the wind-only line
        <strong>again and again</strong>. Take Vanuatu: <strong>{{stat:aboveCount.VUT}}</strong>
        of its storms ({{stat:aboveShare.VUT}}) hit harder than wind alone would predict —
        cyclones Judy and Kevin, a week apart, among the worst. That points to
        <strong>exposure</strong> — how many people stand in a storm's path — and likely
        <strong>vulnerability</strong>, not wind. The data suggests this; it does not prove it.`),
      transition: 'Line the countries up, and the pattern gets even clearer.',
      hint: "Orange dots are Vanuatu's storms; each thin line drops to the dashed wind-only line. The longer the line, the more that storm's toll outran its wind.",
      apply: () => base({
        formation: 'scatter', // Bühnen-Gruppe dots2 (Paket 10 Task 8)
        storyFx: fx({
          // Band bewusst aus (Vereinfachung): die gestrichelte Wind-Linie ist die Referenz für
          // „über der Erwartung"; das wellige Quantilband lenkte nur ab. Label bleibt via showFitLabel.
          showPoints: true, showTrend: true, showBand: false, showFitLabel: true,
          // Bewusst NUR Vanuatu (Review 2026-07-13): zwei hervorgehobene Länder verwässerten
          // das Ein-Insel-Argument - Tonga/Gita kommt erst im Residual-Beat wieder ins Bild.
          focusEventIds: [...vutAboveIds],
          residualStems: true, // Abstand zur Linie als gezeichnete Strecke statt Leseaufgabe
          // Keine Annotation mehr (Review 2026-07-13): das Judy-&-Kevin-Label doppelte nur
          // den Text links - Namen und Prozente liefert jetzt der Punkt-Hover.
        }),
      }),
    },
    {
      // Residual-Beat (Plan „repeat victims verstärken"): dieselben Punkte fliegen aus dem
      // Scatter in eine Zeile je Land - x wird zum Abstand von der wind-only line. Damit
      // ist „again and again" nicht mehr Leseaufgabe, sondern abzählbares Zeilenmuster.
      id: 'residual-rows',
      layout: 'dual',
      title: r('Country by country, above the line'),
      html: r(`Strip the wind axis away and line the same storms up by country: each dot's
        distance to the <strong>right</strong> of the dashed line is how far its toll outran
        the wind-only expectation. <strong>{{stat:aboveCount.VUT}}</strong> of Vanuatu's storms
        land on the heavy side — no other country with that many storms comes close. Tonga and
        Micronesia lean the same way; Fiji, with nearly twice the storms, splits almost evenly.`),
      transition: 'Before interpreting the pattern, the missing records matter.',
      hint: 'Orange dots took a heavier toll than wind alone predicts, blue dots a lighter one — the note under each country simply counts its orange dots. ÷10 and ×10 mark tolls ten times below or above that expectation; countries with fewer than four complete records are folded into “Other”.',
      apply: () => base({
        formation: 'residualRows', // Bühnen-Gruppe dots2: Morph Scatter → Zeilen
        storyFx: fx({ showPoints: true }),
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
      transition: 'The records are incomplete. Even so, the pattern that remains gives a clear answer.',
      apply: () => base({
        formation: 'unit', unitSort: 'chrono', // Formations-Morph (Paket 10 Task 8)
        storyFx: fx({ showPoints: true, showTrend: true, showBand: true, showRug: true }),
      }),
    },
    {
      id: 'conclusion',
      layout: 'scatter',
      title: r('Wind is only part of the story'),
      html: r(`Rank the same complete storm-country records once by wind and once by the share
        of population reported affected, and the names at the top mostly change. Some of the
        strongest winds produced comparatively small reported impacts; several of the highest
        impacts came from storms far below the top wind ranks. In the full comparison, wind speed
        accounts for only <strong>{{fit:perCapita.r2pct}} of the observed variation</strong>.
        <strong>Wind determines how powerful a cyclone is. It does not determine who suffers most.</strong>`),
      // caveat entfernt (Redundanz-Review 2026-07-13): die Einordnung „nicht gemessen,
      // nicht bewiesen" trägt factorIntro bereits wortgleich im Antwortblock.
      factorQuestion: 'Does wind speed explain who is affected?',
      factorAnswer: 'No. Stronger winds do not automatically mean greater human impact.',
      factorIntro: `Wind measures the physical hazard. Who suffers also depends on where people
        are exposed, what infrastructure can withstand, how early communities can act and how
        impacts are recorded. The data can show that wind alone is insufficient, but not which
        of these conditions shaped the outcome of any single storm.`,
      factors: [
        {
          title: 'Exposure & geography',
          text: 'A storm can cross open ocean, sparsely settled land or dense communities. Who and what lies in its path defines what is exposed.',
        },
        {
          title: 'Infrastructure',
          text: 'The strength of homes, roads, power and communications may limit or amplify how physical hazard becomes disruption.',
        },
        {
          title: 'Preparedness & early warning',
          text: 'Forecast lead time, evacuation, shelters and practised plans can change how many people remain at risk when the storm arrives.',
        },
        {
          title: 'Response & reporting',
          text: 'Access to aid may shape recovery, while reporting capacity shapes how much of the human impact enters the record.',
        },
      ],
      transition: 'First compare the extremes, then test the pattern across every complete record.',
      outro: `Wind measures the hazard. It does not measure who was exposed, prepared or able to recover.`,
      hint: `Blue and orange rank the two extremes. The vertical thermometers place every complete
        storm-country record from low at the bottom to high at the top. Switch the ordering between
        wind and affected share; hover, tap or focus a top-five name to locate it in both columns.`,
      apply: () => base({ storyFx: fx() }),
    },
    {
      id: 'explore',
      layout: 'explore',
      title: r('From track to toll'),
      html: r(`The story has answered its question. This evidence lab lets you test that answer
        across every recorded storm-country pair. Since {{stat:yearMin}}, the records contain
        <strong>{{stat:totalAffected}} reported people affected</strong> — a running total, so
        anyone hit by two storms is counted twice. <strong>Choose a question and test the evidence.</strong>
        Filters and selections carry across all three views.`),
      apply: () => base({ storyFx: null, exploreUnlocked: true }),
    },
  ];
}
