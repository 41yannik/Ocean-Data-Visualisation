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
import { createFilterPanel } from './ui/filterPanel.js';
import { createTimeScrubber } from './ui/timeScrubber.js';
import { createSstIntro } from './story/sstIntro.js';
import { createStormTrend, createGenesisTrend } from './story/stormTrend.js';
import { createImpactBars } from './story/impactBars.js';
import { createPamMorph } from './story/pamMorph.js';
import { createUnitChart } from './story/unitChart.js';
import { createUnitSortControl } from './story/unitSortControl.js';
import { createExploreLab } from './ui/exploreLab.js';
import { createExploreThumbs } from './ui/exploreThumbs.js';
import { buildSteps } from './story/steps.js';
import { SECTIONS } from './story/sections.js';
import { createChapterNav } from './story/chapterNav.js';
import { createStageGroup } from './story/stageGroup.js';
import { createFormationLayer } from './story/formationLayer.js';
import { createChartControls } from './story/chartControls.js';
import { createConclusionSynthesis } from './story/conclusionSynthesis.js';
import { createTrackHeatmap } from './ui/trackHeatmap.js';
import { createTollMap } from './ui/tollMap.js';
import { createCountryRecurrence } from './ui/countryRecurrence.js';
import { createResidualLab } from './ui/residualLab.js';
import { createSelectionSummary } from './ui/selectionSummary.js';
import { methodsHtml } from './story/methods.js';
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

// Kompakter Scatter für das stabile Analysefenster des Evidence Labs.
const EXPLORE_SCATTER = { width: 720, height: 500, margin: { top: 24, right: 20, bottom: 68, left: 64 } };

function evidenceWorkbench(aria = {}) {
  return `
    <div class="evidence-lab">
      <div class="evidence-switcher">
        <nav class="evidence-questions" role="tablist" aria-label="Choose an evidence perspective">
          <button id="tab-outliers" role="tab" data-explore-view="outliers" aria-controls="evidence-outliers" aria-selected="true">
            <span class="thumb-viz" data-thumb="outliers" aria-hidden="true"></span>
            <span class="thumb-label">Wind outliers</span>
          </button>
          <button id="tab-residuals" role="tab" data-explore-view="residuals" aria-controls="evidence-residuals" aria-selected="false" tabindex="-1">
            <span class="thumb-viz" data-thumb="residuals" aria-hidden="true"></span>
            <span class="thumb-label">Beyond the wind line</span>
          </button>
          <button id="tab-countries" role="tab" data-explore-view="countries" aria-controls="evidence-countries" aria-selected="false" tabindex="-1">
            <span class="thumb-viz" data-thumb="countries" aria-hidden="true"></span>
            <span class="thumb-label">Repeated impacts</span>
          </button>
          <button id="tab-geography" role="tab" data-explore-view="geography" aria-controls="evidence-geography" aria-selected="false" tabindex="-1">
            <span class="thumb-viz" data-thumb="geography" aria-hidden="true"></span>
            <span class="thumb-label">Track geography</span>
          </button>
        </nav>
        <button class="evidence-refine" type="button" aria-expanded="false" aria-controls="evidence-filter-region">
          Refine data <span class="evidence-refine-count" hidden></span>
        </button>
      </div>
      <div id="evidence-filter-region" class="evidence-filters" hidden>
        <div id="filters"></div>
      </div>
      <div class="evidence-context-controls">
        <div class="evidence-metric"><span>Impact measure</span><div id="mode-toggle"></div></div>
        <div id="evidence-filter-summary" class="evidence-filter-summary" aria-live="polite" aria-atomic="true"></div>
      </div>
      <div class="evidence-panels">
        <section id="evidence-outliers" class="evidence-panel" data-panel="outliers" role="tabpanel" aria-labelledby="question-outliers">
          <header><h3 id="question-outliers">Which impacts outran the wind-only expectation?</h3><p>Distance above or below the line shows where reported impact diverged from wind alone.</p></header>
          <div class="evidence-empty" hidden><p role="status">No complete wind-and-impact records match these filters.</p><button type="button" data-clear-filters>Clear filters</button></div>
          <div class="evidence-panel-content outlier-layout"><figure class="viz-frame viz-frame--scatter" data-view="scatter" aria-label="${aria.scatter ?? ''}"></figure><aside id="selection-summary" class="evidence-summary"></aside></div>
        </section>
        <section id="evidence-residuals" class="evidence-panel" data-panel="residuals" role="tabpanel" aria-labelledby="question-residuals" hidden>
          <header><h3 id="question-residuals">Who suffers more than wind alone predicts?</h3><p>One row per country, every record placed by its distance from the wind-only line. Dots to the right took a heavier toll than the wind predicts; the emphasised marker is the country's median.</p></header>
          <div class="evidence-empty" hidden><p role="status">No complete wind-and-impact records match these filters.</p><button type="button" data-clear-filters>Clear filters</button></div>
          <div class="evidence-panel-content"><figure id="residual-lab" class="residual-lab"></figure></div>
        </section>
        <section id="evidence-countries" class="evidence-panel" data-panel="countries" role="tabpanel" aria-labelledby="question-countries" hidden>
          <header><h3 id="question-countries">Which countries appear repeatedly in the impact records?</h3><p>Each dot is one storm-country record. Hollow dots mean the human impact was not reported.</p></header>
          <div class="evidence-empty" hidden><p role="status">No storm-country records match these filters.</p><button type="button" data-clear-filters>Clear filters</button></div>
          <div class="evidence-panel-content"><figure id="country-recurrence" class="country-recurrence"></figure></div>
        </section>
        <section id="evidence-geography" class="evidence-panel" data-panel="geography" role="tabpanel" aria-labelledby="question-geography" hidden>
          <header><h3 id="question-geography">Where do storms concentrate — and where does the toll land?</h3><p>Switch between individual tracks, an aggregate view and the reported human toll of the same filtered storms.</p></header>
          <div class="evidence-empty" hidden><p role="status">No storm tracks match these filters.</p><button type="button" data-clear-filters>Clear filters</button></div>
          <div class="evidence-panel-content">
            <div class="geo-controls"><div role="group" aria-label="Map layer"><button data-map-layer="tracks" aria-pressed="true">Tracks</button><button data-map-layer="hotzones" aria-pressed="false">Hot zones</button><button data-map-layer="toll" aria-pressed="false">Human toll</button></div><div class="hot-metric-control" role="group" aria-label="Hot-zone metric" hidden><button data-hot-metric="frequency" aria-pressed="true">Frequency</button><button data-hot-metric="averageWind" aria-pressed="false">Average wind</button></div></div>
            <div class="geo-stage"><figure class="viz-frame viz-frame--map" data-view="map" data-geo-layer="tracks" aria-label="${aria.map ?? ''}"></figure><figure class="viz-frame viz-frame--map" id="hot-zone-map" data-geo-layer="hotzones" hidden></figure><figure class="viz-frame viz-frame--map" id="human-toll-map" data-geo-layer="toll" hidden></figure></div>
            <div id="map-timeline"></div>
            <p class="geo-context" data-geo-note="tracks">Track width indicates storm category. Hover or click a track to follow that storm across the evidence lab.</p>
            <p class="geo-context" data-geo-note="hotzones" hidden>Each cell aggregates the filtered tracks that cross it. Click a cell to select its contributing storm records.</p>
            <p class="geo-context" data-geo-note="toll" hidden>Circle area sums each country's reported affected people — switch the impact measure to compare median population shares instead. Hollow rings mark countries whose filtered records report no human impact. Click a circle to select that country's records.</p>
          </div>
        </section>
      </div>
    </div>`;
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
    // EINE Render-Stelle für den Sektionstext (normal, split, Bühnen-Karte) - inkl.
    // der Editorial-Felder: Leitfragen (questions), Übergabe-Satz (transition),
    // Quelle (source) und "How to read"-Lesehilfe (hint). Reihenfolge ist bewusst:
    // Argument → Fragen → Übergabe → Beleg → Lesehilfe.
    const sectionTextHtml = (sec, s, extra = '') => `
          <div class="section-text">
            <p class="kicker">${sec.act}</p>
            <h2>${s.title}</h2>
            <p>${s.html}</p>
            ${s.questions ? `<ul class="guide-questions">${s.questions.map((q) => `<li>${q}</li>`).join('')}</ul>` : ''}
            ${s.caveat ? `<p class="section-caveat">${s.caveat}</p>` : ''}
            ${s.transition ? `<p class="transition">${s.transition}</p>` : ''}
            ${s.source ? `<p class="source"><span class="source-label">Source</span> · ${s.source}</p>` : ''}
            ${s.hint ? `<p class="reading-hint">${s.hint}</p>` : ''}
            ${extra}
          </div>`;

    const sectionHtml = (sec) => {
      const s = steps[sec.step];
      const figures = sec.views.map((v) =>
        `<figure class="viz-frame viz-frame--${v}" data-view="${v}" aria-label="${sec.aria?.[v] ?? ''}"></figure>`,
      ).join('');
      // Fazit: zwei große Top-5-Listen und gekoppelte vertikale Thermometer bilden
      // eine gemeinsame Synthese; unquantifizierte Bedingungen folgen redaktionell.
      if (sec.conclusion) {
        return `
        <section class="section section--conclusion" id="step-${sec.step}" data-step="${sec.step}">
          ${sectionTextHtml(sec, s)}
          <div class="conclusion-evidence">
            <div class="viz-row">${figures}</div>
          </div>
          <aside class="conclusion-factors" aria-labelledby="conclusion-answer-title">
            <div class="conclusion-answer">
              <!-- Kicker-Diät (Review 2026-07-13): die kursive Frage trägt die Rückkehr
                   zur Ausgangsfrage allein - kein Eyebrow, erst recht kein farbiges. -->
              <p class="conclusion-answer__question">${s.factorQuestion}</p>
              <h3 id="conclusion-answer-title">${s.factorAnswer}</h3>
              <p>${s.factorIntro}</p>
            </div>
            <ol class="conclusion-factor-cards" role="list">
              ${s.factors.map((factor, i) => `
                <li class="factor-card">
                  <span class="factor-card__num" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
                  <h4>${factor.title}</h4>
                  <p>${factor.text}</p>
                </li>`).join('')}
            </ol>
          </aside>
          ${s.outro ? `<p class="conclusion-outro">${s.outro}</p>` : ''}
        </section>`;
      }
      // Evidence-Panel: zweispaltig - Text links, Chart mit Control-Leiste rechts.
      if (sec.split) {
        return `
        <section class="section section--split" id="step-${sec.step}" data-step="${sec.step}">
          ${sectionTextHtml(sec, s)}
          <div class="split-viz">
            <div class="chart-controls"></div>
            <div class="viz-row">${figures}</div>
          </div>
        </section>`;
      }
      return `
        <section class="section${sec.explore ? ' section-explore' : ''}" id="step-${sec.step}" data-step="${sec.step}">
          ${sectionTextHtml(sec, s)}
          ${sec.explore ? evidenceWorkbench(sec.aria) : `
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
              aria-label="${block.members[0].aria?.scatter ?? ''}">${
              // Controls direkt AN der Grafik (oben rechts im Frame), nicht in der Textkarte -
              // sichtbar nur in der Unit-Formation (CSS-Gate über :has(.fm-unit)).
              block.members.some((sec) => sec.controls) ? '<div class="story-controls story-controls--stage"></div>' : ''
            }</figure>
          </div>
          <div class="stage-steps">
            ${block.members.map((sec) => {
              const s = steps[sec.step];
              return `
              <div class="stage-step" id="step-${sec.step}" data-step="${sec.step}">
                ${sectionTextHtml(sec, s, '')}
              </div>`;
            }).join('')}
          </div>
        </div>`;

    const main = document.querySelector('#sections');
    main.innerHTML = blocks.map((b) => (b.single ? sectionHtml(b.single) : groupHtml(b))).join('');
    // Methods & data als transparenter Abschluss - alle Zahlen aus meta.json, nie getippt.
    main.insertAdjacentHTML('beforeend', methodsHtml(meta));

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
        const requestedView = params.get('view');
        const exploreView = ['outliers', 'residuals', 'countries', 'geography'].includes(requestedView) ? requestedView : 'outliers';
        const store = createStore({ ...makeInitialState(), exploreView });
        const ctx = { data, meta, bus: store, config: null };
        const exploreLab = createExploreLab(sectionEl, ctx);
        const components = [
          createTooltip(document.body, ctx),
          createDetailPanel(document.querySelector('#detail'), ctx),
          createModeToggle(sectionEl.querySelector('#mode-toggle'), ctx),
          createFilterPanel(sectionEl.querySelector('#filters'), ctx),
          exploreLab,
          createExploreThumbs(sectionEl, ctx),
        ];
        const mountedViews = new Set();
        function mountView(view) {
          if (mountedViews.has(view)) return [];
          mountedViews.add(view);
          const added = [];
          if (view === 'outliers') added.push(
            createScatter(sectionEl.querySelector('[data-view=scatter]'), ctx,
              { dims: EXPLORE_SCATTER, uniformPoints: true }),
            createSelectionSummary(sectionEl.querySelector('#selection-summary'), ctx),
          );
          if (view === 'residuals') added.push(
            createResidualLab(sectionEl.querySelector('#residual-lab'), ctx),
          );
          if (view === 'countries') added.push(
            createCountryRecurrence(sectionEl.querySelector('#country-recurrence'), ctx),
          );
          if (view === 'geography') added.push(
            createMap(sectionEl.querySelector('[data-view=map]'), ctx),
            createTrackHeatmap(sectionEl.querySelector('#hot-zone-map'), ctx),
            createTollMap(sectionEl.querySelector('#human-toll-map'), ctx),
            createTimeScrubber(sectionEl.querySelector('#map-timeline'), ctx),
          );
          components.push(...added);
          return added;
        }
        store.subscribe((state, patch) => {
          // Das aktive Panel zuerst sichtbar machen, damit neu gemountete D3-Views ihre
          // echte Breite statt clientWidth=0 messen (besonders wichtig für die Länderzeilen).
          exploreLab.update(state, patch);
          const added = new Set(mountView(state.exploreView));
          for (const c of components) {
            if (c === exploreLab) continue;
            c.update(state, added.has(c) ? undefined : patch);
          }
        });
        const state = store.get();
        exploreLab.update(state, undefined);
        mountView(state.exploreView);
        for (const c of components) {
          if (c !== exploreLab) c.update(state, undefined);
        }
        window.store = store;
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
        if (v === 'stormTrend') components.push(createStormTrend(el, ctx));
        if (v === 'genesisTrend') components.push(createGenesisTrend(el, ctx));
        if (v === 'map') components.push(createMap(el, ctx, sec.mapOpts ?? {}));
        if (v === 'bars') components.push(createImpactBars(el, ctx));
        if (v === 'pamMorph') components.push(createPamMorph(el, ctx));
        if (v === 'unitChart') components.push(createUnitChart(el, ctx));
        if (v === 'conclusionSynthesis') components.push(createConclusionSynthesis(el, ctx));
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
      for (const lab of main.querySelectorAll('.evidence-lab')) io.observe(lab);
    } else {
      for (const el of main.querySelectorAll('.section')) {
        const sec = sections.find((s) => s.step === Number(el.dataset.step));
        if (sec) mountSection(el, sec);
      }
      for (const el of main.querySelectorAll('.stage-group')) mountGroup(el);
    }

    // Deep-Link ?step=N → zur Sektion springen (IO mountet bei Ankunft)
    const deepStep = params.has('step') ? Number(params.get('step')) : null;
    if (Number.isInteger(deepStep) && sections.some((section) => section.step === deepStep)) {
      const target = document.getElementById(`step-${deepStep}`);
      if (target) requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
    }
  } catch (err) {
    const banner = document.createElement('div');
    banner.className = 'error-banner';
    banner.textContent = err instanceof Error ? err.message : String(err);
    document.querySelector('.app').replaceChildren(banner);
  }
}
