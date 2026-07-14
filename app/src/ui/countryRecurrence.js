// Evidence-Lab-Ansicht „Repeated country impacts": eine Zeile je Land, Punkte je
// Sturm-Land-Datensatz. Gefüllt = Betroffenheit gemeldet, hohl = unbekannt.
import { select, scaleLinear, scaleSequentialSqrt, interpolateLab } from 'd3';
import { matchesFilters } from '../core/filters.js';
import { COLORS } from '../core/config.js';
import { fmtInt, fmtPct } from '../core/format.js';

export function buildCountryRecurrence(events, filters = null) {
  const visible = filters ? events.filter((event) => matchesFilters(event, filters)) : [...events];
  const grouped = new Map();
  for (const event of visible) {
    if (!grouped.has(event.iso3)) grouped.set(event.iso3, {
      iso3: event.iso3, country: event.country, subregion: event.subregion, events: [],
    });
    grouped.get(event.iso3).events.push(event);
  }
  return [...grouped.values()].map((row) => ({
    ...row,
    totalCount: row.events.length,
    reportedCount: row.events.filter((event) => event.affected != null).length,
  })).sort((a, b) => b.reportedCount - a.reportedCount
    || b.totalCount - a.totalCount || a.country.localeCompare(b.country));
}

export function createCountryRecurrence(container, ctx) {
  const { data, bus } = ctx;
  const years = data.events.map((event) => event.year);
  const yearMin = Math.min(...years); const yearMax = Math.max(...years);
  const maxShare = Math.max(...data.events.map((event) => event.affected_pc ?? 0));
  const maxAffected = Math.max(...data.events.map((event) => event.affected ?? 0));
  const shareColor = scaleSequentialSqrt([0, maxShare], interpolateLab('#d7e3ec', COLORS.point));
  const absoluteColor = scaleSequentialSqrt([0, maxAffected], interpolateLab('#d7e3ec', COLORS.point));

  const svg = select(container).append('svg').attr('role', 'img')
    .attr('aria-label', 'Country-by-year matrix of storm impact records from 2001 to 2026; filled dots have reported human impact and hollow dots are missing impact records');
  const tip = document.createElement('div'); tip.className = 'tooltip'; document.body.appendChild(tip);
  let marks = null; let currentRows = [];

  const moveTip = (event) => {
    const box = tip.getBoundingClientRect(); let x = event.clientX + 14; let y = event.clientY + 14;
    if (x + box.width > innerWidth - 8) x = event.clientX - box.width - 14;
    if (y + box.height > innerHeight - 8) y = event.clientY - box.height - 14;
    tip.style.left = `${Math.max(8, x)}px`; tip.style.top = `${Math.max(8, y)}px`;
  };

  function render(state) {
    currentRows = buildCountryRecurrence(data.events, state.filters);
    const compact = container.clientWidth < 600;
    const W = compact ? 390 : 1000;
    const rowH = compact ? 26 : 24;
    const M = compact
      ? { top: 38, right: 48, bottom: 24, left: 150 }
      : { top: 38, right: 160, bottom: 30, left: 160 };
    // Extra-Zeile unter dem Raster für die Farb-Legende (die Punktfüllung kodiert
    // die Impact-Stärke - ohne Skala wäre das Encoding nicht dekodierbar).
    const LEGEND_H = 30;
    const plotBottom = M.top + Math.max(1, currentRows.length) * rowH;
    const height = plotBottom + LEGEND_H + M.bottom;
    svg.attr('viewBox', `0 0 ${W} ${height}`);
    const x = scaleLinear().domain([yearMin, yearMax]).range([M.left, W - M.right]);
    const all = currentRows.flatMap((row, rowIndex) => row.events
      .sort((a, b) => a.year - b.year || a.id.localeCompare(b.id))
      .map((event, eventIndex) => ({ event, row, rowIndex, eventIndex })));

    svg.selectAll('*').remove();
    const axes = svg.append('g').attr('class', 'cr-axes');
    for (const year of compact ? [2001, 2010, 2020, 2026] : [2001, 2005, 2010, 2015, 2020, 2026]) {
      axes.append('line').attr('x1', x(year)).attr('x2', x(year))
        .attr('y1', M.top - 12).attr('y2', plotBottom + 4).attr('class', 'cr-gridline');
      axes.append('text').attr('x', x(year)).attr('y', M.top - 20)
        .attr('text-anchor', 'middle').attr('class', 'cr-year').text(year);
    }

    // 2025 hat keine erfassten Events (meta.caveats) - die Lücke bekommt ein dezentes
    // Band samt Note, damit sie nicht als Datenfehler gelesen wird.
    axes.append('rect').attr('class', 'cr-gap-band')
      .attr('x', x(2024.5)).attr('width', x(2025.5) - x(2024.5))
      .attr('y', M.top - 12).attr('height', plotBottom + 4 - (M.top - 12));
    axes.append('text').attr('class', 'cr-gap-note')
      .attr('x', x(2025)).attr('y', plotBottom + 15).attr('text-anchor', 'middle')
      .text(compact ? 'no 2025 events' : 'no events recorded in 2025');
    const rows = svg.append('g').selectAll('g.cr-row').data(currentRows, (row) => row.iso3)
      .join('g').attr('class', 'cr-row').attr('transform', (_, index) => `translate(0,${M.top + index * rowH})`);
    rows.append('text').attr('x', M.left - 14).attr('y', rowH / 2 + 4)
      .attr('text-anchor', 'end').attr('class', 'cr-country').text((row) => row.country);
    rows.append('text').attr('x', W - M.right + 18).attr('y', rowH / 2 + 4)
      .attr('class', 'cr-count').text((row) => compact
        ? `${row.reportedCount}/${row.totalCount}`
        : `${row.reportedCount} reported / ${row.totalCount} ${row.totalCount === 1 ? 'record' : 'records'}`);

    // Farb-Legende (Stufen-Swatches wie die Hot-Zone-Karte): volle Skala aus dem
    // ungefilterten Datensatz - Filter dürfen die Farbzuordnung nicht umdeuten.
    const activeColor = state.mode === 'absolute' ? absoluteColor : shareColor;
    const activeMax = state.mode === 'absolute' ? maxAffected : maxShare;
    const steps = compact ? 10 : 12;
    const swatchW = compact ? 12 : 18;
    const legend = svg.append('g').attr('class', 'cr-legend')
      .attr('transform', `translate(${M.left},${plotBottom + 22})`);
    legend.append('text').attr('class', 'heat-legend-label').attr('y', -7)
      .text(state.mode === 'absolute' ? 'fewer people affected' : 'lower affected share');
    for (let index = 0; index < steps; index++) {
      legend.append('rect').attr('x', index * (swatchW - 0.5)).attr('width', swatchW).attr('height', 8)
        .attr('fill', activeColor(activeMax * index / (steps - 1)));
    }
    legend.append('text').attr('class', 'heat-legend-label')
      .attr('x', (steps - 1) * (swatchW - 0.5) + swatchW).attr('y', -7).attr('text-anchor', 'end')
      .text(state.mode === 'absolute' ? 'more people affected' : 'higher affected share');

    const duplicateIndex = new Map();
    marks = svg.append('g').selectAll('circle').data(all, (d) => d.event.id).join('circle')
      .attr('class', (d) => `cr-mark${d.event.affected == null ? ' missing' : ''}`)
      .attr('data-event-id', (d) => d.event.id)
      .attr('cx', (d) => x(d.event.year))
      .attr('cy', (d) => {
        const key = `${d.row.iso3}-${d.event.year}`; const slot = duplicateIndex.get(key) ?? 0;
        duplicateIndex.set(key, slot + 1);
        return M.top + d.rowIndex * rowH + rowH / 2 + (slot % 3 - 1) * (compact ? 3.5 : 4.2);
      })
      .attr('r', compact ? 4 : 4.7).attr('tabindex', 0)
      .attr('aria-label', (d) => `${d.event.name}, ${d.event.country}, ${d.event.year}: ${d.event.affected == null ? 'human impact not reported' : `${fmtPct(d.event.affected_pc)} of population reported affected`}`)
      .style('fill', (d) => {
        if (d.event.affected == null) return 'transparent';
        return state.mode === 'absolute' ? absoluteColor(d.event.affected) : shareColor(d.event.affected_pc ?? 0);
      })
      .on('mouseenter focus', (event, d) => {
        const impact = d.event.affected == null ? 'Human impact not reported'
          : `${fmtInt(d.event.affected)} affected · ${fmtPct(d.event.affected_pc)} of population`;
        tip.innerHTML = `<div class="tt-title">${d.event.name ?? 'Unnamed storm'} · ${d.event.year}</div><div class="tt-sub">${d.event.country}</div><div class="tt-sub">${impact}</div>`;
        tip.classList.add('visible'); if ('clientX' in event) moveTip(event);
        bus.set({ hover: { sid: d.event.sid, eventId: d.event.id, source: 'countries' } });
      })
      .on('mousemove', moveTip)
      .on('mouseleave blur', () => { tip.classList.remove('visible'); bus.set({ hover: null }); })
      .on('click', (_, d) => { if (d.event.sid) bus.set({ detailSid: d.event.sid }); })
      .on('keydown', (event, d) => { if (event.key === 'Enter' && d.event.sid) bus.set({ detailSid: d.event.sid }); });
    applyClasses(state);
  }

  function applyClasses(state) {
    if (!marks) return;
    const active = state.selectedEventIds; const hoverId = state.hover?.eventId ?? null;
    marks.classed('active', (d) => d.event.id === hoverId || (active?.has(d.event.id) ?? false))
      .classed('muted', (d) => !!(hoverId || active?.size) && d.event.id !== hoverId && !(active?.has(d.event.id) ?? false));
  }

  return {
    update(state, patch) {
      if (!patch || 'filters' in patch || 'mode' in patch) render(state);
      else if ('hover' in patch || 'selectedEventIds' in patch) applyClasses(state);
    },
    destroy() { tip.remove(); svg.remove(); },
  };
}
