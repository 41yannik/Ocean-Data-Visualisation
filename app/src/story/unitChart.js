// Step 7 „What the data hides" - Unit Chart (Dot Matrix) der exakt 99 Sturm-Land-Paare.
// Jedes Paar = ein Kreis. Dreistufiges Encoding der Datenqualität:
//   • solide (blau, gefüllt)        - 78 vollständige Paare (Wind + Impact)
//   • rekonstruiert (dashed Kontur) - Teilmenge davon: Wind aus Katastrophen-Akten, nicht Satellit
//   • Ghost (transparent, zarte Kontur) - 21 Paare, deren menschliche Auswirkung nie erfasst wurde
// Sortierung: chronologisch (wann?) ↔ nach Qualität (zwei harte Blöcke, via Store-Feld unitSort).
// Ghost-Hover trägt die eigentliche Botschaft: „Wind bekannt - Impact nie offiziell erfasst."
import { select, easeCubicOut, easeBackOut } from 'd3';
import { isScatterable } from '../core/filters.js';
import { COUNTRY_LOOKUP } from '../map/countryNames.js';

const W = 860;
const H = 560;
const CELL = 42;
const R = 13;
const COLS = 11;          // 11 × 9 = 99 exakt (chronologisches Raster)

// Qualitäts-Blöcke
const COLS_A = 9;         // 78 „recorded"
const COLS_B = 3;         // 21 „missing"
const GAP = CELL * 1.7;

const cat = (e) => {
  if (!isScatterable(e)) return 'ghost';
  return e.intensity_source === 'emdat_fallback' ? 'recon' : 'solid';
};

export function createUnitChart(container, ctx) {
  const { data, bus } = ctx;
  const rm = bus.get().reducedMotion;

  const svg = select(container).append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img');

  // 99 Paare, chronologisch geordnet (Jahr, dann Monat/ID) --------------------------
  const events = [...data.events].sort((a, b) =>
    a.year - b.year || (a.month ?? 0) - (b.month ?? 0) || a.id.localeCompare(b.id));

  // Chronologische Rasterposition
  const gridW = COLS * CELL;
  const gridH = Math.ceil(events.length / COLS) * CELL;
  const oxC = (W - gridW) / 2;
  const oyC = (H - gridH) / 2 - 4;
  const chronoPos = (i) => [oxC + (i % COLS) * CELL + CELL / 2, oyC + Math.floor(i / COLS) * CELL + CELL / 2];

  // Qualitäts-Position: zwei Blöcke nebeneinander
  const solids = events.filter((e) => cat(e) !== 'ghost');
  const ghosts = events.filter((e) => cat(e) === 'ghost');
  const blockAW = COLS_A * CELL;
  const blockBW = COLS_B * CELL;
  const totalW = blockAW + GAP + blockBW;
  const startX = (W - totalW) / 2;
  const aOx = startX;
  const bOx = startX + blockAW + GAP;
  const aOy = (H - Math.ceil(solids.length / COLS_A) * CELL) / 2 + 6;
  const bOy = (H - Math.ceil(ghosts.length / COLS_B) * CELL) / 2 + 6;
  const solidIdx = new Map(solids.map((e, i) => [e.id, i]));
  const ghostIdx = new Map(ghosts.map((e, i) => [e.id, i]));
  const qualityPos = (e) => {
    if (cat(e) === 'ghost') {
      const i = ghostIdx.get(e.id);
      return [bOx + (i % COLS_B) * CELL + CELL / 2, bOy + Math.floor(i / COLS_B) * CELL + CELL / 2];
    }
    const i = solidIdx.get(e.id);
    return [aOx + (i % COLS_A) * CELL + CELL / 2, aOy + Math.floor(i / COLS_A) * CELL + CELL / 2];
  };

  events.forEach((e, i) => { e._chrono = chronoPos(i); e._quality = qualityPos(e); e._cat = cat(e); });

  // Block-Überschriften (nur im Qualitäts-Modus sichtbar) ---------------------------
  const gLabels = svg.append('g').attr('class', 'uc-labels').attr('opacity', 0);
  gLabels.append('text').attr('class', 'uc-block-label')
    .attr('x', aOx + blockAW / 2).attr('y', aOy - 16).attr('text-anchor', 'middle')
    .text(`${solids.length} recorded`);
  gLabels.append('text').attr('class', 'uc-block-label')
    .attr('x', bOx + blockBW / 2).attr('y', bOy - 16).attr('text-anchor', 'middle')
    .text(`${ghosts.length} missing`);

  // Kreise --------------------------------------------------------------------------
  const gDots = svg.append('g').attr('class', 'uc-dots');
  const circles = gDots.selectAll('circle').data(events, (d) => d.id).join('circle')
    .attr('class', (d) => `unit-dot unit-${d._cat}`)
    .attr('cx', (d) => d._chrono[0]).attr('cy', (d) => d._chrono[1])
    .attr('r', rm ? R : 0)
    .on('mouseenter', (event, d) => showTip(event, d))
    .on('mousemove', (event, d) => positionTip(event))
    .on('mouseleave', hideTip);

  if (!rm) {
    circles.transition('uc-intro')
      .delay((_, i) => i * 7)
      .duration(360).ease(easeBackOut.overshoot(1.3))
      .attr('r', R);
  }

  // Lokaler Tooltip ----------------------------------------------------------------
  const tip = document.createElement('div');
  tip.className = 'tooltip';
  document.body.appendChild(tip);

  function tipContent(d) {
    const name = d.name ?? 'Unnamed storm';
    const country = d.country;
    if (d._cat === 'ghost') {
      const msg = d.intensity_kt != null
        ? 'Wind speed known, but the human impact was never officially recorded.'
        : (isScatterable(d) ? '' : 'Impact recorded, but the storm’s wind was never measured.');
      return `<div class="tt-title">${name} · ${d.year}</div>`
        + `<div class="tt-sub">${country}</div>`
        + `<div class="tt-emph">${msg}</div>`;
    }
    const quality = d._cat === 'recon'
      ? 'Wind reconstructed from disaster records'
      : 'Wind + impact recorded (complete)';
    return `<div class="tt-title">${name} · ${d.year}</div>`
      + `<div class="tt-sub">${country}</div>`
      + `<div class="tt-sub">${quality}</div>`;
  }
  function showTip(event, d) {
    tip.innerHTML = tipContent(d);
    tip.classList.add('visible');
    positionTip(event);
  }
  function positionTip(event) {
    const pad = 14;
    const r = tip.getBoundingClientRect();
    let x = event.clientX + pad;
    let y = event.clientY + pad;
    if (x + r.width > innerWidth - 8) x = event.clientX - r.width - pad;
    if (y + r.height > innerHeight - 8) y = event.clientY - r.height - pad;
    tip.style.left = `${Math.max(8, x)}px`;
    tip.style.top = `${Math.max(8, y)}px`;
  }
  function hideTip() { tip.classList.remove('visible'); }

  // Layout-Wechsel chrono ↔ quality -------------------------------------------------
  let lastSort = 'chrono';
  function layout(state) {
    const sort = state.unitSort ?? 'chrono';
    if (sort === lastSort) return;
    lastSort = sort;
    const target = sort === 'quality' ? (d) => d._quality : (d) => d._chrono;
    gLabels.transition('uc-lab').duration(400).attr('opacity', sort === 'quality' ? 1 : 0);
    const sel = rm ? circles : circles.transition('uc-sort')
      .delay((_, i) => i * 4).duration(700).ease(easeCubicOut);
    sel.attr('cx', (d) => target(d)[0]).attr('cy', (d) => target(d)[1]);
  }

  return {
    update(state, patch) {
      if (!patch || 'unitSort' in patch) layout(state);
    },
    destroy() { tip.remove(); svg.remove(); },
  };
}
