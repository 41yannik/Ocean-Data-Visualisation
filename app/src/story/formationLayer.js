// Formations-Layer (Paket 10 Task 8): besitzt ALLE 99 Sturm-Land-Kreise (data-key = id)
// und ersetzt in der Bühnen-Gruppe 'dots2' den Punkte-Layer des Scatters.
//   formation 'scatter': 78 scatterbare Punkte an x/y der Skalen, 21 Ghosts unsichtbar (r 0).
//   formation 'unit':    alle 99 fliegen ins Unit-Raster (chrono bzw. quality je unitSort),
//                        Ghosts wachsen ein - Scatter-Chrome (Achsen/Trend) fadet per CSS aus.
// Objektkonstanz + benannte Transition 'formation' - der Kern von Strategie 4 (Paket 10).
import { easeCubicInOut } from 'd3';
import { isScatterable } from '../core/filters.js';
import { computeUnitLayout, unitTipContent } from './unitChart.js';

const DUR_FORMATION = 900;
const UNIT_CELL = 40;  // Unit-Raster in Scatter-Innenmaßen (562×416) - größer als zuvor (38),
                       // aber so, dass auch die Qualitäts-Zwei-Block-Ansicht (13,7×cell) noch
                       // zentriert in die Innenbreite passt.
const UNIT_R = 12;

export function createFormationLayer(gDots, layerCtx) {
  const { data, bus, inner } = layerCtx;
  // Auf die volle Innenbreite zentriert: Raster mittig UND deckungsgleich mit der ebenfalls
  // mittig zentrierten Zustands-Legende (vorher +80 → Gitter rechts, Legende mittig = versetzt).
  // Die links liegende Textkarte überlappt nur den äußersten Rand → Gitter bleibt frei.
  const unit = computeUnitLayout(data.events, { W: inner.width, H: inner.height, cell: UNIT_CELL });
  const events = unit.events;

  const isUnit = () => (bus.get().formation ?? 'scatter') === 'unit';

  const circles = gDots.selectAll('circle').data(events, (d) => d.id).join('circle')
    .attr('class', (d) => `fm-dot unit-dot unit-${unit.cat(d)}`)
    .attr('data-key', (d) => d.id)
    .on('mouseenter', (event, d) => { if (isUnit()) showTip(event, d); })
    .on('mousemove', (event) => { if (isUnit()) positionTip(event); })
    .on('mouseleave', hideTip);

  // Block-Beschriftungen (nur Qualitäts-Sortierung der Unit-Formation)
  const gLabels = gDots.append('g').attr('class', 'uc-labels').attr('opacity', 0);
  for (const key of ['a', 'b']) {
    gLabels.append('text').attr('class', 'uc-block-label')
      .attr('x', unit.labels[key].x).attr('y', unit.labels[key].y)
      .attr('text-anchor', 'middle').text(unit.labels[key].text);
  }

  // Statische Zustandslegende - nur in der Unit-Formation sichtbar (Review-Fix: die vier
  // Zustände waren nur in Prosa/ARIA/Hover kodiert). Reused unit-* Klassen, per getBBox
  // unten zentriert; Fade zusammen mit der Formation.
  const gLegend = gDots.append('g').attr('class', 'uc-legend').attr('opacity', 0);
  const legItems = [
    { cls: 'unit-solid', label: 'complete' },
    { cls: 'unit-nowind', label: 'impact, no wind' },
    { cls: 'unit-ghost', label: 'impact missing' },
    { cls: 'unit-recon', label: 'wind reconstructed' },
  ];
  let lx = 0;
  for (const it of legItems) {
    gLegend.append('circle').attr('class', `unit-dot ${it.cls}`)
      .attr('cx', lx).attr('cy', 0).attr('r', 7).style('pointer-events', 'none');
    const t = gLegend.append('text').attr('class', 'uc-legend-label').attr('x', lx + 12).attr('y', 4).text(it.label);
    lx += 12 + (t.node().getComputedTextLength() || it.label.length * 6.5) + 24;
  }
  const lbb = gLegend.node().getBBox();
  gLegend.attr('transform', `translate(${(inner.width - lbb.width) / 2 - lbb.x}, ${inner.height - 6})`);

  // Lokaler Tooltip - Wortlaut identisch zum eigenständigen Unit Chart
  const tip = document.createElement('div');
  tip.className = 'tooltip';
  document.body.appendChild(tip);
  function showTip(event, d) {
    tip.innerHTML = unitTipContent(d);
    tip.classList.add('visible');
    positionTip(event);
  }
  function positionTip(event) {
    const pad = 14;
    const r = tip.getBoundingClientRect();
    let x = event.clientX + pad;
    let y = event.clientY + pad;
    if (x + r.width > innerWidth - 8) x = event.clientX - r.width - pad;
    if (y + r.height > innerHeight - 8) y = event.clientY - r.height - pad;
    tip.style.left = `${Math.max(8, x)}px`;
    tip.style.top = `${Math.max(8, y)}px`;
  }
  function hideTip() { tip.classList.remove('visible'); }

  function scatterTarget(d) {
    const { x, y, r } = layerCtx.scales;
    if (!isScatterable(d)) return null; // Ghost: im Scatter unsichtbar
    return { cx: x(d.intensity_kt), cy: y.scale(y.value(d)), r: r(d.deaths ?? 0), o: 1 };
  }
  function unitTarget(d, sort) {
    const [cx, cy] = sort === 'quality' ? unit.quality(d) : unit.chrono(d);
    return { cx, cy, r: UNIT_R, o: 1 };
  }

  let last = null;
  function layout(state, animate) {
    const key = `${state.formation ?? 'scatter'}|${state.unitSort ?? 'chrono'}`;
    if (key === last) return;
    last = key;
    const toUnit = (state.formation ?? 'scatter') === 'unit';
    const target = (d) => (toUnit
      ? unitTarget(d, state.unitSort ?? 'chrono')
      // Ghosts parken unsichtbar auf ihrer Chrono-Zielposition - beim Morph wachsen
      // sie dort ein statt quer über die Bühne zu fliegen.
      : (scatterTarget(d) ?? { ...unitTarget(d, 'chrono'), r: 0, o: 0 }));
    const sel = animate && !state.reducedMotion
      ? circles.transition('formation').duration(DUR_FORMATION)
          .delay((_, i) => i * 3).ease(easeCubicInOut)
      : circles;
    sel
      .attr('cx', (d) => target(d).cx)
      .attr('cy', (d) => target(d).cy)
      .attr('r', (d) => target(d).r)
      .attr('opacity', (d) => target(d).o);
    gDots.classed('fm-unit', toUnit);
    gLabels.transition('fm-lab').duration(400)
      .attr('opacity', toUnit && (state.unitSort ?? 'chrono') === 'quality' ? 1 : 0);
    gLegend.transition('fm-leg').duration(400).attr('opacity', toUnit ? 1 : 0);
  }

  // Story-Klassen der Scatter-Formation (Teilmenge von pointsLayer.classes - der
  // Formations-Layer ersetzt den Punkte-Layer in dieser Bühne; Step 5 nutzt focusEventIds).
  function classes(state) {
    const fx = state.storyFx;
    const inScatter = (state.formation ?? 'scatter') === 'scatter';
    const focusSet = fx?.focusEventIds ? new Set(fx.focusEventIds) : null;
    circles
      .classed('story-hidden', () => inScatter && fx != null && !fx.showPoints)
      .classed('story-focus', (d) => inScatter && (focusSet?.has(d.id) ?? false))
      .classed('story-faded', (d) => inScatter && focusSet != null && !focusSet.has(d.id));
  }

  return {
    update(state, patch) {
      if (!patch) { layout(state, false); classes(state); return; }
      if ('formation' in patch || 'unitSort' in patch) layout(state, true);
      if ('formation' in patch || 'storyFx' in patch) classes(state);
    },
    destroy() { tip.remove(); gDots.selectAll('*').remove(); },
  };
}
