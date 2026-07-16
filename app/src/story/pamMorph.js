// Cyclone Pam evidence beat: one stable map, one blue point per country.
// The map carries only the comparison essentials. Attribution and mechanism
// details are disclosed on hover, focus or tap instead of being printed over it.
import { select, geoPath } from 'd3';
import { makeFittedProjection } from '../core/scales.js';
import { isScatterable } from '../core/filters.js';
import { fmtPct } from '../core/format.js';
import { PAM_IMPACTS } from './pamImpactData.js';

const SID_PAM = '2015066S08170';
const W = 960;
const H = 560;
const DRAW_DELAY = 300;
const DRAW_MS = 1750;
const REVEAL_DELAY = 900;

const shortK = (value) => (value >= 1000
  ? `${Math.round(value / 100) / 10}k`.replace('.0k', 'k')
  : String(value));

function destination([lon, lat], bearingDeg, distanceKm) {
  const angular = distanceKm / 6371;
  const bearing = bearingDeg * Math.PI / 180;
  const phi1 = lat * Math.PI / 180;
  const lambda1 = lon * Math.PI / 180;
  const phi2 = Math.asin(
    Math.sin(phi1) * Math.cos(angular)
      + Math.cos(phi1) * Math.sin(angular) * Math.cos(bearing),
  );
  const lambda2 = lambda1 + Math.atan2(
    Math.sin(bearing) * Math.sin(angular) * Math.cos(phi1),
    Math.cos(angular) - Math.sin(phi1) * Math.sin(phi2),
  );
  return [((lambda2 * 180 / Math.PI + 540) % 360) - 180, phi2 * 180 / Math.PI];
}

function windFieldPolygon(field) {
  const anchors = [
    [-45, field.radiiKm.NW], [45, field.radiiKm.NE],
    [135, field.radiiKm.SE], [225, field.radiiKm.SW],
    [315, field.radiiKm.NW], [405, field.radiiKm.NE],
  ];
  const points = [];
  for (let bearing = 0; bearing < 360; bearing += 5) {
    const normalized = bearing < 45 ? bearing + 360 : bearing;
    let index = 0;
    while (index < anchors.length - 2 && normalized > anchors[index + 1][0]) index += 1;
    const [b0, r0] = anchors[index];
    const [b1, r1] = anchors[index + 1];
    const t = (normalized - b0) / (b1 - b0);
    points.push(destination(field.coordinates, bearing, r0 + (r1 - r0) * t));
  }
  points.push(points[0]);
  return { type: 'Polygon', coordinates: [points] };
}

export function createPamMorph(container, ctx) {
  const { data, bus } = ctx;
  const pamEvidence = ctx.meta.analysis.storyEvidence.pam;
  const windFields = pamEvidence.windFields;
  const reducedMotion = bus.get().reducedMotion;
  const eventsByIso = new Map(
    (data.index.bySid.get(SID_PAM) ?? []).filter(isScatterable).map((event) => [event.iso3, event]),
  );
  const impacts = PAM_IMPACTS
    .map((impact) => ({ ...impact, event: eventsByIso.get(impact.iso3) }))
    .filter((impact) => impact.event);

  const fullTrack = data.tracks[SID_PAM] ?? [];
  const lastRelevant = fullTrack.findIndex((point) => point[1] <= -29);
  const track = (lastRelevant > 0 ? fullTrack.slice(0, lastRelevant + 1) : fullTrack)
    .map((point) => [point[0], point[1]]);
  const peakPoint = fullTrack.reduce((best, point) => ((point[2] ?? -Infinity) > (best[2] ?? -Infinity) ? point : best));
  const fitCoordinates = [
    ...track,
    ...impacts.map((impact) => impact.label.coordinates),
  ];
  const projection = makeFittedProjection(
    { type: 'MultiPoint', coordinates: fitCoordinates }, W, H, 42,
  );
  const path = geoPath(projection);

  const svg = select(container).append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('role', 'group')
    // An SVG <title> creates a native dark hover tooltip in Safari. The
    // accessible name belongs on the group instead, so it never covers data.
    .attr('aria-label', 'Cyclone Pam: track and reported impact in five Pacific countries')
    .attr('aria-describedby', 'pam-map-desc');
  svg.append('desc').attr('id', 'pam-map-desc')
    .text('One blue point represents each country. Labels give affected population share and number of people; interactive details explain the reported exposure.');

  svg.append('path').datum(data.land).attr('class', 'land').attr('d', path);

  const gFields = svg.append('g').attr('class', 'pm-fields');
  for (const field of windFields) {
    gFields.append('path').datum(windFieldPolygon(field))
      .attr('class', 'pm-wind-field').attr('d', path);
  }

  const trackPath = svg.append('path')
    .datum({ type: 'LineString', coordinates: track })
    .attr('class', 'pm-track-line').attr('d', path);

  const peak = projection([peakPoint[0], peakPoint[1]]);
  const peakG = svg.append('g').attr('class', 'pm-peak')
    .attr('transform', `translate(${peak[0]},${peak[1]})`);
  peakG.append('circle').attr('r', 4.5);
  peakG.append('line').attr('x1', 6).attr('y1', 0).attr('x2', 14).attr('y2', 0);
  peakG.append('text').attr('x', 18).attr('y', -2).attr('text-anchor', 'start')
    .text(`${pamEvidence.peakWindKt} kt peak near Vanuatu`);

  const fieldLabelAt = projection([166.5, -9.0]);
  const fieldLabel = gFields.append('text').attr('class', 'pm-field-label')
    .attr('x', fieldLabelAt[0]).attr('y', fieldLabelAt[1]).attr('text-anchor', 'end')
    .text('gale-force wind field');

  const gCountries = svg.append('g').attr('class', 'pm-countries');
  const countryGroups = [];
  for (const impact of impacts) {
    const [pointX, pointY] = projection(impact.label.coordinates);
    const labelX = pointX + impact.label.dx;
    const labelY = pointY + impact.label.dy;
    const group = gCountries.append('g')
      .attr('class', 'pm-country')
      .attr('data-iso3', impact.iso3)
      .attr('role', 'button')
      .attr('tabindex', 0)
      .attr('aria-label', `${impact.event.country}: ${fmtPct(impact.event.affected_pc)} of the population, ${impact.event.affected} people reported affected`)
      .attr('opacity', 0);
    group.append('circle').attr('class', 'pm-country-hit')
      .attr('cx', pointX).attr('cy', pointY).attr('r', 14);
    group.append('circle').attr('class', 'pm-country-point')
      .attr('cx', pointX).attr('cy', pointY).attr('r', 5.5);
    group.append('text').attr('class', 'pm-country-name')
      .attr('x', labelX).attr('y', labelY)
      .attr('text-anchor', impact.label.anchor).text(impact.event.country);
    group.append('text').attr('class', 'pm-country-value')
      .attr('x', labelX).attr('y', labelY + 15)
      .attr('text-anchor', impact.label.anchor)
      .text(`${fmtPct(impact.event.affected_pc)} affected · ${shortK(impact.event.affected)} people`);
    countryGroups.push({ impact, group, point: [pointX, pointY] });
  }

  // One concise detail popup, reused for every country.
  const popup = svg.append('g').attr('class', 'pm-popup').attr('opacity', 0)
    .style('pointer-events', 'none');
  const popupW = 270;
  const popupH = 92;
  popup.append('path').attr('class', 'pm-popup-leader');
  const popupBody = popup.append('g').attr('class', 'pm-popup-body');
  popupBody.append('rect').attr('width', popupW).attr('height', popupH).attr('rx', 4);
  popupBody.append('line').attr('class', 'pm-popup-accent').attr('x1', 0).attr('x2', 0).attr('y1', 0).attr('y2', popupH);
  const popupCountry = popupBody.append('text').attr('class', 'pm-popup-country').attr('x', 16).attr('y', 22);
  const popupShare = popupBody.append('text').attr('class', 'pm-popup-share').attr('x', 16).attr('y', 43);
  const popupCount = popupBody.append('text').attr('class', 'pm-popup-count').attr('x', 16).attr('y', 61);
  const popupNote = popupBody.append('text').attr('class', 'pm-popup-note').attr('x', 16).attr('y', 80);
  let pinnedIso = null;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const expandRect = (rect, padding = 0) => ({
    x: rect.x - padding,
    y: rect.y - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  });
  const overlapArea = (a, b) => Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x))
    * Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  const projectedTrack = track.map((coordinates) => projection(coordinates));

  function protectedRects(activeIso3) {
    const countryRects = countryGroups.map(({ impact, group, point: countryPoint }) => (
      impact.iso3 === activeIso3
        ? expandRect({ x: countryPoint[0] - 7, y: countryPoint[1] - 7, width: 14, height: 14 }, 8)
        : expandRect(group.node().getBBox(), 8)
    ));
    const peakBox = peakG.node().getBBox();
    const peakRect = expandRect({
      x: peak[0] + peakBox.x,
      y: peak[1] + peakBox.y,
      width: peakBox.width,
      height: peakBox.height,
    }, 8);
    return [
      ...countryRects,
      peakRect,
      expandRect(fieldLabel.node().getBBox(), 8),
    ];
  }

  function popupPlacement(impact, pointX, pointY) {
    // Start opposite the permanent label, then search the map's open rails.
    // This avoids both the country labels and the storm annotations, including
    // edge cases such as Kiribati at the top of the projection.
    const preferredSide = impact.label.anchor === 'end' ? 'right' : 'left';
    const maxX = W - popupW - 18;
    const maxY = H - popupH - 18;
    const xValues = [...new Set([
      clamp(pointX + 24, 18, maxX),
      clamp(pointX - popupW - 24, 18, maxX),
      clamp(pointX - popupW / 2, 18, maxX),
    ].map((value) => Math.round(value * 1000) / 1000))];
    const yValues = [...new Set([
      clamp(pointY - popupH / 2, 18, maxY),
      clamp(pointY - popupH - 24, 18, maxY),
      clamp(pointY + 24, 18, maxY),
      ...Array.from({ length: 5 }, (_, index) => clamp(18 + index * 100, 18, maxY)),
    ].map((value) => Math.round(value * 1000) / 1000))];
    const candidates = xValues.flatMap((x) => yValues.map((y) => ({ x, y })));
    const obstacles = protectedRects(impact.iso3);
    for (const candidate of candidates) {
      const rect = { x: candidate.x, y: candidate.y, width: popupW, height: popupH };
      const labelOverlap = obstacles.reduce((sum, obstacle) => sum + overlapArea(rect, obstacle), 0);
      const trackOverlap = projectedTrack.reduce((sum, trackPoint) => (
        trackPoint[0] >= rect.x - 6 && trackPoint[0] <= rect.x + rect.width + 6
          && trackPoint[1] >= rect.y - 6 && trackPoint[1] <= rect.y + rect.height + 6
          ? sum + 1 : sum
      ), 0);
      const liesRight = rect.x >= pointX + 14;
      const liesLeft = rect.x + rect.width <= pointX - 14;
      const relationPenalty = (preferredSide === 'right' && liesRight)
        || (preferredSide === 'left' && liesLeft)
        ? 0
        : (liesRight || liesLeft ? 900 : 1400);
      const nearestX = clamp(pointX, rect.x, rect.x + rect.width);
      const nearestY = clamp(pointY, rect.y, rect.y + rect.height);
      const distance = Math.hypot(pointX - nearestX, pointY - nearestY);
      candidate.score = labelOverlap * 30 + trackOverlap * 450 + relationPenalty + distance;
    }
    return candidates.sort((a, b) => a.score - b.score)[0];
  }

  function showPopup(item, pin = false) {
    const { impact, point: [pointX, pointY] } = item;
    if (pin) pinnedIso = impact.iso3;
    const placement = popupPlacement(impact, pointX, pointY);
    const { x: boxX, y: boxY } = placement;
    const edgeX = clamp(pointX, boxX, boxX + popupW);
    const edgeY = clamp(pointY, boxY, boxY + popupH);
    popup.select('.pm-popup-leader')
      .attr('d', `M${pointX},${pointY} L${edgeX},${edgeY}`);
    popupBody.attr('transform', `translate(${boxX},${boxY})`);
    popupCountry.text(impact.event.country);
    popupShare.text(`${fmtPct(impact.event.affected_pc)} of the population reported affected`);
    popupCount.text(`${impact.event.affected.toLocaleString('en-US')} people`);
    popupNote.text(impact.popupNote);
    popup.raise().interrupt().transition().duration(120).attr('opacity', 1);
    gCountries.selectAll('.pm-country').classed('is-active', function active() {
      return this.getAttribute('data-iso3') === impact.iso3;
    });
  }

  function hidePopup(force = false) {
    if (pinnedIso && !force) return;
    if (force) pinnedIso = null;
    popup.interrupt().transition().duration(100).attr('opacity', 0);
    gCountries.selectAll('.pm-country').classed('is-active', false);
  }

  for (const item of countryGroups) {
    item.group
      .on('mouseenter', () => showPopup(item))
      .on('mouseleave', () => hidePopup())
      .on('focus', () => showPopup(item))
      .on('blur', () => hidePopup(true))
      .on('click', (event) => {
        event.stopPropagation();
        if (pinnedIso === item.impact.iso3) hidePopup(true);
        else showPopup(item, true);
      })
      .on('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          showPopup(item, true);
        }
        if (event.key === 'Escape') hidePopup(true);
      });
  }
  svg.on('click', () => hidePopup(true));

  function run() {
    const instant = reducedMotion;
    const length = trackPath.node().getTotalLength();
    if (instant) {
      trackPath.attr('stroke-dasharray', null).attr('stroke-dashoffset', null);
      gCountries.selectAll('.pm-country').attr('opacity', 1);
      return;
    }
    trackPath.attr('stroke-dasharray', `${length} ${length}`).attr('stroke-dashoffset', length)
      .transition('draw').delay(DRAW_DELAY).duration(DRAW_MS).ease((t) => t)
      .attr('stroke-dashoffset', 0)
      .on('end', () => trackPath.attr('stroke-dasharray', null));
    gCountries.selectAll('.pm-country').transition('reveal')
      .delay(REVEAL_DELAY).duration(380).attr('opacity', 1);
  }

  const replay = document.createElement('button');
  replay.type = 'button';
  replay.className = 'heta-replay';
  replay.textContent = '↺ Replay';
  replay.addEventListener('click', () => {
    svg.selectAll('*').interrupt();
    hidePopup(true);
    gCountries.selectAll('.pm-country').attr('opacity', 0);
    run();
  });
  container.appendChild(replay);

  run();

  return {
    update() { /* frozen story section */ },
    destroy() { replay.remove(); svg.remove(); },
  };
}
