// Router + EINZIGER Kompositionspunkt (docs/plan/09 §5).
// ?mount=<key>[&fixture=<key>] → Dev-Harness mit genau einer Komponente; sonst volle App.
import { loadData } from './core/dataLoader.js';
import { createStore } from './core/state.js';
import { makeInitialState } from './core/initialState.js';
import { applyCssVars } from './core/config.js';
import { createMap } from './map/index.js';
import { createScatter } from './scatter/index.js';

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
    // C11–C15 hängen hier tooltip, detail, legend, toggle, filters an.
    const components = [
      createMap(document.querySelector('#map'), ctx),
      createScatter(document.querySelector('#scatter'), ctx),
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
