// Router + EINZIGER Kompositionspunkt (docs/plan/09 §5).
// ?mount=<key>[&fixture=<key>] → Dev-Harness mit genau einer Komponente; sonst volle App.
// App-Modi: Standard = Scrollytelling (storyRunner sperrt Exploration bis Step 7);
// ?step=N springt per Deep-Link in die Story; ?story=off = reines Dashboard.
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
import { createLayoutController } from './story/layoutController.js';
import { createStoryCaption } from './story/storyCaption.js';
import { createProgressNav } from './story/progressNav.js';
import { createStoryRunner } from './story/storyRunner.js';

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
    const store = createStore(makeInitialState());
    const ctx = { data, meta, bus: store, config: null };

    const storyOff = params.get('story') === 'off';
    const deepStep = params.has('step') ? Number(params.get('step')) : null;

    // Deterministische Update-Reihenfolge (Lücke L14): Layout → Views → UI → Story.
    const components = [
      createLayoutController(document.querySelector('.app'), ctx),
      createMap(document.querySelector('#map'), ctx),
      createScatter(document.querySelector('#scatter'), ctx),
      createSstIntro(document.querySelector('#sst'), ctx),
      createStoryCaption(document.querySelector('#step-caption'), ctx),
      createTooltip(document.body, ctx),
      createDetailPanel(document.querySelector('#detail'), ctx),
      createLegend(document.querySelector('#legend'), ctx),
      createModeToggle(document.querySelector('#mode-toggle'), ctx),
      createFilterPanel(document.querySelector('#filters'), ctx),
    ];

    if (storyOff) {
      // Reines Dashboard: Hero + Trigger + Caption weg — nur die Bühne bleibt.
      document.querySelector('#hero').style.display = 'none';
      document.querySelector('#story-steps').style.display = 'none';
      document.querySelector('#step-caption').style.display = 'none';
    } else {
      components.push(createProgressNav(document.querySelector('#progress-nav'), ctx));
      // Zuletzt: wendet beim Erzeugen Step 0 (bzw. ?step=N) an und sperrt die Exploration.
      components.push(createStoryRunner(document.querySelector('#story-steps'), ctx, {
        initialStep: Number.isFinite(deepStep) ? deepStep : 0,
      }));
    }

    store.subscribe((state, patch) => {
      for (const c of components) c.update(state, patch);
    });
    const state = store.get();
    for (const c of components) c.update(state, undefined); // Vollrender
    window.store = store; // Konsole/E2E: store.set({step: 3})
  } catch (err) {
    document.querySelector('.app').innerHTML = `<div class="error-banner">${err.message}</div>`;
  }
}
