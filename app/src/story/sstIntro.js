// SST-Intro (Step 0): Warming Stripes der pazifischen Meeresoberflächen-Anomalien
// (PDH-Pflichtdatensatz, Challenge §9). Statisch bis auf die einmalige Einlauf-Animation;
// alle Beschriftungen aus data.sst generiert. Vertrag: create(container, ctx) → {update, destroy}.
import { select, scaleLinear, interpolateRdBu, max } from 'd3';

const W = 960;
const H = 420;
const MARGIN = { top: 46, right: 16, bottom: 64, left: 16 };

export function createSstIntro(container, ctx) {
  const sst = ctx.data.sst;
  const reducedMotion = ctx.bus.get?.().reducedMotion ?? false;

  const innerW = W - MARGIN.left - MARGIN.right;
  const innerH = H - MARGIN.top - MARGIN.bottom;
  const maxAbs = max(sst, (d) => Math.abs(d.anom));
  // Divergente Skala um 0: warm = rot, kalt = blau (RdBu invertiert)
  const color = (anom) => interpolateRdBu(1 - (anom + maxAbs) / (2 * maxAbs));
  const x = scaleLinear()
    .domain([sst[0].year, sst[sst.length - 1].year + 1])
    .range([0, innerW]);

  const svg = select(container).append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('role', 'img')
    .attr('aria-label', 'Warming stripes: Pacific sea-surface temperature anomalies by year');
  const root = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

  const first = sst[0];
  const latest = sst[sst.length - 1];

  svg.append('text').attr('class', 'sst-title').attr('x', MARGIN.left).attr('y', 24)
    .text(`Pacific sea-surface temperature anomaly, ${first.year}–${latest.year}`);

  const stripes = root.selectAll('rect')
    .data(sst, (d) => d.year)
    .join('rect')
    .attr('class', 'sst-stripe')
    .attr('x', (d) => x(d.year))
    .attr('y', 0)
    .attr('width', innerW / sst.length + 0.5) // +0.5 gegen Subpixel-Fugen
    .attr('height', innerH)
    .attr('fill', (d) => color(d.anom));
  stripes.append('title')
    .text((d) => `${d.year}: ${d.anom > 0 ? '+' : ''}${d.anom.toFixed(2)} °C`);

  // Einmalige Einlauf-Animation (links → rechts); bei reducedMotion sofort sichtbar.
  if (!reducedMotion) {
    stripes.attr('opacity', 0)
      .transition('sst-intro')
      .delay((_, i) => i * 6)
      .duration(300)
      .attr('opacity', 1);
  }

  // Dekaden-Ticks als eigene Achse (nur runde Jahrzehnte + letztes Jahr)
  const tickYears = sst.map((d) => d.year).filter((y) => y % 50 === 0);
  if (!tickYears.includes(latest.year)) tickYears.push(latest.year);
  const ticks = root.append('g').attr('class', 'sst-axis')
    .selectAll('g').data(tickYears).join('g')
    .attr('transform', (y) => `translate(${x(y)},${innerH})`);
  ticks.append('line').attr('y2', 6);
  ticks.append('text').attr('y', 22).attr('text-anchor', 'middle').text((y) => y);

  // Endwert-Marker: die jüngste Anomalie, generiert (nie getippt)
  root.append('text').attr('class', 'sst-latest')
    .attr('x', innerW).attr('y', -10).attr('text-anchor', 'end')
    .text(`${latest.year}: ${latest.anom > 0 ? '+' : ''}${latest.anom.toFixed(2)} °C vs. long-term average`);

  return {
    update() {}, // statisch — Steps blenden die View über das Layout ein/aus
    destroy() { svg.remove(); },
  };
}
