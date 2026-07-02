// Trend + Quantilband + generierte Annotation (fitLabel — nie getippt, Lücke L8).
// Fit-Parameter kommen ausschließlich aus meta.fits[mode] (Pipeline) — nie im Frontend fitten.
// Die fast flache Absolut-Linie ist der BEFUND ("wind alone predicts almost nothing").
import { line as d3line, area as d3area, curveMonotoneX } from 'd3';
import { DUR_MODE } from '../core/config.js';
import { fitLabel } from '../core/format.js';

const X_CLAMP = [45, 172]; // Datenbereich der Linie (Punkte: 35–170 kt)

export function createTrendLayer(gBand, gTrend, gAnnotations, layerCtx) {
  const { meta } = layerCtx;

  const bandPath = gBand.append('path').attr('class', 'trend-band');
  const medianPath = gBand.append('path').attr('class', 'trend-median');
  const linePath = gTrend.append('path').attr('class', 'trend-line');
  const label = gAnnotations.append('text').attr('class', 'trend-annotation')
    .attr('text-anchor', 'end');

  function render(state, animate) {
    const { x, y } = layerCtx.scales;
    const fit = meta.fits[state.mode];
    const band = meta.bands[state.mode];
    const tx = animate && !state.reducedMotion
      ? (sel) => sel.transition('mode').duration(DUR_MODE)
      : (sel) => sel;

    const lineGen = d3line()
      .x((d) => x(d.xv))
      .y((d) => y.scale(fit.slope * d.xv + fit.intercept));
    const linePts = [{ xv: X_CLAMP[0] }, { xv: X_CLAMP[1] }];
    tx(linePath).attr('d', lineGen(linePts));

    const areaGen = d3area()
      .x((d) => x(d.x))
      .y0((d) => y.scale(d.q25))
      .y1((d) => y.scale(d.q75))
      .curve(curveMonotoneX);
    tx(bandPath).attr('d', areaGen(band));

    const medianGen = d3line()
      .x((d) => x(d.x))
      .y((d) => y.scale(d.q50))
      .curve(curveMonotoneX);
    tx(medianPath).attr('d', medianGen(band));

    const yEnd = y.scale(fit.slope * X_CLAMP[1] + fit.intercept);
    tx(label)
      .attr('x', x(X_CLAMP[1]))
      .attr('y', Math.max(12, yEnd - 10));
    label.text(fitLabel(fit));
  }

  return {
    update(state, patch) {
      if (!patch) return render(state, false);
      if ('mode' in patch) render(state, true);
      // 'step': Sichtbarkeits-Steuerung folgt in Paket 06
    },
    destroy() {
      gBand.selectAll('*').remove();
      gTrend.selectAll('*').remove();
      gAnnotations.selectAll('*').remove();
    },
  };
}
