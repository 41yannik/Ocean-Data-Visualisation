// Basemap: Land (Natural Earth 110m) + Graticule — einmaliger Render, ignoriert Patches.
// Kleine Atolle fehlen im 110m-Land bewusst: der centroidsLayer ist dafür Pflicht.
import { geoGraticule } from 'd3';

export function createBasemapLayer(gLand, gGraticule, layerCtx) {
  const { path } = layerCtx.geo;

  gLand.append('path')
    .datum(layerCtx.data.land)
    .attr('class', 'land')
    .attr('d', path);

  gGraticule.append('path')
    .datum(geoGraticule().step([10, 10])())
    .attr('class', 'graticule')
    .attr('d', path);

  return {
    update() { /* statisch */ },
    destroy() {
      gLand.selectAll('*').remove();
      gGraticule.selectAll('*').remove();
    },
  };
}
