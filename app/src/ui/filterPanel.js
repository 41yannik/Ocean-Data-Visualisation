// Filterpanel (freie Erkundung): Jahr-Range, Kategorie, Land - sendet IMMER ein komplettes
// filters-Objekt (Store-Konvention); gesperrt solange !exploreUnlocked (Story-Gate, Paket 06).
import { COUNTRY_LOOKUP } from '../map/countryNames.js';

const SUBREGIONS = { Melanesia: [], Micronesia: [], Polynesia: [] };

export function createFilterPanel(container, ctx) {
  const bus = ctx.bus;
  const byRegion = JSON.parse(JSON.stringify(SUBREGIONS));
  const seen = new Set();
  for (const e of ctx.data.events) {
    if (!seen.has(e.iso3) && byRegion[e.subregion]) {
      byRegion[e.subregion].push(e.iso3);
      seen.add(e.iso3);
    }
  }
  for (const list of Object.values(byRegion)) list.sort();

  container.className = 'filter-panel';
  container.innerHTML = `
    <fieldset>
      <legend>Play range</legend>
      <input type="number" name="y0" min="2001" max="2026" value="2001" aria-label="from year">
      –
      <input type="number" name="y1" min="2001" max="2026" value="2026" aria-label="to year">
    </fieldset>
    <fieldset>
      <legend>Category ≥</legend>
      <select name="cat" aria-label="minimum category">
        <option value="">all</option>
        <option value="1">1</option><option value="2">2</option><option value="3">3</option>
        <option value="4">4</option><option value="5">5</option>
      </select>
    </fieldset>
    <fieldset>
      <legend>Country</legend>
      <select name="country" aria-label="country">
        <option value="">all</option>
        ${Object.entries(byRegion).map(([region, isos]) => `
          <optgroup label="${region}">
            ${isos.map((i) => `<option value="${i}">${COUNTRY_LOOKUP[i] ?? i}</option>`).join('')}
          </optgroup>`).join('')}
      </select>
    </fieldset>
    <button type="button" name="reset">Reset</button>`;

  const y0 = container.querySelector('[name=y0]');
  const y1 = container.querySelector('[name=y1]');
  const cat = container.querySelector('[name=cat]');
  const country = container.querySelector('[name=country]');

  function emit() {
    const lo = Math.max(2001, Math.min(+y0.value || 2001, +y1.value || 2026));
    const hi = Math.min(2026, Math.max(+y0.value || 2001, +y1.value || 2026));
    const minCat = cat.value === '' ? null : +cat.value;
    bus.set({
      filters: {
        yearRange: [lo, hi],
        categories: minCat == null ? null : [minCat, minCat + 1, minCat + 2, minCat + 3, minCat + 4].filter((c) => c <= 5),
        countries: country.value === '' ? null : [country.value],
      },
    });
  }

  for (const el of [y0, y1, cat, country]) el.addEventListener('change', emit);
  container.querySelector('[name=reset]').addEventListener('click', () => {
    y0.value = '2001'; y1.value = '2026'; cat.value = ''; country.value = '';
    emit();
  });

  function render(state) {
    container.dataset.disabled = String(!state.exploreUnlocked);
    // Reflect externe Patches (z. B. Harness-Fixtures) in den Controls:
    const [lo, hi] = state.filters.yearRange;
    y0.value = String(lo); y1.value = String(hi);
    cat.value = state.filters.categories ? String(Math.min(...state.filters.categories)) : '';
    country.value = state.filters.countries?.[0] ?? '';
  }

  return {
    update(state, patch) {
      if (!patch || 'filters' in patch || 'exploreUnlocked' in patch) render(state);
    },
    destroy() { container.innerHTML = ''; },
  };
}
