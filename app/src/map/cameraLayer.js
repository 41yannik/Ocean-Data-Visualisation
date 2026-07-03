// Kamera-Einflug (Story-Zoom): Wenn storyFx.camera gesetzt ist, startet die Ansicht
// beim Mount auf der GANZEN Beckensicht (Transform so, dass der PICT-Extent in den
// viewBox passt) und fährt weich auf die gezoomte Projektion (Identität) heran.
// Die Karte selbst ist bereits auf den Fokus-Ausschnitt gefittet (opts.fitTo) —
// dieser Layer animiert NUR den Wrapper-Transform. reducedMotion: sofort Identität.
import { easeCubicInOut } from 'd3';
import { MAP } from '../core/config.js';

const BASIN_CORNERS = [[130, 25], [-130, 25], [-130, -27], [130, -27]];

export function createCameraLayer(gCamera, layerCtx) {
  const { geo } = layerCtx;

  let lastKey = null;
  function render(state) {
    const cam = state.storyFx?.camera ?? null;
    const key = cam ? JSON.stringify(cam) : null;
    if (key === lastKey) return;
    lastKey = key;

    gCamera.interrupt('camera-fly');
    if (!cam || state.reducedMotion) {
      gCamera.attr('transform', null);
      return;
    }

    // Start-Transform: das gesamte Becken in den viewBox einpassen (in der
    // bereits gezoomten Projektion liegt es weit außerhalb → k0 << 1).
    const pts = BASIN_CORNERS.map((c) => geo.projection(c));
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const w = Math.max(...xs) - Math.min(...xs);
    const h = Math.max(...ys) - Math.min(...ys);
    const k0 = Math.min(MAP.width / w, MAP.height / h);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;

    gCamera
      .attr('transform', `translate(${MAP.width / 2},${MAP.height / 2}) scale(${k0}) translate(${-cx},${-cy})`)
      .transition('camera-fly')
      .duration(cam.flyMs ?? 1600)
      .ease(easeCubicInOut)
      .attr('transform', 'translate(0,0) scale(1)');
  }

  return {
    update(state, patch) {
      if (!patch || 'storyFx' in patch) render(state);
    },
    destroy() { gCamera.attr('transform', null); },
  };
}
