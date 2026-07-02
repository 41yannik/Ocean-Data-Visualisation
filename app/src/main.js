// Router + EINZIGER Kompositionspunkt (docs/plan/09 §5).
// ?mount=<key>[&fixture=<key>] → Dev-Harness mit genau einer Komponente; sonst volle App.
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

    // Deterministische Update-Reihenfolge (Lücke L14): Views vor UI.
    const components = [
      createMap(document.querySelector('#map'), ctx),
      createScatter(document.querySelector('#scatter'), ctx),
      createTooltip(document.body, ctx),
      createDetailPanel(document.querySelector('#detail'), ctx),
      createLegend(document.querySelector('#legend'), ctx),
      createModeToggle(document.querySelector('#mode-toggle'), ctx),
      createFilterPanel(document.querySelector('#filters'), ctx),
    ];

    store.subscribe((state, patch) => {
      for (const c of components) c.update(state, patch);
    });
    const state = store.get();
    for (const c of components) c.update(state, undefined); // Vollrender
  } catch (err) {
    document.querySelector('.app').innerHTML = `<div class="error-banner">${err.message}</div>`;
  }
}
