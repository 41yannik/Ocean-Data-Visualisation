// Impact-Bubbles (Story-Hook, Step 2): flächenproportionale Kreise an den Zentroiden der
// betroffenen Länder (Fläche ∝ affected) mit generierten Direktlabels - der Aha-Kontrast
// „Riesenkreis ASM vs. Minikreis NIU" trotz gleichem Windfeld.
// EREIGNISGESTEUERT: die Blase ist anfangs unsichtbar (r=0) und poppt erst, wenn der
// wandernde Windkreis (swathLayer) ihre Insel erreicht - gemeldet über state.hetaReached.
// Hover spiegelt sich in den Balken rechts (state.hetaFocusIso3 = Cross-Highlight).
// Werte kommen ausschließlich aus events.json (byId); reducedMotion: sofort voll.
import { easeBackOut } from 'd3';
import { fmtInt, fmtPct } from '../core/format.js';
import { COUNTRY_LOOKUP } from './countryNames.js';

const R_BUBBLE_MAX = 46;

export function createImpactLayer(g, layerCtx) {
  const { data, geo, bus } = layerCtx;
  const { byId, centroids } = data.index;

  let bubbles = new Map(); // iso3 -> { circle, label, r, popped }
  let lastKey = null;

  function build(state) {
    const list = state.storyFx?.impactBubbles ?? null;
    const key = list?.length ? list.map((b) => b.eventId).join('|') : null;
    if (key === lastKey) return;
    lastKey = key;

    g.selectAll('*').interrupt('impact-pop');
    g.selectAll('*').remove();
    bubbles = new Map();
    if (!key) return;

    const items = list
      .map((b) => {
        const e = byId.get(b.eventId);
        const c = e ? centroids[e.iso3] : null;
        return e && e.affected != null && c ? { e, point: geo.projection(c) } : null;
      })
      .filter(Boolean);
    if (!items.length) return;

    const vmax = Math.max(...items.map((d) => d.e.affected));
    for (const d of items) {
      const [px, py] = d.point;
      const r = R_BUBBLE_MAX * Math.sqrt(d.e.affected / vmax);
      const node = g.append('g').attr('class', 'impact');

      const circle = node.append('circle')
        .attr('class', 'impact-bubble')
        .attr('cx', px).attr('cy', py).attr('r', 0)
        .on('mouseenter', () => bus.set({ hetaFocusIso3: d.e.iso3 }))
        .on('mouseleave', () => bus.set({ hetaFocusIso3: null }));

      const label = node.append('text')
        .attr('class', 'impact-label').attr('opacity', 0);
      // Direktlabel mit BEIDEN Perspektiven: absolute Betroffene (Kreisfläche) UND
      // Bevölkerungsanteil (relativ) - die zentrale Kontrast-Erkenntnis direkt an der Karte.
      label.append('tspan').attr('class', 'il-name')
        .attr('x', px + r + 8).attr('y', py - 8)
        .text(COUNTRY_LOOKUP[d.e.iso3] ?? d.e.iso3);
      label.append('tspan').attr('class', 'il-value')
        .attr('x', px + r + 8).attr('dy', 14)
        .text(`${fmtInt(d.e.affected)} affected`);
      label.append('tspan').attr('class', 'il-pct')
        .attr('x', px + r + 8).attr('dy', 13)
        .text(`${fmtPct(d.e.affected_pc)} of population`);

      bubbles.set(d.e.iso3, { circle, label, r, popped: false });
    }

    // Bereits erreichte Inseln (z. B. Deep-Link nach Ende) sofort zeigen.
    for (const iso3 of Object.keys(state.hetaReached ?? {})) {
      if (state.hetaReached[iso3]) pop(iso3, state, /* instant */ true);
    }
    highlight(state.hetaFocusIso3);
  }

  function pop(iso3, state, instant) {
    const b = bubbles.get(iso3);
    if (!b || b.popped) return;
    b.popped = true;
    b.circle.style('pointer-events', 'auto');
    if (instant || state.reducedMotion) {
      b.circle.attr('r', b.r);
      b.label.attr('opacity', 1);
      return;
    }
    b.circle.attr('r', 0)
      .transition('impact-pop').duration(550).ease(easeBackOut.overshoot(1.4))
      .attr('r', b.r);
    b.label.attr('opacity', 0)
      .transition('impact-pop').delay(350).duration(300).attr('opacity', 1);
  }

  function reset(iso3) {
    const b = bubbles.get(iso3);
    if (!b) return;
    b.popped = false;
    b.circle.interrupt('impact-pop').style('pointer-events', 'none').attr('r', 0);
    b.label.interrupt('impact-pop').attr('opacity', 0);
  }

  function applyReached(state) {
    const reached = state.hetaReached ?? {};
    for (const iso3 of bubbles.keys()) {
      if (reached[iso3]) pop(iso3, state, false);
      else reset(iso3);
    }
  }

  function highlight(focus) {
    for (const [iso3, b] of bubbles) {
      b.circle.classed('hl', focus === iso3).classed('dim', focus != null && focus !== iso3);
    }
  }

  return {
    update(state, patch) {
      if (!patch || 'storyFx' in patch) { build(state); return; }
      if ('hetaReached' in patch) applyReached(state);
      if ('hetaFocusIso3' in patch) highlight(state.hetaFocusIso3);
    },
    destroy() { g.selectAll('*').remove(); },
  };
}
