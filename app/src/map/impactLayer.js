// Impact-Bubbles (Story-Hook): flächenproportionale Kreise an den Zentroiden der
// betroffenen Länder (Fläche ∝ affected) mit generierten Direktlabels — der
// Aha-Kontrast „Riesenkreis ASM vs. Minikreis NIU" trotz gleichem Windfeld.
// Pop-Sequenz: erscheint NACH dem Track-/Korridor-Einzeichnen (easeBackOut);
// reducedMotion: sofort. Werte kommen ausschließlich aus events.json (byId).
import { easeBackOut } from 'd3';
import { DUR_DRAW } from '../core/config.js';
import { fmtInt } from '../core/format.js';
import { COUNTRY_LOOKUP } from './countryNames.js';

const R_BUBBLE_MAX = 46;

export function createImpactLayer(g, layerCtx) {
  const { data, geo } = layerCtx;
  const { byId, centroids } = data.index;

  let lastKey = null;
  function render(state) {
    const list = state.storyFx?.impactBubbles ?? null;
    const key = list?.length ? list.map((b) => b.eventId).join('|') : null;
    if (key === lastKey) return;
    lastKey = key;

    g.selectAll('*').interrupt('impact-pop');
    g.selectAll('*').remove();
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
    const rFor = (d) => R_BUBBLE_MAX * Math.sqrt(d.e.affected / vmax);
    // Pop erst nach dem Einzeichnen, wenn gerade ein Draw-in läuft
    const popDelay = state.reducedMotion ? 0 : (state.storyFx?.drawSid ? DUR_DRAW + 150 : 150);

    for (const d of items) {
      const [px, py] = d.point;
      const r = rFor(d);
      const node = g.append('g').attr('class', 'impact');

      const circle = node.append('circle')
        .attr('class', 'impact-bubble')
        .attr('cx', px).attr('cy', py);
      const label = node.append('text')
        .attr('class', 'impact-label')
        .attr('x', px + r + 8).attr('y', py - 2);
      label.append('tspan').attr('class', 'il-name')
        .text(COUNTRY_LOOKUP[d.e.iso3] ?? d.e.iso3);
      label.append('tspan').attr('class', 'il-value')
        .attr('x', px + r + 8).attr('dy', 14)
        .text(`${fmtInt(d.e.affected)} affected`);

      if (state.reducedMotion) {
        circle.attr('r', r);
      } else {
        circle.attr('r', 0)
          .transition('impact-pop')
          .delay(popDelay)
          .duration(550)
          .ease(easeBackOut.overshoot(1.4))
          .attr('r', r);
        label.attr('opacity', 0)
          .transition('impact-pop')
          .delay(popDelay + 350)
          .duration(300)
          .attr('opacity', 1);
      }
    }
  }

  return {
    update(state, patch) {
      if (!patch || 'storyFx' in patch) render(state);
    },
    destroy() { g.selectAll('*').remove(); },
  };
}
