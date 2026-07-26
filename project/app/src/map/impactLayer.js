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

  // Bezugswert für die Flächenskala: das Maximum über ALLE Records, nicht über die
  // gerade sichtbaren Blasen (Audit 2026-07). Vorher wurde je Step neu normiert -
  // Winstons Kreis (633.584 Betroffene) sah dann exakt so groß aus wie Vanuatus
  // (246.802), obwohl er 2,6-mal so viele Menschen bedeutet. Fläche ∝ Wert gilt jetzt
  // über die ganze Story hinweg, Kreise sind zwischen Kapiteln vergleichbar.
  const globalMax = Math.max(
    ...data.events.filter((e) => e.affected != null).map((e) => e.affected),
    1,
  );

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

    for (const d of items) {
      const [px, py] = d.point;
      // r ∝ √Wert, also Fläche ∝ Wert. Der äußere Ring nutzt dieselbe Skala für die
      // Bevölkerung, damit Fläche(innen)/Fläche(außen) exakt affected_pc ergibt.
      const rInner = R_BUBBLE_MAX * Math.sqrt(d.e.affected / globalMax);
      const rOuter = R_BUBBLE_MAX * Math.sqrt(d.e.pop / globalMax);
      const node = g.append('g').attr('class', 'impact');

      const outerCircle = node.append('circle')
        .attr('class', 'impact-bubble-outer')
        .attr('cx', px).attr('cy', py).attr('r', 0);

      const circle = node.append('circle')
        .attr('class', 'impact-bubble')
        .attr('cx', px).attr('cy', py).attr('r', 0)
        .on('mouseenter', () => highlight(d.e.iso3))
        .on('mouseleave', () => highlight(null));

      const label = node.append('text')
        .attr('class', 'impact-label').attr('opacity', 0);
      // Direktlabel mit BEIDEN Perspektiven: absolute Betroffene (Kreisfläche) UND
      // Bevölkerungsanteil (relativ) - die zentrale Kontrast-Erkenntnis direkt an der Karte.
      // Offset orientiert sich am äußeren Kreis.
      label.append('tspan').attr('class', 'il-name')
        .attr('x', px + rOuter + 8).attr('y', py - 8)
        .text(COUNTRY_LOOKUP[d.e.iso3] ?? d.e.iso3);
      label.append('tspan').attr('class', 'il-value')
        .attr('x', px + rOuter + 8).attr('dy', 14)
        .text(`${fmtInt(d.e.affected)} affected`);
      label.append('tspan').attr('class', 'il-pct')
        .attr('x', px + rOuter + 8).attr('dy', 13)
        .text(`${fmtPct(d.e.affected_pc)} of population`);

      bubbles.set(d.e.iso3, { circle, outerCircle, label, rInner, rOuter });
    }

    // Legende: ohne sie ist der gestrichelte Außenring unerklärt - und damit genau die
    // Aussage des Beats (Anteil = gefüllte Fläche im Ring) auf der Karte nicht lesbar.
    const legend = g.append('g').attr('class', 'impact-legend').attr('opacity', 0);
    const lr = 18;
    // Background pill for contrast
    legend.append('rect')
      .attr('x', -10).attr('y', -6)
      .attr('width', 260).attr('height', lr * 2 + 12)
      .attr('rx', 8).attr('ry', 8)
      .attr('fill', 'var(--bg)').attr('fill-opacity', 0.75)
      .attr('stroke', 'var(--graticule)').attr('stroke-width', 1);
    legend.append('circle').attr('class', 'impact-bubble-outer')
      .attr('cx', lr).attr('cy', lr).attr('r', lr);
    legend.append('circle').attr('class', 'impact-bubble')
      .attr('cx', lr).attr('cy', lr).attr('r', lr * 0.62)
      .style('pointer-events', 'none');
    legend.append('text').attr('class', 'impact-legend-label')
      .attr('x', lr * 2 + 12).attr('y', lr - 4)
      .text('filled = people reported affected');
    legend.append('text').attr('class', 'impact-legend-label')
      .attr('x', lr * 2 + 12).attr('y', lr + 14)
      .text('ring = total population');
    legend.attr('transform', `translate(16, ${(layerCtx.inner?.height ?? geo.height ?? 520) - 62})`);
    legend.transition('impact-pop')
      .delay(state.reducedMotion ? 0 : (state.storyFx?.camera?.flyMs ?? 0) + 200)
      .duration(state.reducedMotion ? 0 : 300).attr('opacity', 1);

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
      b.outerCircle.attr('r', b.rOuter);
      b.circle.attr('r', b.rInner);
      b.label.attr('opacity', 1);
      return;
    }
    b.outerCircle.attr('r', 0)
      .transition('impact-pop').duration(550).ease(easeBackOut.overshoot(1.4))
      .attr('r', b.rOuter);
    b.circle.attr('r', 0)
      .transition('impact-pop').duration(550).ease(easeBackOut.overshoot(1.4))
      .attr('r', b.rInner);
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
