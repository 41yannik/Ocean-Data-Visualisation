// Formations-Layer (Paket 10 Task 8): besitzt ALLE 99 Sturm-Land-Kreise (data-key = id)
// und ersetzt in der Bühnen-Gruppe 'dots2' den Punkte-Layer des Scatters.
//   formation 'scatter':      78 scatterbare Punkte an x/y der Skalen, 21 Ghosts unsichtbar (r 0).
//   formation 'residualRows': dieselben 78 Punkte als EINE Zeile je Land, x = Abstand zur
//                             wind-only line (residualRows.js) - macht „again and again" abzählbar.
//   formation 'unit':         alle 99 fliegen ins Unit-Raster (chrono bzw. quality je unitSort),
//                             Ghosts wachsen ein - Scatter-Chrome (Achsen/Trend) fadet per CSS aus.
// Objektkonstanz + benannte Transition 'formation' - der Kern von Strategie 4 (Paket 10).
import { easeCubicInOut } from 'd3';
import { isScatterable } from '../core/filters.js';
import { fmtKt, fmtPct } from '../core/format.js';
import { computeUnitLayout, unitTipContent } from './unitChart.js';
import { computeResidualRows, RR_R } from './residualRows.js';

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
  const rr = computeResidualRows(data.events, { W: inner.width, H: inner.height });

  const formationNow = () => bus.get().formation ?? 'scatter';

  const circles = gDots.selectAll('circle').data(events, (d) => d.id).join('circle')
    .attr('class', (d) => `fm-dot unit-dot unit-${unit.cat(d)}`)
    .attr('data-key', (d) => d.id)
    // Hover in ALLEN Formationen (Review 2026-07-13: auch der Step-5-Scatter erklärt sich
    // per Tooltip, wie das Evidence-Panel). Ghosts sind im Scatter r 0 → nicht hoverbar;
    // der Guard fängt den theoretischen Randfall trotzdem ab.
    .on('mouseenter', (event, d) => {
      if (formationNow() === 'scatter' && !isScatterable(d)) return;
      showTip(event, d);
    })
    .on('mousemove', positionTip)
    .on('mouseleave', hideTip);

  // Residual-Stems (Step 5): vertikale Linien von Fokus-Punkten zur gestrichelten
  // wind-only line - machen den Abstand „über der Erwartung" sichtbar, statt ihn dem
  // Auge zu überlassen. Unter den Kreisen eingehängt (insert vor dem ersten circle);
  // gleiche Fit-Mathematik wie pointsLayer.hoverExtras.
  const gStems = gDots.insert('g', 'circle').attr('class', 'fm-stems').attr('opacity', 0);

  // Block-Beschriftungen (nur Qualitäts-Sortierung der Unit-Formation)
  const gLabels = gDots.append('g').attr('class', 'uc-labels').attr('opacity', 0);
  for (const key of ['a', 'b']) {
    gLabels.append('text').attr('class', 'uc-block-label')
      .attr('x', unit.labels[key].x).attr('y', unit.labels[key].y)
      .attr('text-anchor', 'middle').text(unit.labels[key].text);
  }

  // Statische Zustandslegende - nur in der Unit-Formation sichtbar (Review-Fix: die vier
  // Zustände waren nur in Prosa/ARIA/Hover kodiert). Reused unit-* Klassen; gleichmäßig
  // über die GESAMTE Innenbreite verteilt (Review 2026-07-13, statt Block-Zentrierung);
  // Fade zusammen mit der Formation.
  const gLegend = gDots.append('g').attr('class', 'uc-legend').attr('opacity', 0);
  const legItems = [
    { cls: 'unit-solid', label: 'complete' },
    { cls: 'unit-nowind', label: 'impact, no wind' },
    { cls: 'unit-ghost', label: 'impact missing' },
    { cls: 'unit-recon', label: 'wind reconstructed' },
  ];
  const legendSlot = inner.width / legItems.length;
  legItems.forEach((it, i) => {
    const slot = gLegend.append('g').attr('transform', `translate(${i * legendSlot + 8}, 0)`);
    slot.append('circle').attr('class', `unit-dot ${it.cls}`)
      .attr('cx', 0).attr('cy', 0).attr('r', UNIT_R).style('pointer-events', 'none');
    slot.append('text').attr('class', 'uc-legend-label').attr('x', 12).attr('y', 4).text(it.label);
  });
  gLegend.attr('transform', `translate(0, ${inner.height - 6})`);

  // Zeilen-Chrome der Residual-Formation: Länder-Labels mit Above-Zähler, gestrichelte
  // Null-Linie (gleiche Dash-Sprache wie die wind-only line) und Faktor-Ticks. Kein
  // separates Achsen-Label: der Tick „wind-only line" bei 0 benennt die Referenz selbst.
  const gRR = gDots.append('g').attr('class', 'rr-chrome').attr('opacity', 0);
  gRR.append('line').attr('class', 'rr-zero')
    .attr('x1', rr.zeroX).attr('x2', rr.zeroX)
    .attr('y1', 6).attr('y2', rr.axisY - 14);
  for (const t of rr.ticks) {
    gRR.append('text').attr('class', 'rr-tick')
      .attr('x', t.x).attr('y', rr.axisY).attr('text-anchor', 'middle').text(t.label);
  }
  for (const row of rr.rows) {
    gRR.append('text').attr('class', 'rr-row-label')
      .attr('x', rr.labelX).attr('y', row.y - 1).attr('text-anchor', 'end').text(row.label);
    // Ausgeschrieben statt „8/10 above" (Review 2026-07-13: Bruch-Notation war unklar) -
    // zählt schlicht die orangen Punkte der Zeile.
    gRR.append('text').attr('class', 'rr-row-count')
      .attr('x', rr.labelX).attr('y', row.y + 13).attr('text-anchor', 'end')
      .text(`${row.nAbove} of ${row.n} hit harder`);
  }

  // Lokaler Tooltip - Wortlaut identisch zum eigenständigen Unit Chart
  const tip = document.createElement('div');
  tip.className = 'tooltip';
  document.body.appendChild(tip);
  // Faktor zur Erwartung: residual_pc ist log10, also 10^|r| = „N× über/unter der Linie".
  function factorLine(d) {
    if (!isScatterable(d)) return '';
    const res = d.residual_pc ?? 0;
    const factor = 10 ** Math.abs(res);
    const n = factor >= 10 ? Math.round(factor) : Math.round(factor * 10) / 10;
    return `<div class="tt-sub">toll ≈ ${n}× ${res > 0 ? 'above' : 'below'} the wind-only expectation</div>`;
  }
  function showTip(event, d) {
    const f = formationNow();
    if (f === 'scatter') {
      // Einfache Sprache wie im Evidence-Panel (ui/tooltip contentSimple) + Faktor-Zeile -
      // Wind & Metrik direkt am Punkt, passend zur Stem-Lesart des Steps.
      tip.innerHTML = `<div class="tt-title">${d.name ?? 'Unnamed storm'} · ${d.country} · ${d.year}</div>`
        + `<div class="tt-simple">At <strong>${fmtKt(d.intensity_kt)}</strong> of wind, `
        + `<strong>${fmtPct(d.affected_pc)}</strong> of the population was reported affected.</div>`
        + factorLine(d);
    } else {
      tip.innerHTML = unitTipContent(d) + (f === 'residualRows' ? factorLine(d) : '');
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
    const { x, y, r } = layerCtx.scales;
    if (!isScatterable(d)) return null; // Ghost: im Scatter unsichtbar
    return { cx: x(d.intensity_kt), cy: y.scale(y.value(d)), r: r(d.deaths ?? 0), o: 1 };
  }
  function unitTarget(d, sort) {
    const [cx, cy] = sort === 'quality' ? unit.quality(d) : unit.chrono(d);
    return { cx, cy, r: UNIT_R, o: 1 };
  }
  // Ghosts parken unsichtbar auf ihrer Chrono-Zielposition - beim Morph wachsen
  // sie dort ein statt quer über die Bühne zu fliegen (gilt für Scatter UND Residual).
  const ghostPark = (d) => ({ ...unitTarget(d, 'chrono'), r: 0, o: 0 });
  function residualTarget(d) {
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
      if (f === 'residualRows') return residualTarget(d);
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
    gDots.classed('fm-unit', f === 'unit').classed('fm-residual', f === 'residualRows');
    // Divergenz nur in der Residual-Formation: über der Linie = Akzent, darunter = Blau.
    circles
      .classed('rr-above', (d) => f === 'residualRows' && rr.pos(d) != null && (d.residual_pc ?? 0) > 0)
      .classed('rr-below', (d) => f === 'residualRows' && rr.pos(d) != null && (d.residual_pc ?? 0) <= 0);
    gLabels.transition('fm-lab').duration(400)
      .attr('opacity', f === 'unit' && (state.unitSort ?? 'chrono') === 'quality' ? 1 : 0);
    gLegend.transition('fm-leg').duration(400).attr('opacity', f === 'unit' ? 1 : 0);
    gRR.transition('fm-rr').duration(400).attr('opacity', f === 'residualRows' ? 1 : 0);
  }

  // Stems nur in der Scatter-Formation, wenn der Step sie anfordert (storyFx.residualStems)
  // und Fokus-Events gesetzt sind; beim Morph in eine andere Formation faden sie aus.
  function stems(state) {
    const fx2 = state.storyFx;
    const fit = layerCtx.meta?.fits?.[state.mode];
    const show = (state.formation ?? 'scatter') === 'scatter'
      && !!fx2?.residualStems && fx2?.focusEventIds != null && fit != null;
    const focus = show
      ? fx2.focusEventIds.map((id) => data.index.byId.get(id)).filter((e) => e && isScatterable(e))
      : [];
    const { x, y } = layerCtx.scales;
    gStems.selectAll('line').data(focus, (e) => e.id).join('line')
      .attr('class', 'residual-line')
      .attr('x1', (e) => x(e.intensity_kt)).attr('x2', (e) => x(e.intensity_kt))
      .attr('y1', (e) => y.scale(y.value(e)))
      .attr('y2', (e) => y.scale(fit.slope * e.intensity_kt + fit.intercept));
    gStems.transition('fm-stems').duration(state.reducedMotion ? 0 : 400)
      .attr('opacity', focus.length ? 1 : 0);
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
      if (!patch) { layout(state, false); classes(state); stems(state); return; }
      if ('formation' in patch || 'unitSort' in patch) layout(state, true);
      if ('formation' in patch || 'storyFx' in patch) { classes(state); stems(state); }
    },
    destroy() { tip.remove(); gDots.selectAll('*').remove(); },
  };
}
