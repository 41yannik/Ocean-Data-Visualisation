// Dashboard-Kachel „Storm hot zones" (Explore, 2x2-Grid): geografische 2D-Heatmap
// über dem Pazifik-Raster. Zellwert = Summe des Spitzenwinds aller Stürme, deren
// Track die Zelle kreuzt (= Frequenz × Intensität in EINER Zahl). Gleiche Projektion
// wie die Hero-Map (960x480, rotate[-192,0]) → Geografie deckungsgleich; Binning im
// projizierten Pixelraum ist dadurch antimeridian-sicher (Naht liegt außerhalb der Daten).
// Cross-Highlighting: hover.sid → gekreuzte Zellen leuchten + Track-Overlay in Akzent;
// Zell-Hover emittiert textSet (1:n-Kanal) → Karte/Scatter/Trend spiegeln die Stürme.
import { select, scaleSequentialSqrt, interpolateLab } from 'd3';
import { makePacificProjection, makeGeoPath } from '../core/scales.js';
import { COLORS } from '../core/config.js';
import { matchesFilters } from '../core/filters.js';
import { fmtKt } from '../core/format.js';

const CELL = 12; // px im viewBox-Raum → 80x40-Raster

// Eigene, flachere Dims als die Hero-Karte (~1.86:1, 80x43-Zellraster): füllt die
// Grid-Kachel ohne Letterbox; die Pazifik-Projektion wird auf diese Fläche refittet.
const HEAT = { width: 960, height: 516 };

export function createTrackHeatmap(container, ctx) {
  const { data, bus } = ctx;
  const { bySid } = data.index;
  const projection = makePacificProjection(HEAT.width, HEAT.height);
  const geoPath = makeGeoPath(projection);
  const cols = Math.ceil(HEAT.width / CELL);

  // --- Binning einmalig je Sturm: Zellen mit dem dort maximalen Wind ---
  const cellIdx = (px, py) => {
    if (px < 0 || py < 0 || px >= HEAT.width || py >= HEAT.height) return null;
    return Math.floor(py / CELL) * cols + Math.floor(px / CELL);
  };
  const storms = Object.entries(data.tracks).map(([sid, pts]) => {
    const cells = new Map(); // idx → max. Wind dieses Sturms in der Zelle
    const addSample = (px, py, wind) => {
      const idx = cellIdx(px, py);
      if (idx == null) return;
      if (wind > (cells.get(idx) ?? -1)) cells.set(idx, wind);
    };
    let prev = null;
    for (const p of pts) {
      const proj = projection([p[0], p[1]]);
      const wind = Math.max(p[2] ?? 0, 0);
      if (!proj) { prev = null; continue; }
      if (prev) {
        // Segment alle CELL/2 px sampeln - füllt die Lücken zwischen 6-h-Fixes
        const n = Math.max(1, Math.ceil(Math.hypot(proj[0] - prev.x, proj[1] - prev.y) / (CELL / 2)));
        for (let i = 1; i <= n; i++) {
          addSample(prev.x + ((proj[0] - prev.x) * i) / n,
            prev.y + ((proj[1] - prev.y) * i) / n,
            prev.wind + ((wind - prev.wind) * i) / n);
        }
      } else {
        addSample(proj[0], proj[1], wind);
      }
      prev = { x: proj[0], y: proj[1], wind };
    }
    return {
      sid,
      events: bySid.get(sid) ?? [],
      cells,
      lineString: { type: 'LineString', coordinates: pts.map((p) => [p[0], p[1]]) },
    };
  });

  function aggregate(filters) {
    const agg = new Map(); // idx → { value, count, maxWind, sids }
    for (const s of storms) {
      if (filters && !s.events.some((e) => matchesFilters(e, filters))) continue;
      for (const [idx, wind] of s.cells) {
        let c = agg.get(idx);
        if (!c) agg.set(idx, (c = { idx, value: 0, count: 0, maxWind: 0, sids: new Set() }));
        c.value += wind;
        c.count += 1;
        c.maxWind = Math.max(c.maxWind, wind);
        c.sids.add(s.sid);
      }
    }
    return [...agg.values()];
  }

  // Farbdomain fix auf das UNGEFILTERTE Maximum: Filtern liest sich als Wegnehmen,
  // nicht als Umskalieren. Sequentielles Ozeanblau; --accent bleibt dem Highlight.
  const maxValue = Math.max(...aggregate(null).map((c) => c.value));
  const color = scaleSequentialSqrt([0, maxValue], interpolateLab(COLORS.bg, COLORS.trend));

  const svg = select(container).append('svg')
    .attr('viewBox', `0 0 ${HEAT.width} ${HEAT.height}`).attr('role', 'img')
    .attr('aria-label', 'Heatmap of the Pacific region: cell color encodes how many and how strong storms crossed each area since 2001');

  // Land-Silhouette als Orientierung UNTER den Zellen
  svg.append('path').datum(data.land).attr('class', 'land').attr('d', geoPath);
  const gCells = svg.append('g');
  const gOverlay = svg.append('g'); // Track des gehoverten Sturms

  // Gradient-Legende unten rechts (weißes Backing gegen Zell-Überlagerung)
  const defs = svg.append('defs');
  const grad = defs.append('linearGradient').attr('id', 'heat-grad');
  for (const t of [0, 0.25, 0.5, 0.75, 1]) {
    grad.append('stop').attr('offset', `${t * 100}%`).attr('stop-color', color(maxValue * t * t));
  }
  const gLegend = svg.append('g').attr('transform', `translate(${HEAT.width - 248}, ${HEAT.height - 34})`);
  gLegend.append('rect').attr('x', -8).attr('y', -6).attr('width', 248).attr('height', 34)
    .attr('fill', '#ffffff').attr('fill-opacity', 0.8).attr('rx', 4);
  gLegend.append('rect').attr('width', 210).attr('height', 8).attr('fill', 'url(#heat-grad)');
  gLegend.append('text').attr('class', 'heat-legend-label').attr('x', 0).attr('y', 22).text('rare / weak');
  gLegend.append('text').attr('class', 'heat-legend-label').attr('x', 210).attr('y', 22)
    .attr('text-anchor', 'end').text('frequent / intense');

  // Lokaler Tooltip (Muster der anderen Kacheln); global geht textSet an alle Views
  const tip = document.createElement('div');
  tip.className = 'tooltip';
  document.body.appendChild(tip);
  const moveTip = (event) => {
    const pad = 14;
    const r = tip.getBoundingClientRect();
    let px = event.clientX + pad;
    let py = event.clientY + pad;
    if (px + r.width > innerWidth - 8) px = event.clientX - r.width - pad;
    if (py + r.height > innerHeight - 8) py = event.clientY - r.height - pad;
    tip.style.left = `${Math.max(8, px)}px`;
    tip.style.top = `${Math.max(8, py)}px`;
  };

  const idsForCell = (d) => {
    const ids = new Set();
    for (const s of storms) {
      if (!d.sids.has(s.sid)) continue;
      for (const e of s.events) ids.add(e.id);
    }
    return ids;
  };

  let cellSel = gCells.selectAll('rect');
  function renderCells(filters) {
    cellSel = gCells.selectAll('rect')
      .data(aggregate(filters), (d) => d.idx)
      .join('rect')
      .attr('class', 'heat-cell')
      .attr('x', (d) => (d.idx % cols) * CELL)
      .attr('y', (d) => Math.floor(d.idx / cols) * CELL)
      .attr('width', CELL).attr('height', CELL)
      .attr('fill', (d) => color(d.value))
      .on('mouseenter', (event, d) => {
        tip.innerHTML = `<div class="tt-title">${d.count} storm${d.count > 1 ? 's' : ''}</div>`
          + `<div class="tt-sub">strongest here: <strong>${fmtKt(d.maxWind)}</strong></div>`;
        tip.classList.add('visible');
        moveTip(event);
        bus.set({ textSet: { ids: idsForCell(d) } });
      })
      .on('mousemove', moveTip)
      .on('mouseleave', () => {
        tip.classList.remove('visible');
        bus.set({ textSet: null });
      });
  }

  function applyState(state) {
    const hoverSid = state.hover?.sid ?? null;
    const sel = state.selectedEventIds;
    const textSet = state.textSet?.ids ?? null;

    // Aktive Sturm-Menge: Hover (1 Sturm) > Brush-Selektion > textSet (Trend/Heatmap)
    let activeSids = null;
    if (hoverSid) {
      activeSids = new Set([hoverSid]);
    } else if (sel?.size) {
      activeSids = new Set(storms.filter((s) => s.events.some((e) => sel.has(e.id))).map((s) => s.sid));
    } else if (textSet) {
      activeSids = new Set(storms.filter((s) => s.events.some((e) => textSet.has(e.id))).map((s) => s.sid));
    }

    const crosses = (d) => {
      for (const sid of d.sids) if (activeSids.has(sid)) return true;
      return false;
    };
    cellSel
      .classed('hl', (d) => (activeSids ? crosses(d) : false))
      .classed('dim', (d) => (activeSids ? !crosses(d) : false));

    // Track-Overlay nur beim Einzel-Hover (Selektion/Set wäre Pfad-Spaghetti)
    const overlay = hoverSid ? storms.filter((s) => s.sid === hoverSid) : [];
    gOverlay.selectAll('path')
      .data(overlay, (d) => d.sid)
      .join('path')
      .attr('class', 'heat-track-overlay')
      .attr('d', (d) => geoPath(d.lineString));
  }

  // Effektiver Filter: aktives Scrubber-Jahr überschreibt den Jahr-Range auf [Jahr, Jahr]
  // (Farb-Domain bleibt fix → einzelnes Jahr liest sich als „Wegnehmen", nicht als Umskalieren).
  const effectiveFilters = (state) => {
    const ay = state.activeYear ?? null;
    return ay == null ? state.filters : { ...state.filters, yearRange: [ay, ay] };
  };

  return {
    update(state, patch) {
      if (!patch || 'filters' in patch || 'activeYear' in patch) {
        renderCells(effectiveFilters(state));
        applyState(state);
        return;
      }
      if ('hover' in patch || 'selectedEventIds' in patch || 'textSet' in patch) {
        applyState(state);
      }
    },
    destroy() { tip.remove(); svg.remove(); },
  };
}
