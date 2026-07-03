// Step-Caption (Layout v4): fester Erklärtext unten links in der Bühne — eigene
// Grid-Zeile, kein Overlay, kein Wischen. Reine View: konsumiert NUR state.step
// und rendert Kicker/Titel/Text/Quelle des aktiven Steps mit sanftem Fade-Wechsel
// (reducedMotion: sofort). Bei step < 0 (Explore ohne Story) unsichtbar.
import { buildSteps } from './steps.js';

const SWAP_MS = 200; // Ausblenden, dann Inhalt tauschen (CSS-Transition 0.3s)

export function createStoryCaption(container, ctx) {
  const steps = buildSteps(ctx);
  let current = null;
  let timer = null;

  function contentFor(i) {
    const s = steps[i];
    return `
      <p class="kicker">Step ${i + 1} of ${steps.length}</p>
      <h2>${s.title}</h2>
      <p>${s.html}</p>
      ${s.source ? `<p class="source">${s.source}</p>` : ''}`;
  }

  function render(state) {
    const i = state.step;
    if (i === current) return;
    current = i;
    clearTimeout(timer);
    if (i < 0 || i >= steps.length) {
      container.innerHTML = '';
      container.dataset.visible = 'false';
      container.classList.remove('swapping');
      return;
    }
    container.dataset.visible = 'true';
    if (state.reducedMotion) {
      container.innerHTML = contentFor(i);
      return;
    }
    container.classList.add('swapping');
    timer = setTimeout(() => {
      container.innerHTML = contentFor(i);
      container.classList.remove('swapping');
    }, SWAP_MS);
  }

  return {
    update(state, patch) {
      if (!patch || 'step' in patch) render(state);
    },
    destroy() {
      clearTimeout(timer);
      container.innerHTML = '';
      container.dataset.visible = 'false';
    },
  };
}
