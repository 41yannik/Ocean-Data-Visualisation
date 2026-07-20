// Layout-Controller: mappt state.step → data-layout auf der App-Wurzel und hält die
// aria-Labels der drei Views je Story-Step aktuell (Paket 07 Punkt 10 - Screenreader
// bekommen denselben Erzählstand wie Sehende). Der Morph selbst ist reines CSS
// (styles.css, [data-layout=…]); Map/Scatter/SST bleiben unberührt (viewBox skaliert).
// Statische Strings ohne Datenzahlen - Zahlen wären Resolver-Pflicht (Paket-06-Regel).
import { stepLayout } from './steps.js';

const DEFAULT_LABELS = {
  sst: 'Warming stripes with an aligned annual line chart: Pacific sea-surface temperature anomalies since 1850',
  map: 'Map of Pacific tropical-cyclone tracks; track width shows storm category',
  scatter: 'Scatterplot of peak wind speed against share of national population affected',
};

// je Step nur die Abweichungen vom Default (offene Land-Jahr-Story)
const STEP_LABELS = {
  2: { map: 'Map focused on Cyclone Harold crossing Vanuatu and Fiji; the two reported tolls pulse' },
  4: { map: 'Map focused on Cyclone Winston over Fiji with its reported affected share' },
  5: { scatter: 'Scatterplot: Fiji’s above-the-line country-years highlighted with drop lines to the wind-only fit' },
  6: { scatter: 'Dot plot: one row per country, dots placed by distance from the wind-only line' },
};

export function createLayoutController(container, ctx) {
  const views = {
    sst: container.querySelector('#sst'),
    map: container.querySelector('#map'),
    scatter: container.querySelector('#scatter'),
  };

  function render(state) {
    container.dataset.layout = stepLayout(state.step);
    const overrides = STEP_LABELS[state.step] ?? {};
    for (const [key, el] of Object.entries(views)) {
      if (el) el.setAttribute('aria-label', overrides[key] ?? DEFAULT_LABELS[key]);
    }
  }
  return {
    update(state, patch) {
      if (!patch || 'step' in patch) render(state);
    },
    destroy() { container.removeAttribute('data-layout'); },
  };
}
