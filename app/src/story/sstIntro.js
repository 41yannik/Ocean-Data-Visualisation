// SST-Intro (Step 0): Warming Stripes + synchronisiertes Liniendiagramm der pazifischen
// Meeresoberflächen-Anomalien (PDH-Pflichtdatensatz, Challenge §9).
// Briefing 2026-07-03: sofortiger Tooltip je Jahr (folgt dem Cursor), gehoverter Streifen
// mit heller Outline, darunter ein simples Liniendiagramm mit EXAKT bündiger x-Achse und
// Cross-Highlighting (vertikale Hilfslinie durch beide Charts + Punkt auf der Linie).
// Alles komponentenintern - kein anderes View kennt SST-Jahre, daher kein bus-Verkehr.
// Vertrag: create(container, ctx) → {update, destroy}; Beschriftungen aus data.sst generiert.
import { select, scaleLinear, interpolateRdBu, max, extent, line as d3line } from 'd3';

const W = 960;
const H = 640;
// GEMEINSAME linke/rechte Ränder für beide Charts - das garantiert die bündige x-Achse.
const MARGIN = { top: 46, right: 20, bottom: 40, left: 64 };
const STRIPES_H = 260;
const GAP = 30;

const fmtAnom = (v) => `${v > 0 ? '+' : ''}${v.toFixed(2)} °C`;

export function createSstIntro(container, ctx) {
  const sst = ctx.data.sst;
  const reducedMotion = ctx.bus.get?.().reducedMotion ?? false;

  const innerW = W - MARGIN.left - MARGIN.right;
  const lineTop = STRIPES_H + GAP;
  const lineH = H - MARGIN.top - MARGIN.bottom - lineTop;
  const first = sst[0];
  const latest = sst[sst.length - 1];

  const maxAbs = max(sst, (d) => Math.abs(d.anom));
  const color = (anom) => interpolateRdBu(1 - (anom + maxAbs) / (2 * maxAbs)); // warm = rot
  const x = scaleLinear()
    .domain([first.year, latest.year + 1])
    .range([0, innerW]);
  const bandW = innerW / sst.length;
  const [minA, maxA] = extent(sst, (d) => d.anom);
  const y = scaleLinear().domain([minA, maxA]).nice().range([lineTop + lineH, lineTop]);

  const svg = select(container).append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('role', 'img')
    .attr('aria-label', 'Warming stripes and annual line chart: Pacific sea-surface temperature anomalies by year');
  const root = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

  svg.append('text').attr('class', 'sst-title').attr('x', MARGIN.left).attr('y', 24)
    .text(`Pacific sea-surface temperature anomaly, ${first.year}–${latest.year}`);
  svg.append('text').attr('class', 'sst-latest')
    .attr('x', W - MARGIN.right).attr('y', 24).attr('text-anchor', 'end')
    .text(`${latest.year}: ${fmtAnom(latest.anom)} vs. long-term average`);

  // Lokaler Tooltip (folgt dem Cursor; .tooltip-CSS der App wiederverwendet)
  const tip = document.createElement('div');
  tip.className = 'tooltip sst-tip';
  document.body.appendChild(tip);

  // ---- Chart 1: Warming Stripes ----
  const stripes = root.append('g').attr('class', 'sst-stripes').selectAll('rect')
    .data(sst, (d) => d.year)
    .join('rect')
    .attr('class', 'sst-stripe')
    .attr('x', (d) => x(d.year))
    .attr('y', 0)
    .attr('width', bandW + 0.5) // +0.5 gegen Subpixel-Fugen
    .attr('height', STRIPES_H)
    .attr('fill', (d) => color(d.anom));

  if (!reducedMotion) {
    stripes.attr('opacity', 0)
      .transition('sst-intro')
      .delay((_, i) => i * 6)
      .duration(300)
      .attr('opacity', 1);
  }

  // ---- Chart 2: Liniendiagramm (x-Achse EXAKT bündig - gleiche Skala, gleiche Ränder) ----
  const zeroY = y(0);
  root.append('line').attr('class', 'sst-zero')
    .attr('x1', 0).attr('x2', innerW).attr('y1', zeroY).attr('y2', zeroY);

  const lineGen = d3line()
    .x((d) => x(d.year) + bandW / 2)
    .y((d) => y(d.anom));
  const linePath = root.append('path').attr('class', 'sst-line')
    .datum(sst)
    .attr('d', lineGen);
  if (!reducedMotion) {
    const len = linePath.node().getTotalLength();
    linePath.attr('stroke-dasharray', `${len} ${len}`)
      .attr('stroke-dashoffset', len)
      .transition('sst-line')
      .duration(1400)
      .attr('stroke-dashoffset', 0)
      .on('end', () => linePath.attr('stroke-dasharray', null).attr('stroke-dashoffset', null));
  }

  // y-Achse (nur Linie-Chart): wenige Ticks, °C
  const yTicks = y.ticks(4);
  const gy = root.append('g').attr('class', 'sst-axis sst-axis-y');
  gy.selectAll('g').data(yTicks).join('g')
    .attr('transform', (t) => `translate(0,${y(t)})`)
    .call((g) => g.append('line').attr('x1', -6).attr('x2', 0))
    .call((g) => g.append('text').attr('x', -10).attr('dy', '0.32em').attr('text-anchor', 'end')
      .text((t) => fmtAnom(t)));

  // Gemeinsame x-Achse UNTER dem Liniendiagramm (runde Jahrzehnte + letztes Jahr)
  const tickYears = sst.map((d) => d.year).filter((yr) => yr % 50 === 0);
  if (!tickYears.includes(latest.year)) tickYears.push(latest.year);
  const gx = root.append('g').attr('class', 'sst-axis sst-axis-x');
  gx.selectAll('g').data(tickYears).join('g')
    .attr('transform', (yr) => `translate(${x(yr) + bandW / 2},${lineTop + lineH})`)
    .call((g) => g.append('line').attr('y2', 6))
    .call((g) => g.append('text').attr('y', 22).attr('text-anchor', 'middle').text((yr) => yr));

  // ---- Cross-Highlighting: Hilfslinie durch BEIDE Charts + Punkt auf der Linie ----
  const cursor = root.append('g').attr('class', 'sst-cursor').style('display', 'none');
  cursor.append('line').attr('y1', 0).attr('y2', lineTop + lineH);
  const cursorDot = cursor.append('circle').attr('r', 3.5);

  let hoveredYear = null;
  function show(d, event) {
    const cx = x(d.year) + bandW / 2;
    cursor.style('display', null).select('line').attr('x1', cx).attr('x2', cx);
    cursorDot.attr('cx', cx).attr('cy', y(d.anom));
    if (hoveredYear !== d.year) {
      hoveredYear = d.year;
      stripes.classed('hovered', (s) => s.year === d.year);
      stripes.filter((s) => s.year === d.year).raise();
      tip.innerHTML = `<div class="tt-title">${d.year}</div><div class="tt-sub">anomaly ${fmtAnom(d.anom)}</div>`;
    }
    tip.classList.add('visible');
    const pad = 14;
    const r = tip.getBoundingClientRect();
    let tx = event.clientX + pad;
    let ty = event.clientY + pad;
    if (tx + r.width > innerWidth - 8) tx = event.clientX - r.width - pad;
    if (ty + r.height > innerHeight - 8) ty = event.clientY - r.height - pad;
    tip.style.left = `${Math.max(8, tx)}px`;
    tip.style.top = `${Math.max(8, ty)}px`;
  }
  function hide() {
    hoveredYear = null;
    cursor.style('display', 'none');
    stripes.classed('hovered', false);
    tip.classList.remove('visible');
  }

  stripes
    .on('mousemove', (event, d) => show(d, event))
    .on('mouseleave', hide);

  // Auch das Liniendiagramm selbst ist hoverbar (unsichtbares Overlay, Jahr via x-Invert)
  root.append('rect').attr('class', 'sst-line-overlay')
    .attr('x', 0).attr('y', lineTop).attr('width', innerW).attr('height', lineH)
    .attr('fill', 'transparent')
    .on('mousemove', function (event) {
      const [px] = eventPointInRoot(event, this);
      const idx = Math.max(0, Math.min(sst.length - 1, Math.floor(x.invert(px)) - first.year));
      if (sst[idx]) show(sst[idx], event);
    })
    .on('mouseleave', hide);

  // Pointer-Koordinaten im root-Koordinatensystem (viewBox-skaliert)
  function eventPointInRoot(event, node) {
    const svgEl = node.ownerSVGElement;
    const p = svgEl.createSVGPoint();
    p.x = event.clientX; p.y = event.clientY;
    const m = root.node().getScreenCTM();
    const q = p.matrixTransform(m.inverse());
    return [q.x, q.y];
  }

  return {
    update() {}, // statisch - Steps blenden die View über das Layout ein/aus
    destroy() { svg.remove(); tip.remove(); },
  };
}
