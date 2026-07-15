// Storm-Trend (Step 1) + Genesis-Drift (Step 2): gestapelte Liniendiagramme mit
// gemeinsamer Jahres-x-Achse, 2001–2025. Struktur-Klon von sstIntro (geteilte Ränder →
// bündige x-Achse, stroke-dashoffset-Draw, Crosshair durch alle Panels, lokaler .tooltip).
// Caption = Klartext-Verdikt (kein R²/p-Jargon), damit jeder sofort „No clear trend" versteht.
// Vertrag: create(container, ctx) → {update, destroy}; Zahlen/Fits aus data.trends (Pipeline).
//
// renderTrendPanels ist die geteilte Maschinerie; createStormTrend (Sturmzahl + Wind)
// und createGenesisTrend (Genesis-Breite beider Becken, geteilte y-Skala) sind dünne
// Spezialisierungen. buildGenesisModel ist pur und wird gegen trends.json getestet.
import { select, scaleLinear, line as d3line } from 'd3';

// Klartext-Verdikt aus dem Fit: nicht signifikant → „No clear trend", sonst die Richtung.
const verdict = (fit) =>
  (fit.p >= 0.05 ? 'No clear trend' : (fit.slope > 0 ? 'A clear upward trend' : 'A clear downward trend'));

const W = 960;
const H = 520;
const MARGIN = { top: 44, right: 72, bottom: 30, left: 60 };
const PLOT_H = 180;
const BLOCK = 230;          // Titel + Plot + Luft je Panel
const TITLE_DY = 16;        // Titel-Baseline über dem Plot
const TICKS_X = [2001, 2005, 2010, 2015, 2020, 2025];

// Geteilte Panel-Maschinerie: rendert panelSpecs als gestapelte Linien-Panels mit
// gemeinsamer x-Achse, Trendlinien, Captions, Crosshair + lokalem Tooltip.
// opts: { panelSpecs, aria, tipHtml(idx, year) → HTML, drift? }
function renderTrendPanels(container, ctx, { panelSpecs, aria, tipHtml, drift = null }) {
  const t = ctx.data.trends;
  const reducedMotion = ctx.bus.get?.().reducedMotion ?? false;
  const years = t.series.season;
  const [y0, y1] = t.window;

  const innerW = W - MARGIN.left - MARGIN.right;
  const x = scaleLinear().domain([y0, y1]).range([0, innerW]);

  const svg = select(container).append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('role', 'img')
    .attr('aria-label', aria);
  const root = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

  // Lokaler Tooltip (folgt dem Cursor; .tooltip-CSS wiederverwendet)
  const tip = document.createElement('div');
  tip.className = 'tooltip st-tip';
  document.body.appendChild(tip);

  const panels = panelSpecs.map((spec, i) => {
    const top = i * BLOCK;
    const plotT = top + 26;
    const plotB = plotT + PLOT_H;
    const y = scaleLinear().domain(spec.yDomain).range([plotB, plotT]);
    return { ...spec, top, plotT, plotB, y };
  });
  const spanTop = panels[0].plotT;
  const spanBottom = panels[panels.length - 1].plotB;

  const lineGen = (y) => d3line()
    .defined((d) => d.v != null)
    .x((d) => x(d.year))
    .y((d) => y(d.v));

  // ---- Panels rendern ----
  panels.forEach((p, pi) => {
    const g = root.append('g');

    // Panel-Titel
    g.append('text').attr('class', 'st-panel-title')
      .attr('x', 0).attr('y', p.top + TITLE_DY).text(p.title);

    // horizontale Gitterlinien + y-Beschriftung
    const ticks = p.y.ticks(p.yTicks);
    const gy = g.append('g').attr('class', 'st-axis');
    gy.selectAll('g').data(ticks).join('g')
      .attr('transform', (d) => `translate(0,${p.y(d)})`)
      .call((s) => s.append('line').attr('class', 'tt-gridline').attr('x1', 0).attr('x2', innerW))
      .call((s) => s.append('text').attr('class', 'tt-axis-label')
        .attr('x', -10).attr('dy', '0.32em').attr('text-anchor', 'end').text((d) => p.yFmt(d)));

    // Trendlinien (gestrichelt, --trend) — nur wo ein Fit hinterlegt ist
    p.series.forEach((s) => {
      if (!s.trend) return;
      const yAt = (yr) => clamp(s.trend.slope * yr + s.trend.intercept, p.yDomain[0], p.yDomain[1]);
      const tl = g.append('line').attr('class', 'trend-line')
        .attr('x1', x(y0)).attr('y1', p.y(yAt(y0)))
        .attr('x2', x(y1)).attr('y2', p.y(yAt(y1)));
      if (!reducedMotion) tl.attr('opacity', 0).transition('st-trend').delay(900).duration(500).attr('opacity', 1);
    });

    // Datenlinien
    p.series.forEach((s) => {
      const pts = years.map((yr, i) => ({ year: yr, v: s.values[i] }));
      const path = g.append('path')
        .attr('class', s.fill === 'var(--track)' ? 'st-line st-line--ctx' : 'st-line')
        .datum(pts).attr('d', lineGen(p.y));
      if (!reducedMotion) {
        const len = path.node().getTotalLength();
        path.attr('stroke-dasharray', `${len} ${len}`).attr('stroke-dashoffset', len)
          .transition('st-draw').delay(pi * 180).duration(1100)
          .attr('stroke-dashoffset', 0)
          .on('end', () => path.attr('stroke-dasharray', null).attr('stroke-dashoffset', null));
      }
      // Direkt-Label am Linienende (Panel mit zwei Serien)
      if (s.label) {
        const last = pts[pts.length - 1];
        g.append('text').attr('class', 'st-end-label')
          .attr('x', x(last.year) + 6).attr('y', p.y(last.v)).attr('dy', '0.32em')
          .attr('fill', s.fill).text(s.label);
      }
    });

    // Caption (Klartext-Verdikt) unten rechts im Plot
    g.append('text').attr('class', 'n-caption')
      .attr('x', innerW).attr('y', p.plotB - 6).attr('text-anchor', 'end').text(p.caption);
  });

  // Drift-Bracket (Genesis, optional): vertikale Spanne latFirst→latLast am rechten
  // Panel-Rand + Beschriftung der Verschiebung in km. Akzent nur als TEXT (--accent-text),
  // die Akzent-Exklusivität für Highlights bleibt gewahrt.
  if (drift) {
    const p = panels[drift.panel];
    const bx = innerW + 8;
    const gb = root.append('g').attr('class', 'st-drift');
    gb.append('line').attr('class', 'st-drift-span')
      .attr('x1', bx).attr('x2', bx)
      .attr('y1', p.y(drift.from)).attr('y2', p.y(drift.to));
    for (const v of [drift.from, drift.to]) {
      gb.append('line').attr('class', 'st-drift-span')
        .attr('x1', bx - 4).attr('x2', bx)
        .attr('y1', p.y(v)).attr('y2', p.y(v));
    }
    gb.append('text').attr('class', 'st-drift-note')
      .attr('x', innerW).attr('y', p.plotT + 12).attr('text-anchor', 'end')
      .text(drift.label);
  }

  // ---- gemeinsame x-Achse unter dem untersten Panel ----
  const gx = root.append('g').attr('class', 'st-axis');
  gx.selectAll('g').data(TICKS_X).join('g')
    .attr('transform', (yr) => `translate(${x(yr)},${spanBottom})`)
    .call((s) => s.append('line').attr('y2', 6))
    .call((s) => s.append('text').attr('y', 22).attr('text-anchor', 'middle').text((yr) => yr));

  // ---- Crosshair durch ALLE Panels + Punkt je Serie ----
  const cursor = root.append('g').attr('class', 'sst-cursor').style('display', 'none');
  cursor.append('line').attr('y1', spanTop).attr('y2', spanBottom);
  const cursorDots = cursor.append('g');

  let hoveredYear = null;
  function show(idx, event) {
    const yr = years[idx];
    const cx = x(yr);
    cursor.style('display', null).select('line').attr('x1', cx).attr('x2', cx);

    cursorDots.selectAll('circle').remove();
    panels.forEach((p) => p.series.forEach((s) => {
      const v = s.values[idx];
      if (v == null) return;
      cursorDots.append('circle').attr('r', 4)
        .attr('cx', cx).attr('cy', p.y(v))
        .attr('fill', s.fill).attr('stroke', '#fff').attr('stroke-width', 1.2);
    }));

    if (hoveredYear !== yr) {
      hoveredYear = yr;
      tip.innerHTML = tipHtml(idx, yr);
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
    cursorDots.selectAll('circle').remove();
    tip.classList.remove('visible');
  }

  root.append('rect').attr('class', 'st-overlay')
    .attr('x', 0).attr('y', spanTop).attr('width', innerW).attr('height', spanBottom - spanTop)
    .attr('fill', 'transparent')
    .on('mousemove', function (event) {
      const [px] = eventPointInRoot(event, this);
      const idx = Math.max(0, Math.min(years.length - 1, Math.round(x.invert(px)) - y0));
      show(idx, event);
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
    update() {}, // statisch (frozen Section) — Layout blendet die View ein/aus
    destroy() { svg.remove(); tip.remove(); },
  };
}

export function createStormTrend(container, ctx) {
  const t = ctx.data.trends;
  const S = t.series;
  return renderTrendPanels(container, ctx, {
    aria: 'Two stacked line charts, 2001 to 2025: the number of Pacific tropical storms per year '
      + 'and their average wind strength. Both are essentially flat — no clear trend — so storms '
      + 'here are not becoming more frequent or stronger.',
    panelSpecs: [
      {
        title: 'Storms per year',
        yDomain: [0, niceCeil(Math.max(...S.count), 15)], yTicks: 4, yFmt: (v) => v,
        caption: verdict(t.fits.count),
        series: [{ values: S.count, fill: 'var(--point)', trend: t.fits.count }],
      },
      {
        title: 'Average wind strength  ·  kt',
        yDomain: [40, 100], yTicks: 4, yFmt: (v) => v,
        caption: verdict(t.fits.windMean),
        series: [{ values: S.meanWind, fill: 'var(--point)', trend: t.fits.windMean }],
      },
    ],
    tipHtml: (idx, yr) => {
      const c = S.count[idx], w = S.meanWind[idx];
      return `<div class="tt-title">${yr}</div>`
        + `<div class="tt-sub">${c} storm${c === 1 ? '' : 's'} · ${w == null ? '—' : `${Math.round(w)} kt`} average wind</div>`;
    },
  });
}

// Genesis-Drift (Step 2), pur und getestet: beide Becken auf EINER y-Skala
// (Ehrlichkeits-Mechanik - ein Becken driftet, eins nicht; nur die gemeinsame
// Skala macht den Kontrast belastbar). Serien sind |Breite| (Saisonmittel des
// ersten Fixes mit Tropensturm-Stärke); SP heißt deshalb °S, nie „north".
export function buildGenesisModel(trends) {
  const f = trends.fits;
  const all = [...trends.series.genesisWP, ...trends.series.genesisSP].filter((v) => v != null);
  const lo = Math.floor(Math.min(...all) / 2) * 2;
  const hi = Math.ceil(Math.max(...all) / 2) * 2;
  const yDomain = [lo, hi];
  return {
    northKm: trends.summary.genesis.wpNorthKm,
    latFirst: trends.summary.genesis.wpLatFirst,
    latLast: trends.summary.genesis.wpLatLast,
    panels: [
      {
        key: 'wp',
        title: 'Northwest Pacific  ·  formation latitude  ·  °N',
        yDomain, yTicks: 4, yFmt: (v) => `${v}°`,
        caption: verdict(f.genesisWP),
        series: [{ values: trends.series.genesisWP, fill: 'var(--point)', trend: f.genesisWP }],
      },
      {
        key: 'sp',
        title: 'South Pacific  ·  formation latitude  ·  °S (distance from equator)',
        yDomain, yTicks: 4, yFmt: (v) => `${v}°`,
        caption: verdict(f.genesisSP),
        series: [{ values: trends.series.genesisSP, fill: 'var(--point)', trend: f.genesisSP }],
      },
    ],
  };
}

export function createGenesisTrend(container, ctx) {
  const t = ctx.data.trends;
  const S = t.series;
  const model = buildGenesisModel(t);
  const deg = (v, suffix) => (v == null ? '—' : `${v.toFixed(1)}${suffix}`);
  return renderTrendPanels(container, ctx, {
    aria: 'Two stacked line charts, 2001 to 2025, on one shared latitude scale: the average '
      + 'latitude where Pacific storms first reach tropical-storm strength. In the Northwest '
      + 'Pacific the formation latitude trends clearly poleward, about 322 kilometres since '
      + '2001; in the South Pacific it shows no clear trend.',
    panelSpecs: model.panels,
    tipHtml: (idx, yr) => `<div class="tt-title">${yr}</div>`
      + `<div class="tt-sub">NW Pacific ${deg(S.genesisWP[idx], '°N')} · South Pacific ${deg(S.genesisSP[idx], '°S')}</div>`,
    drift: {
      panel: 0, from: model.latFirst, to: model.latLast,
      label: `≈ ${model.northKm} km poleward`,
    },
  });
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const niceCeil = (v, step) => Math.ceil(v / step) * step;
