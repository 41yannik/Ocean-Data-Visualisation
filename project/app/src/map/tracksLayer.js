// Zugbahnen-Layer: 69 Pfade (key = SID), Grundzustand entsättigt (CSS opacity .3),
// Kategorie = Strichstärke (E2 - keine zweite Farbskala).
// 1:n-Semantik: löst selectedEventIds/hover selbst über ctx.data.index auf - keine Scatter-Kenntnis.
// Story (storyFx): focusSids hebt Tracks an / fadet den Rest; drawSid zeichnet die Bahn
// einmalig via stroke-dasharray ein (bei reducedMotion instant).
import { strokeForCategory } from '../core/scales.js';
import { matchesFilters } from '../core/filters.js';
import { DUR_DRAW } from '../core/config.js';

export function createTracksLayer(g, layerCtx) {
  const { data, bus, geo } = layerCtx;
  const { bySid } = data.index;

  // Statische Geometrie einmalig: LineString durch geo.path (Antimeridian-Clipping!) -
  // NIEMALS Punkte einzeln projizieren und verbinden (Stolperstein 7).
  const storms = Object.entries(data.tracks).map(([sid, pts]) => {
    const events = bySid.get(sid) ?? [];
    return {
      sid,
      events,
      // Ein kanonischer Jahr-Slot je Sturm für den Zeit-Scrubber: frühestes Impact-Jahr
      // (löst die wenigen SID-Saison≠Impact-/Mehr-Jahr-Fälle deterministisch auf).
      year: events.length ? Math.min(...events.map((e) => e.year)) : null,
      lineString: { type: 'LineString', coordinates: pts.map((p) => [p[0], p[1]]) },
    };
  });

  const paths = g.selectAll('path')
    .data(storms, (d) => d.sid)
    .join('path')
    .attr('class', 'track')
    .attr('d', (d) => geo.path(d.lineString))
    .attr('stroke-width', (d) => strokeForCategory(d.events[0]?.category))
    .style('pointer-events', 'stroke')
    .on('pointerenter pointermove', (event, d) => {
      const state = bus.get();
      if (!state.exploreUnlocked || (state.activeYear != null && d.year !== state.activeYear)) return;
      bus.set({ hover: { sid: d.sid, eventId: null, x: event.clientX, y: event.clientY, source: 'map' } });
    })
    .on('pointerleave pointercancel', () => {
      if (!bus.get().exploreUnlocked) return;
      if (bus.get().hover?.source === 'map') bus.set({ hover: null });
    })
    .on('click', (event, d) => {
      const state = bus.get();
      if (!state.exploreUnlocked || (state.activeYear != null && d.year !== state.activeYear)) return;
      bus.set({ detailSid: d.sid });
    });

  const svgNode = g.node()?.ownerSVGElement;
  const clearMapHover = () => {
    if (bus.get().hover?.source === 'map') bus.set({ hover: null });
  };
  svgNode?.addEventListener('pointerleave', clearMapHover);
  svgNode?.addEventListener('pointercancel', clearMapHover);

  function render(state) {
    const selectedSids = state.selectedEventIds
      ? new Set(storms.filter((s) => s.events.some((e) => state.selectedEventIds.has(e.id))).map((s) => s.sid))
      : null;
    const rawHoverSid = state.hover?.sid ?? null;
    const focus = state.storyFx?.focusSids ? new Set(state.storyFx.focusSids) : null;
    // textSet (Trend-Dot-/Heatmap-Zellen-Hover): 1:n-Kanal, Mitglieder heben sich,
    // Rest dimmt - nur in der Erkundung relevant, Story nutzt eigene storyFx-Felder.
    const textSet = state.textSet?.ids ?? null;
    const inTextSet = (d) => d.events.some((e) => textSet.has(e.id));
    // Zeit-Scrubber: aktives Jahr leuchtet, alle anderen werden zur Kontext-Kulisse gedimmt.
    // null = „Alle Jahre" → beide Klassen aus, heutiges Verhalten. filtered-out behält Vorrang.
    const activeYear = state.activeYear ?? null;
    const hoveredStorm = rawHoverSid ? storms.find((storm) => storm.sid === rawHoverSid) : null;
    const hoverSid = activeYear != null && hoveredStorm?.year !== activeYear ? null : rawHoverSid;
    if (rawHoverSid && hoverSid == null && state.hover?.source === 'map') {
      queueMicrotask(() => {
        if (bus.get().hover?.source === 'map' && bus.get().hover?.sid === rawHoverSid) clearMapHover();
      });
    }

    paths
      .classed('filtered-out', (d) => !d.events.some((e) => matchesFilters(e, state.filters)))
      .classed('year-active', (d) => activeYear != null && d.year === activeYear)
      .classed('year-context', (d) => activeYear != null && d.year !== activeYear)
      .classed('hovered', (d) => d.sid === hoverSid)
      .classed('detail', (d) => d.sid === state.detailSid)
      .classed('selected', (d) => selectedSids?.has(d.sid) ?? false)
      .classed('dimmed', (d) => selectedSids != null && !selectedSids.has(d.sid))
      .classed('set-hi', (d) => (textSet ? inTextSet(d) : false))
      .classed('set-dim', (d) => (textSet ? !inTextSet(d) : false))
      .classed('story-focus', (d) => focus?.has(d.sid) ?? false)
      .classed('story-faded', (d) => focus != null && !focus.has(d.sid) && !state.storyFx?.focusOnly)
      .classed('story-hidden', (d) => focus != null && !focus.has(d.sid) && state.storyFx?.focusOnly === true)
      // Die initiale Inline-Style aus dem D3-Join gewinnt sonst gegen CSS. Fremdjahre
      // dürfen im Fokusmodus weder sichtbar dominieren noch Pointer-Ereignisse abfangen.
      .style('pointer-events', (d) => (activeYear != null && d.year !== activeYear ? 'none' : 'stroke'))
      .attr('stroke-width', (d) => {
        const base = strokeForCategory(d.events[0]?.category);
        const lifted = d.sid === hoverSid || d.sid === state.detailSid
          || (selectedSids?.has(d.sid) ?? false) || (focus?.has(d.sid) ?? false)
          || (activeYear != null && d.year === activeYear);
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

    // Läuft ein Kamera-Einflug (storyFx.camera), startet das Einzeichnen erst danach.
    const flyDelay = state.storyFx?.camera?.flyMs ?? 0;
    paths.filter((d) => d.sid === drawSid).each(function () {
      const len = this.getTotalLength();
      const sel = paths.filter((d) => d.sid === drawSid);
      sel.attr('stroke-dasharray', `${len} ${len}`)
        .attr('stroke-dashoffset', len)
        .transition('story-draw')
        .delay(flyDelay)
        .duration(DUR_DRAW)
        .attr('stroke-dashoffset', 0)
        .on('end', () => sel.attr('stroke-dasharray', null).attr('stroke-dashoffset', null));
    });
  }

  return {
    update(state, patch) {
      if (!patch) { render(state); drawIn(state); return; } // Vollrender (Mount/Harness)
      if ('hover' in patch || 'selectedEventIds' in patch || 'detailSid' in patch
        || 'filters' in patch || 'storyFx' in patch || 'textSet' in patch
        || 'activeYear' in patch) {
        render(state);
      }
      if ('storyFx' in patch) drawIn(state);
    },
    destroy() {
      svgNode?.removeEventListener('pointerleave', clearMapHover);
      svgNode?.removeEventListener('pointercancel', clearMapHover);
      g.selectAll('*').remove();
    },
  };
}
