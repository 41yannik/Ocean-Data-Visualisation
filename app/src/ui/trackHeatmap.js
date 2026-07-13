import { select, scaleSequentialSqrt, interpolateLab } from 'd3';
import { makePacificProjection, makeGeoPath } from '../core/scales.js';
import { COLORS, MAP } from '../core/config.js';
import { matchesFilters } from '../core/filters.js';
import { fmtKt } from '../core/format.js';

const CELL = 12;

export function aggregateHotZoneCells(storms, filters = null, metric = 'frequency', activeYear = null) {
  const aggregated = new Map();
  for (const storm of storms) {
    const visibleEvents = storm.events.filter((event) => (!filters || matchesFilters(event, filters))
      && (activeYear == null || event.year === activeYear));
    if (!visibleEvents.length) continue;
    for (const [idx, wind] of storm.cells) {
      if (!aggregated.has(idx)) aggregated.set(idx, {
        idx, count: 0, windSum: 0, maxWind: 0, sids: new Set(), events: new Map(),
      });
      const cell = aggregated.get(idx);
      cell.count += 1; cell.windSum += wind; cell.maxWind = Math.max(cell.maxWind, wind); cell.sids.add(storm.sid);
      visibleEvents.forEach((event) => cell.events.set(event.id, event));
    }
  }
  return [...aggregated.values()].map((cell) => {
    const averageWind = cell.count ? cell.windSum / cell.count : 0;
    return { ...cell, averageWind, value: metric === 'averageWind' ? averageWind : cell.count };
  });
}

export function createTrackHeatmap(container, ctx) {
  const { data, bus } = ctx;
  const projection = makePacificProjection(MAP.width, MAP.height);
  const path = makeGeoPath(projection); const cols = Math.ceil(MAP.width / CELL);
  const cellIdx = (x, y) => (x < 0 || y < 0 || x >= MAP.width || y >= MAP.height
    ? null : Math.floor(y / CELL) * cols + Math.floor(x / CELL));
  const storms = Object.entries(data.tracks).map(([sid, points]) => {
    const cells = new Map(); let previous = null;
    const add = (x, y, wind) => { const idx = cellIdx(x, y); if (idx != null) cells.set(idx, Math.max(cells.get(idx) ?? 0, wind)); };
    for (const point of points) {
      const projected = projection([point[0], point[1]]); const wind = Math.max(point[2] ?? 0, 0);
      if (!projected) { previous = null; continue; }
      if (previous) {
        const samples = Math.max(1, Math.ceil(Math.hypot(projected[0] - previous.x, projected[1] - previous.y) / (CELL / 2)));
        for (let index = 1; index <= samples; index++) add(
          previous.x + (projected[0] - previous.x) * index / samples,
          previous.y + (projected[1] - previous.y) * index / samples,
          previous.wind + (wind - previous.wind) * index / samples,
        );
      } else add(projected[0], projected[1], wind);
      previous = { x: projected[0], y: projected[1], wind };
    }
    return { sid, events: data.index.bySid.get(sid) ?? [], cells };
  });
  const maxByMetric = {
    frequency: Math.max(1, ...aggregateHotZoneCells(storms, null, 'frequency').map((cell) => cell.value)),
    averageWind: Math.max(1, ...aggregateHotZoneCells(storms, null, 'averageWind').map((cell) => cell.value)),
  };

  const svg = select(container).append('svg').attr('viewBox', `0 0 ${MAP.width} ${MAP.height}`)
    .attr('role', 'img').attr('aria-label', 'Pacific hot-zone map; switch between storm frequency and average wind along tracks');
  svg.append('path').datum(data.land).attr('class', 'land').attr('d', path);
  const cellsGroup = svg.append('g').attr('class', 'hot-zone-cells');
  const legend = svg.append('g').attr('class', 'hot-zone-legend').attr('transform', `translate(${MAP.width - 250},${MAP.height - 28})`);
  const tip = document.createElement('div'); tip.className = 'tooltip'; document.body.appendChild(tip);
  let cells = null;
  const moveTip = (event) => {
    const box = tip.getBoundingClientRect(); let x = event.clientX + 14; let y = event.clientY + 14;
    if (x + box.width > innerWidth - 8) x = event.clientX - box.width - 14;
    if (y + box.height > innerHeight - 8) y = event.clientY - box.height - 14;
    tip.style.left = `${Math.max(8, x)}px`; tip.style.top = `${Math.max(8, y)}px`;
  };
  function render(state) {
    const metric = state.hotZoneMetric;
    const values = aggregateHotZoneCells(storms, state.filters, metric, state.activeYear);
    const color = scaleSequentialSqrt([0, maxByMetric[metric]], interpolateLab(COLORS.bg, COLORS.point));
    cells = cellsGroup.selectAll('rect').data(values, (cell) => cell.idx).join('rect')
      .attr('class', 'heat-cell').attr('x', (cell) => cell.idx % cols * CELL)
      .attr('y', (cell) => Math.floor(cell.idx / cols) * CELL).attr('width', CELL).attr('height', CELL)
      .attr('fill', (cell) => color(cell.value)).attr('tabindex', 0)
      .attr('aria-label', (cell) => `${cell.count} storms, average wind ${fmtKt(cell.averageWind)}, maximum wind ${fmtKt(cell.maxWind)}`)
      .on('mouseenter focus', (event, cell) => {
        tip.innerHTML = `<div class="tt-title">${cell.count} storm${cell.count === 1 ? '' : 's'} crossed here</div><div class="tt-sub">Average wind: <strong>${fmtKt(cell.averageWind)}</strong></div><div class="tt-sub">Strongest wind: <strong>${fmtKt(cell.maxWind)}</strong></div>`;
        tip.classList.add('visible'); if ('clientX' in event) moveTip(event);
        bus.set({ textSet: { ids: new Set(cell.events.keys()) } });
      }).on('mousemove', moveTip)
      .on('mouseleave blur', () => { tip.classList.remove('visible'); bus.set({ textSet: null }); })
      .on('click', (_, cell) => bus.set({ selectedEventIds: new Set(cell.events.keys()) }));
    legend.selectAll('*').remove();
    legend.append('text').attr('class', 'heat-legend-label').attr('y', -7)
      .text(metric === 'frequency' ? 'fewer storms' : 'lower average wind');
    legend.append('rect').attr('width', 210).attr('height', 8).attr('fill', `linear-gradient(90deg,${COLORS.bg},${COLORS.point})`);
    // SVG rect cannot use a CSS linear-gradient as fill; stepped swatches remain deterministic.
    legend.select('rect').remove();
    for (let index = 0; index < 12; index++) legend.append('rect').attr('x', index * 17.5).attr('width', 18).attr('height', 8)
      .attr('fill', color(maxByMetric[metric] * index / 11));
    legend.append('text').attr('class', 'heat-legend-label').attr('x', 210).attr('y', -7).attr('text-anchor', 'end')
      .text(metric === 'frequency' ? 'more storms' : 'higher average wind');
    applyClasses(state);
  }
  function applyClasses(state) {
    if (!cells) return;
    const active = state.selectedEventIds ?? state.textSet?.ids ?? null;
    cells.classed('hl', (cell) => active ? [...cell.events.keys()].some((id) => active.has(id)) : false)
      .classed('dim', (cell) => active ? ![...cell.events.keys()].some((id) => active.has(id)) : false);
  }
  return {
    update(state, patch) {
      if (!patch || 'filters' in patch || 'activeYear' in patch || 'hotZoneMetric' in patch) render(state);
      else if ('selectedEventIds' in patch || 'textSet' in patch || 'hover' in patch) applyClasses(state);
    },
    destroy() { tip.remove(); svg.remove(); },
  };
}
