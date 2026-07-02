// Fortschritts-Navigation: ein Punkt je Story-Step, klickbar (Robustheit E3 —
// Steps müssen auch OHNE Scrollen erreichbar sein). Output nur bus.set({step});
// das Anwenden des Steps + Scroll-Sync übernimmt der storyRunner.
import { STEP_COUNT } from './steps.js';

export function createProgressNav(container, ctx) {
  const bus = ctx.bus;
  container.innerHTML = '';
  const buttons = [];
  for (let i = 0; i < STEP_COUNT; i++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pn-dot';
    b.setAttribute('aria-label', `Story step ${i + 1} of ${STEP_COUNT}`);
    b.addEventListener('click', () => bus.set({ step: i }));
    container.appendChild(b);
    buttons.push(b);
  }

  function render(state) {
    container.dataset.visible = String(state.step >= 0);
    buttons.forEach((b, i) => {
      b.classList.toggle('active', i === state.step);
      if (i === state.step) b.setAttribute('aria-current', 'step');
      else b.removeAttribute('aria-current');
    });
  }

  return {
    update(state, patch) {
      if (!patch || 'step' in patch) render(state);
    },
    destroy() { container.innerHTML = ''; },
  };
}
