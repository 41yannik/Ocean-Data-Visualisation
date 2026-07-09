// Story-Annotationen im Scatter: Aura-Ring + Label an benannten Events (storyFx.annotations).
// Positionen kommen aus layerCtx.scales (Besitz beim Kompositor) - Layer rendert nur.
// Nicht interaktiv (pointer-events: none via CSS), max. ~3 gleichzeitig (Clutter-Regel).
import { select } from 'd3';
import { isScatterable } from '../core/filters.js';

export function createAnnotationsLayer(gAnnotations, layerCtx) {
  const g = gAnnotations.append('g').attr('class', 'g-story-annotations');
  const { data, inner } = layerCtx;

  function render(state) {
    // Story-Annotationen (storyFx) + Button-Annotationen (highlight.annos, Evidence-Panel);
    // Dedupe per eventId - das persistente Button-Highlight gewinnt.
    const raw = [...(state.highlight?.annos ?? []), ...(state.storyFx?.annotations ?? [])];
    const seen = new Set();
    const annos = raw
      .filter((a) => !seen.has(a.eventId) && seen.add(a.eventId))
      .map((a) => ({ ...a, event: data.index.byId.get(a.eventId) }))
      .filter((a) => a.event && isScatterable(a.event));

    const sel = g.selectAll('g.anno').data(annos, (d) => d.eventId);
    sel.exit().remove();
    const enter = sel.enter().append('g').attr('class', 'anno');
    enter.append('circle').attr('class', 'anno-ring');
    enter.append('line').attr('class', 'anno-leader');
    enter.append('text').attr('class', 'anno-label');

    const { x, y, r } = layerCtx.scales;
    // Kollisionsschutz für bis zu 3 Labels: jedem eine EIGENE Reihe geben (nach x-Rang
    // geordnet, damit die Leader nicht kreuzen). Ringe nahe der Oberkante (Top-Region)
    // staffeln NACH UNTEN in die dort leere Plotfläche - sonst würden die Labels über
    // den oberen SVG-Rand hinauslaufen (der frühere 2-Reihen-Stagger ließ die 3
    // Ausreißer-Labels Judy/Gita/Kevin überlappen).
    const rank = new Map(
      [...annos]
        .sort((a, b) => (a.event.intensity_kt ?? 0) - (b.event.intensity_kt ?? 0))
        .map((a, k) => [a.eventId, k]),
    );
    const ROW = 17;
    enter.merge(sel).each(function (d) {
      const cx = x(d.event.intensity_kt);
      const cy = y.scale(y.value(d.event));
      const ringR = r(d.event.deaths ?? 0) + 5;
      const k = rank.get(d.eventId) ?? 0;
      const below = cy < inner.height * 0.33; // nahe Oberkante → Labels nach unten
      const labelY = below ? cy + ringR + 16 + k * ROW : cy - ringR - 10 - k * ROW;
      const node = select(this);
      node.select('.anno-ring').attr('cx', cx).attr('cy', cy).attr('r', ringR);
      node.select('.anno-leader')
        .attr('x1', cx).attr('y1', below ? cy + ringR : cy - ringR)
        .attr('x2', cx).attr('y2', below ? labelY - 11 : labelY + 3);
      node.select('.anno-label')
        .attr('x', Math.max(70, Math.min(inner.width - 70, cx)))
        .attr('y', labelY)
        .attr('text-anchor', 'middle')
        .text(d.text);
    });
  }

  return {
    update(state, patch) {
      if (!patch || 'storyFx' in patch || 'mode' in patch || 'highlight' in patch) render(state);
    },
    destroy() { g.remove(); },
  };
}
