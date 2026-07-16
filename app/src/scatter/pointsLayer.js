// Punkte-Layer: 78 scatterbare Sturm-Land-Paare (data-key = id → Objektkonstanz beim Toggle),
// Tote = Radius, Fallback = gestrichelt, Multi-Country-Connectors ("ein Sturm, n Länder").
// 1:n: hover.sid highlightet Geschwister; Punkt ohne SID (2004-0153-FJI) ist nicht klickbar (L4).
import { select } from 'd3';
import { DUR_MODE, REVEAL_RESIDUAL_MIN, UNIFORM_POINT_R } from '../core/config.js';
import { matchesFilters, isScatterable } from '../core/filters.js';
import { fmtKt, fmtPct } from '../core/format.js';

export function createPointsLayer(gPoints, gConnectors, layerCtx) {
  const { data, bus, meta, inner } = layerCtx;
  const events = data.events.filter(isScatterable);

  // Hover-Extras (Step 3): Residuum-Linie vom Punkt zur Trendlinie + eingeblendeter Name.
  // In gConnectors (unter den Punkten) bzw. gPoints (über den Punkten) - eigene Klassen,
  // damit der Connector-Join sie nicht mitfasst.
  const residual = gConnectors.append('line').attr('class', 'residual-line').style('display', 'none');
  const stormSpine = gConnectors.append('line').attr('class', 'storm-spine').style('display', 'none');
  const hoverName = gPoints.append('text').attr('class', 'hover-name')
    .attr('text-anchor', 'middle').style('display', 'none');

  // Mausbewegungen kommen deutlich schneller als der Bildschirm zeichnet. Hover-State
  // höchstens einmal pro Frame schreiben und ein Mouseleave erst im nächsten Frame
  // bestätigen: Beim Wechsel zwischen eng benachbarten Punkten entsteht so kein Null-Frame.
  let hoverFrame = null;
  let leaveFrame = null;
  let pendingHover = null;
  const cancelPendingLeave = () => {
    if (leaveFrame != null) cancelAnimationFrame(leaveFrame);
    leaveFrame = null;
  };
  const queueHover = (hover) => {
    cancelPendingLeave();
    pendingHover = hover;
    if (hoverFrame != null) return;
    hoverFrame = requestAnimationFrame(() => {
      hoverFrame = null;
      if (!pendingHover) return;
      bus.set({ hover: pendingHover });
      pendingHover = null;
    });
  };
  const queueHoverClear = () => {
    pendingHover = null;
    // Ein bereits geplanter Pointer-Frame darf nach dem Verlassen des Charts keinen
    // alten Hover mehr in den Store schreiben. Das war die Ursache für den gelegentlich
    // stehenbleibenden Gruppen-Tooltip im Evidence-Schritt.
    if (hoverFrame != null) cancelAnimationFrame(hoverFrame);
    hoverFrame = null;
    cancelPendingLeave();
    leaveFrame = requestAnimationFrame(() => {
      leaveFrame = null;
      if (bus.get().hover?.source === 'scatter') bus.set({ hover: null });
    });
  };

  const canHover = () => {
    const state = bus.get();
    return state.exploreUnlocked || state.storyFx?.hoverPoints;
  };
  const hoverPayload = (event, d) => {
    const state = bus.get();
    const variant = state.storyFx?.hoverPoints ? 'simple' : undefined;
    return {
      sid: d.sid, eventId: d.id, x: event.clientX, y: event.clientY,
      source: 'scatter', variant,
    };
  };

  const circles = gPoints.selectAll('circle')
    .data(events, (d) => d.id)
    .join('circle')
    .attr('class', 'point')
    .attr('data-key', (d) => d.id)
    .classed('fallback', (d) => d.intensity_source === 'emdat_fallback')
    .classed('no-deaths', (d) => d.deaths == null)
    .attr('tabindex', 0)
    .attr('aria-label', (d) => `${d.name ?? 'Unnamed storm'} ${d.year}, ${d.country}`)
    .on('pointerenter pointermove', (event, d) => {
      // Story-Gate: Hover nur in der Erkundung ODER wenn ein Step ihn ausdrücklich freigibt (Step 3).
      if (!canHover()) return;
      queueHover(hoverPayload(event, d));
    })
    .on('pointerleave pointercancel', () => {
      if (!canHover()) return;
      queueHoverClear();
    })
    .on('focus', (event, d) => {
      const s = bus.get();
      if (!s.exploreUnlocked && !s.storyFx?.hoverPoints) return;
      const variant = s.storyFx?.hoverPoints ? 'simple' : undefined;
      cancelPendingLeave();
      bus.set({ hover: { sid: d.sid, eventId: d.id, x: null, y: null, source: 'scatter', variant } });
    })
    .on('blur', () => {
      const s = bus.get();
      if (!s.exploreUnlocked && !s.storyFx?.hoverPoints) return;
      queueHoverClear();
    })
    .on('click', (event, d) => {
      const s = bus.get();
      if (s.storyFx?.stormSpine && d.sid && visibleStormEvents(d.sid, s).length > 1) {
        const sameStorm = s.stormPin?.sid === d.sid;
        bus.set({ stormPin: sameStorm ? null : { sid: d.sid, eventId: d.id } });
        event.stopPropagation();
        return;
      }
      if (d.sid && bus.get().exploreUnlocked) bus.set({ detailSid: d.sid });
    })
    .on('keydown', (event, d) => {
      const s = bus.get();
      if (event.key === 'Escape' && s.stormPin) {
        event.preventDefault();
        bus.set({ stormPin: null });
      } else if ((event.key === 'Enter' || event.key === ' ') && s.storyFx?.stormSpine
        && d.sid && visibleStormEvents(d.sid, s).length > 1) {
        event.preventDefault();
        const sameStorm = s.stormPin?.sid === d.sid;
        bus.set({ stormPin: sameStorm ? null : { sid: d.sid, eventId: d.id } });
      } else if (event.key === 'Enter' && d.sid && s.exploreUnlocked) {
        bus.set({ detailSid: d.sid });
      }
    });

  // Persistente Beschriftung erscheint erst nach Klick. Beim reinen Hover übernimmt
  // der Gruppen-Tooltip die Ländernamen, damit Text und Tooltip nicht kollidieren.
  const stormLabels = gPoints.append('g').attr('class', 'storm-spine-labels')
    .style('pointer-events', 'none');
  const stormTitle = stormLabels.append('text').attr('class', 'storm-spine-title')
    .attr('text-anchor', 'middle');
  let lastInteractionKey = null;

  // SVG-Kreise erhalten nach einem Mausklick nicht in jedem Browser zuverlässig
  // den Tastaturfokus. Escape daher auf Dokumentebene behandeln und beim Destroy lösen.
  const onDocumentKeydown = (event) => {
    const state = bus.get();
    if (event.key !== 'Escape' || !state.storyFx?.stormSpine || !state.stormPin) return;
    event.preventDefault();
    bus.set({ stormPin: null, hover: null });
  };
  document.addEventListener('keydown', onDocumentKeydown);

  // Sicherheitsnetz für schnelle Bewegungen, Scrollen und Browser-Tabwechsel: Nicht alle
  // Browser liefern in diesen Fällen zuverlässig ein pointerleave am winzigen SVG-Kreis.
  const svgNode = gPoints.node()?.ownerSVGElement;
  const onScatterBoundaryLeave = () => {
    if (pendingHover || bus.get().hover?.source === 'scatter') queueHoverClear();
  };
  const onVisibilityChange = () => {
    if (document.hidden) onScatterBoundaryLeave();
  };
  svgNode?.addEventListener('pointerleave', onScatterBoundaryLeave);
  svgNode?.addEventListener('pointercancel', onScatterBoundaryLeave);
  window.addEventListener('blur', onScatterBoundaryLeave);
  document.addEventListener('visibilitychange', onVisibilityChange);

  const interactionKey = (state) => [
    state.hover?.eventId ?? '', state.hover?.sid ?? '',
    state.stormPin?.eventId ?? '', state.stormPin?.sid ?? '',
  ].join('|');

  function visibleStormEvents(sid, state) {
    return events.filter((event) => event.sid === sid && matchesFilters(event, state.filters));
  }

  function activeStorm(state) {
    if (state.storyFx?.stormSpine !== true) return null;
    const sid = state.hover?.sid ?? state.stormPin?.sid ?? null;
    if (!sid) return null;
    const list = visibleStormEvents(sid, state);
    if (list.length < 2) return null;
    return {
      sid,
      list,
      activeEventId: state.hover?.eventId ?? state.stormPin?.eventId ?? null,
    };
  }

  function countryLabelLayout(list, yScale) {
    const GAP = 15;
    const PAD = 8;
    const rows = list
      .map((event) => ({ event, pointY: yScale(event) }))
      .sort((a, b) => a.pointY - b.pointY);
    for (let i = 0; i < rows.length; i += 1) {
      rows[i].labelY = i === 0 ? rows[i].pointY : Math.max(rows[i].pointY, rows[i - 1].labelY + GAP);
    }
    const overflow = rows.at(-1)?.labelY - (inner.height - PAD);
    if (overflow > 0) for (const row of rows) row.labelY -= overflow;
    for (let i = rows.length - 2; i >= 0; i -= 1) {
      rows[i].labelY = Math.min(rows[i].labelY, rows[i + 1].labelY - GAP);
    }
    const underflow = PAD - (rows[0]?.labelY ?? PAD);
    if (underflow > 0) for (const row of rows) row.labelY += underflow;
    return rows;
  }

  function renderStormSpine(state) {
    const group = activeStorm(state);
    if (!group) {
      stormSpine.style('display', 'none');
      stormLabels.style('display', 'none');
      stormLabels.selectAll('g.storm-country').remove();
      return;
    }

    const { x, y } = layerCtx.scales;
    const cx = x(group.list[0].intensity_kt);
    const pointY = (event) => y.scale(y.value(event));
    const ys = group.list.map(pointY);
    stormSpine.style('display', null)
      .attr('x1', cx).attr('x2', cx)
      .attr('y1', Math.min(...ys)).attr('y2', Math.max(...ys));

    // Klick fixiert die Gruppe: danach werden Titel und kollisionsgeschützte
    // Länderlabels sichtbar. Solange der Zeiger auf einem Punkt liegt, reicht der Tooltip.
    const pinned = state.hover?.eventId == null && state.stormPin?.sid === group.sid;
    stormLabels.style('display', pinned ? null : 'none');
    if (!pinned) return;

    const first = group.list[0];
    const countryCount = new Set(group.list.map((event) => event.iso3)).size;
    const titleX = Math.max(105, Math.min(inner.width - 105, cx));
    const titleY = Math.max(14, Math.min(...ys) - 18);
    stormTitle.attr('x', titleX).attr('y', titleY)
      .text(`${first.name ?? 'Storm'} · ${fmtKt(first.intensity_kt)} · ${countryCount} countries`);

    const placeLeft = cx > inner.width * 0.68;
    const labelX = cx + (placeLeft ? -12 : 12);
    const anchor = placeLeft ? 'end' : 'start';
    const rows = countryLabelLayout(group.list, pointY);
    const join = stormLabels.selectAll('g.storm-country').data(rows, (d) => d.event.id);
    join.exit().remove();
    const enter = join.enter().append('g').attr('class', 'storm-country');
    enter.append('line').attr('class', 'storm-country-leader');
    enter.append('text').attr('class', 'storm-country-label');
    enter.merge(join).each(function (row) {
      const node = select(this);
      node.select('.storm-country-leader')
        .attr('x1', cx + (placeLeft ? -5 : 5)).attr('y1', row.pointY)
        .attr('x2', labelX + (placeLeft ? 3 : -3)).attr('y2', row.labelY);
      node.select('.storm-country-label')
        .attr('x', labelX).attr('y', row.labelY + 4)
        .attr('text-anchor', anchor)
        .text(`${row.event.country} · ${fmtPct(row.event.affected_pc)}`);
    });
  }

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
      .attr('r', (d) => (state.storyFx?.uniformPoints || layerCtx.uniformPoints
        ? UNIFORM_POINT_R : r(d.deaths ?? 0)));

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
    const storm = activeStorm(state);
    const stormIds = storm ? new Set(storm.list.map((event) => event.id)) : null;

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
    const hoverFocusIds = fx?.stormSpine && hover?.eventId != null
      ? new Set(events
        .filter((event) => (hover.sid ? event.sid === hover.sid : event.id === hover.eventId)
          && matchesFilters(event, state.filters))
        .map((event) => event.id))
      : null;

    // Outlier-Glow (residualReveal) nur, solange kein Set die Bühne übernommen hat.
    const revealGlow = fx?.residualReveal === true && !activeSet;
    const isOutlier = (d) => (d.residual_pc ?? -Infinity) > REVEAL_RESIDUAL_MIN;
    const isReveal = (d) => revealGlow && isOutlier(d);
    const isStoryFaded = (d) => {
      // Ein direkter Punkt-Hover gewinnt temporär gegen einen aktiven Beispiel-Button.
      // Nach Mouseleave kehrt dessen Hervorhebung unverändert zurück.
      if (hoverFocusIds) return !hoverFocusIds.has(d.id);
      if (activeSet) return !activeSet.has(d.id);
      if (!fx) return false;
      if (revealGlow && !isOutlier(d)) return true;
      if (focusSet && !focusSet.has(d.id)) return true;
      return false;
    };

    // Einzel-Hover dimmt die anderen (Step 3: hoverPoints; Step 4: Guba-Text-Hover bei residualReveal).
    const hoverDimActive = !activeSet && (storm != null
      || (hover?.eventId != null && (fx?.hoverPoints === true || fx?.residualReveal === true)));
    const activeSid = storm?.sid ?? hover?.sid ?? null;
    const activeEventId = storm?.activeEventId ?? hover?.eventId ?? null;

    circles
      .classed('filtered-out', (d) => !matchesFilters(d, state.filters))
      .classed('hovered', (d) => hover?.eventId === d.id)
      .classed('sibling', (d) => hover?.sid != null && d.sid === hover.sid && hover.eventId !== d.id)
      .classed('storm-peer', (d) => stormIds?.has(d.id) ?? false)
      .classed('storm-primary', (d) => storm?.activeEventId === d.id)
      .classed('storm-hoverable', () => fx?.stormSpine === true)
      .classed('detail', (d) => state.detailSid != null && d.sid === state.detailSid)
      .classed('selected', (d) => sel?.has(d.id) ?? false)
      .classed('dimmed', (d) => sel != null && !sel.has(d.id))
      .classed('hover-dim', (d) => hoverDimActive && d.id !== activeEventId && d.sid !== activeSid)
      .classed('story-hidden', () => fx != null && !fx.showPoints)
      .classed('story-reveal', isReveal)
      .classed('set-hi', (d) => (activeSet ? activeSet.has(d.id) : false))
      .classed('pulse', (d) => (pulseSet ? pulseSet.has(d.id) : false))
      .classed('story-focus', (d) => focusSet?.has(d.id) ?? false)
      .classed('story-faded', isStoryFaded)
      .attr('tabindex', (d) => (matchesFilters(d, state.filters)
        && (state.exploreUnlocked || fx?.stormSpine) ? 0 : -1));
    // Nahezu gleiche Länderwerte können exakt übereinanderliegen. Der aktive Punkt
    // kommt nach vorn; die fixierten Labels bleiben anschließend oberste SVG-Ebene.
    if (storm?.activeEventId) circles.filter((d) => d.id === storm.activeEventId).raise();
    stormLabels.raise();
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
    const ringR = state.storyFx?.uniformPoints || layerCtx.uniformPoints
      ? UNIFORM_POINT_R : r(e.deaths ?? 0);

    const fit = meta?.fits?.[state.mode];
    const storm = activeStorm(state);
    if (state.storyFx?.showTrend && fit && !storm) {
      const ty = y.scale(fit.slope * e.intensity_kt + fit.intercept);
      residual.style('display', null)
        .attr('x1', cx).attr('x2', cx).attr('y1', cy).attr('y2', ty);
    } else {
      residual.style('display', 'none');
    }

    if (state.storyFx?.uniformPoints || layerCtx.uniformPoints) {
      // Im Evidence-Panel nennt der Tooltip den Sturm bereits. Ein zweites SVG-Label
      // würde mit Fit- und Punktbeschriftungen konkurrieren.
      hoverName.style('display', 'none');
    } else {
      hoverName.style('display', null)
        .attr('x', cx).attr('y', cy - ringR - 8)
        .text(e.name ?? 'Unnamed storm');
    }
  }

  return {
    update(state, patch) {
      const nextInteractionKey = interactionKey(state);
      const interactionChanged = nextInteractionKey !== lastInteractionKey;
      lastInteractionKey = nextInteractionKey;
      if (!patch) {
        position(state, false);
        classes(state);
        hoverExtras(state);
        renderStormSpine(state);
        return;
      }
      if ('mode' in patch) position(state, true);
      if ('filters' in patch) position(state, false);
      if (interactionChanged || 'selectedEventIds' in patch || 'detailSid' in patch
        || 'filters' in patch || 'storyFx' in patch || 'exploreUnlocked' in patch
        || 'highlight' in patch || 'textSet' in patch || 'stormPin' in patch) {
        classes(state);
      }
      if (interactionChanged || 'storyFx' in patch || 'mode' in patch || 'filters' in patch) {
        hoverExtras(state);
      }
      if (interactionChanged || 'storyFx' in patch || 'mode' in patch
        || 'filters' in patch || 'stormPin' in patch) renderStormSpine(state);
    },
    destroy() {
      if (hoverFrame != null) cancelAnimationFrame(hoverFrame);
      if (leaveFrame != null) cancelAnimationFrame(leaveFrame);
      document.removeEventListener('keydown', onDocumentKeydown);
      svgNode?.removeEventListener('pointerleave', onScatterBoundaryLeave);
      svgNode?.removeEventListener('pointercancel', onScatterBoundaryLeave);
      window.removeEventListener('blur', onScatterBoundaryLeave);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      gPoints.selectAll('*').remove();
      gConnectors.selectAll('*').remove();
    },
  };
}
