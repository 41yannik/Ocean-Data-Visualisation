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
    .text('peak wind speed (kt)');

  const yLabel = g.append('text').attr('class', 'axis-label')
    .attr('transform', 'rotate(-90)')
    .attr('x', -inner.height / 2).attr('y', -44)
    .attr('text-anchor', 'middle');

  const scaleNote = g.append('text').attr('class', 'axis-scale-note')
    .attr('x', 0).attr('y', -10)
    .text('Equal steps up = 10×');

  function render(state, animate) {
    const { x, y } = layerCtx.scales;
    const tx = animate && !state.reducedMotion
      ? (sel) => sel.transition('mode').duration(DUR_MODE)
      : (sel) => sel;

    gX.call(axisBottom(x).ticks(7).tickSizeOuter(0));
    tx(gY).call(axisLeft(y.scale).tickValues(y.ticks).tickFormat(y.tickFormat).tickSizeOuter(0));
    yLabel.text(y.axisLabel);
    scaleNote.attr('aria-label', 'The vertical scale is logarithmic; each equal step represents ten times the affected share.');
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
