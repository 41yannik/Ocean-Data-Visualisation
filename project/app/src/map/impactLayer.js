// Impact-Bubbles (Story-Hook, Step 2): flächenproportionale Kreise an den Zentroiden der
// betroffenen Länder (Fläche ∝ affected) mit generierten Direktlabels - der Aha-Kontrast
// „fast gleiche Rohzahl, sehr verschiedener Bevölkerungsanteil" (Harold: Vanuatu vs. Fiji).
// Die Blasen starten unsichtbar (r=0) und poppen selbst: nach dem Kamera-Einflug
// (storyFx.camera.flyMs als Delay, leicht gestaffelt); reducedMotion: sofort voll.
// Hover hebt eine Blase hervor und dimmt die andere (lokal, kein Store-Feld).
// Werte kommen ausschließlich aus events.json (byId).
import { easeBackOut } from 'd3';
import { fmtInt, fmtPct } from '../core/format.js';
import { COUNTRY_LOOKUP } from './countryNames.js';

const R_BUBBLE_MAX = 46;
const POP_STAGGER_MS = 450;

export function createImpactLayer(g, layerCtx) {
  const { data, geo } = layerCtx;
  const { byId, centroids } = data.index;

  let bubbles = new Map(); // iso3 -> { circle, label, r }
  let lastKey = null;
  let timers = [];

  function clearTimers() {
    for (const t of timers) clearTimeout(t);
    timers = [];
  }

  function build(state) {
    const list = state.storyFx?.impactBubbles ?? null;
    const key = list?.length ? list.map((b) => b.eventId).join('|') : null;
    if (key === lastKey) return;
    lastKey = key;

    clearTimers();
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
        .on('mouseenter', () => highlight(d.e.iso3))
        .on('mouseleave', () => highlight(null));

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

      bubbles.set(d.e.iso3, { circle, label, r });
    }

    // Selbst-Pop: nach dem Kamera-Einflug, leicht gestaffelt; reducedMotion sofort.
    const instant = state.reducedMotion;
    const baseDelay = instant ? 0 : (state.storyFx?.camera?.flyMs ?? 0);
    let i = 0;
    for (const iso3 of bubbles.keys()) {
      if (instant) {
        pop(iso3, true);
      } else {
        const delay = baseDelay + i * POP_STAGGER_MS;
        timers.push(setTimeout(() => pop(iso3, false), delay));
      }
      i += 1;
    }
  }

  function pop(iso3, instant) {
    const b = bubbles.get(iso3);
    if (!b) return;
    b.circle.style('pointer-events', 'auto');
    if (instant) {
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

  function highlight(focus) {
    for (const [iso3, b] of bubbles) {
      b.circle.classed('hl', focus === iso3).classed('dim', focus != null && focus !== iso3);
    }
  }

  return {
    update(state, patch) {
      if (!patch || 'storyFx' in patch) build(state);
    },
    destroy() {
      clearTimers();
      g.selectAll('*').remove();
    },
  };
}
