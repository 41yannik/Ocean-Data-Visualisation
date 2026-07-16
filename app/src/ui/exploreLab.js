import { isScatterable, matchesFilters } from '../core/filters.js';

const VIEWS = ['outliers', 'residuals', 'countries', 'geography'];

// Filterreaktive Kernaussage über den Panels - pur und getestet; der Renderer baut
// daraus einen Satz. Zahlen IMMER berechnet, nie getippt (z. B. „42 of 78").
export function buildLabHeroStat(events, { view = 'outliers', filters = null, mode = 'perCapita' } = {}) {
  const visible = events.filter((event) => !filters || matchesFilters(event, filters));
  if (view === 'countries') {
    return { view, total: visible.length, reported: visible.filter((e) => e.affected != null).length };
  }
  if (view === 'geography') {
    return { view, storms: new Set(visible.map((e) => e.sid).filter(Boolean)).size };
  }
  const field = mode === 'absolute' ? 'residual_abs' : 'residual_pc';
  const complete = visible.filter((e) => e[field] != null);
  return { view, above: complete.filter((e) => e[field] > 0).length, total: complete.length };
}

function heroSentence(stat) {
  if (stat.view === 'countries') {
    return `<strong>${stat.total}</strong> storm-country records · ${stat.reported} with a reported human impact.`;
  }
  if (stat.view === 'geography') {
    return `<strong>${stat.storms}</strong> storm${stat.storms === 1 ? '' : 's'} cross the current filters.`;
  }
  if (!stat.total) return 'No complete records match these filters.';
  return `<strong>${stat.above} of ${stat.total}</strong> complete records outran the wind-only expectation.`;
}

export function createExploreLab(sectionEl, ctx) {
  const { bus, data } = ctx;
  const tabs = [...sectionEl.querySelectorAll('[role=tab][data-explore-view]')];
  const panels = [...sectionEl.querySelectorAll('[role=tabpanel][data-panel]')];
  const metricControl = sectionEl.querySelector('.evidence-metric');
  const filterToggle = sectionEl.querySelector('.evidence-refine');
  const filterRegion = sectionEl.querySelector('#evidence-filter-region');
  const mapButtons = [...sectionEl.querySelectorAll('[data-map-layer]')];
  const heatButtons = [...sectionEl.querySelectorAll('[data-hot-metric]')];
  const heatMetric = sectionEl.querySelector('.hot-metric-control');
  const geoNotes = [...sectionEl.querySelectorAll('[data-geo-note]')];
  const groupButtons = [...sectionEl.querySelectorAll('[data-residual-group]')];
  const heroEl = sectionEl.querySelector('#evidence-hero');

  const setFilterOpen = (open) => {
    filterToggle.setAttribute('aria-expanded', String(open));
    filterRegion.hidden = !open;
  };
  filterToggle.addEventListener('click', () => {
    setFilterOpen(filterToggle.getAttribute('aria-expanded') !== 'true');
  });
  filterRegion.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    setFilterOpen(false);
    filterToggle.focus();
  });

  const setView = (view, focus = false) => {
    if (!VIEWS.includes(view)) return;
    bus.set({ exploreView: view });
    const url = new URL(location.href);
    url.searchParams.set('view', view);
    history.replaceState(null, '', url);
    if (focus) tabs.find((tab) => tab.dataset.exploreView === view)?.focus();
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => setView(tab.dataset.exploreView));
    tab.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
        : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      setView(tabs[next].dataset.exploreView, true);
    });
  });
  mapButtons.forEach((button) => button.addEventListener('click', () => bus.set({ mapLayer: button.dataset.mapLayer })));
  heatButtons.forEach((button) => button.addEventListener('click', () => bus.set({ hotZoneMetric: button.dataset.hotMetric })));
  groupButtons.forEach((button) => button.addEventListener('click', () => bus.set({ residualGroupBy: button.dataset.residualGroup })));

  function visibleCount(view, filters) {
    const events = data.events.filter((event) => matchesFilters(event, filters));
    // residuals deckt sich mit outliers: Residuen existieren genau für die
    // scatterbaren Records (78/99, gleiche Pipeline).
    if (view === 'outliers' || view === 'residuals') return events.filter(isScatterable).length;
    if (view === 'geography') return new Set(events.map((event) => event.sid).filter(Boolean)).size;
    return events.length;
  }

  function render(state) {
    tabs.forEach((tab) => {
      const active = tab.dataset.exploreView === state.exploreView;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    panels.forEach((panel) => {
      const active = panel.dataset.panel === state.exploreView;
      panel.hidden = !active;
      const empty = visibleCount(panel.dataset.panel, state.filters) === 0;
      panel.querySelector('.evidence-empty').hidden = !empty;
      panel.querySelector('.evidence-panel-content').hidden = empty;
    });
    // Auf der Geografie-Ansicht ist die Impact-Metrik nur für den Toll-Layer relevant
    // (Kreisfläche = Summe vs. Median-Anteil); Tracks/Hotzones haben eigene Metriken.
    metricControl.hidden = state.exploreView === 'geography' && state.mapLayer !== 'toll';
    mapButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.mapLayer === state.mapLayer)));
    heatButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.hotMetric === state.hotZoneMetric)));
    groupButtons.forEach((button) => button.setAttribute('aria-pressed',
      String(button.dataset.residualGroup === (state.residualGroupBy ?? 'country'))));
    if (heroEl) {
      heroEl.innerHTML = heroSentence(buildLabHeroStat(data.events,
        { view: state.exploreView, filters: state.filters, mode: state.mode }));
    }
    heatMetric.hidden = state.mapLayer !== 'hotzones';
    sectionEl.querySelectorAll('[data-geo-layer]').forEach((layer) => { layer.hidden = layer.dataset.geoLayer !== state.mapLayer; });
    geoNotes.forEach((note) => { note.hidden = note.dataset.geoNote !== state.mapLayer; });
  }

  return {
    update(state, patch) {
      if (!patch || 'exploreView' in patch || 'mapLayer' in patch
        || 'hotZoneMetric' in patch || 'filters' in patch
        || 'mode' in patch || 'residualGroupBy' in patch) render(state);
    },
    destroy() {},
  };
}
