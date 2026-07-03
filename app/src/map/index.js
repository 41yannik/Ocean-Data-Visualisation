// Karten-Kompositor: SVG-Skelett, <g>-Reihenfolge, Projektion (Besitz), Layer-Delegation.
// Rendert selbst nichts Sichtbares; keine Interaktionslogik (docs/plan/09 §3).
import { select } from 'd3';
import { MAP } from '../core/config.js';
import { makePacificProjection, makeGeoPath } from '../core/scales.js';
import { createBasemapLayer } from './basemapLayer.js';
import { createTracksLayer } from './tracksLayer.js';
import { createCentroidsLayer } from './centroidsLayer.js';
import { createSwathLayer } from './swathLayer.js';
import { createImpactLayer } from './impactLayer.js';

const ALL_LAYERS = ['basemap', 'swath', 'tracks', 'centroids', 'impact'];

export function createMap(container, ctx, opts = {}) {
  const layersWanted = opts.layers ?? ALL_LAYERS;

  const svg = select(container).append('svg')
    .attr('viewBox', `0 0 ${MAP.width} ${MAP.height}`)
    .attr('role', 'img');

  // Feste <g>-Reihenfolge = einzige Stelle, an der Z-Ordnung existiert:
  const gLand = svg.append('g').attr('class', 'g-land');
  const gGraticule = svg.append('g').attr('class', 'g-graticule');
  const gSwath = svg.append('g').attr('class', 'g-swath');
  const gTracks = svg.append('g').attr('class', 'g-tracks');
  const gCentroids = svg.append('g').attr('class', 'g-centroids');
  const gLabels = svg.append('g').attr('class', 'g-labels');
  const gImpact = svg.append('g').attr('class', 'g-impact');

  const projection = makePacificProjection();
  const layerCtx = {
    ...ctx,
    geo: { projection, path: makeGeoPath(projection), width: MAP.width, height: MAP.height },
  };

  const children = [];
  if (layersWanted.includes('basemap')) children.push(createBasemapLayer(gLand, gGraticule, layerCtx));
  if (layersWanted.includes('swath')) children.push(createSwathLayer(gSwath, layerCtx));
  if (layersWanted.includes('tracks')) children.push(createTracksLayer(gTracks, layerCtx));
  if (layersWanted.includes('centroids')) children.push(createCentroidsLayer(gCentroids, gLabels, layerCtx));
  if (layersWanted.includes('impact')) children.push(createImpactLayer(gImpact, layerCtx));

  return {
    update(state, patch) {
      for (const child of children) child.update(state, patch);
    },
    destroy() {
      for (const child of children) child.destroy();
      svg.remove();
    },
  };
}
