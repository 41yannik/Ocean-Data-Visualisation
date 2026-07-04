// Dev-Harness: mountet GENAU EINE Komponente mit echten Pipeline-Daten + Patch-Button-Leiste.
// Abnahmeregel (docs/plan/09 §5): Eine Komponente gilt als fertig, wenn sie hier mit allen
// relevanten Fixtures korrekt reagiert - erst dann wird sie in runApp() registriert.
import { loadData } from '../core/dataLoader.js';
import { createStore } from '../core/state.js';
import { makeInitialState } from '../core/initialState.js';
import { applyCssVars } from '../core/config.js';
import { FIXTURES } from './fixtures.js';
import { REGISTRY } from './registry.js';

export async function runHarness(mountKey, fixtureKey) {
  applyCssVars();
  document.body.innerHTML = `
    <div class="harness-bar" id="hb">
      <span class="hb-title">HARNESS · mount=${mountKey}</span>
    </div>
    <div class="harness-container" id="hc"></div>`;
  const bar = document.querySelector('#hb');
  const container = document.querySelector('#hc');

  const entry = REGISTRY[mountKey];
  if (!entry) {
    container.innerHTML = `<pre class="harness-summary">Unbekannter mount-Key: ${mountKey}
Verfügbar: ${Object.keys(REGISTRY).join(', ')}</pre>`;
    return;
  }

  let ctx;
  try {
    const { data, meta } = await loadData();
    const store = createStore(makeInitialState());
    ctx = { data, meta, bus: store, config: null };
    window.store = store; // Konsolen-Patches: store.set({detailSid: '2020092S09155'})

    const component = entry.mount(container, ctx);
    store.subscribe((state, patch) => component.update(state, patch));
    component.update(store.get(), undefined); // Vollrender

    // Patch-Button-Leiste
    for (const name of Object.keys(FIXTURES)) {
      const btn = document.createElement('button');
      btn.textContent = name;
      btn.addEventListener('click', () => store.set(FIXTURES[name]()));
      bar.appendChild(btn);
    }
    if (fixtureKey && FIXTURES[fixtureKey]) store.set(FIXTURES[fixtureKey]());
  } catch (err) {
    container.innerHTML = `<div class="error-banner">${err.message}</div>`;
  }
}
