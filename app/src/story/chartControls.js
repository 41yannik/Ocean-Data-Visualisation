// Chart-Controls des Evidence-Panels (Plan „delightful-harbor"): Bedienelemente DIREKT
// an der Grafik statt im Textblock. Zwei Gegenbeispiele + ein Abweichungs-Set setzen
// das Store-Feld `highlight` ({ key, ids, annos }) - pointsLayer hebt das Set orange hervor
// und dimmt den Rest, annotationsLayer zeichnet die mitgelieferten Punkt-Annotationen.
// Ein Land-Dropdown filtert per komplettem filters-Objekt (Store-Konvention).
// Annotationstexte laufen durch resolveRefs - keine getippte Datenzahl.
import { COUNTRY_LOOKUP } from '../map/countryNames.js';
import { resolveRefs } from './refs.js';
import { resolveHighlightSpec } from './highlightSpecs.js';

const BUTTONS = [
  {
    key: 'tino', eventId: '2020-0015-TUV', label: 'Tino · above fit',
    anno: 'Tino · {{event:2020-0015-TUV.affected_pc:pct}} affected at {{event:2020-0015-TUV.intensity_kt:kt}}',
  },
  {
    key: 'daman', eventId: '2007-0655-FJI', label: 'Daman · below fit',
    anno: 'Daman · {{event:2007-0655-FJI.affected_pc:pct}} affected at {{event:2007-0655-FJI.intensity_kt:kt}}',
  },
  { key: 'outliers', spec: 'outliers', label: 'Largest gaps from fit' },
];

const DEFAULT_FILTERS = { yearRange: [2001, 2026], categories: null, countries: null };

export function createChartControls(container, ctx) {
  const { bus, data } = ctx;

  // Highlight-Set + Annotation je Button vorberechnen (Refs lösen sofort auf - Fehler knallen früh).
  const specs = {};
  for (const b of BUTTONS) {
    specs[b.key] = {
      ids: b.eventId ? new Set([b.eventId]) : resolveHighlightSpec(b.spec, data).ids,
      annos: b.anno ? [{ eventId: b.eventId, text: resolveRefs(b.anno, ctx) }] : [],
    };
  }

  // Länder gruppiert nach Subregion (Muster filterPanel)
  const byRegion = { Melanesia: [], Micronesia: [], Polynesia: [] };
  const seen = new Set();
  for (const e of data.events) {
    if (!seen.has(e.iso3) && byRegion[e.subregion]) {
      byRegion[e.subregion].push(e.iso3);
      seen.add(e.iso3);
    }
  }
  for (const list of Object.values(byRegion)) list.sort();

  container.innerHTML = `
    <div class="cc-buttons" role="group" aria-label="Show contrasting records on the chart">
      ${BUTTONS.map((b) => `<button type="button" class="cc-btn" data-key="${b.key}" aria-pressed="false">${b.label}</button>`).join('')}
    </div>
    <label class="cc-filter">
      <span class="cc-filter-label">Country</span>
      <select class="cc-select" aria-label="filter dots by country">
        <option value="">All countries</option>
        ${Object.entries(byRegion).map(([region, isos]) => `
          <optgroup label="${region}">
            ${isos.map((i) => `<option value="${i}">${COUNTRY_LOOKUP[i] ?? i}</option>`).join('')}
          </optgroup>`).join('')}
      </select>
    </label>`;

  const buttons = [...container.querySelectorAll('.cc-btn')];
  for (const btn of buttons) {
    btn.addEventListener('click', () => {
      const key = btn.dataset.key;
      const cur = bus.get().highlight?.key ?? null;
      bus.set({
        highlight: cur === key ? null : { key, ...specs[key] },
        hover: null,
        stormPin: null,
      });
    });
  }

  const select = container.querySelector('.cc-select');
  select.addEventListener('change', () => {
    bus.set({
      filters: { ...DEFAULT_FILTERS, countries: select.value ? [select.value] : null },
      hover: null,
      stormPin: null,
    });
  });

  function render(state) {
    const active = state.highlight?.key ?? null;
    for (const btn of buttons) {
      const on = btn.dataset.key === active;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    select.value = state.filters.countries?.[0] ?? '';
  }
  render(bus.get());

  return {
    update(state, patch) {
      if (!patch || 'highlight' in patch || 'filters' in patch) render(state);
    },
    destroy() { container.innerHTML = ''; },
  };
}
