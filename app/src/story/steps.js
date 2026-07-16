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
export const SID_PAM = '2015066S08170';
export const SID_GUBA = '2007317S10150';

// Fokus-Ausschnitt des Hooks: ASM, Niue und die Zugbahn dazwischen (inkl. Korridor-Luft).
export const HETA_FOCUS = {
  type: 'MultiPoint',
  coordinates: [[-176.5, -10.5], [-164.5, -23]],
};
export const HETA_FLY_MS = 1600;

// Gemeinsame Quellenzeile für alle Visualisierungen, die Sturmwind und gemeldete
// Auswirkungen vergleichen. Die Sektionsstruktur rendert sie direkt vor
// „How to read".
const IMPACT_SOURCE = 'Peak wind: IBTrACS / NOAA · Reported impacts: EM-DAT / CRED · Population: UN World Population Prospects';

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
  swath: null,         // { sid, radiusKm } - Wind-Korridor um eine Zugbahn
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

export function buildSteps(ctx) {
  const r = (template) => resolveRefs(template, ctx);
  const hetaRadiusKm = ctx.meta.analysis.storyEvidence.heta.radiusKm;

  const pamIds = (ctx.data.index.bySid.get(SID_PAM) ?? []).map((e) => e.id);
  const vutAboveIds = ctx.data.events
    .filter((e) => e.iso3 === 'VUT' && isScatterable(e) && (e.residual_pc ?? 0) > 0)
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
        {{sst:first.year}}, but the wind and human-impact records this story analyses begin only
        in {{stat:yearMin}}, where the orange marker sits.`),
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
      html: r(`If a warmer ocean meant worse cyclones, we would expect more of them, or
        stronger ones. Counting every Pacific tropical storm from {{trend:yearMin}} to
        {{trend:yearMax}}, neither shows up. The number of storms each year is
        <strong>flat</strong>: the first five seasons averaged {{trend:count.first5}}, the last
        five {{trend:count.last5}}. Their <strong>average strength has not risen</strong> either.
        So the growing human toll in this story is not because the storms themselves got worse:
        it is about who stands in their way.`),
      source: r('Every Pacific tropical storm, {{trend:yearMin}}–{{trend:yearMax}} · IBTrACS / NOAA'),
      hint: 'Top: each dot is the number of Pacific tropical storms in one season. Bottom: each dot is their average peak wind. The dashed lines show the linear trend across 2001–2025.',
      apply: () => base({ storyFx: fx() }),
    },
    {
      id: 'hook-heta',
      layout: 'map',
      title: r('One storm, two ways to count impact'),
      html: r(`In January {{event:2004-0004-NIU.year}}, Cyclone Heta swept past both American
        Samoa and Niue, both inside its gale-force wind field. By raw count, American Samoa was
        hit <strong>{{stat:affectedRatio.2004-0004-ASM.2004-0004-NIU}}× harder</strong>; but
        measured against each island's population, the two were struck at almost the same scale.
        That is why the rest of this story counts storms by <strong>share of population
        affected</strong>, not by raw totals.`),
      hint: "Left: the pale band is Heta's gale-force wind field over both islands; the orange line is its track. Right: the same two tolls, first as raw counts, then as a share of each island's population.",
      source: 'Track & wind field: IBTrACS / NOAA · Reported impacts: EM-DAT / CRED',
      apply: () => base({
        storyFx: fx({
          focusSids: [SID_HETA], drawSid: SID_HETA, emphasisIso3: ['ASM', 'NIU'],
          swath: { sid: SID_HETA, radiusKm: hetaRadiusKm },
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
      title: r('Stronger winds, widely different impacts'),
      html: r(`Each dot represents one storm affecting one country. One storm can create several
        dots: one for every country with a reported impact. Farther right means stronger wind;
        higher means a larger reported affected share. The dashed line shows the average
        relationship from wind alone. The points spread widely around it: across these
        {{stat:scatterCount}} records, wind speed accounts for only about
        <strong>{{fit:perCapita.r2pct}} of the differences</strong> in affected share. Stronger
        wind matters, but it does not explain the large differences on its own.`),
      source: IMPACT_SOURCE,
      hint: 'Right = stronger wind. Higher = larger affected share. Each vertical step is 10×. Hover a dot to connect every country reported for the same storm; click to keep the group visible. The dashed line is the wind-only fit. All dots are equal size.',
      apply: () => base({
        storyFx: fx({
          // Die Linie trägt eine Klartext-Effektgröße; einheitliche Punktgröße hält
          // die Aufmerksamkeit auf Wind × betroffenen Anteil statt auf einer dritten Variable.
          showPoints: true, showTrend: true, showBand: false, showFitLabel: true,
          showFitNote: true, uniformPoints: true, hideConnectors: true, hoverPoints: true,
          stormSpine: true,
        }),
      }),
    },
    {
      id: 'pam',
      layout: 'dual',
      title: r('One storm, several kinds of exposure'),
      html: r(`Cyclone Pam ({{event:2015-0093-VUT.year}}, {{event:2015-0093-VUT.category:cat}})
        is linked to reported impacts in five Pacific countries, but that does not mean all five
        experienced the same wind. Pam’s <strong>{{event:2015-0093-VUT.intensity_kt:kt}} lifetime
        peak occurred near Vanuatu</strong>. Parts of Solomon Islands also lay near the track;
        Tuvalu and Kiribati mainly reported remote swell and coastal flooding. Papua New Guinea’s
        record sits amid impacts from Pam and another system, Nathan. The reported affected share
        still ranges from <strong>{{event:2015-0093-VUT.affected_pc:pct}}</strong> to
        <strong>{{event:2015-0093-PNG.affected_pc:pct}}</strong> (a
        {{stat:affectedPcRatio.2015-0093-VUT.2015-0093-PNG}}× span), but it compares different
        exposure pathways, not equal local wind.`),
      transition: 'Pam separates the storm’s physical footprint from the outcomes reported across countries.',
      source: 'Track & gale-force radii: IBTrACS / NOAA · Reported impacts & locations: EM-DAT / CRED · Impact mechanisms: IFRC & WMO · Population: UN World Population Prospects',
      hint: r(`Each blue point marks one affected country at a representative island location. Its
        label gives the affected population share and reported number of people. Hover, focus or tap
        a point to see how the country was affected. The orange line is Pam’s track; the pale outlines
        show the observed gale-force wind extent. Pam’s {{event:2015-0093-VUT.intensity_kt:kt}} peak is
        shown only where it occurred near Vanuatu.`),
      apply: () => base({
        detailSid: SID_PAM,
        // Nur die Karten-Flags: pamMorph ist eine eigenständige Karte und liest keine
        // Scatter-Flags (showPoints/showTrend/showBand waren vestigial).
        storyFx: fx({ focusSids: [SID_PAM], focusEventIds: [...pamIds] }),
      }),
    },
    {
      id: 'patterns',
      layout: 'dual',
      title: r('The repeat victims'),
      html: r(`Zoom out, and a pattern appears: some countries sit above the wind-only line
        <strong>again and again</strong>. Take Vanuatu: <strong>{{stat:aboveCount.VUT}}</strong>
        of its storms ({{stat:aboveShare.VUT}}) hit harder than wind alone would predict:
        cyclones Judy and Kevin, a week apart, among the worst. That points to
        <strong>exposure</strong> (how many people stand in a storm's path) and likely
        <strong>vulnerability</strong>, not wind. The data suggests this; it does not prove it.`),
      transition: 'Line the countries up, and the pattern gets even clearer.',
      source: IMPACT_SOURCE,
      hint: "Orange dots are Vanuatu's storms; each thin line drops to the dashed wind-only line. The longer the line, the more that storm's toll outran its wind. Every dot uses the same size; deaths are not encoded.",
      apply: () => base({
        formation: 'scatter', // Bühnen-Gruppe dots2 (Paket 10 Task 8)
        storyFx: fx({
          // Band bewusst aus (Vereinfachung): die gestrichelte Wind-Linie ist die Referenz für
          // „über der Erwartung"; das wellige Quantilband lenkte nur ab. Label bleibt via showFitLabel.
          showPoints: true, showTrend: true, showBand: false, showFitLabel: true,
          uniformPoints: true,
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
        land on the heavy side: no other country with that many storms comes close. Tonga and
        Micronesia lean the same way; Fiji, with nearly twice the storms, splits almost evenly.`),
      transition: 'Countries tell one story. Do whole regions tell another?',
      source: IMPACT_SOURCE,
      hint: 'Orange dots took a heavier toll than wind alone predicts, blue dots a lighter one. The note under each country simply counts its orange dots. ÷10 and ×10 mark tolls ten times below or above that expectation; countries with fewer than four complete records are folded into “Other”.',
      apply: () => base({
        formation: 'residualRows', // Bühnen-Gruppe dots2: Morph Scatter → Zeilen
        storyFx: fx({ showPoints: true }),
      }),
    },
    {
      // Subregion-Beat (V2): dieselben Zeilen, gefaltet auf die drei Subregionen.
      // Die Pointe ist die VERMEIDUNG des ökologischen Fehlschlusses: Polynesien lehnt
      // schwer, aber Vanuatus Signal verschwindet in Melanesiens Balance - das Muster
      // lebt auf Länder-, nicht auf Regionsebene. Begründet zugleich, warum die Story
      // auf Länderebene argumentiert.
      id: 'subregion-rows',
      layout: 'dual',
      title: r('Is it a region’s fate?'),
      html: r(`Merge the same rows into the three Pacific subregions and the picture changes
        character. Polynesia’s records lean heavy:
        <strong>{{stat:subregionAboveCount.Polynesia}}</strong> outran the wind-only
        expectation, and the group’s midpoint sits well right of the line. But Melanesia,
        home to Vanuatu, splits almost evenly
        ({{stat:subregionAboveCount.Melanesia}}): Fiji’s balanced record dilutes Vanuatu’s
        within the same row. Geography sets who lies in the storm belt, but it does not
        assign the burden by region. <strong>The pattern lives at the level of countries,
        not regions.</strong>`),
      transition: 'Before interpreting any of it, the missing records matter.',
      source: IMPACT_SOURCE,
      hint: 'The same dots regroup into one row per subregion. Orange dots took a heavier toll than wind alone predicts, blue a lighter one; the short vertical stroke marks each group’s median, and the note under each region counts its orange dots.',
      apply: () => base({
        formation: 'subregion', // Bühnen-Gruppe dots2: Morph Länder-Zeilen → Subregionen
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
      source: IMPACT_SOURCE,
      hint: 'Each circle is one storm–country pair. Filled circles have both wind and impact data; hollow circles have no reported impact. The half-filled circle has impact but no measured wind, and a dashed ring marks wind reconstructed from disaster records.',
      apply: () => base({
        formation: 'unit', unitSort: 'chrono', // Formations-Morph (Paket 10 Task 8)
        // Kein showRug: die Bühne dots2 mountet keinen Rug-Layer (Flag war No-op).
        storyFx: fx({ showPoints: true, showTrend: true, showBand: true }),
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
      factorIntro: `Wind measures the physical hazard. The data can show that wind alone is insufficient,
        but not which conditions shaped the outcome of any single storm. Who suffers also depends
        on four things this dataset cannot see:`,
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
      source: IMPACT_SOURCE,
      outro: `Wind measures the hazard. It does not measure who was exposed, prepared or able to recover.`,
      hint: `Blue and orange rank the two extremes. The vertical thermometers place every complete
        storm-country record from low at the bottom to high at the top. Switch the ordering between
        wind and affected share; hover or focus a top-five name to locate it in both columns.`,
      apply: () => base({ storyFx: fx() }),
    },
    {
      id: 'explore',
      layout: 'explore',
      title: r('From track to toll'),
      html: r(`The story has answered its question. Now test the same relationship across every
        recorded storm-country pair. Since {{stat:yearMin}}, these records contain
        <strong>{{stat:totalAffected}} reported people affected</strong>. This is a running total:
        repeat impacts are counted once per storm-country record.`),
      source: IMPACT_SOURCE,
      hint: 'Choose a perspective, then hover, select or refine the data. Filters and selections carry across all three views.',
      apply: () => base({ storyFx: null, exploreUnlocked: true }),
    },
  ];
}
