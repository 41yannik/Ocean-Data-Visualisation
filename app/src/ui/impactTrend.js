// Dashboard-Kachel „People affected per year" (Explore, Plan delightful-harbor):
// Jahressummen der Betroffenen (log-Skala) je Pazifik-Subregion - der EHRLICHE Ersatz
// für einen Welt-Regionen-Vergleich (unsere Pipeline deckt Pazifik-Inselstaaten ab;
// subregion ist ein echtes Feld je Event). Darstellung als Lollipops (Punkt + Stiel,
// je Subregion leicht versetzt): verbundene Linien wären bei lückigen, um Größen-
// ordnungen springenden Jahreswerten Gekritzel. Annotationen via resolveRefs.
// Cross-Highlighting: Dot-Hover emittiert textSet (1:n - ein Dot aggregiert mehrere
// Events) → Karte/Scatter/Heatmap spiegeln; Empfang über hover.sid/selectedEventIds.
// Filter dünnen die Summen aus (y-Domain bleibt fix - kein Achsen-Springen).
import { select, scaleLinear, scaleLog } from 'd3';
import { resolveRefs } from '../story/refs.js';
import { matchesFilters } from '../core/filters.js';

// Kompakt fürs 2x2-Grid (~1.9:1) - flacher als zuvor, damit alle vier Kacheln
// gleich hoch sind und zusammen in einen Viewport passen.
const W = 460;
const H = 242;
const M = { top: 14, right: 96, bottom: 24, left: 46 };

// Drei Subregionen als kühle Kategorial-Rampe nach HELLIGKEIT unterschieden
// (dunkel/mittel/hell) + direkte Legende/Endlabels - KEINE Akzentfarbe: #e4572e bleibt
// exklusiv für Hover/Brush/Highlight (E2). Micronesia war fälschlich --accent (Dot las
// sich dauerhaft „gehighlightet"); --trend macht den Hover erst zum echten Farbwechsel.
// CVD: worst-adjacent ΔE 27.8 (Validator) - klar trennbar trotz gleicher Hue-Familie.
const REGIONS = [
  { key: 'Melanesia', color: 'var(--point)' },
  { key: 'Micronesia', color: 'var(--trend)' },
  { key: 'Polynesia', color: 'var(--track)' },
];

const ANNOTATIONS = [
  { year: 2016, region: 'Melanesia', text: 'Winston · {{event:2016-0041-FJI.affected:int}} reported affected' },
  { year: 2023, region: 'Micronesia', text: 'Mawar · {{event:2023-0300-GUM.affected:int}} reported affected' },
];

export function createImpactTrend(container, ctx) {
  const { data, bus } = ctx;

  // Mini-Legende (freischwebende Punkte haben keine Linien-Endlabels)
  const legend = document.createElement('div');
  legend.className = 'tile-legend';
  legend.innerHTML = REGIONS.map((r) =>
    `<span><i style="background:${r.color}"></i>${r.key}</span>`).join('');
  container.appendChild(legend);

  // Jahressummen je Subregion (nur erfasste affected-Werte; 0/fehlend = Lücke);
  // Events je Dot mitführen (Cross-Highlighting + Filter-Neuberechnung).
  const years = data.events.map((e) => e.year);
  const [y0, y1] = [Math.min(...years), Math.max(...years)];
  const buildDots = (filters) => {
    const dots = [];
    for (const [ri, r] of REGIONS.entries()) {
      const byYear = new Map();
      for (const e of data.events) {
        if (e.affected == null || e.subregion !== r.key) continue;
        if (filters && !matchesFilters(e, filters)) continue;
        if (!byYear.has(e.year)) byYear.set(e.year, { sum: 0, events: [] });
        const d = byYear.get(e.year);
        d.sum += e.affected;
        d.events.push(e);
      }
      for (const [year, d] of byYear) {
        dots.push({ key: `${r.key}-${year}`, region: r.key, color: r.color, dodge: (ri - 1) * 3.5, year, ...d });
      }
    }
    return dots;
  };
  const sums = new Map(REGIONS.map((r) => [r.key, new Map()]));
  for (const d of buildDots(null)) sums.get(d.region).set(d.year, d.sum);

  const allSums = buildDots(null).map((d) => d.sum).filter((v) => v > 0);
  const x = scaleLinear().domain([y0, y1]).range([M.left, W - M.right]);
  const y = scaleLog().domain([Math.min(...allSums), Math.max(...allSums)]).nice()
    .range([H - M.bottom, M.top]);

  const svg = select(container).append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
    .attr('aria-label', 'Chart of people reported affected per year, one dot series per Pacific subregion (Melanesia, Micronesia, Polynesia), logarithmic scale, with Winston 2016 and Mawar 2023 annotated');

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

  // Playhead des Zeit-Scrubbers (Explore): senkrechte Linie beim aktiven Jahr, folgt der
  // Karte. Zwischen Achsen und Marks, damit die Dots oben aufliegen. null = ausgeblendet.
  const playhead = svg.append('line').attr('class', 'year-playhead')
    .attr('y1', M.top).attr('y2', H - M.bottom).style('display', 'none');

  // Freischwebende Punkte je Subregion (keine Stiele - vertikale Linien von der
  // log-Achse würden die Größenverhältnisse optisch verzerren). Subregionen minimal
  // versetzt (Dodge), damit gleiche Jahre nicht überplotten. Keyed Join → Filter
  // dünnen die Dots aus, Objektkonstanz bleibt für die Highlight-Klassen erhalten.
  const gMarks = svg.append('g').attr('class', 'trend-tile-marks');
  let dotSel = gMarks.selectAll('circle');
  function renderDots(filters) {
    dotSel = gMarks.selectAll('circle')
      .data(buildDots(filters).filter((d) => d.sum > 0), (d) => d.key)
      .join((enter) => enter.append('circle').attr('class', 'tt-dot')
        .call((sel) => sel.append('title')))
      .attr('cx', (d) => x(d.year) + d.dodge)
      .attr('cy', (d) => y(d.sum))
      .attr('r', 3.5)
      .style('fill', (d) => d.color)
      .on('mouseenter', (event, d) => {
        // 1:n-Kanal: ein Dot = alle Events der Subregion in dem Jahr
        bus.set({ textSet: { ids: new Set(d.events.map((e) => e.id)) } });
      })
      .on('mouseleave', () => bus.set({ textSet: null }));
    dotSel.select('title').text((d) => `${d.region} ${d.year}`);
  }
  renderDots(null);

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
  note.textContent = 'Reported affected people summed by year and subregion. Recent seasons may be revised.';
  container.appendChild(note);

  return {
    update(state, patch) {
      if (patch && !('hover' in patch) && !('selectedEventIds' in patch)
        && !('textSet' in patch) && !('filters' in patch) && !('activeYear' in patch)) return;
      if (!patch || 'activeYear' in patch) {
        const ay = state.activeYear ?? null;
        if (ay == null) playhead.style('display', 'none');
        else playhead.style('display', null).attr('x1', x(ay)).attr('x2', x(ay));
      }
      if (!patch || 'filters' in patch) renderDots(state.filters);

      const hoverSid = state.hover?.sid ?? null;
      const sel = state.selectedEventIds;
      const textSet = state.textSet?.ids ?? null;

      // Aktive Event-Menge: Hover (Geschwister via bySid) > Selektion > textSet
      let active = null;
      if (hoverSid) {
        const sibs = data.index.bySid.get(hoverSid) ?? [];
        active = new Set(sibs.map((e) => e.id));
      } else if (sel?.size) {
        active = sel;
      } else if (textSet) {
        active = textSet;
      }

      const contains = (d) => d.events.some((e) => active.has(e.id));
      dotSel
        .classed('hl', (d) => (active ? contains(d) : false))
        .classed('dim', (d) => (active ? !contains(d) : false));
    },
    destroy() { legend.remove(); note.remove(); svg.remove(); },
  };
}
