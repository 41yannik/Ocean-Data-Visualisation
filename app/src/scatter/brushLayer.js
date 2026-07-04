// Brush-Verhalten: Auswahl-Rechteck → selectedEventIds (Set, immer neu - nie mutieren).
// Loop-Guard gegen programmatic moves (Lücke L10); Mode-Wechsel resettet den Brush.
import { brush as d3brush } from 'd3';
import { matchesFilters, isScatterable } from '../core/filters.js';

export function createBrushLayer(gBrush, layerCtx) {
  const { data, bus, inner } = layerCtx;
  const events = data.events.filter(isScatterable);
  let lastState = null;

  const brush = d3brush()
    .extent([[0, 0], [inner.width, inner.height]])
    .on('end', (event) => {
      if (!event.sourceEvent) return; // programmatic move (Reset) → keine Auswertung
      if (!event.selection) {
        if (lastState?.selectedEventIds != null) bus.set({ selectedEventIds: null });
        return;
      }
      const [[x0, y0], [x1, y1]] = event.selection;
      const { x, y } = layerCtx.scales;
      const ids = events
        .filter((e) => matchesFilters(e, lastState.filters))
        .filter((e) => {
          const cx = x(e.intensity_kt);
          const cy = y.scale(y.value(e));
          return cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1;
        })
        .map((e) => e.id);
      bus.set({ selectedEventIds: ids.length ? new Set(ids) : null });
    });

  gBrush.call(brush);

  function setEnabled(enabled) {
    gBrush.style('display', enabled ? null : 'none');
  }

  return {
    update(state, patch) {
      lastState = state;
      if (!patch) { setEnabled(state.exploreUnlocked); return; }
      if ('exploreUnlocked' in patch) setEnabled(state.exploreUnlocked);
      if ('mode' in patch) {
        gBrush.call(brush.move, null); // löst 'end' ohne sourceEvent aus → Guard greift
        if (state.selectedEventIds != null) bus.set({ selectedEventIds: null });
      }
      // Externer Reset (Selection-Chip „clear" / andere Views) → Auswahlrechteck wischen.
      if ('selectedEventIds' in patch && state.selectedEventIds == null) {
        gBrush.call(brush.move, null);
      }
    },
    destroy() { gBrush.selectAll('*').remove(); },
  };
}
