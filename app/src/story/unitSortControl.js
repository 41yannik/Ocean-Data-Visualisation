// Umschalter für das Unit Chart (Step 6): chronologisch ↔ nach Datenqualität.
// Schaltet das Store-Feld `unitSort`; das unitChart ordnet die 99 Kreise fließend um.
export function createUnitSortControl(container, ctx) {
  const { bus } = ctx;
  const row = document.createElement('div');
  row.className = 'toggle-row';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'toggle-btn';
  row.appendChild(btn);
  container.appendChild(row);

  btn.addEventListener('click', () => {
    const next = (bus.get().unitSort ?? 'chrono') === 'quality' ? 'chrono' : 'quality';
    bus.set({ unitSort: next });
  });

  function render(state) {
    const quality = (state.unitSort ?? 'chrono') === 'quality';
    btn.textContent = quality ? '↺ Sort chronologically' : 'Sort by data completeness';
    btn.classList.toggle('active', quality);
    btn.setAttribute('aria-pressed', quality ? 'true' : 'false');
  }
  render(bus.get());

  return {
    update(state) { render(state); },
    destroy() { row.remove(); },
  };
}
