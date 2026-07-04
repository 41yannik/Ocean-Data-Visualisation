// Step 5 „One storm, four countries" - Map-to-Chart-Morph in EINEM SVG.
// Phase 1: Harold-Zugbahn zeichnet sich, die Sturmspitze poppt nacheinander vier
//   Impact-Bubbles (Fläche ∝ Betroffene) an den Zentroiden von Salomonen, Vanuatu,
//   Fidschi, Tonga - mit Labels „Fiji: 180k".
// Phase 2: Karte verblasst (10 %), andere Tracks verschwinden, Scatter-Achsen blenden ein,
//   die vier Bubbles FLIEGEN auf ihre exakten Scatterplot-Koordinaten. Gleiche Windstärke
//   (145 kt) → gleiche X; die Betroffenen streuen massiv auf der Y-Achse (ABSOLUT).
// Phase 3: eine Klammer zwischen dem höchsten (Fidschi) und niedrigsten (Tonga) Punkt mit
//   „7× difference in impact"; die restlichen Punkte bleiben stark gedimmt.
// Cross-Hover: Hover über einen der vier Punkte macht die Karte kurz sichtbarer und lässt
//   das jeweilige Land aufleuchten - die Brücke zwischen Statistik und Geografie bleibt.
//
// Bewusst in ABSOLUT-Mode (Menschen, log): nur so trägt „7×" (Fidschi 180k ↔ Tonga 25k) -
// pro Kopf wäre die Spreizung nur ~2× und die Reihenfolge anders.
import {
  select, geoPath, timer, easeCubicInOut, easeBackOut, axisBottom, axisLeft,
} from 'd3';
import { makeFittedProjection, makeXScale, makeYScale } from '../core/scales.js';
import { isScatterable } from '../core/filters.js';
import { COUNTRY_LOOKUP } from '../map/countryNames.js';

const SID_HAROLD = '2020092S09155';
const W = 960;
const H = 560;
const M = { top: 26, right: 30, bottom: 58, left: 68 };
const innerW = W - M.left - M.right;
const innerH = H - M.top - M.bottom;

const R_BUBBLE_MAX = 34;
const R_SCATTER = 7;
const SVG_NS = 'http://www.w3.org/2000/svg';

// Zeitplan (ms ab Mount)
const DRAW_DELAY = 500;
const DRAW = 2200;
const HOLD = 1000;
const MORPH_AT = DRAW_DELAY + DRAW + HOLD;
const MORPH = 1300;
const BRACKET_AT = MORPH_AT + MORPH;

const shortK = (v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v));

export function createHaroldMorph(container, ctx) {
  const { data, bus } = ctx;
  const rm = bus.get().reducedMotion;

  const svg = select(container).append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('role', 'img');

  // Harold-Ereignisse (4 Länder) + Geometrie ------------------------------------------
  const events = (data.index.bySid.get(SID_HAROLD) ?? []).filter(isScatterable);
  const projection = makeFittedProjection(
    { type: 'MultiPoint', coordinates: events.map((e) => data.index.centroids[e.iso3]) },
    W, H, 54,
  );
  const path = geoPath(projection);

  // Track auf das relevante Segment (bis kurz hinter Tonga) kürzen - der SO-Ausläufer
  // würde die Animation nur verlängern.
  const fullTrack = data.tracks[SID_HAROLD].map((p) => [p[0], p[1]]);
  const tonC = data.index.centroids.TON;
  let tonIdx = fullTrack.length - 1;
  let best = Infinity;
  fullTrack.forEach(([lon, lat], i) => {
    const [px, py] = projection([lon, lat]);
    const [tx, ty] = projection(tonC);
    const d = (px - tx) ** 2 + (py - ty) ** 2;
    if (d < best) { best = d; tonIdx = i; }
  });
  const track = fullTrack.slice(0, Math.min(fullTrack.length, tonIdx + 2));

  // Scatter-Skalen (ABSOLUT) ----------------------------------------------------------
  const x = makeXScale(innerW);
  const y = makeYScale('absolute', innerH);
  const sx = (kt) => M.left + x(kt);
  const syE = (e) => M.top + y.scale(y.value(e));

  // Gruppen (Z-Reihenfolge) -----------------------------------------------------------
  const gMap = svg.append('g').attr('class', 'hm-map');
  const gOther = gMap.append('g').attr('class', 'hm-other-tracks');
  const gLand = gMap.append('g');
  const gHaroldTrack = gMap.append('g');
  const gFlash = gMap.append('g').attr('class', 'hm-flash');
  const gAxes = svg.append('g').attr('class', 'hm-axes').attr('opacity', 0);
  const gBg = svg.append('g').attr('class', 'hm-bg').attr('opacity', 0);
  const gBracket = svg.append('g').attr('class', 'hm-bracket').attr('opacity', 0);
  const gBubbles = svg.append('g').attr('class', 'hm-bubbles');

  // Land ------------------------------------------------------------------------------
  gLand.append('path').datum(data.land).attr('class', 'land').attr('d', path);

  // Andere Tracks (fein) - verschwinden in Phase 2
  gOther.selectAll('path')
    .data(Object.keys(data.tracks).filter((sid) => sid !== SID_HAROLD))
    .join('path')
    .attr('class', 'hm-track-other')
    .attr('d', (sid) => path({ type: 'LineString', coordinates: data.tracks[sid].map((p) => [p[0], p[1]]) }));

  // Harold-Track
  const haroldPath = gHaroldTrack.append('path')
    .attr('class', 'hm-track-harold')
    .attr('d', path({ type: 'LineString', coordinates: track }));
  const tip = gHaroldTrack.append('circle').attr('class', 'hm-tip').attr('r', 4).style('display', 'none');

  // Achsen ----------------------------------------------------------------------------
  const axInner = gAxes.append('g').attr('transform', `translate(${M.left},${M.top})`);
  axInner.append('g').attr('class', 'axis axis-x').attr('transform', `translate(0,${innerH})`)
    .call(axisBottom(x).ticks(7).tickSizeOuter(0));
  axInner.append('g').attr('class', 'axis axis-y')
    .call(axisLeft(y.scale).tickValues(y.ticks).tickFormat(y.tickFormat).tickSizeOuter(0));
  axInner.append('text').attr('class', 'axis-label')
    .attr('x', innerW / 2).attr('y', innerH + 42).attr('text-anchor', 'middle')
    .text('max. sustained wind (kt)');
  axInner.append('text').attr('class', 'axis-label')
    .attr('transform', 'rotate(-90)').attr('x', -innerH / 2).attr('y', -48)
    .attr('text-anchor', 'middle').text('people affected (log)');

  // Hintergrund-Punkte (alle außer Harold) --------------------------------------------
  const bgEvents = data.events.filter((e) => isScatterable(e) && e.sid !== SID_HAROLD);
  gBg.selectAll('circle').data(bgEvents).join('circle')
    .attr('class', 'hm-bg-point')
    .attr('cx', (e) => sx(e.intensity_kt)).attr('cy', (e) => syE(e)).attr('r', 3);

  // Vier Bubbles ----------------------------------------------------------------------
  const maxAff = Math.max(...events.map((e) => e.affected));
  const bubbles = events.map((e) => {
    const [mx, my] = projection(data.index.centroids[e.iso3]);
    return {
      e,
      map: [mx, my],
      scatter: [sx(e.intensity_kt), syE(e)],
      rImpact: R_BUBBLE_MAX * Math.sqrt(e.affected / maxAff),
      frac: 0,
    };
  });

  // Reach-Fraktionen entlang der gezeichneten Bahn (off-DOM vermessen)
  (() => {
    const tmp = document.createElementNS(SVG_NS, 'svg');
    tmp.setAttribute('style', 'position:absolute;width:0;height:0;left:-9999px;overflow:hidden');
    const pe = document.createElementNS(SVG_NS, 'path');
    pe.setAttribute('d', path({ type: 'LineString', coordinates: track }));
    tmp.appendChild(pe); document.body.appendChild(tmp);
    const total = pe.getTotalLength();
    const N = 220;
    const samples = [];
    for (let i = 0; i <= N; i += 1) { const p = pe.getPointAtLength((total * i) / N); samples.push({ f: i / N, x: p.x, y: p.y }); }
    document.body.removeChild(tmp);
    for (const b of bubbles) {
      let bf = 0; let bd = Infinity;
      for (const s of samples) { const d = (s.x - b.map[0]) ** 2 + (s.y - b.map[1]) ** 2; if (d < bd) { bd = d; bf = s.f; } }
      b.frac = bf;
    }
    bubbles._samples = samples;
    bubbles._total = total;
  })();

  const ratio = Math.round(maxAff / Math.min(...events.map((e) => e.affected)));

  // Bubble-DOM
  for (const b of bubbles) {
    const g = gBubbles.append('g').attr('class', 'hm-bubble').datum(b);
    b.node = g;
    b.circle = g.append('circle').attr('class', 'hm-bubble-c')
      .attr('cx', b.map[0]).attr('cy', b.map[1]).attr('r', 0);
    b.label = g.append('text').attr('class', 'hm-bubble-l')
      .attr('x', b.map[0] + 6).attr('y', b.map[1] + 4).attr('opacity', 0)
      .text(`${COUNTRY_LOOKUP[b.e.iso3] ?? b.e.iso3}: ${shortK(b.e.affected)}`);
  }

  // ---- Phasen -----------------------------------------------------------------------
  function popBubble(b, instant) {
    b.circle.classed('pulse', true);
    if (instant) { b.circle.attr('r', b.rImpact); b.label.attr('opacity', 1); return; }
    b.circle.transition('pop').duration(520).ease(easeBackOut.overshoot(1.5)).attr('r', b.rImpact);
    b.label.transition('pop').delay(260).duration(260).attr('opacity', 1);
  }

  function doMorph(instant) {
    gMap.transition('morph').duration(instant ? 0 : 700).attr('opacity', 0.1);
    gOther.transition('morph').duration(instant ? 0 : 500).attr('opacity', 0);
    tip.style('display', 'none');
    gAxes.transition('morph').duration(instant ? 0 : 600).attr('opacity', 1);
    gBg.transition('morph').duration(instant ? 0 : 600).attr('opacity', 1);
    // Im Scatter liegen Fiji/Solomon/Vanuatu im Log-Raum dicht → nur die Klammer-Endpunkte
    // (höchster + niedrigster = Fiji + Tonga) beschriften, damit die 7×-Aussage sauber liest.
    const byY = [...bubbles].sort((a, b) => a.scatter[1] - b.scatter[1]);
    const labelled = new Set([byY[0], byY[byY.length - 1]]);
    for (const b of bubbles) {
      b.circle.classed('pulse', false).classed('hm-scatter', true).style('pointer-events', 'auto');
      const [tx, ty] = b.scatter;
      const move = instant ? b.circle : b.circle.transition('fly').duration(MORPH).ease(easeCubicInOut);
      move.attr('cx', tx).attr('cy', ty).attr('r', R_SCATTER);
      const lab = instant ? b.label : b.label.transition('fly').duration(MORPH).ease(easeCubicInOut);
      lab.attr('x', tx + R_SCATTER + 6).attr('y', ty + 4).attr('opacity', labelled.has(b) ? 1 : 0);
      // Cross-Hover erst nach dem Morph aktiv
      b.circle.on('mouseenter', () => crossHover(b, true)).on('mouseleave', () => crossHover(b, false));
    }
  }

  function doBracket(instant) {
    const top = bubbles.reduce((a, b) => (b.scatter[1] < a.scatter[1] ? b : a));
    const bot = bubbles.reduce((a, b) => (b.scatter[1] > a.scatter[1] ? b : a));
    const bx = Math.max(top.scatter[0], bot.scatter[0]) + 42;
    const yT = top.scatter[1];
    const yB = bot.scatter[1];
    gBracket.append('path').attr('class', 'hm-bracket-line')
      .attr('d', `M${bx - 7},${yT} H${bx} V${yB} H${bx - 7}`);
    gBracket.append('text').attr('class', 'hm-bracket-label')
      .attr('x', bx + 10).attr('y', (yT + yB) / 2 - 4)
      .text(`${ratio}× difference`);
    gBracket.append('text').attr('class', 'hm-bracket-sub')
      .attr('x', bx + 10).attr('y', (yT + yB) / 2 + 13)
      .text('in impact');
    gBracket.transition('bracket').duration(instant ? 0 : 500).attr('opacity', 1);
  }

  // Cross-Hover: Karte kurz sichtbarer + Land aufleuchten
  function crossHover(b, on) {
    gMap.interrupt('cross').transition('cross').duration(220).attr('opacity', on ? 0.42 : 0.1);
    gFlash.selectAll('*').remove();
    if (on) {
      const [mx, my] = b.map;
      gFlash.append('circle').attr('class', 'hm-country-flash').attr('cx', mx).attr('cy', my).attr('r', 16);
      gFlash.append('text').attr('class', 'hm-country-name').attr('x', mx).attr('y', my - 20)
        .attr('text-anchor', 'middle').text(COUNTRY_LOOKUP[b.e.iso3] ?? b.e.iso3);
    }
  }

  // ---- Ablauf -----------------------------------------------------------------------
  let clock = null;
  const flags = {};
  function run() {
    if (rm) { // reduced motion: direkt Endzustand
      for (const b of bubbles) popBubble(b, true);
      doMorph(true); doBracket(true);
      return;
    }
    // Track zeichnen (linear → Zeit ↔ Weg proportional zu den Pop-Fraktionen)
    const len = haroldPath.node().getTotalLength();
    haroldPath.attr('stroke-dasharray', `${len} ${len}`).attr('stroke-dashoffset', len)
      .transition('draw').delay(DRAW_DELAY).duration(DRAW).ease((t) => t)
      .attr('stroke-dashoffset', 0)
      .on('end', () => haroldPath.attr('stroke-dasharray', null));

    tip.style('display', null);
    const samples = bubbles._samples;
    const sampleAt = (f) => {
      const n = samples.length - 1; const xx = Math.max(0, Math.min(1, f)) * n;
      const i = Math.min(n - 1, Math.floor(xx)); const t = xx - i;
      return [samples[i].x + (samples[i + 1].x - samples[i].x) * t, samples[i].y + (samples[i + 1].y - samples[i].y) * t];
    };

    clock = timer((elapsed) => {
      if (elapsed >= DRAW_DELAY && elapsed <= DRAW_DELAY + DRAW) {
        const f = (elapsed - DRAW_DELAY) / DRAW;
        const [tx, ty] = sampleAt(f);
        tip.attr('cx', tx).attr('cy', ty);
        for (const b of bubbles) if (!b.popped && f >= b.frac) { b.popped = true; popBubble(b, false); }
      }
      if (elapsed > DRAW_DELAY + DRAW && !flags.tipHidden) { flags.tipHidden = true; tip.transition().duration(300).style('opacity', 0); }
      if (elapsed >= MORPH_AT && !flags.morph) { flags.morph = true; doMorph(false); }
      if (elapsed >= BRACKET_AT && !flags.bracket) { flags.bracket = true; doBracket(false); clock.stop(); clock = null; }
    });
  }

  // Replay
  const figure = container;
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'heta-replay'; btn.textContent = '↺ Replay';
  btn.addEventListener('click', reset);
  figure.appendChild(btn);

  function reset() {
    if (clock) { clock.stop(); clock = null; }
    svg.selectAll('*').interrupt();
    Object.keys(flags).forEach((k) => delete flags[k]);
    gMap.attr('opacity', 1); gOther.attr('opacity', 1);
    gAxes.attr('opacity', 0); gBg.attr('opacity', 0);
    gBracket.attr('opacity', 0).selectAll('*').remove();
    gFlash.selectAll('*').remove();
    haroldPath.attr('stroke-dasharray', null).attr('stroke-dashoffset', null);
    for (const b of bubbles) {
      b.popped = false;
      b.circle.classed('pulse', false).classed('hm-scatter', false).style('pointer-events', 'none')
        .on('mouseenter', null).on('mouseleave', null)
        .attr('cx', b.map[0]).attr('cy', b.map[1]).attr('r', 0);
      b.label.attr('x', b.map[0] + 6).attr('y', b.map[1] + 4).attr('opacity', 0);
    }
    run();
  }

  run();

  return {
    update() { /* eingefrorene Sektion */ },
    destroy() { if (clock) clock.stop(); btn.remove(); svg.remove(); },
  };
}
