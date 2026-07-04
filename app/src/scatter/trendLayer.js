// Trend + Quantilband + generierte Annotation (fitLabel - nie getippt, Lücke L8).
// Fit-Parameter kommen ausschließlich aus meta.fits[mode] (Pipeline) - nie im Frontend fitten.
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

  // Story-Sichtbarkeit (storyFx = null → alles sichtbar); Fade via CSS-Transition.
  function visibility(state) {
    const fx = state.storyFx;
    linePath.classed('story-hidden', fx != null && !fx.showTrend);
    // Reveal-Step (Step 4): die flache Linie trägt die Hauptaussage → präsenter zeichnen.
    linePath.classed('trend-emphasis', fx?.residualReveal === true);
    // Das Fit-Label (R²/p) ist die Pointe des Reveal-Steps - es erscheint erst mit dem Band,
    // nicht schon in Step 3, der nur die Erwartungslinie zeigt.
    label.classed('story-hidden', fx != null && !fx.showBand);
    bandPath.classed('story-hidden', fx != null && !fx.showBand);
    medianPath.classed('story-hidden', fx != null && !fx.showBand);
  }

  return {
    update(state, patch) {
      if (!patch) { render(state, false); visibility(state); return; }
      if ('mode' in patch) render(state, true);
      if ('storyFx' in patch) visibility(state);
    },
    destroy() {
      gBand.selectAll('*').remove();
      gTrend.selectAll('*').remove();
      gAnnotations.selectAll('*').remove();
    },
  };
}
