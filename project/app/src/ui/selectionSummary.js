// Kontextfeld der Outlier-Ansicht: Leseregel, ein Datensatz oder Brush-Zusammenfassung.
import { median } from 'd3';
import { fmtInt, fmtKt, fmtPct } from '../core/format.js';

export function createSelectionSummary(container, ctx) {
  const { data, meta, bus } = ctx;
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
  // Der frühere Text ("Distance from the line is the clue", "wind-only line") stammte
  // aus der Fassung VOR dem Audit 2026-07, als hier noch eine Regressionsgerade lag.
  // Gezeichnet sind heute nur der Median über alle Records und das Quartilsband je
  // Wind-Bin - eine "wind-only line", von der man Abstand messen könnte, gibt es nicht.
  // Der alte Text behauptete damit genau den Zusammenhang, den die Story widerlegt.
  // Alle Zahlen kommen aus meta (Pipeline-Artefakt), keine ist getippt.
  const renderDefault = (mode) => {
    const band = meta.bands?.[mode] ?? meta.bands?.perCapita ?? [];
    const counts = band.map((b) => b.n).filter(Number.isFinite);
    const perBin = counts.length
      ? `only ${Math.min(...counts)}–${Math.max(...counts)} records per bin`
      : 'few records per bin';
    const fit = meta.fits?.[mode] ?? meta.fits?.perCapita;
    const r2 = fit ? `${(fit.r2 * 100).toFixed(1).replace(/\.0$/, '')}%` : null;
    const p = fit ? (fit.p >= 0.001 ? fit.p.toFixed(2) : '<0.001') : null;
    container.innerHTML = `<p class="kicker">How to read</p><h3>Look for spread, not for a slope.</h3>
      <p>The horizontal line is the median reported share across all records. The shaded band
      shows the middle half of the records in each wind bin — a summary of the spread, not a
      fitted trend; with ${perBin} its shape is unstable.${r2
        ? ` Across all ${fit.n} complete records the wind explains ${r2} of the differences (p = ${p}).`
        : ''}</p>
      <p class="es-note">Drag across points to compare a group.</p>`;
  };
  return {
    update(state, patch) {
      // 'mode' gehört dazu, seit der Default-Text Kennzahlen des aktiven Maßes nennt.
      if (patch && !('hover' in patch) && !('selectedEventIds' in patch) && !('mode' in patch)) return;
      const hoverEvent = state.hover?.eventId ? data.index.byId.get(state.hover.eventId) : null;
      if (hoverEvent) renderEvent(hoverEvent);
      else if (state.selectedEventIds?.size) renderSet(state.selectedEventIds);
      else renderDefault(state.mode);
    },
    destroy() { container.innerHTML = ''; },
  };
}
