// Rug-Leiste (Missing-Data-Ehrlichkeit, Paket 07 Punkt 6): Events MIT Windwert aber
// OHNE Betroffenenzahl als schmale Ticks direkt über der x-Achse — sie verschwinden
// nicht mehr stillschweigend. 20 von 21 fehlenden Zeilen haben Wind + Track, daher
// volle CMV-Interaktion (Hover → Tooltip + Karten-Link, Klick → Detailpanel),
// hinter dem exploreUnlocked-Gate wie im pointsLayer.
// Sichtbar im Explore-Modus (storyFx == null) und wenn storyFx.showRug (Story-Step 6).
import { matchesFilters, isScatterable } from '../core/filters.js';

const TICK_H = 8;
const TICK_W = 3;

export function createRugLayer(g, layerCtx) {
  const { data, bus, inner } = layerCtx;
  const events = data.events.filter((e) => e.intensity_kt != null && !isScatterable(e));

  const ticks = g.selectAll('rect')
    .data(events, (d) => d.id)
    .join('rect')
    .attr('class', 'rug-tick')
    .attr('data-key', (d) => d.id)
    .attr('width', TICK_W)
    .attr('height', TICK_H)
    .attr('y', inner.height - TICK_H - 1)
    .attr('aria-label', (d) => `${d.name ?? 'Unnamed storm'} ${d.year}, ${d.country} — impact not reported`)
    .on('mousemove', (event, d) => {
      if (!bus.get().exploreUnlocked) return; // Story-Gate (Konvention aus Paket 06)
      bus.set({ hover: { sid: d.sid, eventId: d.id, x: event.clientX, y: event.clientY, source: 'scatter' } });
    })
    .on('mouseleave', () => {
      if (!bus.get().exploreUnlocked) return;
      bus.set({ hover: null });
    })
    .on('click', (event, d) => {
      if (d.sid && bus.get().exploreUnlocked) bus.set({ detailSid: d.sid });
    })
    .on('keydown', (event, d) => {
      if (event.key === 'Enter' && d.sid && bus.get().exploreUnlocked) bus.set({ detailSid: d.sid });
    });

  // x-Position hängt nur an der (modus-unabhängigen) x-Skala — einmalig setzen.
  ticks.attr('x', (d) => layerCtx.scales.x(d.intensity_kt) - TICK_W / 2);

  function classes(state) {
    const fx = state.storyFx;
    const visible = fx == null || fx.showRug === true;
    const hover = state.hover;
    ticks
      .classed('story-hidden', !visible)
      .classed('filtered-out', (d) => !matchesFilters(d, state.filters))
      .classed('hovered', (d) => hover?.eventId === d.id)
      .classed('sibling', (d) => hover?.sid != null && d.sid === hover.sid && hover.eventId !== d.id)
      .classed('detail', (d) => state.detailSid != null && d.sid === state.detailSid)
      .attr('tabindex', (d) => (visible && state.exploreUnlocked && matchesFilters(d, state.filters) ? 0 : -1));
  }

  return {
    update(state, patch) {
      if (!patch || 'hover' in patch || 'filters' in patch || 'detailSid' in patch
        || 'storyFx' in patch || 'exploreUnlocked' in patch) {
        classes(state);
      }
    },
    destroy() { g.selectAll('*').remove(); },
  };
}
