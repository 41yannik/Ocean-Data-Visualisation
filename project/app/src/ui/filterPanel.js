// Progressive Filter für die freie Erkundung. Der Store-Vertrag bleibt unverändert:
// jede Interaktion ersetzt das komplette filters-Objekt. Auswahl-IDs, die außerhalb
// des neuen Ergebnisses liegen, werden dabei entfernt statt unsichtbar weiterzulaufen.
import { matchesFilters } from '../core/filters.js';
import { COUNTRY_LOOKUP } from '../map/countryNames.js';

const SUBREGIONS = { Melanesia: [], Micronesia: [], Polynesia: [] };

export function createFilterPanel(container, ctx) {
  const { bus, data } = ctx;
  const lab = container.closest('.evidence-lab');
  const summary = lab?.querySelector('#evidence-filter-summary') ?? null;
  const refineCount = lab?.querySelector('.evidence-refine-count') ?? null;
  const years = data.events.map((event) => event.year);
  const yearMin = Math.min(...years);
  const yearMax = Math.max(...years);
  const defaultFilters = () => ({ yearRange: [yearMin, yearMax], categories: null, countries: null });

  const byRegion = JSON.parse(JSON.stringify(SUBREGIONS));
  const seen = new Set();
  for (const event of data.events) {
    if (!seen.has(event.iso3) && byRegion[event.subregion]) {
      byRegion[event.subregion].push(event.iso3);
      seen.add(event.iso3);
    }
  }
  for (const list of Object.values(byRegion)) {
    list.sort((a, b) => (COUNTRY_LOOKUP[a] ?? a).localeCompare(COUNTRY_LOOKUP[b] ?? b));
  }

  const yearOptions = Array.from({ length: yearMax - yearMin + 1 }, (_, index) => yearMin + index)
    .map((year) => `<option value="${year}">${year}</option>`).join('');

  container.className = 'filter-panel';
  container.innerHTML = `
    <fieldset class="filter-years">
      <legend>Years</legend>
      <div class="filter-year-range">
        <label><span>From</span><select name="y0" aria-label="From year">${yearOptions}</select></label>
        <span aria-hidden="true">–</span>
        <label><span>To</span><select name="y1" aria-label="To year">${yearOptions}</select></label>
      </div>
    </fieldset>
    <fieldset>
      <legend>Minimum category</legend>
      <select name="cat" aria-label="Minimum storm category">
        <option value="">All storms</option>
        <option value="1">Category 1+</option><option value="2">Category 2+</option>
        <option value="3">Category 3+</option><option value="4">Category 4+</option>
        <option value="5">Category 5</option>
      </select>
    </fieldset>
    <fieldset class="fp-countries">
      <legend>Countries</legend>
      <div class="fp-country-groups">
        ${Object.entries(byRegion).map(([region, isos]) => `
          <div class="fp-country-group" role="group" aria-label="${region}">
            <span class="fp-region">${region}</span>
            ${isos.map((iso3) => `<label><input type="checkbox" name="country" value="${iso3}">
              <span>${COUNTRY_LOOKUP[iso3] ?? iso3}</span></label>`).join('')}
          </div>`).join('')}
      </div>
    </fieldset>
    <button type="button" name="reset">Clear filters</button>`;

  const y0 = container.querySelector('[name=y0]');
  const y1 = container.querySelector('[name=y1]');
  const cat = container.querySelector('[name=cat]');
  const countryBoxes = [...container.querySelectorAll('input[name=country]')];

  function applyFilters(filters) {
    const state = bus.get();
    const selected = state.selectedEventIds;
    let selectedEventIds = selected;
    if (selected?.size) {
      const remaining = [...selected].filter((id) => {
        const event = data.index.byId.get(id);
        return event && matchesFilters(event, filters);
      });
      selectedEventIds = remaining.length ? new Set(remaining) : null;
    }
    bus.set({ filters, selectedEventIds, hover: null, stormPin: null });
  }

  function filtersFromControls() {
    const from = +y0.value || yearMin;
    const to = +y1.value || yearMax;
    const lo = Math.max(yearMin, Math.min(from, to));
    const hi = Math.min(yearMax, Math.max(from, to));
    const minCategory = cat.value === '' ? null : +cat.value;
    // Mehrfachauswahl: immer ein FRISCHES Array bauen (Store-Vertrag: patch ersetzt).
    const checked = countryBoxes.filter((box) => box.checked).map((box) => box.value);
    return {
      yearRange: [lo, hi],
      categories: minCategory == null
        ? null
        : Array.from({ length: 6 - minCategory }, (_, index) => minCategory + index),
      countries: checked.length ? checked : null,
    };
  }

  function emit() { applyFilters(filtersFromControls()); }

  function resetFilters() { applyFilters(defaultFilters()); }

  for (const element of [y0, y1, cat]) element.addEventListener('change', emit);
  container.querySelector('.fp-countries').addEventListener('change', emit);
  container.querySelector('[name=reset]').addEventListener('click', resetFilters);
  for (const button of lab?.querySelectorAll('[data-clear-filters]') ?? []) {
    button.addEventListener('click', resetFilters);
  }

  summary?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-clear-filter]');
    if (!button) return;
    const current = bus.get().filters;
    // Länder-Chips entfernen nur das EINE Land (data-iso3); leer → null.
    let countries = current.countries;
    if (button.dataset.clearFilter === 'country') {
      const remaining = (current.countries ?? []).filter((iso3) => iso3 !== button.dataset.iso3);
      countries = remaining.length ? remaining : null;
    }
    const next = {
      yearRange: button.dataset.clearFilter === 'years' ? [yearMin, yearMax] : [...current.yearRange],
      categories: button.dataset.clearFilter === 'category' ? null : current.categories,
      countries,
    };
    applyFilters(next);
  });

  function renderSummary(filters) {
    if (!summary) return;
    const chips = [];
    const [lo, hi] = filters.yearRange;
    if (lo !== yearMin || hi !== yearMax) {
      chips.push(`<button type="button" class="evidence-filter-chip" data-clear-filter="years" aria-label="Remove year filter ${lo} to ${hi}">${lo}–${hi}<span aria-hidden="true">×</span></button>`);
    }
    if (filters.categories) {
      const minimum = Math.min(...filters.categories);
      chips.push(`<button type="button" class="evidence-filter-chip" data-clear-filter="category" aria-label="Remove minimum category filter">Category ${minimum}${minimum < 5 ? '+' : ''}<span aria-hidden="true">×</span></button>`);
    }
    for (const iso3 of filters.countries ?? []) {
      const name = COUNTRY_LOOKUP[iso3] ?? iso3;
      chips.push(`<button type="button" class="evidence-filter-chip" data-clear-filter="country" data-iso3="${iso3}" aria-label="Remove country filter ${name}">${name}<span aria-hidden="true">×</span></button>`);
    }
    summary.innerHTML = chips.length ? chips.join('') : '<span class="evidence-all-records">All records</span>';
    if (refineCount) {
      refineCount.hidden = chips.length === 0;
      refineCount.textContent = chips.length ? `(${chips.length})` : '';
    }
  }

  function render(state) {
    container.dataset.disabled = String(!state.exploreUnlocked);
    const [lo, hi] = state.filters.yearRange;
    y0.value = String(lo);
    y1.value = String(hi);
    cat.value = state.filters.categories ? String(Math.min(...state.filters.categories)) : '';
    for (const box of countryBoxes) box.checked = state.filters.countries?.includes(box.value) ?? false;
    renderSummary(state.filters);
  }

  return {
    update(state, patch) {
      if (!patch || 'filters' in patch || 'exploreUnlocked' in patch) render(state);
    },
    destroy() { container.innerHTML = ''; if (summary) summary.innerHTML = ''; },
  };
}
