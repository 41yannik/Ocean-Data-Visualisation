// Evidence-Lab-Kartenlayer „Human toll": ein Kreis je Land am Centroid, Fläche =
// Summe der gemeldeten Betroffenen (absolute) bzw. Median des Betroffenenanteils
// (perCapita). Schließt die Lücke, dass die Geografie-Ansicht nur die Hazard-Seite
// (Tracks/Hot zones) zeigt - hier landet erstmals der Toll auf der Karte.
// Muster wie trackHeatmap.js: pure Aggregat-Funktion (testbar) + Komponente mit
// eigenem SVG, Tooltip, textSet-Hover und selectedEventIds-Klick.
import { select, scaleSqrt, median as d3median } from 'd3';
import { makePacificProjection, makeGeoPath } from '../core/scales.js';
import { MAP } from '../core/config.js';
import { matchesFilters } from '../core/filters.js';
import { fmtInt, fmtPct } from '../core/format.js';

export function buildCountryToll(events, { filters = null, mode = 'perCapita', activeYear = null } = {}) {
  const visible = events.filter((event) => (!filters || matchesFilters(event, filters))
    && (activeYear == null || event.year === activeYear));
  const grouped = new Map();
  for (const event of visible) {
    if (!grouped.has(event.iso3)) grouped.set(event.iso3, {
      iso3: event.iso3, country: event.country, events: [],
    });
    grouped.get(event.iso3).events.push(event);
  }
  return [...grouped.values()].map((row) => {
    const reported = row.events.filter((event) => event.affected != null);
    const affectedSum = reported.reduce((sum, event) => sum + event.affected, 0);
    const medianShare = reported.length ? d3median(reported, (event) => event.affected_pc ?? 0) : 0;
    return {
      iso3: row.iso3,
      country: row.country,
      n: row.events.length,
      reported: reported.length,
      affectedSum,
      medianShare,
      value: mode === 'absolute' ? affectedSum : medianShare,
      unreported: reported.length === 0,
      eventIds: row.events.map((event) => event.id),
    };
  }).sort((a, b) => b.value - a.value); // große Kreise zuerst zeichnen → kleine bleiben klickbar
}

export function createTollMap(container, ctx) {
  const { data, meta, bus } = ctx;
  const projection = makePacificProjection(MAP.width, MAP.height);
  const path = makeGeoPath(projection);

  // Radius-Maximum je Modus aus dem VOLLEN Datensatz (wie maxByMetric der Heatmap):
  // Filter dürfen die Größenzuordnung nicht umskalieren.
  const fullByMode = {
    absolute: buildCountryToll(data.events, { mode: 'absolute' }),
    perCapita: buildCountryToll(data.events, { mode: 'perCapita' }),
  };
  const rScale = {
    absolute: scaleSqrt([0, Math.max(1, ...fullByMode.absolute.map((row) => row.value))], [0, 42]),
    perCapita: scaleSqrt([0, Math.max(0.01, ...fullByMode.perCapita.map((row) => row.value))], [0, 42]),
  };

  const svg = select(container).append('svg').attr('viewBox', `0 0 ${MAP.width} ${MAP.height}`)
    .attr('role', 'img')
    .attr('aria-label', 'Pacific map of the reported human toll by country; circle area shows '
      + 'total people affected or the median share of population affected, hollow rings mark '
      + 'countries without reported impacts');
  svg.append('path').datum(data.land).attr('class', 'land').attr('d', path);
  const circlesGroup = svg.append('g').attr('class', 'toll-circles');
  const legend = svg.append('g').attr('class', 'toll-legend')
    .attr('transform', `translate(${MAP.width - 250},${MAP.height - 30})`);
  const tip = document.createElement('div'); tip.className = 'tooltip'; document.body.appendChild(tip);
  let circles = null;

  const moveTip = (event) => {
    const box = tip.getBoundingClientRect(); let x = event.clientX + 14; let y = event.clientY + 14;
    if (x + box.width > innerWidth - 8) x = event.clientX - box.width - 14;
    if (y + box.height > innerHeight - 8) y = event.clientY - box.height - 14;
    tip.style.left = `${Math.max(8, x)}px`; tip.style.top = `${Math.max(8, y)}px`;
  };

  function render(state) {
    const mode = state.mode;
    const rows = buildCountryToll(data.events, {
      filters: state.filters, mode, activeYear: state.activeYear,
    }).filter((row) => meta.centroids[row.iso3]);
    const r = rScale[mode] ?? rScale.perCapita;

    circles = circlesGroup.selectAll('circle').data(rows, (row) => row.iso3).join('circle')
      .attr('class', (row) => `toll-circle${row.unreported ? ' unreported' : ''}`)
      .attr('data-iso3', (row) => row.iso3)
      .attr('cx', (row) => projection(meta.centroids[row.iso3])[0])
      .attr('cy', (row) => projection(meta.centroids[row.iso3])[1])
      .attr('r', (row) => (row.unreported ? 6 : Math.max(3, r(row.value))))
      .attr('tabindex', 0)
      .attr('aria-label', (row) => `${row.country}: ${row.unreported
        ? `${row.n} storm record${row.n === 1 ? '' : 's'}, human impact not reported`
        : `${fmtInt(row.affectedSum)} people affected across ${row.n} storm record${row.n === 1 ? '' : 's'}, median ${fmtPct(row.medianShare)} of population`}`)
      .on('mouseenter focus', (event, row) => {
        const impact = row.unreported
          ? 'Human impact not reported'
          : (mode === 'absolute'
            ? `<strong>${fmtInt(row.affectedSum)}</strong> affected`
            : `median <strong>${fmtPct(row.medianShare)}</strong> of population`);
        tip.innerHTML = `<div class="tt-title">${row.country}</div>`
          + `<div class="tt-sub">${row.n} storm record${row.n === 1 ? '' : 's'} · ${row.reported} with reported impact</div>`
          + `<div class="tt-sub">${impact}</div>`;
        tip.classList.add('visible'); if ('clientX' in event) moveTip(event);
        bus.set({ textSet: { ids: new Set(row.eventIds) } });
      })
      .on('mousemove', moveTip)
      .on('mouseleave blur', () => { tip.classList.remove('visible'); bus.set({ textSet: null }); })
      .on('click', (_, row) => bus.set({ selectedEventIds: new Set(row.eventIds) }))
      .on('keydown', (event, row) => {
        if (event.key === 'Enter') bus.set({ selectedEventIds: new Set(row.eventIds) });
      });

    legend.selectAll('*').remove();
    legend.append('text').attr('class', 'heat-legend-label').attr('y', -34)
      .text(mode === 'absolute' ? 'circle area = people affected' : 'circle area = median affected share');
    const refs = mode === 'absolute' ? [1000, 100000] : [0.01, 0.3];
    let refX = 8;
    for (const value of refs) {
      const radius = Math.max(3, r(value));
      legend.append('circle').attr('class', 'toll-ref')
        .attr('cx', refX + radius).attr('cy', -8 - radius).attr('r', radius);
      refX += radius * 2 + 14;
    }
    legend.append('circle').attr('class', 'toll-circle unreported')
      .attr('cx', refX + 6).attr('cy', -14).attr('r', 6);
    legend.append('text').attr('class', 'heat-legend-label')
      .attr('x', refX + 18).attr('y', -10).text('impact not reported');
    applyClasses(state);
  }

  function applyClasses(state) {
    if (!circles) return;
    const active = state.selectedEventIds ?? state.textSet?.ids ?? null;
    circles.classed('hl', (row) => (active ? row.eventIds.some((id) => active.has(id)) : false))
      .classed('dim', (row) => (active ? !row.eventIds.some((id) => active.has(id)) : false));
  }

  return {
    update(state, patch) {
      if (!patch || 'filters' in patch || 'mode' in patch || 'activeYear' in patch) render(state);
      else if ('selectedEventIds' in patch || 'textSet' in patch || 'hover' in patch) applyClasses(state);
    },
    destroy() { tip.remove(); svg.remove(); },
  };
}
