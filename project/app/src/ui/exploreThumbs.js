// Mini previews inside the evidence-lab tab buttons: simplified renderings of
// the three views (scatter + trend hint, country dot plot, track map) that
// follow the shared filters. No axes, no text nodes, no pointer interaction -
// the surrounding tab button owns click and keyboard behavior.
import { select, scaleLinear } from 'd3';
import { isScatterable, matchesFilters } from '../core/filters.js';
import { makeYScale, makePacificProjection, makeGeoPath } from '../core/scales.js';
import { buildCountryRecurrence } from './countryRecurrence.js';
import { buildResidualLab } from './residualLab.js';

const THUMB = { w: 120, h: 68, pad: 6 };
const THUMB_ROWS = 6;      // top countries shown in the mini dot plot
const TREND_X = [45, 172]; // same clamp as scatter/trendLayer.js

export function createExploreThumbs(sectionEl, ctx) {
  const { data, meta } = ctx;

  const mount = (view) => select(sectionEl.querySelector(`[data-thumb="${view}"]`))
    .append('svg')
    .attr('viewBox', `0 0 ${THUMB.w} ${THUMB.h}`)
    .attr('aria-hidden', 'true')
    .attr('focusable', 'false');
  const scatterSvg = mount('outliers');
  const residualSvg = mount('residuals');
  const dotsSvg = mount('countries');
  const mapSvg = mount('geography');

  const xWind = scaleLinear().domain([30, 175]).range([THUMB.pad, THUMB.w - THUMB.pad]);
  const years = data.events.map((event) => event.year);
  const xYear = scaleLinear().domain([Math.min(...years), Math.max(...years)])
    .range([THUMB.pad, THUMB.w - THUMB.pad]);

  const scatterDots = scatterSvg.append('g');
  const trendLine = scatterSvg.append('line').attr('class', 'thumb-trend');

  // Map geometry once (land + all tracks); filters only toggle visibility.
  const projection = makePacificProjection(THUMB.w, THUMB.h, 4);
  const geoPath = makeGeoPath(projection);
  mapSvg.append('path').datum(data.land).attr('class', 'land').attr('d', geoPath);
  const storms = Object.entries(data.tracks).map(([sid, pts]) => ({
    sid,
    events: data.index.bySid.get(sid) ?? [],
    lineString: { type: 'LineString', coordinates: pts.map((p) => [p[0], p[1]]) },
  }));
  const trackPaths = mapSvg.append('g').selectAll('path').data(storms, (d) => d.sid)
    .join('path')
    .attr('class', 'thumb-track')
    .attr('stroke-width', 0.7)
    .attr('d', (d) => geoPath(d.lineString));

  function renderScatter(state) {
    const y = makeYScale(state.mode, THUMB.h - 2 * THUMB.pad, data.events);
    const points = data.events.filter(isScatterable)
      .filter((event) => matchesFilters(event, state.filters));
    scatterDots.selectAll('circle').data(points, (event) => event.id).join('circle')
      .attr('class', 'thumb-dot')
      .attr('r', 1.6)
      .attr('cx', (event) => xWind(event.intensity_kt))
      .attr('cy', (event) => THUMB.pad + y.scale(y.value(event)));
    const fit = meta.fits[state.mode];
    trendLine
      .attr('x1', xWind(TREND_X[0]))
      .attr('y1', THUMB.pad + y.scale(fit.slope * TREND_X[0] + fit.intercept))
      .attr('x2', xWind(TREND_X[1]))
      .attr('y2', THUMB.pad + y.scale(fit.slope * TREND_X[1] + fit.intercept));
  }

  // Residual-Mini: Top-Zeilen aus derselben Build-Funktion wie die große Ansicht,
  // Punkte links/rechts der Null-Linie. Muss auch auf 'mode' reagieren (Feld-Wechsel).
  const xRes = scaleLinear().domain([-2.8, 2.0]).range([THUMB.pad, THUMB.w - THUMB.pad]);
  const residualZero = residualSvg.append('line').attr('class', 'thumb-zero')
    .attr('x1', xRes(0)).attr('x2', xRes(0)).attr('y1', THUMB.pad).attr('y2', THUMB.h - THUMB.pad);
  const residualDots = residualSvg.append('g');

  function renderResiduals(state) {
    const { rows, field } = buildResidualLab(data.events, { filters: state.filters, mode: state.mode });
    const top = rows.slice(0, THUMB_ROWS);
    const rowH = (THUMB.h - 2 * THUMB.pad) / THUMB_ROWS;
    const marks = top.flatMap((row, index) => row.events.map((event) => ({
      event, value: event[field], cy: THUMB.pad + index * rowH + rowH / 2,
    })));
    residualDots.selectAll('circle').data(marks, (d) => d.event.id).join('circle')
      .attr('class', (d) => `thumb-dot${d.value > 0 ? ' thumb-dot--above' : ''}`)
      .attr('r', 1.6)
      .attr('cx', (d) => xRes(d.value))
      .attr('cy', (d) => d.cy);
    residualZero.raise();
  }

  function renderDots(state) {
    const rows = buildCountryRecurrence(data.events, state.filters).slice(0, THUMB_ROWS);
    const rowH = (THUMB.h - 2 * THUMB.pad) / THUMB_ROWS;
    const marks = rows.flatMap((row, index) => row.events.map((event) => ({
      event, cy: THUMB.pad + index * rowH + rowH / 2,
    })));
    dotsSvg.selectAll('circle').data(marks, (d) => d.event.id).join('circle')
      .attr('class', (d) => `thumb-dot${d.event.affected == null ? ' thumb-dot--missing' : ''}`)
      .attr('r', 2)
      .attr('cx', (d) => xYear(d.event.year))
      .attr('cy', (d) => d.cy);
  }

  function renderMap(state) {
    trackPaths.classed('off', (d) => !d.events.some((event) => matchesFilters(event, state.filters)));
  }

  return {
    update(state, patch) {
      if (!patch) { renderScatter(state); renderResiduals(state); renderDots(state); renderMap(state); return; }
      if ('filters' in patch || 'mode' in patch) { renderScatter(state); renderResiduals(state); }
      if ('filters' in patch) { renderDots(state); renderMap(state); }
    },
    destroy() { scatterSvg.remove(); residualSvg.remove(); dotsSvg.remove(); mapSvg.remove(); },
  };
}
