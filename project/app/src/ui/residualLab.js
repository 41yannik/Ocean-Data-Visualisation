// Evidence-Lab-Ansicht „Beyond the wind line": eine Zeile je Land, jeder Punkt ein
// Sturm-Land-Datensatz, platziert nach seinem Residuum zur wind-only line (log10:
// 0 = auf der Linie, +1 = Toll 10× über der Erwartung). Anders als die Story-Formation
// (story/residualRows.js) ist diese Ansicht filterbar, mode-abhängig (residual_pc vs.
// residual_abs) und zeigt den Median je Land - deshalb eine eigene pure Build-Funktion
// statt Optionen durch das Story-Modul zu fädeln (dessen Morph-Vertrag bleibt unberührt).
import { select, scaleLinear, median as d3median } from 'd3';
import { matchesFilters } from '../core/filters.js';

// Feste Domain über BEIDE Modi (residual_pc −2.56…+1.46, residual_abs −2.49…+1.78):
// die Null-Linie steht stabil, clamp fängt künftige Ausreißer.
const DOMAIN = [-2.8, 2.0];
// Lane-Versätze für den deterministischen Dodge - Muster aus story/residualRows.js:53-66.
const LANES = [0, -7, 7, -14, 14];
const TICKS = [
  { v: -2, label: '÷100' },
  { v: -1, label: '÷10' },
  { v: 0, label: 'wind-only line' },
  { v: 1, label: '×10' },
];

// Größenklassen für groupBy 'sizeClass': natürliche Brüche der 20 Länder (kein Land
// wechselt über die Jahre die Klasse; 'large' ist ehrlich klein - nur Papua-Neuguinea).
// FESTE klein→groß-Reihenfolge: Ordinalkategorien sortieren nicht nach Anteil um.
const SIZE_CLASSES = [
  { key: 'small', label: 'under 100,000 people', max: 100_000 },
  { key: 'medium', label: '100,000 – 1 million', max: 1_000_000 },
  { key: 'large', label: 'over 1 million', max: Infinity },
];
const sizeClassOf = (pop) => SIZE_CLASSES.find((c) => (pop ?? 0) < c.max) ?? SIZE_CLASSES.at(-1);

// Gruppierungen der Zeilen: key landet im Feld iso3 (Join-Schlüssel des Renderers),
// label im Feld country - so bleibt die Row-Shape für alle Gruppierungen identisch.
const GROUPINGS = {
  country: { keyOf: (e) => e.iso3, labelOf: (e) => e.country, order: null },
  subregion: { keyOf: (e) => e.subregion, labelOf: (e) => e.subregion, order: null },
  sizeClass: {
    keyOf: (e) => sizeClassOf(e.pop).key,
    labelOf: (e) => sizeClassOf(e.pop).label,
    order: SIZE_CLASSES.map((c) => c.key),
  },
};

export function buildResidualLab(events, { filters = null, mode = 'perCapita', groupBy = 'country' } = {}) {
  const field = mode === 'absolute' ? 'residual_abs' : 'residual_pc';
  const grouping = GROUPINGS[groupBy] ?? GROUPINGS.country;
  const visible = events.filter((event) => event[field] != null
    && (!filters || matchesFilters(event, filters)));
  const grouped = new Map();
  for (const event of visible) {
    const key = grouping.keyOf(event);
    if (!grouped.has(key)) grouped.set(key, {
      iso3: key, country: grouping.labelOf(event), events: [],
    });
    grouped.get(key).events.push(event);
  }
  const rows = [...grouped.values()].map((row) => {
    const sorted = [...row.events].sort((a, b) => a[field] - b[field] || a.id.localeCompare(b.id));
    const nAbove = sorted.filter((event) => event[field] > 0).length;
    return {
      ...row,
      events: sorted,
      n: sorted.length,
      nAbove,
      aboveShare: nAbove / sorted.length,
      median: d3median(sorted, (event) => event[field]),
    };
  }).sort(grouping.order
    ? (a, b) => grouping.order.indexOf(a.iso3) - grouping.order.indexOf(b.iso3)
    : (a, b) => b.aboveShare - a.aboveShare
      || b.n - a.n || a.country.localeCompare(b.country));
  return { rows, field };
}

export function createResidualLab(container, ctx) {
  const { data, bus } = ctx;
  const svg = select(container).append('svg').attr('role', 'img')
    .attr('aria-label', 'Country rows of storm records placed by their distance from the '
      + 'wind-only expectation; dots right of the dashed zero line report a larger toll than '
      + "wind alone predicts, and the emphasised marker is each country's median");
  const tip = document.createElement('div'); tip.className = 'tooltip'; document.body.appendChild(tip);
  let marks = null;

  const moveTip = (event) => {
    const box = tip.getBoundingClientRect(); let x = event.clientX + 14; let y = event.clientY + 14;
    if (x + box.width > innerWidth - 8) x = event.clientX - box.width - 14;
    if (y + box.height > innerHeight - 8) y = event.clientY - box.height - 14;
    tip.style.left = `${Math.max(8, x)}px`; tip.style.top = `${Math.max(8, y)}px`;
  };

  // Faktor zur Erwartung (Wortlaut wie story/formationLayer.js): 10^|r| = „N×".
  const factor = (res) => {
    const f = 10 ** Math.abs(res);
    return f >= 10 ? Math.round(f) : Math.round(f * 10) / 10;
  };
  const factorText = (res) => `toll ≈ ${factor(res)}× ${res > 0 ? 'above' : 'below'} the wind-only expectation`;

  function render(state) {
    const { rows, field } = buildResidualLab(data.events,
      { filters: state.filters, mode: state.mode, groupBy: state.residualGroupBy ?? 'country' });
    const compact = container.clientWidth < 600;
    const W = compact ? 390 : 1000;
    const rowH = compact ? 26 : 30;
    const R = compact ? 4 : 5;
    const M = compact
      ? { top: 16, right: 48, bottom: 40, left: 150 }
      : { top: 16, right: 150, bottom: 44, left: 160 };
    const plotBottom = M.top + Math.max(1, rows.length) * rowH;
    const height = plotBottom + M.bottom;
    svg.attr('viewBox', `0 0 ${W} ${height}`);
    const x = scaleLinear().domain(DOMAIN).range([M.left, W - M.right]).clamp(true);

    svg.selectAll('*').remove();
    const chrome = svg.append('g').attr('class', 'rlab-chrome');
    for (const tick of TICKS) {
      if (tick.v !== 0) {
        chrome.append('line').attr('x1', x(tick.v)).attr('x2', x(tick.v))
          .attr('y1', M.top - 6).attr('y2', plotBottom + 4).attr('class', 'rlab-gridline');
      }
      chrome.append('text').attr('x', x(tick.v)).attr('y', plotBottom + 20)
        .attr('text-anchor', 'middle').attr('class', 'rlab-tick').text(tick.label);
    }
    chrome.append('line').attr('class', 'rlab-zero')
      .attr('x1', x(0)).attr('x2', x(0)).attr('y1', M.top - 6).attr('y2', plotBottom + 4);

    const rowsSel = svg.append('g').selectAll('g.rlab-row').data(rows, (row) => row.iso3)
      .join('g').attr('class', 'rlab-row')
      .attr('transform', (_, index) => `translate(0,${M.top + index * rowH})`);
    rowsSel.append('text').attr('x', M.left - 14).attr('y', rowH / 2 + 4)
      .attr('text-anchor', 'end').attr('class', 'rlab-row-label').text((row) => row.country);
    rowsSel.append('text').attr('x', W - M.right + 18).attr('y', rowH / 2 + 4)
      .attr('class', 'rlab-row-count').text((row) => (compact
        ? `${row.nAbove}/${row.n}`
        : `${row.nAbove} of ${row.n} hit harder`));

    // Median-Marker: kurzer vertikaler Strich, nicht interaktiv (Punkte tragen die Events).
    rowsSel.append('line')
      .attr('class', (row) => `rlab-median ${row.median > 0 ? 'rlab-above' : 'rlab-below'}`)
      .attr('x1', (row) => x(row.median)).attr('x2', (row) => x(row.median))
      .attr('y1', rowH / 2 - 9).attr('y2', rowH / 2 + 9);

    // Deterministischer Lane-Dodge je Zeile (Muster story/residualRows.js): von links
    // nach rechts in die erste Lane mit genug Abstand, sonst in die entfernteste.
    const placed = rows.flatMap((row, rowIndex) => {
      const lastX = LANES.map(() => -Infinity);
      return row.events.map((event) => {
        const px = x(event[field]);
        let lane = LANES.findIndex((_, k) => px - lastX[k] >= R * 2 + 1);
        if (lane < 0) lane = lastX.indexOf(Math.min(...lastX));
        lastX[lane] = px;
        return { event, row, cx: px, cy: M.top + rowIndex * rowH + rowH / 2 + LANES[lane] * (rowH / 30) };
      });
    });

    marks = svg.append('g').selectAll('circle').data(placed, (d) => d.event.id).join('circle')
      .attr('class', (d) => `rlab-mark ${d.event[field] > 0 ? 'rlab-above' : 'rlab-below'}`)
      .attr('data-event-id', (d) => d.event.id)
      .attr('cx', (d) => d.cx).attr('cy', (d) => d.cy).attr('r', R)
      .attr('tabindex', 0)
      .attr('aria-label', (d) => `${d.event.name ?? 'Unnamed storm'}, ${d.event.country}, ${d.event.year}: ${factorText(d.event[field])}`)
      .on('mouseenter focus', (event, d) => {
        tip.innerHTML = `<div class="tt-title">${d.event.name ?? 'Unnamed storm'} · ${d.event.year}</div>`
          + `<div class="tt-sub">${d.event.country}</div>`
          + `<div class="tt-sub">${factorText(d.event[field])}</div>`;
        tip.classList.add('visible'); if ('clientX' in event) moveTip(event);
        bus.set({ hover: { sid: d.event.sid, eventId: d.event.id, source: 'residuals' } });
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
      if (!patch || 'filters' in patch || 'mode' in patch || 'residualGroupBy' in patch) render(state);
      else if ('hover' in patch || 'selectedEventIds' in patch) applyClasses(state);
    },
    destroy() { tip.remove(); svg.remove(); },
  };
}
