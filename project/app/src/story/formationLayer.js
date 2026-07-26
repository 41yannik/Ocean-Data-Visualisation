// Formations-Layer: besitzt ALLE gemeldeten Land-Jahr-Kreise (data-key = id) und
// ersetzt in der Bühnen-Gruppe 'dots2' den Punkte-Layer des Scatters.
//   formation 'scatter':   Punkte an x/y der Skalen; gemeldete Nullen in der Zero-Lane.
//   formation 'sizeRows':  dieselben Punkte als EINE Zeile je Land, sortiert nach
//                          BEVÖLKERUNG, x = gemeldeter Anteil (sizeRows.js). Macht den
//                          einzigen belastbaren Befund abzählbar: der Anteil hängt am
//                          Nenner, nicht am Wind.
//   formation 'unit':      alle fliegen ins Unit-Raster (chrono bzw. quality je unitSort).
// Objektkonstanz + benannte Transition 'formation' - der Kern von Strategie 4 (Paket 10).
//
// Entfallen (Audit 2026-07): 'residualRows' und 'subregion'. Beide ordneten nach dem
// Abstand zu einer wind-only line, die nichts erklärt (R² 0.015, p 0.31); 56 % aller
// Punkte lagen über ihr, kein Land wich signifikant ab, und das Subregionen-Muster war
// ein Bevölkerungsgrößen-Effekt.
import { easeCubicInOut } from 'd3';
import { isScatterable, isZeroLane, isPlottable } from '../core/filters.js';
import { fmtKt, fmtPct } from '../core/format.js';
import { computeUnitLayout, unitTipContent } from './unitChart.js';
import { computeSizeRows, RR_R } from './sizeRows.js';

const DUR_FORMATION = 900;
// Punktgröße = RR_R (Review 2026-07-13): die Kreise behalten über Residual-Zeilen und
// Unit-Raster hinweg DIESELBE Größe - der Morph liest sich als Umordnung, nicht als
// Neuzeichnung. Zellmaß proportional mitverkleinert, damit das Raster kompakt bleibt.
const UNIT_CELL = 28;
const UNIT_R = RR_R;

export function createFormationLayer(gDots, layerCtx) {
  const { data, bus, inner } = layerCtx;
  // Auf die volle Innenbreite zentriert: Raster mittig UND deckungsgleich mit der ebenfalls
  // mittig zentrierten Zustands-Legende (vorher +80 → Gitter rechts, Legende mittig = versetzt).
  // Die links liegende Textkarte überlappt nur den äußersten Rand → Gitter bleibt frei.
  const unit = computeUnitLayout(data.events, { W: inner.width, H: inner.height, cell: UNIT_CELL });
  const events = unit.events;
  const rr = computeSizeRows(data.events, { W: inner.width, H: inner.height });

  const formationNow = () => bus.get().formation ?? 'scatter';

  const circles = gDots.selectAll('circle').data(events, (d) => d.id).join('circle')
    .attr('class', (d) => `fm-dot unit-dot unit-${unit.cat(d)}`)
    .attr('data-key', (d) => d.id)
    // Hover in ALLEN Formationen (Review 2026-07-13: auch der Step-5-Scatter erklärt sich
    // per Tooltip, wie das Evidence-Panel). Ghosts sind im Scatter r 0 → nicht hoverbar;
    // der Guard fängt den theoretischen Randfall trotzdem ab.
    .on('mouseenter', (event, d) => {
      if (formationNow() === 'scatter' && !isPlottable(d)) return;
      showTip(event, d);
    })
    .on('mousemove', positionTip)
    .on('mouseleave', hideTip);

  // Block-Beschriftungen (nur Qualitäts-Sortierung der Unit-Formation)
  const gLabels = gDots.append('g').attr('class', 'uc-labels').attr('opacity', 0);
  for (const key of ['a', 'b', 'c']) {
    gLabels.append('text').attr('class', 'uc-block-label')
      .attr('x', unit.labels[key].x).attr('y', unit.labels[key].y)
      .attr('text-anchor', 'middle').text(unit.labels[key].text);
  }

  // Statische Zustandslegende - nur in der Unit-Formation sichtbar. Als kompaktes
  // 2×2-Raster bleibt sie ungefähr so breit wie das Punkteraster; die Farberklärung
  // bildet dadurch eine Einheit mit der Visualisierung statt eine zweite, breitere Achse.
  const gLegend = gDots.append('g').attr('class', 'uc-legend').attr('opacity', 0);
  const legItems = [
    { cls: 'unit-solid', label: 'reported toll' },
    { cls: 'unit-zero', label: 'reported zero' },
    { cls: 'unit-ghost', label: 'no cyclone near' },
  ];
  const legendWidth = Math.min(320, inner.width);
  const legendColumn = legendWidth / 2;
  legItems.forEach((it, i) => {
    const slot = gLegend.append('g').attr('class', 'uc-legend-item')
      .attr('transform', `translate(${i % 2 * legendColumn + 8}, ${Math.floor(i / 2) * 24})`);
    slot.append('circle').attr('class', `unit-dot ${it.cls}`)
      .attr('cx', 0).attr('cy', 0).attr('r', UNIT_R).style('pointer-events', 'none');
    slot.append('text').attr('class', 'uc-legend-label').attr('x', 12).attr('y', 4).text(it.label);
  });
  const legendBox = gLegend.node().getBBox();
  const legendX = inner.width / 2 - (legendBox.x + legendBox.width / 2);
  gLegend.attr('transform', `translate(${legendX}, ${inner.height - 30})`);

  // Zeilen-Chrome: Länderlabel + Bevölkerung als Sublabel (der Nenner, um den es geht),
  // Median-Referenzlinie über alle Records, Prozent-Ticks und je Zeile ein Median-Tick.
  // Die Zeilen sind nach Bevölkerung sortiert; das Sublabel macht die Ordnung lesbar,
  // ohne dass der Text sie behaupten muss.
  function drawRowChrome(g, lay) {
    g.append('line').attr('class', 'rr-zero')
      .attr('x1', lay.zeroX).attr('x2', lay.zeroX)
      .attr('y1', 6).attr('y2', lay.axisY - 14);
    g.append('text').attr('class', 'rr-zero-label')
      .attr('x', lay.zeroX).attr('y', 2).attr('text-anchor', 'middle')
      .text('median across all records');
    // Edge-Band: komprimierter Streifen für Anteile < 0.01 % (16 % der Records, u. a.
    // ein Papua-Neuguinea-Rekord) - dieselbe Idee wie die Zero-Lane, nur für "sehr klein,
    // nicht null". Solide statt gestrichelte Trennlinie (keine Gridlines-als-Rauschen).
    // Label auf einer EIGENEN Zeile über den Haupt-Ticks (wie beim Zero-Lane-Vorbild),
    // sonst kollidiert es mit dem ersten Haupt-Tick auf derselben Baseline.
    if (lay.hasEdge) {
      g.append('line').attr('class', 'rr-edge-divider')
        .attr('x1', lay.edgeDividerX).attr('x2', lay.edgeDividerX)
        .attr('y1', 6).attr('y2', lay.axisY - 14);
      g.append('text').attr('class', 'rr-tick')
        .attr('x', lay.edgeDividerX - 4).attr('y', lay.axisY - 15)
        .attr('text-anchor', 'end').text('<0.01%');
    }
    for (const t of lay.ticks) {
      g.append('text').attr('class', 'rr-tick')
        .attr('x', t.x).attr('y', lay.axisY).attr('text-anchor', 'middle').text(t.label);
    }
    g.append('text').attr('class', 'rr-axis-label')
      .attr('x', (lay.x.range()[0] + lay.x.range()[1]) / 2).attr('y', lay.axisY + 18)
      .attr('text-anchor', 'middle').text('share of population reported affected');
    for (const row of lay.rows) {
      g.append('text').attr('class', 'rr-row-label')
        .attr('x', lay.labelX).attr('y', row.y - 1).attr('text-anchor', 'end').text(row.label);
      g.append('text').attr('class', 'rr-row-count')
        .attr('x', lay.labelX).attr('y', row.y + 13).attr('text-anchor', 'end')
        .text(`${row.sublabel} · ${row.n} yrs`);
      // medianX statt lay.x(row.median): ein Zeilen-Median unter dem Edge-Floor muss auf
      // der Edge-Skala stehen, sonst zeigt die Markierung (Audit-Fund) auf einen anderen
      // Pixel als der Punkt, den sie zusammenfasst - bei einzeiligen Ländern (n=1) ist
      // das sogar mathematisch falsch, weil Punkt und Median identisch sein müssen.
      if (row.medianX != null) {
        g.append('line').attr('class', 'rr-median')
          .attr('x1', row.medianX).attr('x2', row.medianX)
          .attr('y1', row.y - 18).attr('y2', row.y + 18);
      }
    }
  }
  const gRR = gDots.append('g').attr('class', 'rr-chrome').attr('opacity', 0);
  drawRowChrome(gRR, rr);

  // Lokaler Tooltip - Wortlaut identisch zum eigenständigen Unit Chart
  const tip = document.createElement('div');
  tip.className = 'tooltip';
  document.body.appendChild(tip);
  // Einordnungszeile: wie viele Menschen der Anteil bedeutet. Ersetzt den früheren
  // „N× über der Erwartung"-Vergleich, der sich auf eine nichtssagende Linie bezog.
  function contextLine(d) {
    if (isZeroLane(d)) {
      return `<div class="tt-sub">reported as zero affected, despite a storm reaching the country</div>`;
    }
    if (!isScatterable(d)) return '';
    return `<div class="tt-sub">${d.affected.toLocaleString('en-US')} of ${d.pop.toLocaleString('en-US')} people</div>`;
  }
  function showTip(event, d) {
    const f = formationNow();
    if (f === 'scatter') {
      // Einfache Sprache wie im Evidence-Panel (ui/tooltip contentSimple).
      const body = isZeroLane(d)
        ? `<div class="tt-simple">The strongest storm to reach the country brought `
          + `<strong>${fmtKt(d.intensity_kt)}</strong>. Reported affected that year: <strong>0</strong>.</div>`
        : `<div class="tt-simple">At <strong>${fmtKt(d.intensity_kt)}</strong> of wind, `
          + `<strong>${fmtPct(d.affected_pc)}</strong> of the population was reported affected.</div>`;
      tip.innerHTML = `<div class="tt-title">${d.name ?? 'Unnamed storm'} · ${d.country} · ${d.year}</div>`
        + body + contextLine(d);
    } else {
      tip.innerHTML = unitTipContent(d) + (f === 'sizeRows' ? contextLine(d) : '');
    }
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
    const { x, y } = layerCtx.scales;
    if (!isPlottable(d)) return null; // kein Sturm im Radius: im Scatter unsichtbar
    // Ein fixer Radius verhindert eine unbeabsichtigte dritte Variable und bleibt beim
    // anschließenden Morph in Länderzeilen und Vollständigkeitsraster objektkonstant.
    // yOf() setzt gemeldete Nullen in die Zero-Lane statt in den Logarithmus.
    return { cx: x(d.intensity_kt), cy: y.yOf(d), r: UNIT_R, o: 1 };
  }
  function unitTarget(d, sort) {
    const [cx, cy] = sort === 'quality' ? unit.quality(d) : unit.chrono(d);
    return { cx, cy, r: UNIT_R, o: 1 };
  }
  // Nicht darstellbare Records parken unsichtbar auf ihrer Chrono-Zielposition - beim
  // Morph wachsen sie dort ein statt quer über die Bühne zu fliegen.
  const ghostPark = (d) => ({ ...unitTarget(d, 'chrono'), r: 0, o: 0 });
  function sizeRowTarget(d) {
    const p = rr.pos(d);
    return p ? { cx: p[0], cy: p[1], r: RR_R, o: 1 } : ghostPark(d);
  }

  let last = null;
  function layout(state, animate) {
    const f = state.formation ?? 'scatter';
    const key = `${f}|${state.unitSort ?? 'chrono'}`;
    if (key === last) return;
    last = key;
    const target = (d) => {
      if (f === 'unit') return unitTarget(d, state.unitSort ?? 'chrono');
      if (f === 'sizeRows') return sizeRowTarget(d);
      return scatterTarget(d) ?? ghostPark(d);
    };
    const sel = animate && !state.reducedMotion
      ? circles.transition('formation').duration(DUR_FORMATION)
          .delay((_, i) => i * 3).ease(easeCubicInOut)
      : circles;
    sel
      .attr('cx', (d) => target(d).cx)
      .attr('cy', (d) => target(d).cy)
      .attr('r', (d) => target(d).r)
      .attr('opacity', (d) => target(d).o);
    const isRowFormation = f === 'sizeRows';
    gDots.classed('fm-unit', f === 'unit').classed('fm-residual', isRowFormation);
    // Divergenz in der Zeilen-Formation: über dem Gesamtmedian = Akzent, darunter = Blau.
    // Der Median ist eine reine Lage-Referenz und behauptet nichts über den Wind.
    circles
      .classed('rr-above', (d) => isRowFormation && rr.pos(d) != null
        && Math.log10(d.affected_pc) > rr.overallMedian)
      .classed('rr-below', (d) => isRowFormation && rr.pos(d) != null
        && Math.log10(d.affected_pc) <= rr.overallMedian);
    gLabels.transition('fm-lab').duration(400)
      .attr('opacity', f === 'unit' && (state.unitSort ?? 'chrono') === 'quality' ? 1 : 0);
    gLegend.transition('fm-leg').duration(400).attr('opacity', f === 'unit' ? 1 : 0);
    gRR.transition('fm-rr').duration(400).attr('opacity', isRowFormation ? 1 : 0);
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
