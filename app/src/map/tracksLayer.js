// Zugbahnen-Layer: 69 Pfade (key = SID), Grundzustand entsättigt (CSS opacity .3),
// Kategorie = Strichstärke (E2 — keine zweite Farbskala).
// 1:n-Semantik: löst selectedEventIds/hover selbst über ctx.data.index auf — keine Scatter-Kenntnis.
// Story (storyFx): focusSids hebt Tracks an / fadet den Rest; drawSid zeichnet die Bahn
// einmalig via stroke-dasharray ein (bei reducedMotion instant).
import { strokeForCategory } from '../core/scales.js';
import { matchesFilters } from '../core/filters.js';
import { DUR_DRAW } from '../core/config.js';

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
      if (!bus.get().exploreUnlocked) return; // Story-Gate: keine Hover-Ausgabe
      bus.set({ hover: { sid: d.sid, eventId: null, x: event.clientX, y: event.clientY, source: 'map' } });
    })
    .on('mouseleave', () => {
      if (!bus.get().exploreUnlocked) return;
      bus.set({ hover: null });
    })
    .on('click', (event, d) => {
      if (!bus.get().exploreUnlocked) return;
      bus.set({ detailSid: d.sid });
    });

  function render(state) {
    const selectedSids = state.selectedEventIds
      ? new Set(storms.filter((s) => s.events.some((e) => state.selectedEventIds.has(e.id))).map((s) => s.sid))
      : null;
    const hoverSid = state.hover?.sid ?? null;
    const focus = state.storyFx?.focusSids ? new Set(state.storyFx.focusSids) : null;

    paths
      .classed('filtered-out', (d) => !d.events.some((e) => matchesFilters(e, state.filters)))
      .classed('hovered', (d) => d.sid === hoverSid)
      .classed('detail', (d) => d.sid === state.detailSid)
      .classed('selected', (d) => selectedSids?.has(d.sid) ?? false)
      .classed('dimmed', (d) => selectedSids != null && !selectedSids.has(d.sid))
      .classed('story-focus', (d) => focus?.has(d.sid) ?? false)
      .classed('story-faded', (d) => focus != null && !focus.has(d.sid))
      .attr('stroke-width', (d) => {
        const base = strokeForCategory(d.events[0]?.category);
        const lifted = d.sid === hoverSid || d.sid === state.detailSid
          || (selectedSids?.has(d.sid) ?? false) || (focus?.has(d.sid) ?? false);
        return lifted ? base + 0.8 : base;
      });
  }

  // Einzeichnen-Animation: nur beim WECHSEL des drawSid, nie beim Re-Render desselben Steps.
  let lastDrawSid = null;
  function drawIn(state) {
    const drawSid = state.storyFx?.drawSid ?? null;
    if (drawSid === lastDrawSid) return;
    lastDrawSid = drawSid;

    // Alte Draw-Reste immer aufräumen (auch beim Rückwärts-Scrollen aus dem Step heraus)
    paths.interrupt('story-draw')
      .attr('stroke-dasharray', null)
      .attr('stroke-dashoffset', null);
    if (!drawSid || state.reducedMotion) return;

    paths.filter((d) => d.sid === drawSid).each(function () {
      const len = this.getTotalLength();
      const sel = paths.filter((d) => d.sid === drawSid);
      sel.attr('stroke-dasharray', `${len} ${len}`)
        .attr('stroke-dashoffset', len)
        .transition('story-draw')
        .duration(DUR_DRAW)
        .attr('stroke-dashoffset', 0)
        .on('end', () => sel.attr('stroke-dasharray', null).attr('stroke-dashoffset', null));
    });
  }

  return {
    update(state, patch) {
      if (!patch) { render(state); drawIn(state); return; } // Vollrender (Mount/Harness)
      if ('hover' in patch || 'selectedEventIds' in patch || 'detailSid' in patch
        || 'filters' in patch || 'storyFx' in patch) {
        render(state);
      }
      if ('storyFx' in patch) drawIn(state);
    },
    destroy() { g.selectAll('*').remove(); },
  };
}
