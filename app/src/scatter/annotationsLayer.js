// Story-Annotationen im Scatter: Aura-Ring + Label an benannten Events (storyFx.annotations).
// Positionen kommen aus layerCtx.scales (Besitz beim Kompositor) — Layer rendert nur.
// Nicht interaktiv (pointer-events: none via CSS), max. ~3 gleichzeitig (Clutter-Regel).
import { select } from 'd3';
import { isScatterable } from '../core/filters.js';

export function createAnnotationsLayer(gAnnotations, layerCtx) {
  const g = gAnnotations.append('g').attr('class', 'g-story-annotations');
  const { data, inner } = layerCtx;

  function render(state) {
    const annos = (state.storyFx?.annotations ?? [])
      .map((a) => ({ ...a, event: data.index.byId.get(a.eventId) }))
      .filter((a) => a.event && isScatterable(a.event));

    const sel = g.selectAll('g.anno').data(annos, (d) => d.eventId);
    sel.exit().remove();
    const enter = sel.enter().append('g').attr('class', 'anno');
    enter.append('circle').attr('class', 'anno-ring');
    enter.append('line').attr('class', 'anno-leader');
    enter.append('text').attr('class', 'anno-label');

    const { x, y, r } = layerCtx.scales;
    enter.merge(sel).each(function (d, i) {
      const cx = x(d.event.intensity_kt);
      const cy = y.scale(y.value(d.event));
      const ringR = r(d.event.deaths ?? 0) + 5;
      const labelY = cy - ringR - 10 - (i % 2) * 16; // Stagger gegen Label-Kollisionen
      const node = select(this);
      node.select('.anno-ring').attr('cx', cx).attr('cy', cy).attr('r', ringR);
      node.select('.anno-leader')
        .attr('x1', cx).attr('y1', cy - ringR)
        .attr('x2', cx).attr('y2', labelY + 3);
      node.select('.anno-label')
        .attr('x', Math.max(70, Math.min(inner.width - 70, cx)))
        .attr('y', labelY)
        .attr('text-anchor', 'middle')
        .text(d.text);
    });
  }

  return {
    update(state, patch) {
      if (!patch || 'storyFx' in patch || 'mode' in patch) render(state);
    },
    destroy() { g.remove(); },
  };
}
