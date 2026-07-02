// Legende: Strichstärke = Kategorie, gestrichelt = umgerechneter EM-DAT-Wind,
// Kreisgröße = Tote, Akzent = Highlight. Eine Farbsemantik (E2) — keine zweite Farbskala.
import { strokeForCategory } from '../core/scales.js';

export function createLegend(container, ctx) {
  container.className = 'legend';

  const catSamples = [1, 3, 5].map((c) =>
    `<svg width="26" height="10"><line x1="1" y1="5" x2="25" y2="5" stroke="var(--track)" stroke-width="${strokeForCategory(c)}"/></svg> Cat ${c}`,
  ).join(' ');

  container.innerHTML = `
    <span>Track width = storm category: ${catSamples}</span>
    <span><svg width="18" height="14"><circle cx="7" cy="7" r="5" fill="none" stroke="var(--point)" stroke-dasharray="3 2"/></svg> converted EM-DAT wind (no track)</span>
    <span>Circle size = deaths
      <svg width="46" height="16">
        <circle cx="8" cy="9" r="2.5" fill="var(--point)" fill-opacity="0.7"/>
        <circle cx="22" cy="9" r="5.5" fill="var(--point)" fill-opacity="0.7"/>
        <circle cx="38" cy="9" r="8" fill="var(--point)" fill-opacity="0.7"/>
      </svg> (smallest = none reported)</span>
    <span><svg width="14" height="12"><circle cx="7" cy="6" r="4.5" fill="var(--accent)"/></svg> highlight (hover/selection)</span>
    <span class="legend-y" aria-live="polite"></span>`;

  const yNote = container.querySelector('.legend-y');

  function render(state) {
    yNote.textContent = state.mode === 'perCapita'
      ? 'y-axis: share of national population affected'
      : 'y-axis: people affected (absolute)';
  }

  return {
    update(state, patch) {
      if (!patch || 'mode' in patch) render(state);
    },
    destroy() { container.innerHTML = ''; },
  };
}
