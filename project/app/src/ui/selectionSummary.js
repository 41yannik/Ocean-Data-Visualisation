// Kontextfeld der Outlier-Ansicht: Leseregel, ein Datensatz oder Brush-Zusammenfassung.
import { median } from 'd3';
import { fmtInt, fmtKt, fmtPct } from '../core/format.js';

export function createSelectionSummary(container, ctx) {
  const { data, bus } = ctx;
  const renderEvent = (event) => {
    container.innerHTML = `<p class="kicker">Selected record</p><h3>${event.name ?? 'No named storm'} · ${event.country}</h3>
      <p>${event.year}</p><dl><div><dt>Wind</dt><dd>${fmtKt(event.intensity_kt)}</dd></div>
      <div><dt>Affected share</dt><dd>${fmtPct(event.affected_pc)}</dd></div>
      <div><dt>Reported affected</dt><dd>${fmtInt(event.affected)}</dd></div></dl>
      <p class="es-note">Click the point to open the full storm record.</p>`;
  };
  const renderSet = (ids) => {
    const events = [...ids].map((id) => data.index.byId.get(id)).filter(Boolean);
    const countries = new Set(events.map((event) => event.iso3));
    const winds = events.map((event) => event.intensity_kt).filter((value) => value != null);
    const shares = events.map((event) => event.affected_pc).filter((value) => value != null);
    container.innerHTML = `<p class="kicker">Selected records</p><h3>${events.length} records across ${countries.size} countries</h3>
      <dl><div><dt>Median wind</dt><dd>${fmtKt(median(winds))}</dd></div><div><dt>Median affected share</dt><dd>${fmtPct(median(shares))}</dd></div></dl>
      <button type="button" class="es-clear">Clear selection</button>`;
    container.querySelector('.es-clear').addEventListener('click', () => bus.set({ selectedEventIds: null }));
  };
  const renderDefault = () => {
    container.innerHTML = `<p class="kicker">How to read</p><h3>Distance from the line is the clue.</h3>
      <p>Points above the wind-only line report a larger impact than wind alone would predict. Drag across points to compare a group.</p>`;
  };
  return {
    update(state, patch) {
      if (patch && !('hover' in patch) && !('selectedEventIds' in patch)) return;
      const hoverEvent = state.hover?.eventId ? data.index.byId.get(state.hover.eventId) : null;
      if (hoverEvent) renderEvent(hoverEvent);
      else if (state.selectedEventIds?.size) renderSet(state.selectedEventIds);
      else renderDefault();
    },
    destroy() { container.innerHTML = ''; },
  };
}
