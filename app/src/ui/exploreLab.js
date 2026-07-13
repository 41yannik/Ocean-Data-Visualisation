const VIEWS = ['outliers', 'countries', 'geography'];

export function createExploreLab(sectionEl, ctx) {
  const { bus } = ctx;
  const tabs = [...sectionEl.querySelectorAll('[role=tab][data-explore-view]')];
  const panels = [...sectionEl.querySelectorAll('[role=tabpanel][data-panel]')];
  const metricControl = sectionEl.querySelector('.evidence-metric');
  const filterDetails = sectionEl.querySelector('.evidence-filters');
  const mapButtons = [...sectionEl.querySelectorAll('[data-map-layer]')];
  const heatButtons = [...sectionEl.querySelectorAll('[data-hot-metric]')];
  const heatMetric = sectionEl.querySelector('.hot-metric-control');
  const geoNotes = [...sectionEl.querySelectorAll('[data-geo-note]')];

  if (matchMedia('(max-width: 760px)').matches) filterDetails.open = false;
  const setView = (view, focus = false) => {
    if (!VIEWS.includes(view)) return;
    bus.set({ exploreView: view });
    const url = new URL(location.href); url.searchParams.set('view', view); history.replaceState(null, '', url);
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

  function render(state) {
    tabs.forEach((tab) => {
      const active = tab.dataset.exploreView === state.exploreView;
      tab.setAttribute('aria-selected', String(active)); tab.tabIndex = active ? 0 : -1;
    });
    panels.forEach((panel) => { panel.hidden = panel.dataset.panel !== state.exploreView; });
    metricControl.hidden = state.exploreView === 'geography';
    mapButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.mapLayer === state.mapLayer)));
    heatButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.hotMetric === state.hotZoneMetric)));
    heatMetric.hidden = state.mapLayer !== 'hotzones';
    sectionEl.querySelectorAll('[data-geo-layer]').forEach((layer) => { layer.hidden = layer.dataset.geoLayer !== state.mapLayer; });
    geoNotes.forEach((note) => { note.hidden = note.dataset.geoNote !== state.mapLayer; });
  }
  return {
    update(state, patch) {
      if (!patch || 'exploreView' in patch || 'mapLayer' in patch || 'hotZoneMetric' in patch) render(state);
    },
    destroy() {},
  };
}
