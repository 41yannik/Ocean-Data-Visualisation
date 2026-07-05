// Dashboard-Kachel „Storm profiles compared" (Explore, ersetzt das Radar):
// gruppiertes horizontales Balkendiagramm - je Metrik eine Gruppe aus drei Balken
// (Mawar/Percy/Guba) mit dem Perzentil-Rang über alle scatterbaren Events. Ehrlich:
// nur REALE Felder, kein erfundener Verwundbarkeits-Index. Hover → Rohwert-Tooltip.
import { select, scaleLinear } from 'd3';
import { isScatterable } from '../core/filters.js';
import { fmtInt, fmtPct, fmtKt } from '../core/format.js';
import { STORY_STORMS, STORM_COLORS } from '../story/keyStorms.js';

const AXES = [
  { key: 'intensity_kt', label: 'Wind speed', fmt: fmtKt },
  { key: 'affected', label: 'People affected', fmt: fmtInt },
  { key: 'affected_pc', label: 'Share of population', fmt: fmtPct },
  { key: 'deaths', label: 'Deaths', fmt: fmtInt },
  { key: 'pop', label: 'Population exposed', fmt: fmtInt },
];

const W = 460;
const M = { top: 8, right: 44, bottom: 26, left: 12 };
const GROUP_GAP = 26;   // zwischen Metrik-Gruppen
const BAR_H = 9;
const BAR_GAP = 3;
const LABEL_H = 15;     // Metrik-Label über jeder Gruppe
const GROUP_H = LABEL_H + 3 * BAR_H + 2 * BAR_GAP;
const H = M.top + M.bottom + AXES.length * GROUP_H + (AXES.length - 1) * GROUP_GAP;

export function createProfileBars(container, ctx) {
  const { data } = ctx;
  const events = data.events.filter(isScatterable);

  // Perzentil-Rang je Achse (Anteil der Events mit kleinerem/gleichem Wert)
  const val = (e, key) => e[key] ?? 0;
  const sorted = {};
  for (const a of AXES) sorted[a.key] = events.map((e) => val(e, a.key)).sort((x, y) => x - y);
  const pct = (v, key) => {
    const arr = sorted[key];
    let lo = 0;
    while (lo < arr.length && arr[lo] <= v) lo++;
    return lo / arr.length;
  };

  const storms = STORY_STORMS.map((s) => ({ ...s, event: data.index.byId.get(s.eventId) }));

  // Mini-Legende im Kachelkopf
  const legend = document.createElement('div');
  legend.className = 'tile-legend';
  legend.innerHTML = storms.map((s) =>
    `<span><i style="background:${STORM_COLORS[s.key]}"></i>${s.label}</span>`).join('');
  container.appendChild(legend);

  const svg = select(container).append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
    .attr('aria-label', 'Grouped horizontal bar chart comparing Mawar, Percy and Cyclone Guba by percentile rank of wind speed, people affected, share of population, deaths and population exposed');

  const x = scaleLinear().domain([0, 1]).range([M.left, W - M.right]);

  // Tooltip (Muster wie in den anderen Kacheln)
  const tip = document.createElement('div');
  tip.className = 'tooltip';
  document.body.appendChild(tip);
  const showTip = (event, s, a) => {
    tip.innerHTML = `<div class="tt-title">${s.label}</div>`
      + `<div class="tt-sub">${s.event.country}</div>`
      + `<div class="tt-sub">${a.label}: <strong>${a.fmt(s.event[a.key] ?? 0)}</strong></div>`
      + `<div class="tt-sub">Percentile: <strong>${fmtPct(pct(val(s.event, a.key), a.key))}</strong></div>`;
    tip.classList.add('visible');
    moveTip(event);
  };
  const moveTip = (event) => {
    const pad = 14;
    const r = tip.getBoundingClientRect();
    let px = event.clientX + pad;
    let py = event.clientY + pad;
    if (px + r.width > innerWidth - 8) px = event.clientX - r.width - pad;
    if (py + r.height > innerHeight - 8) py = event.clientY - r.height - pad;
    tip.style.left = `${Math.max(8, px)}px`;
    tip.style.top = `${Math.max(8, py)}px`;
  };
  const hideTip = () => tip.classList.remove('visible');

  // Gridlines bei 0/50/100 %
  const gGrid = svg.append('g').attr('class', 'pb-grid');
  for (const t of [0, 0.5, 1]) {
    gGrid.append('line').attr('class', 'pb-gridline')
      .attr('x1', x(t)).attr('x2', x(t)).attr('y1', M.top).attr('y2', H - M.bottom);
    gGrid.append('text').attr('class', 'pb-axis-label')
      .attr('x', x(t)).attr('y', H - 10).attr('text-anchor', 'middle')
      .text(`${t * 100}%`);
  }

  // Metrik-Gruppen
  AXES.forEach((a, gi) => {
    const gy = M.top + gi * (GROUP_H + GROUP_GAP);
    const g = svg.append('g');
    g.append('text').attr('class', 'pb-group-label')
      .attr('x', M.left).attr('y', gy + 11).text(a.label);
    storms.forEach((s, si) => {
      const v = pct(val(s.event, a.key), a.key);
      const by = gy + LABEL_H + si * (BAR_H + BAR_GAP);
      g.append('rect').attr('class', 'pb-bar')
        .attr('x', x(0)).attr('y', by).attr('height', BAR_H)
        .attr('width', Math.max(1, x(v) - x(0)))
        .style('fill', STORM_COLORS[s.key])
        .on('mouseenter', (event) => showTip(event, s, a))
        .on('mousemove', moveTip)
        .on('mouseleave', hideTip);
      g.append('text').attr('class', 'pb-value')
        .attr('x', x(v) + 5).attr('y', by + BAR_H - 1)
        .text(fmtPct(v));
    });
  });

  const note = document.createElement('p');
  note.className = 'tile-note';
  note.textContent = `Each bar: percentile rank among the ${events.length} fully recorded storm-country strikes.`;
  container.appendChild(note);

  return {
    update() {}, // statische Vergleichskachel
    destroy() { tip.remove(); legend.remove(); note.remove(); svg.remove(); },
  };
}
