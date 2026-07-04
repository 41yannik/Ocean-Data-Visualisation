// Zwei Filter-Toggles für den Reveal-Step (Step 4) - der interaktive Beweis, dass
// Windstärke den Schaden kaum erklärt:
//   „Most people affected" → die 10 Stürme mit den meisten Betroffenen (verstreut über die X-Achse)
//   „Strongest winds"      → die 10 stärksten Stürme (oft weit unten = wenig Schaden)
// Klick schaltet das Store-Feld `highlight` ({ key, ids }); der pointsLayer hebt das Set hervor
// und dimmt den Rest weich ab. Erneuter Klick (oder der andere Button) löst wieder auf.
import { isScatterable } from '../core/filters.js';

const TOGGLES = [
  { key: 'affected', field: 'affected', label: 'Highlight most-affected storms' },
  { key: 'wind', field: 'intensity_kt', label: 'Highlight strongest winds' },
];

export function createRevealToggles(container, ctx) {
  const { bus, data } = ctx;
  const events = data.events.filter(isScatterable);
  const sets = {};
  for (const t of TOGGLES) {
    const top10 = [...events].sort((a, b) => (b[t.field] ?? 0) - (a[t.field] ?? 0)).slice(0, 10);
    sets[t.key] = new Set(top10.map((e) => e.id));
  }

  const row = document.createElement('div');
  row.className = 'toggle-row';
  const buttons = TOGGLES.map((t) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'toggle-btn';
    btn.textContent = t.label;
    btn.setAttribute('aria-pressed', 'false');
    btn.addEventListener('click', () => {
      const cur = bus.get().highlight?.key ?? null;
      const next = cur === t.key ? null : t.key;
      bus.set({ highlight: next ? { key: next, ids: sets[next] } : null });
    });
    row.appendChild(btn);
    return { t, btn };
  });
  container.appendChild(row);

  function render(state) {
    const active = state.highlight?.key ?? null;
    for (const { t, btn } of buttons) {
      const on = t.key === active;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  }
  render(bus.get());

  return {
    update(state) { render(state); },
    destroy() { row.remove(); },
  };
}
