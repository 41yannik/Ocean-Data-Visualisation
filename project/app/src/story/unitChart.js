// Unit-Chart-Mathematik fuer den Ehrlichkeits-Beat (Formations-Morph).
// Jedes gemeldete Land-Jahr = ein Kreis. Drei Zustaende der offenen Daten:
//   - solide (blau, gefuellt): positiver Toll UND ein Zyklon im Naehe-Radius
//   - zero (Akzent, hohl):     Zyklon im Radius, aber ausdruecklich 0 Betroffene gemeldet
//   - ghost (zarte Kontur):    Toll gemeldet, aber KEIN Zyklon im Radius - der Jahreswert
//     stammt aus anderen Katastrophen (Flut, Duerre); ehrliche Grenze der Verknuepfung.
// Die zero-Klasse ist neu (Audit 2026-07): vorher waren diese 75 Meldungen aus den Daten
// gefiltert und wurden im Text faelschlich als "fehlend" gefuehrt.
// Layout-Mathematik + Tooltip-Wortlaut sind exportiert: der Formations-Morph
// (story/formationLayer.js) benutzt exakt dieselben Zielpositionen und Texte.
import { isScatterable, isZeroLane } from '../core/filters.js';

const W = 860;
const H = 560;
const CELL = 42;
const R = 13;

export const unitCat = (e) => (isScatterable(e) ? 'solid' : isZeroLane(e) ? 'zero' : 'ghost');

export function computeUnitLayout(rawEvents, { W: width = W, H: height = H, cell = CELL } = {}) {
  const COLS = 14;      // chronologisches Raster (174 Meldungen)
  // Spaltenzahl der drei Qualitaets-Bloecke: bewusst schmaler (Audit 2026-07). Vorher
  // 8/7/7 Spalten ergaben zusammen ~683 px und sprengten die Innenbreite (562 px) - der
  // dritte Block "kein Zyklon" lief samt Label rechts aus dem Rahmen. 7/5/5 Spalten plus
  // ein klarer Gruppen-Gap passen vollstaendig und trennen die Gruppen sichtbar.
  const COLS_A = 7;     // Block "positiver Toll + Zyklon" (der groesste, 70)
  const COLS_B = 5;     // Bloecke "0 gemeldet" (51) und "kein Zyklon" (53)
  const GAP = cell * 1.3;

  // Alle Meldungen, chronologisch geordnet (Jahr, dann ID - ein Monat liegt nicht vor)
  const events = [...rawEvents].sort((a, b) => a.year - b.year || a.id.localeCompare(b.id));

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

  // Qualitaets-Position: drei Bloecke - positiver Toll / gemeldete Null / kein Zyklon.
  const solids = events.filter((e) => unitCat(e) === 'solid');
  const zeros = events.filter((e) => unitCat(e) === 'zero');
  const ghosts = events.filter((e) => unitCat(e) === 'ghost');
  const blockAW = COLS_A * cell;
  const blockBW = COLS_B * cell;
  const blockCW = COLS_B * cell;
  const totalW = blockAW + GAP + blockBW + GAP + blockCW;
  const startX = (width - totalW) / 2;
  const aOx = startX;
  const bOx = startX + blockAW + GAP;
  const cOx = bOx + blockBW + GAP;
  // Alle drei Bloecke an DERSELBEN Oberkante ausrichten (statt jeden einzeln vertikal zu
  // zentrieren): die Gruppen lesen sich als saubere Reihe und die drei Labels stehen auf
  // einer Linie, statt je nach Blockhoehe leicht zu verspringen.
  const rowsOf = (list, cols) => Math.ceil(list.length / cols) * cell;
  const blockH = Math.max(rowsOf(solids, COLS_A), rowsOf(zeros, COLS_B), rowsOf(ghosts, COLS_B));
  const blockOy = (height - blockH) / 2 + 6;
  const aOy = blockOy;
  const bOy = blockOy;
  const cOy = blockOy;
  const idxOf = (list) => new Map(list.map((e, i) => [e.id, i]));
  const solidIdx = idxOf(solids);
  const zeroIdx = idxOf(zeros);
  const ghostIdx = idxOf(ghosts);
  const place = (i, ox, oy, cols) =>
    [ox + (i % cols) * cell + cell / 2, oy + Math.floor(i / cols) * cell + cell / 2];
  const quality = (e) => {
    const c = unitCat(e);
    if (c === 'zero') return place(zeroIdx.get(e.id), bOx, bOy, COLS_B);
    if (c === 'ghost') return place(ghostIdx.get(e.id), cOx, cOy, COLS_B);
    return place(solidIdx.get(e.id), aOx, aOy, COLS_A);
  };

  return {
    events,
    cat: unitCat,
    chrono,
    quality,
    labels: {
      a: { x: aOx + blockAW / 2, y: aOy - 16, text: `${solids.length} reported a toll` },
      b: { x: bOx + blockBW / 2, y: bOy - 16, text: `${zeros.length} reported zero` },
      c: { x: cOx + blockCW / 2, y: cOy - 16, text: `${ghosts.length} no cyclone near` },
    },
  };
}

export function unitTipContent(d) {
  const name = d.name ?? 'No named storm';
  const country = d.country;
  const cat = unitCat(d);
  const head = `<div class="tt-title">${name} · ${d.year}</div>`
    + `<div class="tt-sub">${country}</div>`;
  if (cat === 'ghost') {
    return `${head}<div class="tt-emph">A toll was reported, but no cyclone came within 500 km that year: this annual count stems from other disasters.</div>`;
  }
  if (cat === 'zero') {
    return `${head}<div class="tt-emph">A cyclone reached this country, but the series reports exactly zero people affected that year.</div>`;
  }
  return `${head}<div class="tt-sub">Reported toll with a cyclone in range</div>`;
}
