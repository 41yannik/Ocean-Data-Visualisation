// Mount-Registry der Dev-Harness: Key → { title, mount(container, ctx) → Komponente }.
// Einzel-Layer laufen über den jeweiligen Kompositor mit opts.layers - Ownership von
// geo/scales bleibt beim Kompositor (docs/plan/09 §1 Regel 4).
import { select } from 'd3';
import { makePacificProjection, makeGeoPath } from '../core/scales.js';
import { MAP } from '../core/config.js';
import { isScatterable } from '../core/filters.js';
import { createMap } from '../map/index.js';
import { createScatter } from '../scatter/index.js';
import { createTooltip } from '../ui/tooltip.js';
import { createDetailPanel } from '../ui/detailPanel.js';
import { createModeToggle } from '../ui/modeToggle.js';
import { createLegend } from '../ui/legend.js';
import { createFilterPanel } from '../ui/filterPanel.js';
import { buildSteps, stepLayout } from '../story/steps.js';
import { resolveRefs } from '../story/refs.js';
import { createStoryRunner } from '../story/storyRunner.js';
import { createSstIntro } from '../story/sstIntro.js';
import { createLayoutController } from '../story/layoutController.js';
import { createProgressNav } from '../story/progressNav.js';

export const REGISTRY = {
  tooltip: {
    title: 'Tooltip (Fixtures = Hover-Zustände)',
    mount(c, ctx) {
      c.innerHTML = '<p class="harness-summary">Tooltip hängt an &lt;body&gt;, Hover-Fixtures klicken.</p>';
      return createTooltip(document.body, ctx);
    },
  },
  detail: {
    title: 'Detailpanel',
    mount(c, ctx) {
      c.innerHTML = '<p class="harness-summary">Detailpanel als Overlay: detailHarold/detailPam/detailHeta klicken, Esc schließt.</p>';
      const aside = document.createElement('aside');
      aside.className = 'detail-panel';
      aside.setAttribute('aria-hidden', 'true');
      document.body.appendChild(aside);
      const comp = createDetailPanel(aside, ctx);
      return { update: comp.update, destroy() { comp.destroy(); aside.remove(); } };
    },
  },
  toggle: { title: 'Modus-Toggle', mount: (c, ctx) => createModeToggle(c, ctx) },
  legend: { title: 'Legende', mount: (c, ctx) => createLegend(c, ctx) },
  filters: { title: 'Filterpanel', mount: (c, ctx) => createFilterPanel(c, ctx) },
  'scatter.axes': { title: 'Achsen solo', mount: (c, ctx) => createScatter(c, ctx, { layers: ['axes'] }) },
  'scatter.points': { title: 'Punkte (mit Achsen)', mount: (c, ctx) => createScatter(c, ctx, { layers: ['axes', 'points'] }) },
  'scatter.trend': { title: 'Trend + Band (mit Achsen)', mount: (c, ctx) => createScatter(c, ctx, { layers: ['axes', 'trend'] }) },
  scatter: { title: 'Scatter komplett', mount: (c, ctx) => createScatter(c, ctx) },
  'map.basemap': { title: 'Basemap solo', mount: (c, ctx) => createMap(c, ctx, { layers: ['basemap'] }) },
  'map.tracks': { title: 'Tracks solo (auf Basemap)', mount: (c, ctx) => createMap(c, ctx, { layers: ['basemap', 'tracks'] }) },
  'map.centroids': { title: 'Zentroide solo (auf Basemap)', mount: (c, ctx) => createMap(c, ctx, { layers: ['basemap', 'centroids'] }) },
  map: { title: 'Karte komplett', mount: (c, ctx) => createMap(c, ctx) },

  data: {
    title: 'dataLoader-Summary',
    mount(container, ctx) {
      const { events, tracks, index } = ctx.data;
      const scatterable = events.filter(isScatterable).length;
      container.innerHTML = `<pre class="harness-summary">
events:      ${events.length}   (erwartet 99)
tracks:      ${Object.keys(tracks).length}   (erwartet 69)
scatterable: ${scatterable}   (erwartet 78)
centroids:   ${Object.keys(index.centroids).length}   (erwartet 22)
bySid:       ${index.bySid.size} Stürme · byId: ${index.byId.size}
fits:        abs R²=${ctx.meta.fits.absolute.r2} (p=${ctx.meta.fits.absolute.p}) · pc R²=${ctx.meta.fits.perCapita.r2} (p=${ctx.meta.fits.perCapita.p})
Harold-Zeilen: ${index.bySid.get('2020092S09155')?.length} (erwartet 4) · Pam: ${index.bySid.get('2015066S08170')?.length} (erwartet 5)</pre>`;
      return { update() {}, destroy() { container.innerHTML = ''; } };
    },
  },

  sst: { title: 'SST-Intro: Warming Stripes (PDH)', mount: (c, ctx) => createSstIntro(c, ctx) },

  story: {
    title: 'storyRunner: scrollen/Pfeiltasten → Steps feuern (Log unten links)',
    mount(c, ctx) {
      c.innerHTML = `
        <div class="scrolly" style="margin-top:0;"><div id="hs-steps"></div></div>
        <pre class="harness-summary" id="hs-log"
          style="position:fixed;left:12px;bottom:12px;background:#1f2430;color:#9fe8a8;padding:8px 10px;z-index:60;margin:0;">step: –</pre>`;
      const runner = createStoryRunner(c.querySelector('#hs-steps'), ctx);
      const log = c.querySelector('#hs-log');
      return {
        update(state, patch) {
          runner.update(state, patch);
          if (!patch || 'step' in patch || 'exploreUnlocked' in patch) {
            log.textContent = `step: ${state.step} · layout: ${stepLayout(state.step)}`
              + ` · exploreUnlocked: ${state.exploreUnlocked} · fx: ${state.storyFx ? 'aktiv' : 'null'}`;
          }
        },
        destroy: runner.destroy,
      };
    },
  },

  nav: {
    title: 'Progress-Nav (rechts fixiert): step0–step7/stepOff klicken; Punkte setzen step-Patches',
    mount(c, ctx) {
      c.innerHTML = '<p class="harness-summary">Punkte-Leiste rechts am Bildschirmrand: bei step ≥ 0 sichtbar, aktiver Punkt = Akzent.</p>';
      const nav = document.createElement('nav');
      nav.className = 'progress-nav';
      document.body.appendChild(nav);
      const comp = createProgressNav(nav, ctx);
      return { update: comp.update, destroy() { comp.destroy(); nav.remove(); } };
    },
  },

  layout: {
    title: 'Layout-Morph: step0–step7 klicken → data-layout wechselt (Dummy-Views)',
    mount(container, ctx) {
      container.innerHTML = `
        <div class="app harness-layout" data-layout="intro">
          <section class="stage" style="position:static;height:70vh;">
            <div class="views">
              <figure class="view view-sst"><div class="dummy" style="background:#c65b4e;">SST</div></figure>
              <figure class="view view-map"><div class="dummy" style="background:#46688c;">KARTE</div></figure>
              <figure class="view view-scatter"><div class="dummy" style="background:#2f3640;">SCATTER</div></figure>
            </div>
            <div class="ui-bar"><span>UI-Bar: nur bei data-layout="explore" sichtbar</span></div>
          </section>
        </div>`;
      return createLayoutController(container.querySelector('.app'), ctx);
    },
  },

  'story.text': {
    title: 'Story-Texte: alle Referenzen aufgelöst (GATE: keine {{…}} übrig, Fehler-Selbsttest rot)',
    mount(container, ctx) {
      const steps = buildSteps(ctx);
      // Negativ-Selbsttest: eine bewusst falsche Referenz MUSS werfen.
      let selfTest;
      try {
        resolveRefs('{{event:9999-9999-XXX.affected:int}}', ctx);
        selfTest = 'FAIL: unbekannte Referenz hat NICHT geworfen!';
      } catch (err) {
        selfTest = `PASS: wirft wie erwartet: „${err.message}"`;
      }
      container.innerHTML = `
        <pre class="harness-summary">Steps: ${steps.length} (erwartet 8) · Selbsttest ungültige Referenz: ${selfTest}</pre>
        ${steps.map((s, i) => {
          const patch = s.apply();
          const annotations = patch.storyFx?.annotations ?? [];
          return `<article class="harness-step" style="max-width:640px;border-bottom:1px solid #ddd;padding:10px 0;">
            <h3 style="margin:0 0 4px;">Step ${i} · ${s.title} <small style="color:#777;">[${s.layout} · ${s.id}]</small></h3>
            <p style="margin:0 0 6px;">${s.html}</p>
            ${annotations.length ? `<p style="margin:0;color:#777;font-size:13px;">Annotationen: ${annotations.map((a) => `${a.eventId} → „${a.text}"`).join(' · ')}</p>` : ''}
            ${s.source ? `<p style="margin:0;color:#999;font-size:12px;">${s.source}</p>` : ''}
          </article>`;
        }).join('')}`;
      return { update() {}, destroy() { container.innerHTML = ''; } };
    },
  },

  'map.smoke': {
    title: 'Dateline-GATE: handkodierte kreuzende LineString',
    mount(container, ctx) {
      const svg = select(container).append('svg')
        .attr('viewBox', `0 0 ${MAP.width} ${MAP.height}`);
      const projection = makePacificProjection();
      const path = makeGeoPath(projection);

      svg.append('path').datum(ctx.data.land).attr('class', 'land').attr('d', path);

      const crossing = {
        type: 'LineString',
        coordinates: [[168, -12], [176, -16], [-178, -18], [-170, -20], [-165, -21]],
      };
      svg.append('path').datum(crossing)
        .attr('d', path)
        .attr('fill', 'none')
        .attr('stroke', 'var(--accent)')
        .attr('stroke-width', 2.5);

      svg.append('text').attr('x', 12).attr('y', 20).attr('class', 'axis-label')
        .text('GATE: Linie muss als durchgehende Kurve erscheinen, KEIN horizontaler Streifen quer über die Karte');
      return { update() {}, destroy() { svg.remove(); } };
    },
  },
};
