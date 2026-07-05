// Dashboard-Kachel „People affected per year" (Explore, Plan delightful-harbor):
// Jahressummen der Betroffenen (log-Skala) je Pazifik-Subregion - der EHRLICHE Ersatz
// für einen Welt-Regionen-Vergleich (unsere Pipeline deckt Pazifik-Inselstaaten ab;
// subregion ist ein echtes Feld je Event). Darstellung als Lollipops (Punkt + Stiel,
// je Subregion leicht versetzt): verbundene Linien wären bei lückigen, um Größen-
// ordnungen springenden Jahreswerten Gekritzel. Annotationen via resolveRefs.
import { select, scaleLinear, scaleLog } from 'd3';
import { resolveRefs } from '../story/refs.js';

const W = 460;
const H = 300;
const M = { top: 18, right: 96, bottom: 30, left: 46 };

const REGIONS = [
  { key: 'Melanesia', color: 'var(--point)' },
  { key: 'Micronesia', color: 'var(--accent)' },
  { key: 'Polynesia', color: 'var(--track)' },
];

const ANNOTATIONS = [
  { year: 2016, region: 'Melanesia', text: 'Winston · {{event:2016-0041-FJI.affected:int}} affected' },
  { year: 2023, region: 'Micronesia', text: 'Mawar · {{event:2023-0300-GUM.affected:int}} affected' },
];

export function createImpactTrend(container, ctx) {
  const { data } = ctx;

  // Mini-Legende (freischwebende Punkte haben keine Linien-Endlabels)
  const legend = document.createElement('div');
  legend.className = 'tile-legend';
  legend.innerHTML = REGIONS.map((r) =>
    `<span><i style="background:${r.color}"></i>${r.key}</span>`).join('');
  container.appendChild(legend);

  // Jahressummen je Subregion (nur erfasste affected-Werte; 0/fehlend = Lücke)
  const years = data.events.map((e) => e.year);
  const [y0, y1] = [Math.min(...years), Math.max(...years)];
  const sums = new Map(REGIONS.map((r) => [r.key, new Map()]));
  for (const e of data.events) {
    if (e.affected == null || !sums.has(e.subregion)) continue;
    const m = sums.get(e.subregion);
    m.set(e.year, (m.get(e.year) ?? 0) + e.affected);
  }
  const series = REGIONS.map((r) => ({
    ...r,
    points: Array.from({ length: y1 - y0 + 1 }, (_, i) => {
      const year = y0 + i;
      return { year, sum: sums.get(r.key).get(year) ?? 0 };
    }),
  }));

  const allSums = series.flatMap((s) => s.points.map((p) => p.sum)).filter((v) => v > 0);
  const x = scaleLinear().domain([y0, y1]).range([M.left, W - M.right]);
  const y = scaleLog().domain([Math.min(...allSums), Math.max(...allSums)]).nice()
    .range([H - M.bottom, M.top]);

  const svg = select(container).append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
    .attr('aria-label', 'Line chart of people affected per year, one line per Pacific subregion (Melanesia, Micronesia, Polynesia), logarithmic scale, with Winston 2016 and Mawar 2023 annotated');

  // Achsen (reduziert: Jahres-Ticks unten, log-Ticks links als Zehnerpotenzen)
  const gAxes = svg.append('g').attr('class', 'trend-tile-axes');
  for (const year of [2005, 2010, 2015, 2020, 2025]) {
    gAxes.append('text').attr('class', 'tt-axis-label')
      .attr('x', x(year)).attr('y', H - 10).attr('text-anchor', 'middle').text(year);
  }
  for (const v of [1e2, 1e3, 1e4, 1e5]) {
    if (v < y.domain()[0] || v > y.domain()[1]) continue;
    gAxes.append('line').attr('class', 'tt-gridline')
      .attr('x1', M.left).attr('x2', W - M.right).attr('y1', y(v)).attr('y2', y(v));
    gAxes.append('text').attr('class', 'tt-axis-label')
      .attr('x', M.left - 6).attr('y', y(v)).attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .text(v >= 1e3 ? `${v / 1e3}k` : String(v));
  }

  // Freischwebende Punkte je Subregion (keine Stiele - vertikale Linien von der
  // log-Achse würden die Größenverhältnisse optisch verzerren). Subregionen minimal
  // versetzt (Dodge), damit gleiche Jahre nicht überplotten.
  const gMarks = svg.append('g').attr('class', 'trend-tile-marks');
  series.forEach((s, i) => {
    const dodge = (i - 1) * 3.5;
    for (const p of s.points) {
      if (p.sum <= 0) continue;
      const px = x(p.year) + dodge;
      gMarks.append('circle').attr('class', 'tt-dot')
        .attr('cx', px).attr('cy', y(p.sum)).attr('r', 3.5)
        .style('fill', s.color)
        .append('title').text(`${s.key} ${p.year}`);
    }
  });

  // Annotationen (Punkt + Text), Werte via Refs aus den Daten
  const gAnno = svg.append('g').attr('class', 'trend-tile-annos');
  for (const a of ANNOTATIONS) {
    const sum = sums.get(a.region).get(a.year);
    if (!sum) continue;
    const dodge = (REGIONS.findIndex((r) => r.key === a.region) - 1) * 3.5;
    const [ax, ay] = [x(a.year) + dodge, y(sum)];
    gAnno.append('circle').attr('class', 'tt-anno-dot').attr('cx', ax).attr('cy', ay).attr('r', 4);
    gAnno.append('text').attr('class', 'tt-anno-label')
      .attr('x', Math.min(ax, W - M.right - 40)).attr('y', ay - 10)
      .attr('text-anchor', 'middle')
      .text(resolveRefs(a.text, ctx));
  }

  const note = document.createElement('p');
  note.className = 'tile-note';
  note.textContent = 'Sum of recorded people affected per year and subregion; counts for the most recent seasons may still be revised.';
  container.appendChild(note);

  return {
    update() {}, // statische Kachel
    destroy() { legend.remove(); note.remove(); svg.remove(); },
  };
}
