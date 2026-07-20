// Unit-Chart-Mathematik fuer Step 8 "What the data hides" (Formations-Morph).
// Jedes Land-Jahr mit gemeldetem Toll = ein Kreis. Zwei Zustaende der offenen Daten:
//   - solide (blau, gefuellt): Toll gemeldet UND ein Zyklon im Naehe-Radius (scatterbar)
//   - hohl (zarte Kontur):     Toll gemeldet, aber KEIN Zyklon im Radius - der Jahreswert
//     stammt aus anderen Katastrophen (Flut, Duerre); ehrliche Grenze der Verknuepfung.
// Layout-Mathematik + Tooltip-Wortlaut sind exportiert: der Formations-Morph
// (story/formationLayer.js) benutzt exakt dieselben Zielpositionen und Texte.
import { isScatterable } from '../core/filters.js';

const W = 860;
const H = 560;
const CELL = 42;
const R = 13;

export const unitCat = (e) => (isScatterable(e) ? 'solid' : 'ghost');

export function computeUnitLayout(rawEvents, { W: width = W, H: height = H, cell = CELL } = {}) {
  const COLS = 11;      // 11 Spalten (chronologisches Raster)
  const COLS_A = 9;     // Block "complete" (Toll + Zyklon)
  const COLS_B = 3;     // Block "no cyclone in range"
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

  // Qualitäts-Position: zwei Blöcke nebeneinander - vollständig (Toll + Zyklon) ↔ ohne Zyklon.
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
  const name = d.name ?? 'No named storm';
  const country = d.country;
  const cat = unitCat(d);
  const head = `<div class="tt-title">${name} · ${d.year}</div>`
    + `<div class="tt-sub">${country}</div>`;
  if (cat === 'ghost') {
    return `${head}<div class="tt-emph">A toll was reported, but no cyclone came within 500 km that year: this annual count stems from other disasters.</div>`;
  }
  return `${head}<div class="tt-sub">Toll + nearby cyclone recorded (complete)</div>`;
}
