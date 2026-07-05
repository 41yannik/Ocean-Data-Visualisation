// Deklaratives Schritt-Array der Story (docs/plan/06 + Umsetzungsentscheidung 2026-07-02:
// Fullscreen-Morph, Heta-Hook, Guba-Beat in Step 3). Reine Daten + Funktionen, kein DOM.
//
// Vertrag: buildSteps(ctx) → [{ id, layout, title, html, source, apply() → patch }]
//  - html/source sind fertig aufgelöst (alle Zahlen via resolveRefs - nie getippt).
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
export const STEP_LAYOUTS = ['intro', 'map', 'scatter', 'scatter', 'dual', 'dual', 'dual', 'explore'];
export const STEP_COUNT = STEP_LAYOUTS.length;
export const stepLayout = (step) =>
  step >= 0 && step < STEP_COUNT ? STEP_LAYOUTS[step] : 'explore';

// storyFx immer als KOMPLETTES Objekt ersetzen - fehlende Flags = neutraler Zustand.
// Exportiert, damit Fixtures (Harness) dieselbe Shape garantieren.
export const makeStoryFx = (over = {}) => ({
  focusSids: null, drawSid: null, emphasisIso3: [],
  showPoints: false, showTrend: false, showBand: false,
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
      html: r(`The Pacific has been heating for more than a century: in {{sst:latest.year}},
        sea-surface temperatures ran {{sst:latest.anom}} above the long-term average,
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
      html: r(`This is that night. In January {{event:2004-0004-NIU.year}}, Cyclone Heta
        ({{event:2004-0004-ASM.category:cat}}, near peak intensity) swept past both
        American Samoa and Niue; its gale-force wind field covered both islands.
        In American Samoa it affected
        <strong>{{event:2004-0004-ASM.affected:int}} people</strong>,
        {{event:2004-0004-ASM.affected_pc:pct}} of everyone living there. On Niue:
        <strong>{{event:2004-0004-NIU.affected:int}} people</strong>, on an island so
        small that this is {{event:2004-0004-NIU.affected_pc:pct}} of the population.
        <strong>Same storm, same night, different societies.</strong>`),
      source: 'Tracks & gale-wind radius (R34): IBTrACS (NOAA) · impacts: EM-DAT (CRED)',
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
      id: 'expectation',
      layout: 'scatter',
      title: r('What wind speed should predict'),
      html: r(`Now zoom out from that one night to every recorded strike since
        {{stat:yearMin}}. Each dot is one storm striking one country: {{stat:scatterCount}} of them,
        peak wind speed against the share of the population affected. The dashed line is what
        wind alone would predict; if it decided the toll, the dots would climb neatly along it
        to the right. They don't:
        <span class="text-link" data-event-id="2023-0300-GUM">Mawar ({{event:2023-0300-GUM.year}})</span>
        hit Guam at {{event:2023-0300-GUM.intensity_kt:kt}} and affected
        <strong>{{event:2023-0300-GUM.affected_pc:pct}} of its population</strong>, while
        <span class="text-link" data-event-id="2005-0102-TKL">Percy</span>,
        also {{event:2005-0102-TKL.category:cat}}, crossed Tokelau and touched
        <strong>{{event:2005-0102-TKL.affected:int}} people</strong>.
        <span class="hint">Hover any dot to see its story and how far it sits from the line.</span>`),
      apply: () => base({
        storyFx: fx({
          showPoints: true, showTrend: true, hideConnectors: true, hoverPoints: true,
        }),
      }),
    },
    {
      id: 'reveal',
      layout: 'scatter',
      title: r('The line is almost flat'),
      html: r(`Per capita, wind speed explains <strong>only {{fit:perCapita.r2pct}}</strong> of the variance
        (p = {{fit:perCapita.p}}); in absolute numbers {{fit:absolute.r2pct}}, not
        statistically significant (p = {{fit:absolute.p}}). The deadliest storm between
        {{stat:yearMin}} and {{stat:yearMax}},
        <span class="text-link" data-event-id="2007-0557-PNG">Cyclone Guba</span>
        ({{event:2007-0557-PNG.year}}, <strong>{{event:2007-0557-PNG.deaths:int}} deaths</strong> in Papua
        New Guinea), was only a
        <span class="text-link" data-highlight="category:1"><strong>{{event:2007-0557-PNG.category:cat}}</strong></span>
        storm. What lifts the
        <span class="text-link" data-highlight="outliers">glowing outliers</span>
        above the line is not wind: it is how exposed and vulnerable the
        society in the storm's path is.
        <span class="hint">Use the toggles above, or hover the highlighted terms.</span>`),
      apply: () => base({
        storyFx: fx({
          showPoints: true, showTrend: true, showBand: false, residualReveal: true,
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
        {{event:2020-0132-FJI.affected:int}} in Fiji, and
        {{event:2020-0132-TON.affected:int}} in Tonga. One wind speed, outcomes
        <strong>{{stat:affectedRatio.2020-0132-FJI.2020-0132-TON}}× apart</strong>.`),
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
        <strong>{{stat:aboveShare.VUT}}</strong> of Vanuatu's storms affected more people than wind speed
        would predict. In {{event:2023-0128-VUT.year}}, cyclones Judy and Kevin struck
        Vanuatu within a single week, each touching about
        <strong>{{event:2023-0128-VUT.affected_pc:pct}} of the population</strong>. Gita
        ({{event:2018-0042-TON.year}}) reached {{event:2018-0042-TON.affected_pc:pct}} of
        Tonga. Part of this is exposure (how many people live in a storm's path), not only
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
      html: r(`Honesty matters: only <strong>{{stat:scatterCount}} of {{stat:eventCount}}</strong>
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
      html: r(`A cyclone's track tells you where it goes, not what it costs the people
        beneath it. Preparedness has to target vulnerability and exposure, not just
        forecast wind speeds. <strong>Now explore for yourself:</strong> hover tracks and
        dots, brush the scatter, filter by year, category and country, and switch between
        per-capita and absolute impact.`),
      apply: () => base({ storyFx: null, exploreUnlocked: true }),
    },
  ];
}
