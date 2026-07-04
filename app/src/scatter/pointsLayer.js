// Punkte-Layer: 78 scatterbare Sturm-Land-Paare (data-key = id → Objektkonstanz beim Toggle),
// Tote = Radius, Fallback = gestrichelt, Multi-Country-Connectors ("ein Sturm, n Länder").
// 1:n: hover.sid highlightet Geschwister; Punkt ohne SID (2004-0153-FJI) ist nicht klickbar (L4).
import { DUR_MODE, REVEAL_RESIDUAL_MIN } from '../core/config.js';
import { matchesFilters, isScatterable } from '../core/filters.js';

export function createPointsLayer(gPoints, gConnectors, layerCtx) {
  const { data, bus, meta } = layerCtx;
  const events = data.events.filter(isScatterable);

  // Hover-Extras (Step 3): Residuum-Linie vom Punkt zur Trendlinie + eingeblendeter Name.
  // In gConnectors (unter den Punkten) bzw. gPoints (über den Punkten) - eigene Klassen,
  // damit der Connector-Join sie nicht mitfasst.
  const residual = gConnectors.append('line').attr('class', 'residual-line').style('display', 'none');
  const hoverName = gPoints.append('text').attr('class', 'hover-name')
    .attr('text-anchor', 'middle').style('display', 'none');

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
      const s = bus.get();
      // Story-Gate: Hover nur in der Erkundung ODER wenn ein Step ihn ausdrücklich freigibt (Step 3).
      if (!s.exploreUnlocked && !s.storyFx?.hoverPoints) return;
      const variant = s.storyFx?.hoverPoints ? 'simple' : undefined; // einfache Sprache im Story-Step
      bus.set({ hover: { sid: d.sid, eventId: d.id, x: event.clientX, y: event.clientY, source: 'scatter', variant } });
    })
    .on('mouseleave', () => {
      const s = bus.get();
      if (!s.exploreUnlocked && !s.storyFx?.hoverPoints) return;
      bus.set({ hover: null });
    })
    .on('click', (event, d) => {
      if (d.sid && bus.get().exploreUnlocked) bus.set({ detailSid: d.sid });
    })
    .on('keydown', (event, d) => {
      if (event.key === 'Enter' && d.sid && bus.get().exploreUnlocked) bus.set({ detailSid: d.sid });
    });

  // Einstiegs-Stagger beim Mount - im linearen Layout (v5) mountet die Sektion erst
  // beim Sichtbarwerden, die Punkte "erscheinen" also genau dann (Aha-Effekt).
  if (!bus.get?.().reducedMotion) {
    circles.attr('opacity', 0)
      .transition('points-intro')
      .delay((_, i) => i * 4)
      .duration(300)
      .attr('opacity', 1);
  }

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

    const conn = gConnectors.selectAll('line.connector').data(groups, (d) => d.sid);
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

    // Story-Choreografie (storyFx = null → alles neutral):
    const fx = state.storyFx;
    const focusSet = fx?.focusEventIds ? new Set(fx.focusEventIds) : null;
    let focusSids = null;
    if (focusSet) {
      focusSids = new Set();
      for (const e of events) if (focusSet.has(e.id) && e.sid) focusSids.add(e.sid);
    }
    // Step 4: persistenter Toggle-Filter (highlight) bzw. flüchtiges Text-Hover-Set (textSet,
    // hat Vorrang). Ein aktives Set übernimmt die Bühne: Mitglieder leuchten, Rest dimmt weich.
    const toggleSet = state.highlight?.ids ?? null;
    const textSet = state.textSet?.ids ?? null;
    const activeSet = textSet ?? toggleSet ?? null;
    const pulseSet = state.textSet?.pulse ? textSet : null;

    // Outlier-Glow (residualReveal) nur, solange kein Set die Bühne übernommen hat.
    const revealGlow = fx?.residualReveal === true && !activeSet;
    const isOutlier = (d) => (d.residual_pc ?? -Infinity) > REVEAL_RESIDUAL_MIN;
    const isReveal = (d) => revealGlow && isOutlier(d);
    const isStoryFaded = (d) => {
      if (activeSet) return !activeSet.has(d.id);
      if (!fx) return false;
      if (revealGlow && !isOutlier(d)) return true;
      if (focusSet && !focusSet.has(d.id)) return true;
      return false;
    };

    // Einzel-Hover dimmt die anderen (Step 3: hoverPoints; Step 4: Guba-Text-Hover bei residualReveal).
    const hoverDimActive = hover?.eventId != null && !activeSet
      && (fx?.hoverPoints === true || fx?.residualReveal === true);

    circles
      .classed('filtered-out', (d) => !matchesFilters(d, state.filters))
      .classed('hovered', (d) => hover?.eventId === d.id)
      .classed('sibling', (d) => hover?.sid != null && d.sid === hover.sid && hover.eventId !== d.id)
      .classed('detail', (d) => state.detailSid != null && d.sid === state.detailSid)
      .classed('selected', (d) => sel?.has(d.id) ?? false)
      .classed('dimmed', (d) => sel != null && !sel.has(d.id))
      .classed('hover-dim', (d) => hoverDimActive && d.id !== hover.eventId && d.sid !== hover.sid)
      .classed('story-hidden', () => fx != null && !fx.showPoints)
      .classed('story-reveal', isReveal)
      .classed('set-hi', (d) => (activeSet ? activeSet.has(d.id) : false))
      .classed('pulse', (d) => (pulseSet ? pulseSet.has(d.id) : false))
      .classed('story-focus', (d) => focusSet?.has(d.id) ?? false)
      .classed('story-faded', isStoryFaded)
      .attr('tabindex', (d) => (matchesFilters(d, state.filters) && state.exploreUnlocked ? 0 : -1));
    gConnectors.selectAll('line.connector')
      .classed('dimmed', () => sel != null)
      // Connectors ausblenden, wenn Punkte versteckt sind ODER der Step sie unterdrückt (Step 3).
      .classed('story-hidden', () => fx != null && (!fx.showPoints || fx.hideConnectors === true))
      // Beim Residuen-Reveal treten ALLE Connectors zurück - der Beat gehört den Punkten.
      .classed('story-faded', (d) => (focusSids != null && !focusSids.has(d.sid))
        || fx?.residualReveal === true);
  }

  // Residuum-Linie vom gehoverten Punkt zur Trendlinie + Name-Label (nur im Story-Step 3).
  function hoverExtras(state) {
    // Residuum-Linie + Name bei Einzel-Hover: Step 3 (hoverPoints) und Step 4 (Guba, residualReveal).
    const interactive = state.storyFx?.hoverPoints === true || state.storyFx?.residualReveal === true;
    const id = interactive ? (state.hover?.eventId ?? null) : null;
    const e = id != null ? data.index.byId.get(id) : null;
    if (!e || !isScatterable(e)) {
      residual.style('display', 'none');
      hoverName.style('display', 'none');
      return;
    }
    const { x, y, r } = layerCtx.scales;
    const cx = x(e.intensity_kt);
    const cy = y.scale(y.value(e));
    const ringR = r(e.deaths ?? 0);

    const fit = meta?.fits?.[state.mode];
    if (state.storyFx?.showTrend && fit) {
      const ty = y.scale(fit.slope * e.intensity_kt + fit.intercept);
      residual.style('display', null)
        .attr('x1', cx).attr('x2', cx).attr('y1', cy).attr('y2', ty);
    } else {
      residual.style('display', 'none');
    }

    hoverName.style('display', null)
      .attr('x', cx).attr('y', cy - ringR - 8)
      .text(e.name ?? 'Unnamed storm');
  }

  return {
    update(state, patch) {
      if (!patch) { position(state, false); classes(state); hoverExtras(state); return; }
      if ('mode' in patch) position(state, true);
      if ('filters' in patch) position(state, false);
      if ('hover' in patch || 'selectedEventIds' in patch || 'detailSid' in patch
        || 'filters' in patch || 'storyFx' in patch || 'exploreUnlocked' in patch
        || 'highlight' in patch || 'textSet' in patch) {
        classes(state);
      }
      if ('hover' in patch || 'storyFx' in patch || 'mode' in patch || 'filters' in patch) {
        hoverExtras(state);
      }
    },
    destroy() {
      gPoints.selectAll('*').remove();
      gConnectors.selectAll('*').remove();
    },
  };
}
