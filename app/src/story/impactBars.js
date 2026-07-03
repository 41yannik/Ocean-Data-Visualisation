// Vergleichs-Balkendiagramm (Story-Hook, rechte Seite): untermauert die Karten-Bubbles —
// gleiche Windstärke, drastisch unterschiedliche Betroffenheit. Höhe ∝ affected (linear),
// gleiche Füllfarbe wie die Bubbles (var(--point)); Überschrift und alle Zahlen werden
// aus events.json GENERIERT (Verhältnis z. B. „33×", nie getippt). Wächst synchron zum
// Bubble-Pop (nach Einflug + Einzeichnen); reducedMotion: sofort. Eingefrorene Sektion —
// rendert einmal aus ctx.bus.get().
import { select, scaleLinear, easeCubicOut } from 'd3';
import { DUR_DRAW } from '../core/config.js';
import { fmtInt } from '../core/format.js';
import { COUNTRY_LOOKUP } from '../map/countryNames.js';

const W = 360;
const H = 520;
const M = { top: 92, bottom: 60 };
const BAR_W = 92;
const GAP = 64;

export function createImpactBars(container, ctx) {
  const { byId } = ctx.data.index;
  const state = ctx.bus.get();
  const rm = state.reducedMotion;

  const items = (state.storyFx?.impactBubbles ?? [])
    .map((b) => byId.get(b.eventId))
    .filter((e) => e && e.affected != null)
    .sort((a, b) => b.affected - a.affected);

  const svg = select(container).append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('role', 'img');

  if (items.length >= 2) {
    const vmax = items[0].affected;
    const ratio = Math.round(vmax / items[items.length - 1].affected);
    svg.append('text').attr('class', 'ib-title')
      .attr('x', W / 2).attr('y', 34).attr('text-anchor', 'middle')
      .text('Same wind field —');
    svg.append('text').attr('class', 'ib-title-strong')
      .attr('x', W / 2).attr('y', 62).attr('text-anchor', 'middle')
      .text(`${ratio}× the people affected`);

    const innerH = H - M.top - M.bottom;
    const y = scaleLinear().domain([0, vmax]).range([0, innerH]);
    const x0 = W / 2 - BAR_W - GAP / 2;
    const delay = rm ? 0
      : (state.storyFx?.camera?.flyMs ?? 0) + (state.storyFx?.drawSid ? DUR_DRAW + 150 : 150);

    items.forEach((e, i) => {
      const bx = x0 + i * (BAR_W + GAP);
      const bh = Math.max(2, y(e.affected));
      const bar = svg.append('rect').attr('class', 'impact-bar')
        .attr('x', bx).attr('width', BAR_W)
        .attr('y', H - M.bottom).attr('height', 0);
      const value = svg.append('text').attr('class', 'ib-value')
        .attr('x', bx + BAR_W / 2).attr('y', H - M.bottom - bh - 10)
        .attr('text-anchor', 'middle')
        .text(fmtInt(e.affected));
      svg.append('text').attr('class', 'ib-name')
        .attr('x', bx + BAR_W / 2).attr('y', H - M.bottom + 22)
        .attr('text-anchor', 'middle')
        .text(COUNTRY_LOOKUP[e.iso3] ?? e.iso3);

      if (rm) {
        bar.attr('y', H - M.bottom - bh).attr('height', bh);
      } else {
        value.attr('opacity', 0);
        bar.transition('ib-grow').delay(delay).duration(700).ease(easeCubicOut)
          .attr('y', H - M.bottom - bh).attr('height', bh);
        value.transition('ib-grow').delay(delay + 500).duration(300).attr('opacity', 1);
      }
    });

    svg.append('line').attr('class', 'ib-base')
      .attr('x1', 28).attr('x2', W - 28)
      .attr('y1', H - M.bottom).attr('y2', H - M.bottom);
  }

  return {
    update() {}, // eingefrorene Sektion
    destroy() { svg.remove(); },
  };
}
