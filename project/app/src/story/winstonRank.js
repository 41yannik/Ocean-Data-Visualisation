// Winston-Rank (Step 4 Companion): zwei kompakte Zahlenstrahlen statt nur der Karte.
// Beweist die Text-Behauptung "Wind und Wirkung liegen hier vorn" tatsächlich sichtbar:
// jeder der 70 vollständigen Country-Year-Records ist ein grauer Strich auf zwei
// Skalen (Wind am Land, Anteil der Betroffenen); Winston sticht als einziger Punkt in
// --accent hervor. Emphasis-Muster (1 Farbe + Grau), keine Kategorie-Palette.
//
// Bewusst OHNE die volle Ranking-Mechanik des Fazits (conclusionSynthesis.js): keine
// Top-5-Listen, keine Sturm-Namen der anderen 69, keine Umschalt-Reihenfolge. Nur die
// Position der zwei Zahlen, die dieser Beat behauptet - das Fazit liefert später die
// vollständige Geschichte für alle Records und beide Größen zugleich.
//
// ALLE Zahlen kommen aus events.json (ctx.data.events über isScatterable) - keine
// Literale, damit Rang und Prozentsatz beim nächsten Pipeline-Lauf nie stumm veralten.
import { select, scaleLinear, scaleLog, extent, easeCubicOut, easeBackOut } from 'd3';
import { fmtKt, fmtPct } from '../core/format.js';
import { isScatterable } from '../core/filters.js';

const WINSTON_ID = 'FJI-2016';

const W = 320;
const H = 268;
const AXIS_X0 = 24;
const AXIS_X1 = W - 24; // 296
const DOT_R = 6;
const TICK_LEN = 6;
const TICK_GAP = 2; // garantierter Abstand Tick-Band -> Punkt-Oberkante, für JEDEN x-Wert

// Row A (Wind) - y-Koordinaten
const TITLE_Y = 20;
const SUB_A_Y = 40;
const LABEL_A1_Y = 54;
const LABEL_A2_Y = 67;
const LEADER_A_Y0 = 73;
const LEADER_A_Y1 = 85;
const AXIS_A_Y = 92;

// Row B (Anteil) - identischer Aufbau, um ROW_OFFSET nach unten versetzt.
const ROW_OFFSET = 118;
const SUB_B_Y = SUB_A_Y + ROW_OFFSET;
const LABEL_B1_Y = LABEL_A1_Y + ROW_OFFSET;
const LABEL_B2_Y = LABEL_A2_Y + ROW_OFFSET;
const LEADER_B_Y0 = LEADER_A_Y0 + ROW_OFFSET;
const LEADER_B_Y1 = LEADER_A_Y1 + ROW_OFFSET;
const AXIS_B_Y = AXIS_A_Y + ROW_OFFSET;

// Legende
const LEGEND_Y = 244;
const LEGEND_TEXT_Y = 248;

const ordinal = (n) => {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
};
// "strongest of 70" bei Rang 1, sonst "5th-highest of 70" - nie ein getippter Rang.
const rankPhrase = (rank, n, superlative) =>
  (rank === 1 ? `${superlative} of ${n}` : `${ordinal(rank)}-highest of ${n}`);
const competitionRank = (rows, value, key) => 1 + rows.filter((d) => d[key] > value).length;

export function createWinstonRank(container, ctx) {
  const { data, bus } = ctx;
  const reducedMotion = bus?.get?.().reducedMotion ?? false;

  const rows = data.events.filter(isScatterable);
  const winston = data.index.byId.get(WINSTON_ID);
  if (!winston || !rows.length) return { update() {}, destroy() {} };

  const n = rows.length;
  const others = rows.filter((e) => e.id !== winston.id);
  const windRank = competitionRank(rows, winston.intensity_kt, 'intensity_kt');
  const impactRank = competitionRank(rows, winston.affected_pc, 'affected_pc');

  // Median beider Groessen: DER Anker, der den Strips ueberhaupt eine lesbare Skala gibt
  // (Audit 2026-07). Ohne einen benannten Bezugspunkt sind 69 graue Striche nur ein
  // Barcode ohne Bedeutung; mit "median" wird sichtbar, dass Winston weit rechts vom
  // typischen Record sitzt - genau die Aussage "near the top on both measures".
  const median = (vals) => {
    const s = [...vals].sort((a, b) => a - b);
    const m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  const windMedian = median(rows.map((e) => e.intensity_kt));
  const shareMedian = median(rows.map((e) => e.affected_pc));

  // Windskala: linear, mit Padding auf ganze 5-kt-Schritte (wie makeXScale).
  const [windLo, windHi] = extent(rows, (e) => e.intensity_kt);
  const windScale = scaleLinear()
    .domain([Math.floor((windLo - 5) / 5) * 5, Math.ceil((windHi + 5) / 5) * 5])
    .range([AXIS_X0, AXIS_X1]).clamp(true);

  // Anteilsskala: log10, wie der Story-Scatter (evidence-Step) - sonst verschwinden
  // fast alle 70 Records im ersten Prozentpunkt (Median liegt unter 1 %).
  const [shareLo, shareHi] = extent(rows, (e) => e.affected_pc);
  const shareScale = scaleLog()
    .domain([10 ** Math.floor(Math.log10(shareLo)), 10 ** (Math.ceil(Math.log10(shareHi) * 10) / 10)])
    .range([AXIS_X0, AXIS_X1]).clamp(true);

  const windX = windScale(winston.intensity_kt);
  const shareX = shareScale(winston.affected_pc);

  const svg = select(container).append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('class', 'winston-rank-svg')
    .attr('role', 'img')
    .attr('aria-label', `Two number lines placing Cyclone Winston among ${n} complete country-year `
      + `records. Wind reaching the country: Winston is the ${rankPhrase(windRank, n, 'strongest')}, `
      + `at ${fmtKt(winston.intensity_kt)}. Share of population reported affected: Winston is the `
      + `${rankPhrase(impactRank, n, 'highest')}, at ${fmtPct(winston.affected_pc)}.`);

  svg.append('text').attr('class', 'wr-main-title')
    .attr('x', W / 2).attr('y', TITLE_Y).attr('text-anchor', 'middle')
    .text('Near the top on both measures');

  function drawRow({ subY, label1Y, label2Y, leaderY0, leaderY1, axisY, scale, value, x,
    fmt, rank, superlative, subtitle, median: medianValue, medianFmt }) {
    svg.append('text').attr('class', 'wr-subtitle')
      .attr('x', W / 2).attr('y', subY).attr('text-anchor', 'middle')
      .text(subtitle);

    svg.append('line').attr('class', 'wr-axis')
      .attr('x1', AXIS_X0).attr('x2', AXIS_X1).attr('y1', axisY).attr('y2', axisY);

    // Die anderen 69 Records: dünne graue Striche, keine Namen - der Kontext, nicht die
    // Aussage. Überlappende Winde (IBTrACS rundet auf 5 kt) verdunkeln sich additiv.
    // Band sitzt komplett OBERHALB des Winston-Punkts (der selbst axisY±DOT_R einnimmt),
    // mit TICK_GAP Sicherheitsabstand - sonst verdeckt der Punkt genau die Nachbar-Ticks
    // in seiner unmittelbaren Nähe (Audit-Fund: 3 Records lagen direkt unter dem Punkt).
    const ticks = svg.append('g').attr('class', 'wr-ticks').attr('opacity', reducedMotion ? 0.55 : 0);
    ticks.selectAll('line').data(others).join('line').attr('class', 'wr-tick')
      .attr('x1', (d) => scale(value(d))).attr('x2', (d) => scale(value(d)))
      .attr('y1', axisY - DOT_R - TICK_GAP - TICK_LEN).attr('y2', axisY - DOT_R - TICK_GAP);
    if (!reducedMotion) {
      ticks.transition('wr-ticks').duration(500).ease(easeCubicOut).attr('opacity', 0.55);
    }

    // Median-Anker: kraeftigerer Strich quer zur Achse plus benanntes Label UNTER der
    // Achse (dort ist frei; die grauen Ticks und Winstons Label sitzen oberhalb). Gibt der
    // Position eine absolute Bedeutung - "median 65 kt" links, "Winston 155 kt" rechts -
    // sodass right = mehr ohne Extra-Beschriftung selbsterklaerend wird.
    const mx = scale(medianValue);
    const medMark = svg.append('line').attr('class', 'wr-median')
      .attr('x1', mx).attr('x2', mx).attr('y1', axisY - 6).attr('y2', axisY + 6)
      .attr('opacity', reducedMotion ? 1 : 0);
    const medLabel = svg.append('text').attr('class', 'wr-scale-note')
      .attr('x', mx).attr('y', axisY + 18).attr('text-anchor', 'middle')
      .attr('opacity', reducedMotion ? 1 : 0)
      .text(`median · ${medianFmt}`);
    if (!reducedMotion) {
      medMark.transition('wr-med').duration(450).ease(easeCubicOut).attr('opacity', 1);
      medLabel.transition('wr-med-l').duration(450).ease(easeCubicOut).attr('opacity', 1);
    }

    // Winston: der eine farbige Punkt, mit Leader-Linie zu seinem Zwei-Zeilen-Label.
    const leader = svg.append('line').attr('class', 'wr-leader')
      .attr('x1', x).attr('x2', x).attr('y1', leaderY0).attr('y2', leaderY1)
      .attr('opacity', reducedMotion ? 1 : 0);
    const dot = svg.append('circle').attr('class', 'wr-dot')
      .attr('cx', x).attr('cy', axisY).attr('r', reducedMotion ? DOT_R : 0);
    const label = svg.append('text').attr('opacity', reducedMotion ? 1 : 0);
    label.append('tspan').attr('class', 'wr-label-name')
      .attr('x', x).attr('y', label1Y).attr('text-anchor', 'end')
      .text(`Winston · ${fmt}`);
    label.append('tspan').attr('class', 'wr-label-rank')
      .attr('x', x).attr('y', label2Y).attr('text-anchor', 'end')
      .text(rankPhrase(rank, n, superlative));

    if (!reducedMotion) {
      dot.transition('wr-dot').delay(550).duration(550).ease(easeBackOut.overshoot(1.4)).attr('r', DOT_R);
      leader.transition('wr-leader').delay(550).duration(300).ease(easeCubicOut).attr('opacity', 1);
      label.transition('wr-label').delay(700).duration(300).attr('opacity', 1);
    }
  }

  drawRow({
    subY: SUB_A_Y, label1Y: LABEL_A1_Y, label2Y: LABEL_A2_Y,
    leaderY0: LEADER_A_Y0, leaderY1: LEADER_A_Y1, axisY: AXIS_A_Y,
    scale: windScale, value: (d) => d.intensity_kt, x: windX,
    fmt: fmtKt(winston.intensity_kt), rank: windRank, superlative: 'strongest',
    subtitle: 'Physical hazard · wind reaching the country',
    median: windMedian, medianFmt: fmtKt(windMedian),
  });
  drawRow({
    subY: SUB_B_Y, label1Y: LABEL_B1_Y, label2Y: LABEL_B2_Y,
    leaderY0: LEADER_B_Y0, leaderY1: LEADER_B_Y1, axisY: AXIS_B_Y,
    scale: shareScale, value: (d) => d.affected_pc, x: shareX,
    fmt: fmtPct(winston.affected_pc), rank: impactRank, superlative: 'highest',
    subtitle: 'Human impact · share of population affected',
    median: shareMedian, medianFmt: fmtPct(shareMedian),
  });

  // Legende: ein Glyph je Klasse (Akzent = Winston, grauer Strich = der Rest) - ohne
  // sie ist der graue Strich unerklärt, genau wie der Außenring in impactLayer.js.
  svg.append('circle').attr('class', 'wr-legend-dot')
    .attr('cx', 34).attr('cy', LEGEND_Y).attr('r', 4);
  svg.append('text').attr('class', 'wr-legend-text')
    .attr('x', 44).attr('y', LEGEND_TEXT_Y).text('Winston');
  svg.append('line').attr('class', 'wr-legend-tick')
    .attr('x1', 176).attr('x2', 176).attr('y1', LEGEND_Y - 5).attr('y2', LEGEND_Y + 5);
  svg.append('text').attr('class', 'wr-legend-text')
    .attr('x', 184).attr('y', LEGEND_TEXT_Y).text(`other ${n - 1} records`);

  return {
    update() {},
    destroy() { svg.remove(); },
  };
}
