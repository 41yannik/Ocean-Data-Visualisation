// Router + EINZIGER Kompositionspunkt (docs/plan/09 §5).
// ?mount=<key>[&fixture=<key>] → Dev-Harness mit genau einer Komponente; sonst App.
//
// Layout v5 (2026-07-03): nativer linearer One-Pager — kein Sticky, kein Scrollama.
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
import { buildSteps } from './story/steps.js';
import { SECTIONS } from './story/sections.js';

const params = new URLSearchParams(location.search);

(async () => {
  if (params.get('mount')) {
    const { runHarness } = await import('./harness/harness.js');
    runHarness(params.get('mount'), params.get('fixture'));
  } else {
    runApp();
  }
})();

async function runApp() {
  applyCssVars();
  try {
    const { data, meta } = await loadData();
    const steps = buildSteps({ data, meta });
    document.querySelector('.app').classList.add('linear');

    const storyOff = params.get('story') === 'off';
    if (storyOff) document.querySelector('#hero').style.display = 'none';
    const sections = storyOff ? SECTIONS.filter((s) => s.explore) : SECTIONS;

    // 1) Skelette SOFORT rendern — .viz-frame hat feste CSS-Maße (kein Layout-Sprung).
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
          <div class="viz-row${sec.views.length > 1 ? ' viz-row--dual' : ''}">${figures}</div>
          ${sec.explore ? `
            <div class="ui-bar">
              <div id="mode-toggle"></div>
              <div id="filters"></div>
              <div id="legend"></div>
            </div>` : ''}
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
        // ohne Brush-Layer: gesperrte Sektionen brauchen kein Selektions-Overlay
        if (v === 'scatter') {
          components.push(createScatter(el, ctx, { layers: ['axes', 'rug', 'trend', 'points', 'annotations'] }));
        }
      }
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
