// Punkte-Layer: 78 scatterbare Sturm-Land-Paare (data-key = id → Objektkonstanz beim Toggle),
// Tote = Radius, Fallback = gestrichelt, Multi-Country-Connectors ("ein Sturm, n Länder").
// 1:n: hover.sid highlightet Geschwister; Punkt ohne SID (2004-0153-FJI) ist nicht klickbar (L4).
import { DUR_MODE } from '../core/config.js';
import { matchesFilters, isScatterable } from '../core/filters.js';

export function createPointsLayer(gPoints, gConnectors, layerCtx) {
  const { data, bus } = layerCtx;
  const events = data.events.filter(isScatterable);

  const circles = gPoints.selectAll('circle')
    .data(events, (d) => d.id)
    .join('circle')
    .attr('class', 'point')
    .attr('data-key', (d) => d.id)
    .classed('fallback', (d) => d.intensity_source === 'emdat_fallback')
    .classed('no-deaths', (d) => d.deaths == null)
    .attr('tabindex', 0)
    .attr('aria-label', (d) => `${d.name ?? 'Unnamed storm'} ${d.year}, ${d.country}`)
    .on('mousemove', (event, d) => {
      bus.set({ hover: { sid: d.sid, eventId: d.id, x: event.clientX, y: event.clientY, source: 'scatter' } });
    })
    .on('mouseleave', () => bus.set({ hover: null }))
    .on('click', (event, d) => { if (d.sid) bus.set({ detailSid: d.sid }); })
    .on('keydown', (event, d) => {
      if (event.key === 'Enter' && d.sid) bus.set({ detailSid: d.sid });
    });

  function position(state, animate) {
    const { x, y, r } = layerCtx.scales;
    const tx = animate && !state.reducedMotion
      ? (sel) => sel.transition('mode').duration(DUR_MODE)
      : (sel) => sel;

    tx(circles)
      .attr('cx', (d) => x(d.intensity_kt))
      .attr('cy', (d) => y.scale(y.value(d)))
      .attr('r', (d) => r(d.deaths ?? 0));

    // Connectors: je Sturm mit >= 2 sichtbaren Punkten eine dünne Vertikale (Analyseeinheit!)
    const visible = events.filter((e) => matchesFilters(e, state.filters) && e.sid);
    const bySid = new Map();
    for (const e of visible) {
      if (!bySid.has(e.sid)) bySid.set(e.sid, []);
      bySid.get(e.sid).push(e);
    }
    const groups = [...bySid.entries()].filter(([, list]) => list.length >= 2)
      .map(([sid, list]) => ({
        sid,
        x: x(list[0].intensity_kt),
        y0: Math.min(...list.map((e) => y.scale(y.value(e)))),
        y1: Math.max(...list.map((e) => y.scale(y.value(e)))),
      }));

    const conn = gConnectors.selectAll('line').data(groups, (d) => d.sid);
    conn.exit().remove();
    const connAll = conn.enter().append('line').attr('class', 'connector').merge(conn);
    tx(connAll)
      .attr('x1', (d) => d.x).attr('x2', (d) => d.x)
      .attr('y1', (d) => d.y0).attr('y2', (d) => d.y1);
    return connAll;
  }

  function classes(state) {
    const hover = state.hover;
    const sel = state.selectedEventIds;
    circles
      .classed('filtered-out', (d) => !matchesFilters(d, state.filters))
      .classed('hovered', (d) => hover?.eventId === d.id)
      .classed('sibling', (d) => hover?.sid != null && d.sid === hover.sid && hover.eventId !== d.id)
      .classed('detail', (d) => state.detailSid != null && d.sid === state.detailSid)
      .classed('selected', (d) => sel?.has(d.id) ?? false)
      .classed('dimmed', (d) => sel != null && !sel.has(d.id))
      .attr('tabindex', (d) => (matchesFilters(d, state.filters) ? 0 : -1));
    gConnectors.selectAll('line')
      .classed('dimmed', () => sel != null);
  }

  return {
    update(state, patch) {
      if (!patch) { position(state, false); classes(state); return; }
      if ('mode' in patch) position(state, true);
      if ('filters' in patch) position(state, false);
      if ('hover' in patch || 'selectedEventIds' in patch || 'detailSid' in patch || 'filters' in patch) {
        classes(state);
      }
    },
    destroy() {
      gPoints.selectAll('*').remove();
      gConnectors.selectAll('*').remove();
    },
  };
}
