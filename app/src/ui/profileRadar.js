// Dashboard-Kachel „Storm profiles compared" (Explore, Plan delightful-harbor):
// Radar mit 5 Achsen aus REALEN Event-Feldern - Wind, Betroffene, Betroffene pro Kopf,
// Tote, Landesbevölkerung - je Achse als Perzentil-Rang über alle scatterbaren Events
// (ehrlich + robust gegen Ausreißer; KEINE erfundenen Verwundbarkeits-Indizes).
// Drei überlappende Profile: Mawar / Percy / Guba (story/keyStorms.js).
import { select } from 'd3';
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

const W = 480;
const H = 330;
const R = 108;
const CX = W / 2;
const CY = H / 2 + 10;

export function createProfileRadar(container, ctx) {
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

  const storms = STORY_STORMS.map((s) => {
    const e = data.index.byId.get(s.eventId);
    return { ...s, event: e, values: AXES.map((a) => pct(val(e, a.key), a.key)) };
  });

  // Mini-Legende über dem SVG
  const legend = document.createElement('div');
  legend.className = 'radar-legend';
  legend.innerHTML = storms.map((s) =>
    `<span><i style="background:${STORM_COLORS[s.key]}"></i>${s.label}</span>`).join('');
  container.appendChild(legend);

  const svg = select(container).append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
    .attr('aria-label', 'Radar chart comparing three storms by percentile rank of wind speed, people affected, share of population, deaths and population exposed');

  const angle = (i) => (i / AXES.length) * 2 * Math.PI - Math.PI / 2;
  const point = (i, r01) => [CX + Math.cos(angle(i)) * R * r01, CY + Math.sin(angle(i)) * R * r01];

  // Ringe (25/50/75/100 %) + Achsenlinien + Achsenlabels
  const gGrid = svg.append('g').attr('class', 'radar-grid');
  for (const ring of [0.25, 0.5, 0.75, 1]) {
    gGrid.append('polygon')
      .attr('class', 'radar-ring')
      .attr('points', AXES.map((_, i) => point(i, ring).join(',')).join(' '));
  }
  AXES.forEach((a, i) => {
    const [x, y] = point(i, 1);
    gGrid.append('line').attr('class', 'radar-axis')
      .attr('x1', CX).attr('y1', CY).attr('x2', x).attr('y2', y);
    const [lx, ly] = point(i, 1.16);
    gGrid.append('text').attr('class', 'radar-axis-label')
      .attr('x', lx).attr('y', ly)
      .attr('text-anchor', Math.abs(lx - CX) < 8 ? 'middle' : lx > CX ? 'start' : 'end')
      .attr('dominant-baseline', ly > CY + 8 ? 'hanging' : ly < CY - 8 ? 'auto' : 'middle')
      .text(a.label);
  });

  // Profile (Polygone) - Hover zeigt die ROHwerte des Sturms
  const tip = document.createElement('div');
  tip.className = 'tooltip';
  document.body.appendChild(tip);
  const showTip = (event, s) => {
    tip.innerHTML = `<div class="tt-title">${s.label}</div>`
      + `<div class="tt-sub">${s.event.country}</div>`
      + AXES.map((a, i) => `<div class="tt-sub">${a.label}: <strong>${a.fmt(s.event[a.key] ?? 0)}</strong></div>`).join('');
    tip.classList.add('visible');
    moveTip(event);
  };
  const moveTip = (event) => {
    const pad = 14;
    const r = tip.getBoundingClientRect();
    let x = event.clientX + pad;
    let y = event.clientY + pad;
    if (x + r.width > innerWidth - 8) x = event.clientX - r.width - pad;
    if (y + r.height > innerHeight - 8) y = event.clientY - r.height - pad;
    tip.style.left = `${Math.max(8, x)}px`;
    tip.style.top = `${Math.max(8, y)}px`;
  };
  const hideTip = () => tip.classList.remove('visible');

  const gShapes = svg.append('g').attr('class', 'radar-shapes');
  for (const s of storms) {
    gShapes.append('polygon')
      .attr('class', 'radar-shape')
      .attr('points', s.values.map((v, i) => point(i, Math.max(v, 0.02)).join(',')).join(' '))
      .style('fill', STORM_COLORS[s.key])
      .style('stroke', STORM_COLORS[s.key])
      .on('mouseenter', (event) => showTip(event, s))
      .on('mousemove', moveTip)
      .on('mouseleave', hideTip);
  }

  const note = document.createElement('p');
  note.className = 'tile-note';
  note.textContent = `Each axis: percentile rank among the ${events.length} fully recorded storm-country strikes.`;
  container.appendChild(note);

  return {
    update() {}, // statische Vergleichskachel
    destroy() { tip.remove(); legend.remove(); note.remove(); svg.remove(); },
  };
}
