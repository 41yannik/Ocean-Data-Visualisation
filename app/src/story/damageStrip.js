// Damage-Strip (Beat „The toll has two currencies"): erste Nutzung von damage_kusd.
// Eine Zeile je Land mit mindestens EINEM Dollarwert, x = log10(US$) - und die
// Lücken sind Inhalt erster Klasse: jede Zeile zählt „x of y with a figure", eine
// abgesetzte Ledger-Zeile beziffert die Länder, für die NIE ein Dollarwert erfasst
// wurde. Bewusst KEINE vierte Formation im dots2-Stage: 67 der 99 Kreise hätten
// keine ehrliche Position auf einer Dollar-Achse (Ghost-Prinzip aus residualRows).
//
// buildDamageStrip ist pur (Muster computeResidualRows) und gegen events.json
// getestet; createDamageStrip rendert im stormTrend/residualLab-Idiom.
import { select, scaleLog } from 'd3';
import { fmtPct, fmtUsdCompact } from '../core/format.js';

const W = 960;
const H = 560;
const LABEL_W = 150;        // längste Labels: „New Caledonia", „American Samoa"
const PAD_TOP = 26;
const AXIS_H = 44;
const LEDGER_H = 34;        // abgesetzte Zeile für die Länder ohne Dollarwert
const DOT_R = 6;            // gleiche Punktsprache wie die Zeilen-Formationen (RR_R)
// Feste x-Domain mit Luft um die beobachtete Spanne (500…4.3e6 kUSD) - hartkodiert,
// damit die Achse über Datenstände hinweg stabil steht; clamp fängt Ausreißer.
const DOMAIN_KUSD = [300, 6e6];
// Lane-Versätze für den deterministischen Dodge - Muster aus residualRows.js.
const LANES = [0, -9, 9, -18, 18];
const TICKS = [
  { v: 1e3, label: '$1M' },
  { v: 1e4, label: '$10M' },
  { v: 1e5, label: '$100M' },
  { v: 1e6, label: '$1B' },
];

export function buildDamageStrip(events, { W: width = W, H: height = H } = {}) {
  const x = scaleLog().domain(DOMAIN_KUSD).range([LABEL_W, width - 24]).clamp(true);

  // Länder-Gruppen: Zeile nur bei ≥1 Dollarwert; der Rest wird als Ledger gezählt.
  const byIso = new Map();
  for (const e of events) {
    if (!byIso.has(e.iso3)) byIso.set(e.iso3, { key: e.iso3, label: e.country, events: [] });
    byIso.get(e.iso3).events.push(e);
  }
  const withDollar = [...byIso.values()].filter((g) => g.events.some((e) => e.damage_kusd != null));
  const silentGroups = [...byIso.values()].filter((g) => g.events.every((e) => e.damage_kusd == null));
  withDollar.sort((a, b) => sumKusd(b) - sumKusd(a) || a.label.localeCompare(b.label));

  const rowsH = height - PAD_TOP - AXIS_H - LEDGER_H;
  const rowH = rowsH / Math.max(1, withDollar.length);

  const rows = withDollar.map((g, i) => {
    const cy = PAD_TOP + i * rowH + rowH / 2;
    const dollars = g.events.filter((e) => e.damage_kusd != null)
      .sort((a, b) => a.damage_kusd - b.damage_kusd || a.id.localeCompare(b.id));
    const lastX = LANES.map(() => -Infinity);
    const dots = dollars.map((e) => {
      const px = x(e.damage_kusd);
      let lane = LANES.findIndex((_, k) => px - lastX[k] >= DOT_R * 2 + 1);
      if (lane < 0) lane = lastX.indexOf(Math.min(...lastX));
      lastX[lane] = px;
      return { id: e.id, x: px, y: cy + LANES[lane], e };
    });
    return {
      key: g.key, label: g.label, y: cy, dots,
      nDollars: dollars.length, nRecords: g.events.length, sumKusd: sumKusd(g),
    };
  });

  const dollarEvents = events.filter((e) => e.damage_kusd != null);
  const totalKusd = dollarEvents.reduce((sum, e) => sum + e.damage_kusd, 0);
  const top = dollarEvents.reduce((a, b) => (b.damage_kusd > (a?.damage_kusd ?? -1) ? b : a), null);

  return {
    rows,
    x,
    nWith: dollarEvents.length,
    nWithout: events.length - dollarEvents.length,
    totalKusd,
    silent: {
      countries: silentGroups.length,
      records: silentGroups.reduce((sum, g) => sum + g.events.length, 0),
    },
    topRecord: top ? { id: top.id, event: top, share: top.damage_kusd / totalKusd } : null,
    labelX: LABEL_W - 12,
    rowsBottom: PAD_TOP + rowsH,
    ledgerY: PAD_TOP + rowsH + LEDGER_H - 12,
    axisY: height - AXIS_H + 24,
    ticks: TICKS.map((t) => ({ ...t, x: x(t.v) })),
  };
}

const sumKusd = (g) => g.events.reduce((sum, e) => sum + (e.damage_kusd ?? 0), 0);

export function createDamageStrip(container, ctx) {
  const model = buildDamageStrip(ctx.data.events, { W, H });
  const reducedMotion = ctx.bus.get?.().reducedMotion ?? false;

  const svg = select(container).append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('role', 'img')
    .attr('aria-label',
      'Dot plot of recorded storm damage per country on a logarithmic US-dollar axis. '
      + 'Eleven countries carry at least one recorded damage figure, led by Guam, where a single '
      + 'record (Typhoon Mawar 2023) accounts for about two thirds of every recorded dollar. '
      + 'A closing note counts the countries whose storm records never received a dollar figure.');
  const root = svg.append('g');

  // Vertikale Log-Gridlines + Tick-Labels (gleiche zurückhaltende Achsen-Sprache
  // wie die Zeilen-Formationen).
  for (const t of model.ticks) {
    root.append('line').attr('class', 'ds-grid')
      .attr('x1', t.x).attr('x2', t.x)
      .attr('y1', PAD_TOP - 8).attr('y2', model.rowsBottom);
    root.append('text').attr('class', 'ds-tick')
      .attr('x', t.x).attr('y', model.axisY).attr('text-anchor', 'middle').text(t.label);
  }

  // Zeilen: Label + ehrlicher Zähler links, Punkte auf der Dollar-Achse.
  for (const row of model.rows) {
    root.append('text').attr('class', 'ds-row-label')
      .attr('x', model.labelX).attr('y', row.y - 1).attr('text-anchor', 'end').text(row.label);
    root.append('text').attr('class', 'ds-row-count')
      .attr('x', model.labelX).attr('y', row.y + 13).attr('text-anchor', 'end')
      .text(`${row.nDollars} of ${row.nRecords} with a figure`);
  }
  const dots = root.selectAll('circle').data(model.rows.flatMap((row) => row.dots), (d) => d.id)
    .join('circle')
    .attr('class', (d) => `ds-dot${d.id === model.topRecord?.id ? ' ds-dot--top' : ''}`)
    .attr('cx', (d) => d.x).attr('cy', (d) => d.y).attr('r', DOT_R);

  // Der eine Akzent-Einsatz: Mawar/Guam dominiert das Register - Anteil generiert,
  // nie getippt (topRecord.share).
  if (model.topRecord) {
    // Leicht über die Zeile gesetzt, damit der Text nicht mit Nachbar-Punkten auf
    // derselben Baseline kollidiert (Guams übrige Dollar-Records liegen links daneben).
    const topDot = model.rows.flatMap((r) => r.dots).find((d) => d.id === model.topRecord.id);
    root.append('text').attr('class', 'ds-annotation')
      .attr('x', topDot.x - 2).attr('y', topDot.y - 16).attr('text-anchor', 'end')
      .text(`${model.topRecord.event.name} over ${model.topRecord.event.country}, `
        + `${model.topRecord.event.year} · ${fmtPct(model.topRecord.share)} of every recorded dollar`);
  }

  // Ledger-Zeile: die stille Mehrheit, bewusst NICHT auf der Achse platziert -
  // fehlende Werte bekommen keine erfundene Position.
  root.append('text').attr('class', 'ds-ledger')
    .attr('x', LABEL_W).attr('y', model.ledgerY)
    .text(`${model.silent.countries} more countries · ${model.silent.records} storm records · `
      + 'no dollar figure ever recorded');

  // Lokaler Tooltip: beide Währungen je Record, Fehlwerte in der Methodik-Sprache.
  const tip = document.createElement('div');
  tip.className = 'tooltip';
  document.body.appendChild(tip);
  dots
    .on('mouseenter', (event, d) => {
      const e = d.e;
      tip.innerHTML = `<div class="tt-title">${e.name ?? 'Unnamed storm'} · ${e.country} · ${e.year}</div>`
        + `<div class="tt-sub">reported damage <strong>${fmtUsdCompact(e.damage_kusd)}</strong></div>`
        + `<div class="tt-sub">${e.affected_pc != null
          ? `${fmtPct(e.affected_pc)} of population reported affected`
          : 'human toll not reported'}</div>`;
      tip.classList.add('visible');
      positionTip(event);
    })
    .on('mousemove', positionTip)
    .on('mouseleave', () => tip.classList.remove('visible'));
  function positionTip(event) {
    const pad = 14;
    const r = tip.getBoundingClientRect();
    let px = event.clientX + pad;
    let py = event.clientY + pad;
    if (px + r.width > innerWidth - 8) px = event.clientX - r.width - pad;
    if (py + r.height > innerHeight - 8) py = event.clientY - r.height - pad;
    tip.style.left = `${Math.max(8, px)}px`;
    tip.style.top = `${Math.max(8, py)}px`;
  }

  // Draw-in (Reihenfolge = Zeilen von oben): hinter dem reducedMotion-Gate.
  if (!reducedMotion) {
    dots.attr('opacity', 0).attr('r', 0)
      .transition('ds-draw').delay((_, i) => 200 + i * 24).duration(420)
      .attr('opacity', 1).attr('r', DOT_R);
  }

  return {
    update() {}, // statisch (frozen Section) - Layout blendet die View ein/aus
    destroy() { svg.remove(); tip.remove(); },
  };
}
