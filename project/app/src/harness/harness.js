// Dev-Harness: mountet GENAU EINE Komponente mit echten Pipeline-Daten + Patch-Button-Leiste.
// Abnahmeregel (docs/plan/09 §5): Eine Komponente gilt als fertig, wenn sie hier mit allen
// relevanten Fixtures korrekt reagiert - erst dann wird sie in runApp() registriert.
import { loadData } from '../core/dataLoader.js';
import { createStore } from '../core/state.js';
import { makeInitialState } from '../core/initialState.js';
import { applyTheme } from '../core/theme.js';
import { FIXTURES } from './fixtures.js';
import { REGISTRY } from './registry.js';

export async function runHarness(mountKey, fixtureKey) {
  // Visuelle Komponenten-Snapshots bleiben unabhängig von einer lokal gespeicherten
  // Nutzerwahl reproduzierbar im etablierten hellen Theme.
  applyTheme('light', { persist: false, dispatch: false });
  document.body.innerHTML = `
    <div class="harness-bar" id="hb">
      <span class="hb-title"></span>
    </div>
    <div class="harness-container" id="hc"></div>`;
  const bar = document.querySelector('#hb');
  const container = document.querySelector('#hc');
  bar.querySelector('.hb-title').textContent = `HARNESS · mount=${mountKey}`;

  const entry = REGISTRY[mountKey];
  if (!entry) {
    const summary = document.createElement('pre');
    summary.className = 'harness-summary';
    summary.textContent = `Unbekannter mount-Key: ${mountKey}\nVerfügbar: ${Object.keys(REGISTRY).join(', ')}`;
    container.replaceChildren(summary);
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
    const banner = document.createElement('div');
    banner.className = 'error-banner';
    banner.textContent = err instanceof Error ? err.message : String(err);
    container.replaceChildren(banner);
  }
}
