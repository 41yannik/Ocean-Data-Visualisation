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
import '@fontsource-variable/bricolage-grotesque'; // self-hosted, offline (Challenge-Regel)
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
import { createHaroldMorph } from './story/haroldMorph.js';
import { createUnitChart } from './story/unitChart.js';
import { createUnitSortControl } from './story/unitSortControl.js';
import { createExploreChrome } from './ui/exploreChrome.js';
import { buildSteps } from './story/steps.js';
import { SECTIONS } from './story/sections.js';
import { createChapterNav } from './story/chapterNav.js';
import { createStageGroup } from './story/stageGroup.js';
import { createFormationLayer } from './story/formationLayer.js';
import { createChartControls } from './story/chartControls.js';
import { createProfileBars } from './ui/profileBars.js';
import { createImpactTrend } from './ui/impactTrend.js';
import { resolveHighlightSpec } from './story/highlightSpecs.js';

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
      </div>
      <!-- Legende statisch UNTER den Charts (Datenraum rechts unten bleibt frei) -->
      <div class="chart-legend"><div id="legend"></div></div>
      <div class="tile-row">
        <section class="tile" aria-label="Radar chart comparing the storm profiles of Mawar, Percy and Cyclone Guba">
          <h3>Storm profiles compared</h3>
          <div class="tile-body" id="tile-profile"></div>
        </section>
        <section class="tile" aria-label="People affected per year by Pacific subregion, log scale">
          <h3>People affected per year</h3>
          <div class="tile-body" id="tile-trend"></div>
        </section>
        <section class="tile" aria-label="Data availability: 78 fully recorded versus 21 unrecorded storm-country pairs">
          <h3>Data availability</h3>
          <p class="tile-note tile-note--legend"><span class="ul-dot ul-solid"></span> wind + impact recorded &nbsp; <span class="ul-dot ul-ghost"></span> impact never recorded</p>
          <div class="tile-body tile-body--unit" id="tile-unit"></div>
          <div class="tile-controls" id="tile-unit-sort"></div>
        </section>
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

    // Bühnen-Gruppen (Paket 10): aufeinanderfolgende Sektionen mit gleichem stage-Schlüssel
    // teilen sich EINE sticky Grafik (fließende Übergänge statt harter Schnitte);
    // alle anderen Sektionen rendern und mounten wie bisher einzeln.
    const blocks = [];
    for (const sec of sections) {
      const last = blocks[blocks.length - 1];
      if (sec.stage && last?.stage === sec.stage) last.members.push(sec);
      else blocks.push(sec.stage ? { stage: sec.stage, members: [sec] } : { single: sec });
    }

    // 1) Skelette SOFORT rendern - .viz-frame hat feste CSS-Maße (kein Layout-Sprung).
    const sectionHtml = (sec) => {
      const s = steps[sec.step];
      const figures = sec.views.map((v) =>
        `<figure class="viz-frame viz-frame--${v}" data-view="${v}" aria-label="${sec.aria?.[v] ?? ''}"></figure>`,
      ).join('');
      // Evidence-Panel: zweispaltig - Text links, Chart mit Control-Leiste rechts.
      if (sec.split) {
        return `
        <section class="section section--split" id="step-${sec.step}" data-step="${sec.step}">
          <div class="section-text">
            <p class="kicker">${sec.act}</p>
            <h2>${s.title}</h2>
            <p>${s.html}</p>
            ${s.source ? `<p class="source">${s.source}</p>` : ''}
          </div>
          <div class="split-viz">
            <div class="chart-controls"></div>
            <div class="viz-row">${figures}</div>
          </div>
        </section>`;
      }
      return `
        <section class="section${sec.explore ? ' section-explore' : ''}" id="step-${sec.step}" data-step="${sec.step}">
          <div class="section-text">
            <p class="kicker">${sec.act}</p>
            <h2>${s.title}</h2>
            <p>${s.html}</p>
            ${s.source ? `<p class="source">${s.source}</p>` : ''}
          </div>
          ${sec.explore ? exploreWorkbench(figures) : `
          ${sec.controls ? '<div class="story-controls"></div>' : ''}
          <div class="viz-row${sec.views.length > 1 ? ' viz-row--dual' : ''}">${figures}</div>`}
        </section>`;
    };

    // Gruppe: sticky Scatter-Bühne + Textkarten, die darüber scrollen (Text-IDs step-N
    // bleiben erhalten - Deep-Links und Kapitel-Nav funktionieren unverändert).
    const groupHtml = (block) => `
        <div class="stage-group" data-stage="${block.stage}">
          <div class="stage-sticky">
            <figure class="viz-frame viz-frame--scatter" data-view="scatter"
              aria-label="${block.members[0].aria?.scatter ?? ''}"></figure>
          </div>
          <div class="stage-steps">
            ${block.members.map((sec) => {
              const s = steps[sec.step];
              return `
              <div class="stage-step" id="step-${sec.step}" data-step="${sec.step}">
                <div class="section-text">
                  <p class="kicker">${sec.act}</p>
                  <h2>${s.title}</h2>
                  <p>${s.html}</p>
                  ${s.source ? `<p class="source">${s.source}</p>` : ''}
                  ${sec.controls ? '<div class="story-controls"></div>' : ''}
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>`;

    const main = document.querySelector('#sections');
    main.innerHTML = blocks.map((b) => (b.single ? sectionHtml(b.single) : groupHtml(b))).join('');

    // Kapitel-Nav (Paket 10 Task 2): erst nach dem Sektions-Rendering, braucht die IDs.
    if (!storyOff) createChapterNav(document.body, { sections, steps });

    // Text-to-Chart: Signalwörter im Fließtext steuern die Grafik (Einzel-Sektionen
    // UND Bühnen-Gruppen). data-event-id → einzelner Punkt (Highlight + Residuum-Linie);
    // data-highlight → ganzes Set.
    function wireTextLinks(rootEl, store) {
      for (const linkEl of rootEl.querySelectorAll('.text-link[data-event-id]')) {
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
      for (const linkEl of rootEl.querySelectorAll('.text-link[data-highlight]')) {
        const spec = resolveHighlightSpec(linkEl.dataset.highlight, data);
        const enter = () => store.set({ textSet: spec });
        const leave = () => store.set({ textSet: null });
        linkEl.addEventListener('mouseenter', enter);
        linkEl.addEventListener('mouseleave', leave);
        linkEl.addEventListener('focus', enter);
        linkEl.addEventListener('blur', leave);
        linkEl.setAttribute('tabindex', '0');
      }
    }

    // Mount einer Bühnen-Gruppe (einmalig): gemeinsame Instanzen + Scrollama-Trigger.
    function mountGroup(groupEl) {
      if (groupEl.dataset.mounted) return;
      groupEl.dataset.mounted = 'true';
      const members = [...groupEl.querySelectorAll('.stage-step')].map((textEl) => ({
        sec: sections.find((s) => s.step === Number(textEl.dataset.step)), textEl,
      }));
      // Komposition je Bühne: 'dots2' = Scatter OHNE Punkte-Layer + Formations-Layer
      // (99 Kreise morphen zwischen Scatter- und Unit-Raster-Formation) + Unit-Sort-Umschalter.
      const builders = {
        dots2: (el, groupCtx) => {
          const scatter = createScatter(el.querySelector('[data-view=scatter]'), groupCtx,
            { layers: ['axes', 'trend', 'annotations'] });
          const gDots = scatter.root.append('g').attr('class', 'g-formation');
          const formation = createFormationLayer(gDots,
            { ...groupCtx, scales: scatter.scales, inner: scatter.inner });
          const comps = [scatter, formation];
          const ctrl = el.querySelector('.story-controls');
          if (ctrl) comps.push(createUnitSortControl(ctrl, groupCtx));
          return comps;
        },
      };
      const group = createStageGroup(groupEl, {
        ctx: { data, meta, bus: null, config: null },
        steps,
        members,
        buildComponents: builders[groupEl.dataset.stage],
      });
      wireTextLinks(groupEl, group.store);
    }

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
          // Dashboard-Kacheln (Plan delightful-harbor): Radar + Jahres-Trend + Unit Chart
          // laufen auf demselben Explore-Store (Unit-Sort/Hover sofort funktionsfähig).
          createProfileBars(sectionEl.querySelector('#tile-profile'), ctx),
          createImpactTrend(sectionEl.querySelector('#tile-trend'), ctx),
          createUnitChart(sectionEl.querySelector('#tile-unit'), ctx),
          createUnitSortControl(sectionEl.querySelector('#tile-unit-sort'), ctx),
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
      // hoverPoints gibt Punkt-Hover trotz Story-Gate frei → einfacher Tooltip.
      if (frozen.storyFx?.hoverPoints) components.push(createTooltip(document.body, ctx));

      // Evidence-Panel: Bedienelemente direkt an der Grafik (4 Highlight-Buttons + Land-Dropdown).
      if (sec.split) {
        components.push(createChartControls(sectionEl.querySelector('.chart-controls'), ctx));
      }
      // Umschalter chronologisch ↔ Datenqualität (Unit Chart).
      if (sec.controls === 'unitSort') {
        components.push(createUnitSortControl(sectionEl.querySelector('.story-controls'), ctx));
      }

      wireTextLinks(sectionEl, store);

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
          const groupEl = e.target.closest('.stage-group');
          if (groupEl) { mountGroup(groupEl); continue; }
          const sectionEl = e.target.closest('.section');
          const sec = sections.find((s) => s.step === Number(sectionEl?.dataset.step));
          if (sec) mountSection(sectionEl, sec);
        }
      }, { threshold: 0.3 });
      for (const row of main.querySelectorAll('.viz-row')) io.observe(row);
      for (const sticky of main.querySelectorAll('.stage-sticky')) io.observe(sticky);
    } else {
      for (const el of main.querySelectorAll('.section')) {
        const sec = sections.find((s) => s.step === Number(el.dataset.step));
        if (sec) mountSection(el, sec);
      }
      for (const el of main.querySelectorAll('.stage-group')) mountGroup(el);
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
