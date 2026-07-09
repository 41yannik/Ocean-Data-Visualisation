// Step 7 „What the data hides" - Unit Chart (Dot Matrix) der exakt 99 Sturm-Land-Paare.
// Jedes Paar = ein Kreis. Vierstufiges Encoding der Datenqualität:
//   • solide (blau, gefüllt)        - 78 vollständige Paare (Wind + Impact)
//   • rekonstruiert (dashed Kontur) - Teilmenge davon: Wind aus Katastrophen-Akten, nicht Satellit
//   • Ghost (transparent, zarte Kontur) - 20 Paare, deren menschliche Auswirkung nie erfasst wurde
//   • nowind (halb gefüllt)         - 1 Paar mit erfasstem Impact, aber ohne gemessenen Wind
//     (ehrliche Zerlegung: 20 ohne Toll + 1 ohne Wind = 21 nicht-scatterbar, NICHT „21 ohne Toll")
// Sortierung: chronologisch (wann?) ↔ nach Qualität (zwei harte Blöcke, via Store-Feld unitSort).
// Ghost-Hover trägt die eigentliche Botschaft: „Impact nie offiziell erfasst - Toll unbekannt, nicht null."
//
// Layout-Mathematik + Tooltip-Wortlaut sind exportiert (Paket 10 Task 8): der
// Formations-Morph (story/formationLayer.js) benutzt exakt dieselben Zielpositionen
// und Texte - nur mit Scatter-Maßen statt der 860×560-Bühne.
import { select, easeCubicOut, easeBackOut } from 'd3';
import { isScatterable } from '../core/filters.js';

const W = 860;
const H = 560;
const CELL = 42;
const R = 13;

export const unitCat = (e) => {
  if (isScatterable(e)) return e.intensity_source === 'emdat_fallback' ? 'recon' : 'solid';
  // nicht-scatterbar: Impact erfasst aber Wind fehlt (nowind) ↔ Impact nie erfasst (ghost)
  return e.affected != null ? 'nowind' : 'ghost';
};

export function computeUnitLayout(rawEvents, { W: width = W, H: height = H, cell = CELL } = {}) {
  const COLS = 11;      // 11 × 9 = 99 exakt (chronologisches Raster)
  const COLS_A = 9;     // 78 „recorded"
  const COLS_B = 3;     // 21 „missing"
  const GAP = cell * 1.7;

  // 99 Paare, chronologisch geordnet (Jahr, dann Monat/ID)
  const events = [...rawEvents].sort((a, b) =>
    a.year - b.year || (a.month ?? 0) - (b.month ?? 0) || a.id.localeCompare(b.id));

  // Chronologische Rasterposition
  const gridW = COLS * cell;
  const gridH = Math.ceil(events.length / COLS) * cell;
  const oxC = (width - gridW) / 2;
  const oyC = (height - gridH) / 2 - 4;
  const chronoIdx = new Map(events.map((e, i) => [e.id, i]));
  const chrono = (e) => {
    const i = chronoIdx.get(e.id);
    return [oxC + (i % COLS) * cell + cell / 2, oyC + Math.floor(i / COLS) * cell + cell / 2];
  };

  // Qualitäts-Position: zwei Blöcke nebeneinander - vollständig (scatterbar) ↔ unvollständig.
  // nowind gehört zum unvollständigen Block (nicht scatterbar), bleibt aber visuell eigen.
  const solids = events.filter((e) => isScatterable(e));
  const ghosts = events.filter((e) => !isScatterable(e));
  const blockAW = COLS_A * cell;
  const blockBW = COLS_B * cell;
  const totalW = blockAW + GAP + blockBW;
  const startX = (width - totalW) / 2;
  const aOx = startX;
  const bOx = startX + blockAW + GAP;
  const aOy = (height - Math.ceil(solids.length / COLS_A) * cell) / 2 + 6;
  const bOy = (height - Math.ceil(ghosts.length / COLS_B) * cell) / 2 + 6;
  const solidIdx = new Map(solids.map((e, i) => [e.id, i]));
  const ghostIdx = new Map(ghosts.map((e, i) => [e.id, i]));
  const quality = (e) => {
    if (!isScatterable(e)) {
      const i = ghostIdx.get(e.id);
      return [bOx + (i % COLS_B) * cell + cell / 2, bOy + Math.floor(i / COLS_B) * cell + cell / 2];
    }
    const i = solidIdx.get(e.id);
    return [aOx + (i % COLS_A) * cell + cell / 2, aOy + Math.floor(i / COLS_A) * cell + cell / 2];
  };

  return {
    events,
    cat: unitCat,
    chrono,
    quality,
    labels: {
      a: { x: aOx + blockAW / 2, y: aOy - 16, text: `${solids.length} complete` },
      b: { x: bOx + blockBW / 2, y: bOy - 16, text: `${ghosts.length} incomplete` },
    },
  };
}

export function unitTipContent(d) {
  const name = d.name ?? 'Unnamed storm';
  const country = d.country;
  const cat = unitCat(d);
  const head = `<div class="tt-title">${name} · ${d.year}</div>`
    + `<div class="tt-sub">${country}</div>`;
  if (cat === 'ghost') {
    return `${head}<div class="tt-emph">Impact never officially recorded — the human toll is unknown, not zero.</div>`;
  }
  if (cat === 'nowind') {
    return `${head}<div class="tt-emph">Impact recorded, but the storm’s wind was never measured — so this pair can’t join the scatter.</div>`;
  }
  const quality = cat === 'recon'
    ? 'Wind reconstructed from disaster records'
    : 'Wind + impact recorded (complete)';
  return `${head}<div class="tt-sub">${quality}</div>`;
}

export function createUnitChart(container, ctx) {
  const { data, bus } = ctx;
  const rm = bus.get().reducedMotion;

  const svg = select(container).append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img');

  const layoutFns = computeUnitLayout(data.events);
  const events = layoutFns.events;
  events.forEach((e) => { e._chrono = layoutFns.chrono(e); e._quality = layoutFns.quality(e); e._cat = layoutFns.cat(e); });

  // Block-Überschriften (nur im Qualitäts-Modus sichtbar) ---------------------------
  const gLabels = svg.append('g').attr('class', 'uc-labels').attr('opacity', 0);
  gLabels.append('text').attr('class', 'uc-block-label')
    .attr('x', layoutFns.labels.a.x).attr('y', layoutFns.labels.a.y).attr('text-anchor', 'middle')
    .text(layoutFns.labels.a.text);
  gLabels.append('text').attr('class', 'uc-block-label')
    .attr('x', layoutFns.labels.b.x).attr('y', layoutFns.labels.b.y).attr('text-anchor', 'middle')
    .text(layoutFns.labels.b.text);

  // Statische Legende der vier Zustände (Review-Fix: die Zustände waren nur in Prosa,
  // ARIA und Hover kodiert - jetzt am Chart lesbar). Reused unit-* Klassen, pointer-events
  // aus (kein Hover-Akzent); horizontal per getBBox zentriert.
  const gLegend = svg.append('g').attr('class', 'uc-legend');
  const legItems = [
    { cls: 'unit-solid', label: 'complete' },
    { cls: 'unit-nowind', label: 'impact, no wind' },
    { cls: 'unit-ghost', label: 'impact missing' },
    { cls: 'unit-recon', label: 'wind reconstructed' },
  ];
  let lx = 0;
  for (const it of legItems) {
    gLegend.append('circle').attr('class', `unit-dot ${it.cls}`)
      .attr('cx', lx).attr('cy', 0).attr('r', 8).style('pointer-events', 'none');
    const t = gLegend.append('text').attr('class', 'uc-legend-label').attr('x', lx + 14).attr('y', 4).text(it.label);
    lx += 14 + t.node().getComputedTextLength() + 30;
  }
  const lbb = gLegend.node().getBBox();
  gLegend.attr('transform', `translate(${(W - lbb.width) / 2 - lbb.x}, ${H - 18})`);

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

  function showTip(event, d) {
    tip.innerHTML = unitTipContent(d);
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
