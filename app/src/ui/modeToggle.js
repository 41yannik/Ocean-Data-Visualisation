// Modus-Umschalter pro Kopf ↔ absolut. Spiegelt nur den State (aria-pressed) und sendet
// bus.set({mode}) — die Transition gehört dem Scatter-Kompositor (Stolperstein 2).
export function createModeToggle(container, ctx) {
  const bus = ctx.bus;
  container.className = 'mode-toggle';
  container.innerHTML = `
    <button type="button" data-mode="perCapita" aria-pressed="true">per capita</button>
    <button type="button" data-mode="absolute" aria-pressed="false">absolute</button>
    <span class="refit-hint" aria-live="polite"></span>`;

  const buttons = [...container.querySelectorAll('button')];
  const hint = container.querySelector('.refit-hint');
  let hintTimer = null;

  for (const btn of buttons) {
    btn.addEventListener('click', () => bus.set({ mode: btn.dataset.mode }));
  }

  function render(state, announce) {
    for (const btn of buttons) {
      btn.setAttribute('aria-pressed', String(btn.dataset.mode === state.mode));
    }
    if (announce) {
      hint.textContent = 'expectation re-fitted for this scale';
      hint.classList.add('visible');
      clearTimeout(hintTimer);
      hintTimer = setTimeout(() => hint.classList.remove('visible'), 2200);
    }
  }

  return {
    update(state, patch) {
      if (!patch) return render(state, false);
      if ('mode' in patch) render(state, true);
    },
    destroy() { clearTimeout(hintTimer); container.innerHTML = ''; },
  };
}
