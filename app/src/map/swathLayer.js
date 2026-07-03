// Wind-Korridor (Story-Hook): halbtransparenter dicker Stroke um eine Zugbahn —
// visualisiert die Ausdehnung der Sturmwinde (R34). Radius kommt datengedeckt aus
// storyFx.swath.radiusKm (Heta: IBTrACS-R34, siehe steps.js); die km→px-Umrechnung
// läuft über die Projektion (Breitengrad-Delta, in der Äquirektangular-Projektion
// verzerrungsfrei in y). Zeichnet sich synchron zum Track-Draw-in ein (DUR_DRAW).
import { DUR_DRAW } from '../core/config.js';

const KM_PER_DEG_LAT = 111.32;

export function createSwathLayer(g, layerCtx) {
  const { data, geo } = layerCtx;
  const path = g.append('path').attr('class', 'track-swath').style('display', 'none');

  function radiusPx(radiusKm) {
    const [, y1] = geo.projection([0, -17]);
    const [, y2] = geo.projection([0, -17 + radiusKm / KM_PER_DEG_LAT]);
    return Math.abs(y2 - y1);
  }

  let lastKey = null;
  function render(state) {
    const swath = state.storyFx?.swath ?? null;
    const key = swath ? `${swath.sid}:${swath.radiusKm}` : null;
    if (key === lastKey) return;
    lastKey = key;

    path.interrupt('swath-draw')
      .attr('stroke-dasharray', null)
      .attr('stroke-dashoffset', null);
    if (!swath || !data.tracks[swath.sid]) {
      path.style('display', 'none');
      return;
    }

    const line = { type: 'LineString', coordinates: data.tracks[swath.sid].map((p) => [p[0], p[1]]) };
    path.style('display', null)
      .attr('d', geo.path(line))
      .attr('stroke-width', 2 * radiusPx(swath.radiusKm));

    if (state.reducedMotion) return;
    const len = path.node().getTotalLength();
    path.attr('stroke-dasharray', `${len} ${len}`)
      .attr('stroke-dashoffset', len)
      .transition('swath-draw')
      .duration(DUR_DRAW)
      .attr('stroke-dashoffset', 0)
      .on('end', () => path.attr('stroke-dasharray', null).attr('stroke-dashoffset', null));
  }

  return {
    update(state, patch) {
      if (!patch || 'storyFx' in patch) render(state);
    },
    destroy() { g.selectAll('*').remove(); },
  };
}
