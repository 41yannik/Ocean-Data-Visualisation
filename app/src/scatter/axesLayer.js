// Achsen + Labels + dynamische n-Caption (Missing-Data-Ehrlichkeit, Lücke L2/L3).
import { axisBottom, axisLeft } from 'd3';
import { DUR_MODE } from '../core/config.js';
import { matchesFilters, isScatterable } from '../core/filters.js';

export function createAxesLayer(g, layerCtx) {
  const { inner, data } = layerCtx;

  const gX = g.append('g').attr('class', 'axis axis-x').attr('transform', `translate(0,${inner.height})`);
  const gY = g.append('g').attr('class', 'axis axis-y');

  g.append('text').attr('class', 'axis-label')
    .attr('x', inner.width / 2).attr('y', inner.height + 40)
    .attr('text-anchor', 'middle')
    .text('max. sustained wind (USA agency, kt)');

  const yLabel = g.append('text').attr('class', 'axis-label')
    .attr('transform', 'rotate(-90)')
    .attr('x', -inner.height / 2).attr('y', -44)
    .attr('text-anchor', 'middle');

  const caption = g.append('text').attr('class', 'n-caption')
    .attr('x', 0).attr('y', inner.height + 62);

  function render(state, animate) {
    const { x, y } = layerCtx.scales;
    const tx = animate && !state.reducedMotion
      ? (sel) => sel.transition('mode').duration(DUR_MODE)
      : (sel) => sel;

    gX.call(axisBottom(x).ticks(7).tickSizeOuter(0));
    tx(gY).call(axisLeft(y.scale).tickValues(y.ticks).tickFormat(y.tickFormat).tickSizeOuter(0));
    yLabel.text(y.axisLabel);

    const filtered = data.events.filter((e) => matchesFilters(e, state.filters));
    const shown = filtered.filter(isScatterable).length;
    const total = filtered.length;
    const rug = filtered.filter((e) => !isScatterable(e) && e.intensity_kt != null).length;
    const noWind = total - shown - rug;
    // "(ticks)" nur erwähnen, wenn das Rug gerade sichtbar ist (storyFx-Konvention wie rugLayer)
    const rugVisible = state.storyFx == null || state.storyFx.showRug === true;
    caption.text(`n = ${shown} of ${total} storm-country pairs shown`
      + (rug ? ` · ${rug} with wind but no impact count${rugVisible ? ' (ticks)' : ''}` : '')
      + (noWind ? ` · ${noWind} without wind data` : ''));
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
