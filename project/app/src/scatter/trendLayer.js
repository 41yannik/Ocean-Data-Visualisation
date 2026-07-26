// Referenz-Layer des Scatters: Median-Linie, Quantilband und der Befund-Text.
//
// Bis zum Audit 2026-07 zeichnete dieser Layer eine „wind-only fit"-Gerade. Mit dem
// lokal erreichten Wind auf der x-Achse erklärt diese Gerade nichts (R² 0.015, p 0.31):
// eine gezeichnete Regressionslinie hätte einen Zusammenhang behauptet, den die Daten
// nicht hergeben. Stattdessen steht dort jetzt der MEDIAN des gemeldeten Anteils - eine
// Referenz, die nichts über den Wind behauptet - plus die ausgeschriebene Aussage
// „no detectable relationship". Alle Kennwerte stammen aus meta.fits (Pipeline),
// gerechnet wird im Frontend nichts.
import { line as d3line, area as d3area, curveMonotoneX } from 'd3';
import { DUR_MODE } from '../core/config.js';
import { isScatterable } from '../core/filters.js';

export function createTrendLayer(gBand, gTrend, gAnnotations, layerCtx) {
  const { data, meta, inner } = layerCtx;

  const bandPath = gBand.append('path').attr('class', 'trend-band');
  const bandMedian = gBand.append('path').attr('class', 'trend-median');
  const medianLine = gTrend.append('line').attr('class', 'median-line');
  const medianLabel = gAnnotations.append('text').attr('class', 'median-annotation')
    .attr('text-anchor', 'start');
  // Der fruehere "median, not a fit"-Mini-Key oben ist entfallen (Audit 2026-07): die
  // Median-Linie traegt bereits ihr eigenes Inline-Label und ist als Horizontale ohnehin
  // nicht mit einer Trendgeraden zu verwechseln - der zweite Schluessel war reiner Clutter.
  const fitNote = gAnnotations.append('text').attr('class', 'trend-fit-note')
    .attr('text-anchor', 'start');

  // Median des geplotteten Anteils - Bezugslinie ohne Wind-Behauptung.
  const medianValue = (mode) => {
    const vals = data.events.filter(isScatterable)
      .map((e) => (mode === 'absolute' ? Math.log10(e.affected + 1) : Math.log10(e.affected_pc)))
      .filter((v) => Number.isFinite(v))
      .sort((a, b) => a - b);
    if (!vals.length) return null;
    const mid = vals.length >> 1;
    return vals.length % 2 ? vals[mid] : (vals[mid - 1] + vals[mid]) / 2;
  };

  function render(state, animate) {
    const { x, y } = layerCtx.scales;
    const fit = meta.fits[state.mode];
    const band = meta.bands[state.mode];
    const tx = animate && !state.reducedMotion
      ? (sel) => sel.transition('mode').duration(DUR_MODE)
      : (sel) => sel;

    const med = medianValue(state.mode);
    if (med != null) {
      const my = y.scale(med);
      tx(medianLine).attr('x1', 0).attr('x2', inner.width).attr('y1', my).attr('y2', my);
      tx(medianLabel).attr('x', 6).attr('y', my - 6);
      medianLabel.text('median reported share');
    }

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
    tx(bandMedian).attr('d', medianGen(band));

    // Nur noch der Befund im oberen Plot-Rand, links an der Position des fruheren Keys.
    const keyX = Math.max(150, inner.width - 332);
    tx(fitNote).attr('x', keyX).attr('y', -10);
    // Der Befund selbst, ausgeschrieben: der Wind trägt praktisch nichts bei.
    const r2Pct = fit.r2 * 100;
    const r2Text = r2Pct < 1 ? '<1%' : `${r2Pct.toFixed(1).replace(/\.0$/, '')}%`;
    const pText = fit.p >= 0.001 ? fit.p.toFixed(2) : '<0.001';
    fitNote.text(`Wind explains ${r2Text} of the differences (p = ${pText})`);
  }

  // Story-Sichtbarkeit (storyFx = null → alles sichtbar); Fade via CSS-Transition.
  function visibility(state) {
    const fx = state.storyFx;
    const hideForStormFocus = fx?.hoverPoints === true
      && (state.hover?.eventId != null || state.stormPin?.sid != null);
    medianLine.classed('story-hidden', fx != null && !fx.showTrend);
    medianLabel.classed('story-hidden', (fx != null && !fx.showTrend) || hideForStormFocus);
    fitNote.classed('story-hidden', hideForStormFocus || fx?.showFitNote !== true);
    bandPath.classed('story-hidden', fx != null && !fx.showBand);
    bandMedian.classed('story-hidden', fx != null && !fx.showBand);
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
