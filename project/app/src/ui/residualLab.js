// Evidence-Lab-Ansicht „Impact by country": eine Zeile je Land (oder Subregion bzw.
// Größenklasse), jeder Punkt ein Land-Jahr, platziert nach dem gemeldeten Anteil bzw.
// der absoluten Zahl - dieselbe Log-Achse wie im Scatter. Anders als die Story-Formation
// (story/sizeRows.js) ist diese Ansicht filterbar und mode-abhängig.
//
// Bis zum Audit 2026-07 zeigte diese Ansicht das Residuum zur wind-only line und hieß
// „Beyond the wind line". Diese Linie erklärt nichts (R² 0.015, p 0.31), und die feste
// geclampte Domain stapelte Ausreißer unsichtbar am Rand. Jetzt steht auf der Achse die
// gemessene Größe selbst, und die Domain kommt aus den Daten.
import { select, scaleLinear, median as d3median } from 'd3';
import { matchesFilters, isScatterable } from '../core/filters.js';

// Lane-Versätze für den deterministischen Dodge - Muster aus story/sizeRows.js.
const LANES = [0, -7, 7, -14, 14];

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

// Wert je Modus: log10 des gemeldeten Anteils bzw. der absoluten Betroffenenzahl.
const valueOf = (mode) => (mode === 'absolute'
  ? (e) => Math.log10(e.affected + 1)
  : (e) => Math.log10(e.affected_pc));

export function buildResidualLab(events, { filters = null, mode = 'perCapita', groupBy = 'country' } = {}) {
  const field = mode === 'absolute' ? 'affected' : 'affected_pc';
  const value = valueOf(mode);
  const grouping = GROUPINGS[groupBy] ?? GROUPINGS.country;
  // Nur Records mit positivem Toll: log10(0) existiert nicht. Die gemeldeten Nullen
  // haben ihre eigene Darstellung im Scatter (Zero-Lane) und im Unit-Chart.
  const visible = events.filter((event) => isScatterable(event)
    && (!filters || matchesFilters(event, filters)));
  const grouped = new Map();
  for (const event of visible) {
    const key = grouping.keyOf(event);
    if (!grouped.has(key)) grouped.set(key, {
      iso3: key, country: grouping.labelOf(event), events: [],
    });
    grouped.get(key).events.push(event);
  }
  // Bezugslinie: Median über ALLE sichtbaren Records - eine Lage, keine Vorhersage.
  const overall = d3median(visible, value) ?? 0;
  const rows = [...grouped.values()].map((row) => {
    const sorted = [...row.events].sort((a, b) => value(a) - value(b) || a.id.localeCompare(b.id));
    const nAbove = sorted.filter((event) => value(event) > overall).length;
    return {
      ...row,
      events: sorted,
      n: sorted.length,
      nAbove,
      aboveShare: nAbove / sorted.length,
      median: d3median(sorted, value),
      pop: d3median(sorted, (e) => e.pop) ?? 0,
    };
  }).sort(grouping.order
    ? (a, b) => grouping.order.indexOf(a.iso3) - grouping.order.indexOf(b.iso3)
    // Ohne feste Ordnung: nach Bevölkerung, kleinste zuerst - dieselbe Lesart wie im
    // Story-Beat, wo die Landesgröße der erklärende Faktor ist.
    : (a, b) => a.pop - b.pop || a.country.localeCompare(b.country));
  return { rows, field, value, overall };
}

export function createResidualLab(container, ctx) {
  const { data, bus } = ctx;
  const svg = select(container).append('svg').attr('role', 'img')
    .attr('aria-label', 'Country rows ordered by population, smallest first; each dot is one '
      + 'country-year placed by its reported impact on a logarithmic scale, the dashed line '
      + "marks the median across all records, and the emphasised marker is each country's median");
  const tip = document.createElement('div'); tip.className = 'tooltip'; document.body.appendChild(tip);
  let marks = null;

  const moveTip = (event) => {
    const box = tip.getBoundingClientRect(); let x = event.clientX + 14; let y = event.clientY + 14;
    if (x + box.width > innerWidth - 8) x = event.clientX - box.width - 14;
    if (y + box.height > innerHeight - 8) y = event.clientY - box.height - 14;
    tip.style.left = `${Math.max(8, x)}px`; tip.style.top = `${Math.max(8, y)}px`;
  };

  // Einordnung im Tooltip: der gemeldete Wert selbst, nicht ein Abstand zu einer Linie.
  const valueText = (event, mode) => (mode === 'absolute'
    ? `${event.affected.toLocaleString('en-US')} people reported affected`
    : `${(event.affected_pc * 100).toFixed(event.affected_pc < 0.01 ? 3 : 1)}% of the population`);

  function render(state) {
    const { rows, value, overall } = buildResidualLab(data.events,
      { filters: state.filters, mode: state.mode, groupBy: state.residualGroupBy ?? 'country' });
    const mode = state.mode;
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

    // Domain AUS DEN DATEN (kein Clamp): der Vorgänger klemmte auf eine feste Spanne
    // und stapelte Ausreißer unsichtbar am Rand.
    const all = rows.flatMap((row) => row.events).map(value).filter(Number.isFinite);
    const domain = all.length ? [Math.floor(Math.min(...all)), Math.ceil(Math.max(...all))] : [-6, 0];
    const x = scaleLinear().domain(domain).range([M.left, W - M.right]);
    const fmtTick = (v) => {
      if (mode === 'absolute') {
        const n = 10 ** v;
        return n >= 1e6 ? `${n / 1e6}M` : n >= 1e3 ? `${n / 1e3}k` : String(Math.round(n));
      }
      const pct = 10 ** v * 100;
      return pct >= 1 ? `${pct}%` : `${Number(pct.toPrecision(1))}%`;
    };

    svg.selectAll('*').remove();
    const chrome = svg.append('g').attr('class', 'rlab-chrome');
    for (let v = domain[0]; v <= domain[1]; v += 1) {
      chrome.append('line').attr('x1', x(v)).attr('x2', x(v))
        .attr('y1', M.top - 6).attr('y2', plotBottom + 4).attr('class', 'rlab-gridline');
      chrome.append('text').attr('x', x(v)).attr('y', plotBottom + 20)
        .attr('text-anchor', 'middle').attr('class', 'rlab-tick').text(fmtTick(v));
    }
    // Median über alle sichtbaren Records - Lage-Referenz, keine Vorhersage.
    chrome.append('line').attr('class', 'rlab-zero')
      .attr('x1', x(overall)).attr('x2', x(overall)).attr('y1', M.top - 6).attr('y2', plotBottom + 4);
    chrome.append('text').attr('x', x(overall)).attr('y', M.top - 10)
      .attr('text-anchor', 'middle').attr('class', 'rlab-tick').text('median');

    const rowsSel = svg.append('g').selectAll('g.rlab-row').data(rows, (row) => row.iso3)
      .join('g').attr('class', 'rlab-row')
      .attr('transform', (_, index) => `translate(0,${M.top + index * rowH})`);
    rowsSel.append('text').attr('x', M.left - 14).attr('y', rowH / 2 + 4)
      .attr('text-anchor', 'end').attr('class', 'rlab-row-label').text((row) => row.country);
    rowsSel.append('text').attr('x', W - M.right + 18).attr('y', rowH / 2 + 4)
      .attr('class', 'rlab-row-count').text((row) => (compact
        ? `${row.nAbove}/${row.n}`
        : `${row.nAbove} of ${row.n} above median`));

    // Median-Marker: kurzer vertikaler Strich, nicht interaktiv (Punkte tragen die Events).
    rowsSel.append('line')
      .attr('class', (row) => `rlab-median ${row.median > overall ? 'rlab-above' : 'rlab-below'}`)
      .attr('x1', (row) => x(row.median)).attr('x2', (row) => x(row.median))
      .attr('y1', rowH / 2 - 9).attr('y2', rowH / 2 + 9);

    // Deterministischer Lane-Dodge je Zeile (Muster story/sizeRows.js): von links
    // nach rechts in die erste Lane mit genug Abstand, sonst in die entfernteste.
    const placed = rows.flatMap((row, rowIndex) => {
      const lastX = LANES.map(() => -Infinity);
      return row.events.map((event) => {
        const px = x(value(event));
        let lane = LANES.findIndex((_, k) => px - lastX[k] >= R * 2 + 1);
        if (lane < 0) lane = lastX.indexOf(Math.min(...lastX));
        lastX[lane] = px;
        return { event, row, cx: px, cy: M.top + rowIndex * rowH + rowH / 2 + LANES[lane] * (rowH / 30) };
      });
    });

    marks = svg.append('g').selectAll('circle').data(placed, (d) => d.event.id).join('circle')
      .attr('class', (d) => `rlab-mark ${value(d.event) > overall ? 'rlab-above' : 'rlab-below'}`)
      .attr('data-event-id', (d) => d.event.id)
      .attr('cx', (d) => d.cx).attr('cy', (d) => d.cy).attr('r', R)
      .attr('tabindex', 0)
      .attr('aria-label', (d) => `${d.event.name ?? 'Unnamed storm'}, ${d.event.country}, ${d.event.year}: ${valueText(d.event, mode)}`)
      .on('mouseenter focus', (event, d) => {
        tip.innerHTML = `<div class="tt-title">${d.event.name ?? 'Unnamed storm'} · ${d.event.year}</div>`
          + `<div class="tt-sub">${d.event.country}</div>`
          + `<div class="tt-sub">${valueText(d.event, mode)}</div>`;
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
