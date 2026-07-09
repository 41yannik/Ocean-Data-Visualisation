// Dashboard-Kachel „Storm profiles compared" (Explore, ersetzt das Radar):
// gruppiertes horizontales Balkendiagramm - je Metrik eine Gruppe aus drei Balken
// (Mawar/Percy/Guba) mit dem Perzentil-Rang über alle scatterbaren Events. Ehrlich:
// nur REALE Felder, kein erfundener Verwundbarkeits-Index. Hover → Rohwert-Tooltip.
// Cross-Highlighting: Bar-Hover emittiert hover OHNE x/y (globaler Tooltip bleibt
// stumm, tooltip.js-Guard) → Karte/Scatter/Heatmap heben den Sturm hervor. Empfang:
// dimmt nur, wenn der gehoverte/selektierte Sturm hier überhaupt vorkommt - Hover
// auf beliebige Map-Tracks darf die Kachel nicht dauerflackern lassen.
import { select, scaleLinear } from 'd3';
import { isScatterable } from '../core/filters.js';
import { fmtInt, fmtPct, fmtKt } from '../core/format.js';
import { STORY_STORMS, STORM_COLORS } from '../story/keyStorms.js';

const AXES = [
  { key: 'intensity_kt', label: 'Max sustained wind', fmt: fmtKt },
  { key: 'affected', label: 'Reported affected', fmt: fmtInt },
  { key: 'affected_pc', label: 'Share of population affected', fmt: fmtPct },
  { key: 'deaths', label: 'Deaths', fmt: fmtInt },
  { key: 'pop', label: 'Population exposed', fmt: fmtInt },
];

// Kompakt fürs 2x2-Grid (~1.9:1): dünnere Balken, engere Gruppen → alle vier Kacheln
// gleich hoch und zusammen in einen Viewport.
const W = 460;
const M = { top: 8, right: 44, bottom: 22, left: 12 };
const GROUP_GAP = 11;   // zwischen Metrik-Gruppen
const BAR_H = 6;
const BAR_GAP = 2;
const LABEL_H = 12;     // Metrik-Label über jeder Gruppe
const GROUP_H = LABEL_H + 3 * BAR_H + 2 * BAR_GAP;
const H = M.top + M.bottom + AXES.length * GROUP_H + (AXES.length - 1) * GROUP_GAP;

export function createProfileBars(container, ctx) {
  const { data, bus } = ctx;
  const events = data.events.filter(isScatterable);

  // Perzentil-Rang je Achse - NUR über Events mit erfasstem Wert. Fehlende Tote NICHT
  // als 0 werten (Review-Fix): sonst läse ein Sturm ohne gemeldete Tote als ~50. Perzentil
  // „mittlere Tödlichkeit", wo in Wahrheit keine Daten vorliegen (Missing ≠ Zero).
  const sorted = {};
  for (const a of AXES) sorted[a.key] = events.map((e) => e[a.key]).filter((v) => v != null).sort((x, y) => x - y);
  const pct = (v, key) => {
    const arr = sorted[key];
    let lo = 0;
    while (lo < arr.length && arr[lo] <= v) lo++;
    return lo / arr.length;
  };

  const storms = STORY_STORMS.map((s) => ({ ...s, event: data.index.byId.get(s.eventId) }));

  // Mini-Legende im Kachelkopf
  const legend = document.createElement('div');
  legend.className = 'tile-legend';
  legend.innerHTML = storms.map((s) =>
    `<span><i style="background:${STORM_COLORS[s.key]}"></i>${s.label}</span>`).join('');
  container.appendChild(legend);

  const svg = select(container).append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
    .attr('aria-label', 'Grouped horizontal bar chart comparing Mawar, Percy and Cyclone Guba by percentile rank of maximum sustained wind, reported affected people, share of population affected, deaths and population exposed');

  const x = scaleLinear().domain([0, 1]).range([M.left, W - M.right]);

  // Tooltip (Muster wie in den anderen Kacheln)
  const tip = document.createElement('div');
  tip.className = 'tooltip';
  document.body.appendChild(tip);
  const showTip = (event, s, a) => {
    const raw = s.event[a.key];
    const pctLine = raw == null
      ? '<div class="tt-sub">Percentile: <strong>not reported</strong></div>'
      : `<div class="tt-sub">Percentile: <strong>${fmtPct(pct(raw, a.key))}</strong></div>`;
    tip.innerHTML = `<div class="tt-title">${s.label}</div>`
      + `<div class="tt-sub">${s.event.country}</div>`
      + `<div class="tt-sub">${a.label}: <strong>${a.fmt(raw)}</strong></div>`
      + pctLine;
    tip.classList.add('visible');
    moveTip(event);
  };
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
  const hideTip = () => tip.classList.remove('visible');

  // Gridlines bei 0/50/100 %
  const gGrid = svg.append('g').attr('class', 'pb-grid');
  for (const t of [0, 0.5, 1]) {
    gGrid.append('line').attr('class', 'pb-gridline')
      .attr('x1', x(t)).attr('x2', x(t)).attr('y1', M.top).attr('y2', H - M.bottom);
    gGrid.append('text').attr('class', 'pb-axis-label')
      .attr('x', x(t)).attr('y', H - 10).attr('text-anchor', 'middle')
      .text(`${t * 100}%`);
  }

  // Metrik-Gruppen; Balken + Wertlabels je Sturm einsammeln (Cross-Highlighting)
  const marksByStorm = new Map(storms.map((s) => [s.key, []]));
  AXES.forEach((a, gi) => {
    const gy = M.top + gi * (GROUP_H + GROUP_GAP);
    const g = svg.append('g');
    g.append('text').attr('class', 'pb-group-label')
      .attr('x', M.left).attr('y', gy + 11).text(a.label);
    storms.forEach((s, si) => {
      const raw = s.event[a.key];
      const has = raw != null;                 // fehlender Wert (z. B. Percy-Tote) → kein Balken
      const v = has ? pct(raw, a.key) : 0;
      const by = gy + LABEL_H + si * (BAR_H + BAR_GAP);
      const bar = g.append('rect').attr('class', 'pb-bar')
        .attr('x', x(0)).attr('y', by).attr('height', BAR_H)
        .attr('width', has ? Math.max(1, x(v) - x(0)) : 0)
        .style('fill', STORM_COLORS[s.key])
        .on('mouseenter', (event) => {
          showTip(event, s, a);
          // hover ohne x/y: Highlight überall, globaler Tooltip bleibt aus
          bus.set({ hover: { sid: s.event.sid, eventId: s.event.id, source: 'profile' } });
        })
        .on('mousemove', moveTip)
        .on('mouseleave', () => { hideTip(); bus.set({ hover: null }); });
      const label = g.append('text').attr('class', has ? 'pb-value' : 'pb-value pb-na')
        .attr('x', (has ? x(v) : x(0)) + 5).attr('y', by + BAR_H - 1)
        .text(has ? fmtPct(v) : 'not reported');
      marksByStorm.get(s.key).push(bar, label);
    });
  });

  const note = document.createElement('p');
  note.className = 'tile-note';
  note.textContent = 'Bars show percentile rank among complete storm-country pairs.';
  container.appendChild(note);

  const storySids = new Set(storms.map((s) => s.event?.sid).filter(Boolean));

  return {
    update(state, patch) {
      if (patch && !('hover' in patch) && !('selectedEventIds' in patch) && !('textSet' in patch)) return;
      const hoverSid = state.hover?.sid ?? null;
      const sel = state.selectedEventIds;
      const textSet = state.textSet?.ids ?? null;

      // Ein Sturm „leuchtet", wenn er gehovert, im textSet oder selektiert ist.
      const lit = (s) => s.event.sid === hoverSid
        || (textSet?.has(s.event.id) ?? false)
        || (sel?.has(s.event.id) ?? false);
      // Dimmen nur, wenn die Interaktion diese Kachel betrifft: gehoverter Sturm ist
      // einer der drei, ODER Selektion/textSet aktiv (dann treten Nicht-Mitglieder zurück).
      const dimActive = (hoverSid != null && storySids.has(hoverSid))
        || (sel != null && sel.size > 0)
        || (textSet != null && storms.some((s) => textSet.has(s.event.id)));

      for (const s of storms) {
        const isLit = lit(s);
        for (const mark of marksByStorm.get(s.key)) {
          mark.classed('hl', isLit && s.event.sid === hoverSid)
            .classed('dim', dimActive && !isLit);
        }
      }
    },
    destroy() { tip.remove(); legend.remove(); note.remove(); svg.remove(); },
  };
}
