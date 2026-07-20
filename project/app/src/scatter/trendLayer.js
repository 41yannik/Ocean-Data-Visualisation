// Trend + Quantilband + generierte Annotation (fitLabel - nie getippt, Lücke L8).
// Fit-Parameter kommen ausschließlich aus meta.fits[mode] (Pipeline) - nie im Frontend fitten.
// Die geringe erklärte Variation ist der Befund; die sichtbare Steigung wird nicht
// als „flach" überinterpretiert.
import { line as d3line, area as d3area, curveMonotoneX } from 'd3';
import { DUR_MODE } from '../core/config.js';

const X_CLAMP = [45, 172]; // Datenbereich der Linie (Punkte: 35–170 kt)

export function createTrendLayer(gBand, gTrend, gAnnotations, layerCtx) {
  const { meta, inner } = layerCtx;

  const bandPath = gBand.append('path').attr('class', 'trend-band');
  const medianPath = gBand.append('path').attr('class', 'trend-median');
  const linePath = gTrend.append('path').attr('class', 'trend-line');
  const keyLine = gAnnotations.append('line').attr('class', 'trend-key-line');
  const label = gAnnotations.append('text').attr('class', 'trend-annotation')
    .attr('text-anchor', 'start');
  const fitNote = gAnnotations.append('text').attr('class', 'trend-fit-note')
    .attr('text-anchor', 'start');

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

    // Feste Schlüsselzeile im oberen Plot-Rand statt Direktlabel im Punktefeld.
    // Sie bleibt unabhängig von Filter/Punktverteilung garantiert kollisionsfrei.
    const keyX = Math.max(150, inner.width - 292);
    tx(keyLine)
      .attr('x1', keyX).attr('x2', keyX + 27)
      .attr('y1', -14).attr('y2', -14);
    tx(label)
      .attr('x', keyX + 35)
      .attr('y', -10);
    label.text('wind-only fit');
    tx(fitNote)
      .attr('x', keyX + 116)
      .attr('y', -10);
    const r2Pct = (fit.r2 * 100).toFixed(1).replace(/\.0$/, '');
    fitNote.text(`About ${r2Pct}% of variation captured`);
  }

  // Story-Sichtbarkeit (storyFx = null → alles sichtbar); Fade via CSS-Transition.
  function visibility(state) {
    const fx = state.storyFx;
    const hideForStormFocus = fx?.hoverPoints === true
      && (state.hover?.eventId != null || state.stormPin?.sid != null);
    linePath.classed('story-hidden', fx != null && !fx.showTrend);
    // Reveal-Step: die Abweichungen von der Linie tragen die Hauptaussage.
    linePath.classed('trend-emphasis', fx?.residualReveal === true);
    // Das Fit-Label (R²/p) erscheint mit dem Band ODER explizit via showFitLabel
    // (Evidence-Panel: Linie + Label ohne Band).
    const hideFitKey = hideForStormFocus || (fx != null && !fx.showBand && !fx.showFitLabel);
    keyLine.classed('story-hidden', hideFitKey);
    label.classed('story-hidden', hideFitKey);
    fitNote.classed('story-hidden', hideForStormFocus || fx?.showFitNote !== true);
    bandPath.classed('story-hidden', fx != null && !fx.showBand);
    medianPath.classed('story-hidden', fx != null && !fx.showBand);
  }

  return {
    update(state, patch) {
      if (!patch) { render(state, false); visibility(state); return; }
      if ('mode' in patch) render(state, true);
      if ('storyFx' in patch || 'hover' in patch || 'stormPin' in patch) visibility(state);
    },
    destroy() {
      gBand.selectAll('*').remove();
      gTrend.selectAll('*').remove();
      gAnnotations.selectAll('*').remove();
    },
  };
}
