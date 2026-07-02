// Zugbahnen-Layer: 69 Pfade (key = SID), Grundzustand entsättigt (CSS opacity .3),
// Kategorie = Strichstärke (E2 — keine zweite Farbskala).
// 1:n-Semantik: löst selectedEventIds/hover selbst über ctx.data.index auf — keine Scatter-Kenntnis.
import { strokeForCategory } from '../core/scales.js';
import { matchesFilters } from '../core/filters.js';

export function createTracksLayer(g, layerCtx) {
  const { data, bus, geo } = layerCtx;
  const { bySid } = data.index;

  // Statische Geometrie einmalig: LineString durch geo.path (Antimeridian-Clipping!) —
  // NIEMALS Punkte einzeln projizieren und verbinden (Stolperstein 7).
  const storms = Object.entries(data.tracks).map(([sid, pts]) => ({
    sid,
    events: bySid.get(sid) ?? [],
    lineString: { type: 'LineString', coordinates: pts.map((p) => [p[0], p[1]]) },
  }));

  const paths = g.selectAll('path')
    .data(storms, (d) => d.sid)
    .join('path')
    .attr('class', 'track')
    .attr('d', (d) => geo.path(d.lineString))
    .attr('stroke-width', (d) => strokeForCategory(d.events[0]?.category))
    .style('pointer-events', 'stroke')
    .on('mousemove', (event, d) => {
      bus.set({ hover: { sid: d.sid, eventId: null, x: event.clientX, y: event.clientY, source: 'map' } });
    })
    .on('mouseleave', () => bus.set({ hover: null }))
    .on('click', (event, d) => bus.set({ detailSid: d.sid }));

  function render(state) {
    const selectedSids = state.selectedEventIds
      ? new Set(storms.filter((s) => s.events.some((e) => state.selectedEventIds.has(e.id))).map((s) => s.sid))
      : null;
    const hoverSid = state.hover?.sid ?? null;

    paths
      .classed('filtered-out', (d) => !d.events.some((e) => matchesFilters(e, state.filters)))
      .classed('hovered', (d) => d.sid === hoverSid)
      .classed('detail', (d) => d.sid === state.detailSid)
      .classed('selected', (d) => selectedSids?.has(d.sid) ?? false)
      .classed('dimmed', (d) => selectedSids != null && !selectedSids.has(d.sid))
      .attr('stroke-width', (d) => {
        const base = strokeForCategory(d.events[0]?.category);
        const lifted = d.sid === hoverSid || d.sid === state.detailSid || (selectedSids?.has(d.sid) ?? false);
        return lifted ? base + 0.8 : base;
      });
  }

  return {
    update(state, patch) {
      if (!patch) return render(state); // Vollrender (Mount/Harness)
      if ('hover' in patch || 'selectedEventIds' in patch || 'detailSid' in patch || 'filters' in patch) {
        render(state);
      }
      // 'step' wird entgegengenommen und ignoriert (Verhalten kommt in Paket 06)
    },
    destroy() { g.selectAll('*').remove(); },
  };
}
