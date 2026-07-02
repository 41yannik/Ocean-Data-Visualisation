// Layout-Controller: mappt state.step → data-layout auf der App-Wurzel.
// Der Morph selbst ist reines CSS (styles.css, [data-layout=…]) — hier wird NUR das
// Attribut gesetzt; Map/Scatter/SST bleiben unberührt (feste viewBox skaliert mit).
import { stepLayout } from './steps.js';

export function createLayoutController(container, ctx) {
  function render(state) {
    container.dataset.layout = stepLayout(state.step);
  }
  return {
    update(state, patch) {
      if (!patch || 'step' in patch) render(state);
    },
    destroy() { container.removeAttribute('data-layout'); },
  };
}
