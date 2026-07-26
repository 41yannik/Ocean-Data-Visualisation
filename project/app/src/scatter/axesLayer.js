// Achsen + Labels.
import { axisBottom, axisLeft } from 'd3';
import { DUR_MODE } from '../core/config.js';

export function createAxesLayer(g, layerCtx) {
  const { inner } = layerCtx;

  const gX = g.append('g').attr('class', 'axis axis-x').attr('transform', `translate(0,${inner.height})`);
  const gY = g.append('g').attr('class', 'axis axis-y');

  g.append('text').attr('class', 'axis-label')
    .attr('x', inner.width / 2).attr('y', inner.height + 40)
    .attr('text-anchor', 'middle')
    // Seit Audit 2026-07: lokal erreichter Wind, nicht der Lifetime-Peak des Sturms.
    // Richtungshinweis "stronger ->" macht ohne Umweg klar, dass die x-Achse Windstaerke ist.
    .text('wind reaching the country (kt) · stronger →');

  // y=-62 (statt -44): folgt dem groesseren linken Rand, damit der Titel ausserhalb der
  // breitesten Tick-Labels ("0.0001%") sitzt und nicht mehr mit ihnen kollidiert.
  const yLabel = g.append('text').attr('class', 'axis-label')
    .attr('transform', 'rotate(-90)')
    .attr('x', -inner.height / 2).attr('y', -62)
    .attr('text-anchor', 'middle');

  const scaleNote = g.append('text').attr('class', 'axis-scale-note')
    .attr('x', 0).attr('y', -10)
    .text('Equal steps up = 10×');

  // Zero-Lane: eigenes Band unter der Log-Achse für die ausdrücklich als 0 gemeldeten
  // Land-Jahre. Trennlinie + Label machen den Bruch in der Skala sichtbar, statt die
  // Nullen stillschweigend an den Achsenboden zu klemmen.
  const gZero = g.append('g').attr('class', 'zero-lane');
  const zeroRule = gZero.append('line').attr('class', 'zero-lane__rule');
  const zeroLabel = gZero.append('text').attr('class', 'zero-lane__label').attr('x', -8)
    .attr('text-anchor', 'end').attr('dominant-baseline', 'middle');

  function render(state, animate) {
    const { x, y } = layerCtx.scales;
    const tx = animate && !state.reducedMotion
      ? (sel) => sel.transition('mode').duration(DUR_MODE)
      : (sel) => sel;

    gX.call(axisBottom(x).ticks(7).tickSizeOuter(0));
    // Auf der vollen Log-Achse (bis zu 8 Dekaden, weil ein paar Extremwerte den Boden
    // setzen) liest eine Beschriftung pro Dekade als Wand aus kleinteiligen Prozent-
    // zahlen. Nur jede zweite Dekade bekommt Text, dazwischen bleibt ein gedimmter
    // Tick-Strich - kein Wert verschwindet aus der Skala, nur aus dem Textlayer.
    // Start immer von der obersten (wichtigsten) Dekade, damit 100 % immer beschriftet ist.
    const topTick = y.ticks.at(-1);
    const isMajorTick = (v) => (topTick - v) % 2 === 0;
    tx(gY).call(axisLeft(y.scale).tickValues(y.ticks)
      .tickFormat((v) => (isMajorTick(v) ? y.tickFormat(v) : ''))
      .tickSizeOuter(0));
    gY.selectAll('.tick').classed('tick--minor', (v) => !isMajorTick(v));
    yLabel.text(y.axisLabel);
    scaleNote.attr('aria-label', 'The vertical scale is logarithmic; each equal step represents ten times the affected share. Country-years reported as exactly zero sit in a separate band below the scale.');

    gZero.style('display', y.hasZeroLane ? null : 'none');
    if (y.hasZeroLane) {
      // Auf die Bandoberkante, nicht in die Mitte: sonst ragen gedodgte Nullen über
      // die Linie und sähen aus wie sehr kleine positive Werte.
      const gap = y.bandTop;
      zeroRule.attr('x1', 0).attr('x2', inner.width).attr('y1', gap).attr('y2', gap);
      zeroLabel.attr('y', y.zeroY).text(y.zeroLabel);
    }
  }

  return {
    update(state, patch) {
      if (!patch) return render(state, false);
      if ('mode' in patch) render(state, true);
      else if ('filters' in patch || 'storyFx' in patch) render(state, false);
    },
    destroy() { g.selectAll('*').remove(); },
  };
}
