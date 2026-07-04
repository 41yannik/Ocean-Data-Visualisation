// Vergleichs-Balkendiagramm (Story-Hook Step 2, rechte Seite): untermauert die Karten-Bubbles -
// gleiche Windstärke, drastisch unterschiedliche Betroffenheit. Höhe ∝ affected (linear),
// gleiche Füllfarbe wie die Bubbles (var(--point)); Überschrift/Zahlen aus events.json GENERIERT.
// EREIGNISGESTEUERT: jeder Balken ist anfangs 0 und wächst erst, wenn der wandernde Windkreis
// die zugehörige Insel erreicht (state.hetaReached[iso3]) - synchron zum Bubble-Pop auf der Karte.
// Hover spiegelt sich auf die Karte (state.hetaFocusIso3 = Cross-Highlight). reducedMotion: sofort.
import { select, scaleLinear, easeCubicOut } from 'd3';
import { fmtInt } from '../core/format.js';
import { COUNTRY_LOOKUP } from '../map/countryNames.js';

const W = 360;
const H = 520;
const M = { top: 92, bottom: 60 };
const BAR_W = 92;
const GAP = 64;

export function createImpactBars(container, ctx) {
  const { byId } = ctx.data.index;
  const { bus } = ctx;

  const svg = select(container).append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('role', 'img');

  const bars = new Map(); // iso3 -> { rect, value, bh, grown }

  const state0 = bus.get();
  const items = (state0.storyFx?.impactBubbles ?? [])
    .map((b) => byId.get(b.eventId))
    .filter((e) => e && e.affected != null)
    .sort((a, b) => b.affected - a.affected);

  if (items.length >= 2) {
    const vmax = items[0].affected;
    const ratio = Math.round(vmax / items[items.length - 1].affected);
    svg.append('text').attr('class', 'ib-title')
      .attr('x', W / 2).attr('y', 34).attr('text-anchor', 'middle')
      .text('Same wind field:');
    svg.append('text').attr('class', 'ib-title-strong')
      .attr('x', W / 2).attr('y', 62).attr('text-anchor', 'middle')
      .text(`${ratio}× the people affected`);

    const innerH = H - M.top - M.bottom;
    const y = scaleLinear().domain([0, vmax]).range([0, innerH]);
    const x0 = W / 2 - BAR_W - GAP / 2;

    items.forEach((e, i) => {
      const bx = x0 + i * (BAR_W + GAP);
      const bh = Math.max(2, y(e.affected));
      const rect = svg.append('rect').attr('class', 'impact-bar')
        .attr('x', bx).attr('width', BAR_W)
        .attr('y', H - M.bottom).attr('height', 0);
      const value = svg.append('text').attr('class', 'ib-value')
        .attr('x', bx + BAR_W / 2).attr('y', H - M.bottom - bh - 10)
        .attr('text-anchor', 'middle').attr('opacity', 0)
        .text(fmtInt(e.affected));
      svg.append('text').attr('class', 'ib-name')
        .attr('x', bx + BAR_W / 2).attr('y', H - M.bottom + 22)
        .attr('text-anchor', 'middle')
        .text(COUNTRY_LOOKUP[e.iso3] ?? e.iso3);
      // Unsichtbares, volles Trefferfeld je Spalte für stabiles Hover (auch bei 0-Höhe).
      svg.append('rect').attr('class', 'ib-hit')
        .attr('x', bx - GAP / 2).attr('width', BAR_W + GAP)
        .attr('y', M.top).attr('height', innerH + 8)
        .attr('fill', 'transparent')
        .on('mouseenter', () => bus.set({ hetaFocusIso3: e.iso3 }))
        .on('mouseleave', () => bus.set({ hetaFocusIso3: null }));

      bars.set(e.iso3, { rect, value, bh, grown: false });
    });

    svg.append('line').attr('class', 'ib-base')
      .attr('x1', 28).attr('x2', W - 28)
      .attr('y1', H - M.bottom).attr('y2', H - M.bottom);
  }

  function grow(iso3, rm) {
    const b = bars.get(iso3);
    if (!b || b.grown) return;
    b.grown = true;
    const topY = H - M.bottom - b.bh;
    if (rm) {
      b.rect.attr('y', topY).attr('height', b.bh);
      b.value.attr('opacity', 1);
      return;
    }
    b.rect.transition('ib-grow').duration(700).ease(easeCubicOut)
      .attr('y', topY).attr('height', b.bh);
    b.value.transition('ib-grow').delay(500).duration(300).attr('opacity', 1);
  }

  function reset(iso3) {
    const b = bars.get(iso3);
    if (!b) return;
    b.grown = false;
    b.rect.interrupt('ib-grow').attr('y', H - M.bottom).attr('height', 0);
    b.value.interrupt('ib-grow').attr('opacity', 0);
  }

  function applyReached(state) {
    const reached = state.hetaReached ?? {};
    for (const iso3 of bars.keys()) {
      if (reached[iso3]) grow(iso3, state.reducedMotion);
      else reset(iso3);
    }
  }

  function highlight(focus) {
    for (const [iso3, b] of bars) {
      b.rect.classed('hl', focus === iso3).classed('dim', focus != null && focus !== iso3);
    }
  }

  return {
    update(state, patch) {
      if (!patch) { applyReached(state); highlight(state.hetaFocusIso3); return; }
      if ('hetaReached' in patch) applyReached(state);
      if ('hetaFocusIso3' in patch) highlight(state.hetaFocusIso3);
    },
    destroy() { svg.remove(); },
  };
}
