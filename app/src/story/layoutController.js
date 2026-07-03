// Layout-Controller: mappt state.step → data-layout auf der App-Wurzel und hält die
// aria-Labels der drei Views je Story-Step aktuell (Paket 07 Punkt 10 — Screenreader
// bekommen denselben Erzählstand wie Sehende). Der Morph selbst ist reines CSS
// (styles.css, [data-layout=…]); Map/Scatter/SST bleiben unberührt (viewBox skaliert).
// Statische Strings ohne Datenzahlen — Zahlen wären Resolver-Pflicht (Paket-06-Regel).
import { stepLayout } from './steps.js';

const DEFAULT_LABELS = {
  sst: 'Warming stripes with an aligned annual line chart: Pacific sea-surface temperature anomalies since 1850',
  map: 'Map of Pacific tropical-cyclone tracks; track width shows storm category',
  scatter: 'Scatterplot of peak wind speed against share of national population affected',
};

// je Step nur die Abweichungen vom Default
const STEP_LABELS = {
  1: { map: 'Map focused on Cyclone Heta’s track past American Samoa and Niue; both impact sites pulse' },
  2: { scatter: 'Scatterplot: storm-country pairs appear; no trend line yet — Mawar and Percy annotated' },
  3: { scatter: 'Scatterplot: nearly flat expectation line with quantile band; high-residual outliers highlighted, Cyclone Guba ringed' },
  4: { map: 'Map focused on Cyclone Harold’s track across four countries', scatter: 'Scatterplot: Harold’s four connected country outcomes highlighted' },
  5: { scatter: 'Scatterplot: Vanuatu’s repeat above-the-line storms highlighted, with Kevin, Judy and Gita annotated' },
  6: { scatter: 'Scatterplot with rug ticks along the wind axis marking storms without an impact count' },
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
