// Router + EINZIGER Kompositionspunkt (docs/plan/09 §5).
// ?mount=<key>[&fixture=<key>] → Dev-Harness mit genau einer Komponente; sonst App.
//
// Layout v5 (2026-07-03): nativer linearer One-Pager - kein Sticky, kein Scrollama.
// Jede Sektion bekommt EIGENE Komponenten-Instanzen mit eingefrorenem Story-Zustand
// (lokaler Store aus steps[i].apply(); Gate zu → keine Interaktion). Ein
// IntersectionObserver mountet die Sektion erst, wenn ihre Grafik ~30 % sichtbar
// ist (Lazy Loading; Einstiegsanimationen feuern dadurch beim Sichtbarwerden).
// Die letzte Sektion ist das voll interaktive Dashboard (entsperrter Store).
// ?step=N springt zur Sektion; ?story=off zeigt nur das Dashboard.
import { loadData } from './core/dataLoader.js';
import { createStore } from './core/state.js';
import { makeInitialState } from './core/initialState.js';
import { applyCssVars } from './core/config.js';
import { createMap } from './map/index.js';
import { createScatter } from './scatter/index.js';
import { createTooltip } from './ui/tooltip.js';
import { createDetailPanel } from './ui/detailPanel.js';
import { createModeToggle } from './ui/modeToggle.js';
import { createLegend } from './ui/legend.js';
import { createFilterPanel } from './ui/filterPanel.js';
import { createSstIntro } from './story/sstIntro.js';
import { createImpactBars } from './story/impactBars.js';
import { createRevealToggles } from './story/revealToggles.js';
import { createHaroldMorph } from './story/haroldMorph.js';
import { createUnitChart } from './story/unitChart.js';
import { createUnitSortControl } from './story/unitSortControl.js';
import { createExploreChrome } from './ui/exploreChrome.js';
import { buildSteps } from './story/steps.js';
import { SECTIONS } from './story/sections.js';
import { isScatterable } from './core/filters.js';
import { REVEAL_RESIDUAL_MIN } from './core/config.js';

// Text-Hover-Set (Step 4): „Category 1" → alle Kat-1-Stürme, „glowing outliers" → hohe Residuen.
function resolveHighlightSpec(spec, data) {
  const events = data.events.filter(isScatterable);
  if (spec === 'outliers') {
    return { ids: new Set(events.filter((e) => (e.residual_pc ?? -Infinity) > REVEAL_RESIDUAL_MIN).map((e) => e.id)), pulse: true };
  }
  if (spec.startsWith('category:')) {
    const cat = Number(spec.split(':')[1]);
    return { ids: new Set(events.filter((e) => e.category === cat).map((e) => e.id)), pulse: false };
  }
  return { ids: new Set(), pulse: false };
}

const params = new URLSearchParams(location.search);

(async () => {
  if (params.get('mount')) {
    const { runHarness } = await import('./harness/harness.js');
    runHarness(params.get('mount'), params.get('fixture'));
  } else {
    runApp();
  }
})();

// Workbench-Chrome der Explore-Sektion: View-Toggle-Bar, Bühne mit Grafiken + schwebender
// Legende + Auswahl-Chip, sowie Off-Canvas-Filter-Sidebar mit FAB. Mount-IDs (#legend,
// #mode-toggle, #filters) bleiben erhalten → bestehende Komponenten ohne Änderung.
function exploreWorkbench(figures) {
  return `
    <div class="explore-workbench">
      <div class="view-toggle" role="tablist" aria-label="Layout">
        <button type="button" data-set-mode="map" aria-pressed="false">Map focus</button>
        <button type="button" data-set-mode="split" aria-pressed="true">Split</button>
        <button type="button" data-set-mode="chart" aria-pressed="false">Chart focus</button>
      </div>
      <div class="viz-stage">
        <div class="viz-row viz-row--dual" data-view-mode="split">${figures}</div>
        <div class="selection-chip" hidden><span class="sc-count"></span><button type="button" class="sc-clear">clear</button></div>
        <p class="brush-hint">drag on the chart to select storms</p>
        <aside class="floating-legend" data-collapsed="false">
          <header class="fl-head"><span>Legend</span><button type="button" class="fl-toggle" aria-label="Collapse legend">–</button></header>
          <div class="fl-body"><div id="legend"></div></div>
        </aside>
      </div>
    </div>
    <button type="button" class="filter-fab" aria-expanded="false">⚙ Filter data</button>
    <div class="sidebar-backdrop" hidden></div>
    <aside class="explore-sidebar" data-open="false" aria-hidden="true">
      <header class="sb-head"><h3>Filter &amp; scale</h3><button type="button" class="sb-close" aria-label="Close">×</button></header>
      <div class="sb-block"><h4>Scale</h4><div id="mode-toggle"></div></div>
      <div class="sb-block"><h4>Filters</h4><div id="filters"></div></div>
    </aside>`;
}

async function runApp() {
  applyCssVars();
  try {
    const { data, meta } = await loadData();
    const steps = buildSteps({ data, meta });
    document.querySelector('.app').classList.add('linear');

    const storyOff = params.get('story') === 'off';
    if (storyOff) document.querySelector('#hero').style.display = 'none';
    const sections = storyOff ? SECTIONS.filter((s) => s.explore) : SECTIONS;

    // 1) Skelette SOFORT rendern - .viz-frame hat feste CSS-Maße (kein Layout-Sprung).
    const main = document.querySelector('#sections');
    main.innerHTML = sections.map((sec) => {
      const s = steps[sec.step];
      const figures = sec.views.map((v) =>
        `<figure class="viz-frame viz-frame--${v}" data-view="${v}" aria-label="${sec.aria?.[v] ?? ''}"></figure>`,
      ).join('');
      return `
        <section class="section${sec.explore ? ' section-explore' : ''}" id="step-${sec.step}" data-step="${sec.step}">
          <div class="section-text">
            <p class="kicker">${sec.explore ? 'Explore the data' : `Step ${sec.step + 1} of ${SECTIONS.length}`}</p>
            <h2>${s.title}</h2>
            <p>${s.html}</p>
            ${s.source ? `<p class="source">${s.source}</p>` : ''}
          </div>
          ${sec.explore ? exploreWorkbench(figures) : `
          ${sec.controls ? '<div class="story-controls"></div>' : ''}
          <div class="viz-row${sec.views.length > 1 ? ' viz-row--dual' : ''}">${figures}</div>`}
        </section>`;
    }).join('');

    // 2) Mount je Sektion (einmalig, beim Sichtbarwerden der Grafikzeile)
    function mountSection(sectionEl, sec) {
      if (sectionEl.dataset.mounted) return;
      sectionEl.dataset.mounted = 'true';
      const step = steps[sec.step];

      if (sec.explore) {
        const store = createStore(makeInitialState()); // step -1, exploreUnlocked true
        const ctx = { data, meta, bus: store, config: null };
        const components = [
          createMap(sectionEl.querySelector('[data-view=map]'), ctx),
          createScatter(sectionEl.querySelector('[data-view=scatter]'), ctx),
          createTooltip(document.body, ctx),
          createDetailPanel(document.querySelector('#detail'), ctx),
          createLegend(sectionEl.querySelector('#legend'), ctx),
          createModeToggle(sectionEl.querySelector('#mode-toggle'), ctx),
          createFilterPanel(sectionEl.querySelector('#filters'), ctx),
          createExploreChrome(sectionEl, ctx),
        ];
        store.subscribe((state, patch) => {
          for (const c of components) c.update(state, patch);
        });
        const state = store.get();
        for (const c of components) c.update(state, undefined);
        window.store = store; // Konsole/E2E: das interaktive Dashboard
        return;
      }

      // Eingefrorene Story-Sektion: lokaler Store, niemand patcht (Gate bleibt zu).
      const frozen = { ...makeInitialState(), ...step.apply(), ...(sec.overrides ?? {}) };
      const store = createStore(frozen);
      const ctx = { data, meta, bus: store, config: null };
      const components = [];
      for (const v of sec.views) {
        const el = sectionEl.querySelector(`[data-view=${v}]`);
        if (v === 'sst') components.push(createSstIntro(el, ctx));
        if (v === 'map') components.push(createMap(el, ctx, sec.mapOpts ?? {}));
        if (v === 'bars') components.push(createImpactBars(el, ctx));
        if (v === 'haroldMorph') components.push(createHaroldMorph(el, ctx));
        if (v === 'unitChart') components.push(createUnitChart(el, ctx));
        // ohne Brush-Layer: gesperrte Sektionen brauchen kein Selektions-Overlay
        if (v === 'scatter') {
          components.push(createScatter(el, ctx, { layers: ['axes', 'rug', 'trend', 'points', 'annotations'] }));
        }
      }
      // Step 3 gibt Punkt-Hover frei → einfacher Tooltip (die Sektion mountet den globalen nicht).
      if (frozen.storyFx?.hoverPoints) components.push(createTooltip(document.body, ctx));

      // Step 4: zwei Filter-Toggles unter dem Erklärtext.
      if (sec.controls === 'revealToggles') {
        components.push(createRevealToggles(sectionEl.querySelector('.story-controls'), ctx));
      }
      // Step 7: Umschalter chronologisch ↔ Datenqualität.
      if (sec.controls === 'unitSort') {
        components.push(createUnitSortControl(sectionEl.querySelector('.story-controls'), ctx));
      }

      // Text-to-Chart: Signalwörter im Fließtext steuern die Grafik.
      // data-event-id → einzelner Punkt (Highlight + Residuum-Linie); data-highlight → ganzes Set.
      for (const linkEl of sectionEl.querySelectorAll('.text-link[data-event-id]')) {
        const id = linkEl.dataset.eventId;
        const ev = data.index.byId.get(id);
        const enter = () => store.set({ hover: { sid: ev?.sid ?? null, eventId: id, source: 'text' } });
        const leave = () => store.set({ hover: null });
        linkEl.addEventListener('mouseenter', enter);
        linkEl.addEventListener('mouseleave', leave);
        linkEl.addEventListener('focus', enter);
        linkEl.addEventListener('blur', leave);
        linkEl.setAttribute('tabindex', '0');
      }
      for (const linkEl of sectionEl.querySelectorAll('.text-link[data-highlight]')) {
        const spec = resolveHighlightSpec(linkEl.dataset.highlight, data);
        const enter = () => store.set({ textSet: spec });
        const leave = () => store.set({ textSet: null });
        linkEl.addEventListener('mouseenter', enter);
        linkEl.addEventListener('mouseleave', leave);
        linkEl.addEventListener('focus', enter);
        linkEl.addEventListener('blur', leave);
        linkEl.setAttribute('tabindex', '0');
      }

      // Innerhalb der Sektion propagieren (Heta-Hook Step 2: Windkreis → Pop von Bubble+Balken,
      // Hover-Cross-Highlight Karte↔Balken). Das Story-Gate bleibt zu - nur die vom Hook selbst
      // gesetzten Felder (hetaReached/hetaFocusIso3/hetaAnimDone) fließen; Explore-Interaktion
      // ist weiter durch exploreUnlocked:false gesperrt.
      store.subscribe((s, patch) => {
        for (const c of components) c.update(s, patch);
      });
      const state = store.get();
      for (const c of components) c.update(state, undefined);
    }

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          io.unobserve(e.target);
          const sectionEl = e.target.closest('.section');
          const sec = sections[[...main.children].indexOf(sectionEl)];
          if (sec) mountSection(sectionEl, sec);
        }
      }, { threshold: 0.3 });
      for (const row of main.querySelectorAll('.viz-row')) io.observe(row);
    } else {
      [...main.children].forEach((el, i) => mountSection(el, sections[i]));
    }

    // Deep-Link ?step=N → zur Sektion springen (IO mountet bei Ankunft)
    const deepStep = params.has('step') ? Number(params.get('step')) : null;
    if (Number.isFinite(deepStep)) {
      const target = document.querySelector(`#step-${deepStep}`);
      if (target) requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
    }
  } catch (err) {
    document.querySelector('.app').innerHTML = `<div class="error-banner">${err.message}</div>`;
  }
}
