// Scatter-Kompositor: SVG-Skelett, <g>-Reihenfolge, BESITZT die Skalen.
// Bei 'mode'-Patch werden layerCtx.scales VOR der Layer-Delegation neu gesetzt -
// alle Layer transitionieren dann über dieselbe benannte Transition 'mode' (Stolperstein 2).
import { select } from 'd3';
import { SCATTER } from '../core/config.js';
import { makeXScale, makeYScale, makeRScale, scatterInner } from '../core/scales.js';
import { createAxesLayer } from './axesLayer.js';
import { createPointsLayer } from './pointsLayer.js';
import { createTrendLayer } from './trendLayer.js';
import { createBrushLayer } from './brushLayer.js';
import { createAnnotationsLayer } from './annotationsLayer.js';
import { createRugLayer } from './rugLayer.js';

const ALL_LAYERS = ['axes', 'rug', 'trend', 'brush', 'points', 'annotations'];

export function createScatter(container, ctx, opts = {}) {
  const layersWanted = opts.layers ?? ALL_LAYERS;
  // Kompakte Dims per Instanz (Explore-Tile) - ohne opts.dims greift das globale SCATTER
  // (Story-Sektionen bleiben unverändert groß).
  const S = opts.dims ?? SCATTER;
  const { margin } = S;
  const inner = scatterInner(S);

  const svg = select(container).append('svg')
    .attr('viewBox', `0 0 ${S.width} ${S.height}`)
    .attr('role', 'img');
  const root = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  // Feste <g>-Reihenfolge: band → trend → connectors → BRUSH → points → annotations
  // (Brush-Overlay unter den Punkten, sonst schluckt es die Pointer-Events - Stolperstein 3).
  const gAxes = root.append('g').attr('class', 'g-axes');
  const gRug = root.append('g').attr('class', 'g-rug');
  const gBand = root.append('g').attr('class', 'g-band');
  const gTrend = root.append('g').attr('class', 'g-trend');
  const gConnectors = root.append('g').attr('class', 'g-connectors');
  const gBrush = root.append('g').attr('class', 'g-brush');
  const gPoints = root.append('g').attr('class', 'g-points');
  const gAnnotations = root.append('g').attr('class', 'g-annotations');

  const layerCtx = { ...ctx, scales: null, inner };
  const setScales = (mode) => {
    layerCtx.scales = {
      x: makeXScale(inner.width),
      y: makeYScale(mode, inner.height),
      r: makeRScale(ctx.data.events),
      mode,
    };
  };
  setScales(ctx.bus.get?.().mode ?? 'perCapita');

  const children = [];
  if (layersWanted.includes('axes')) children.push(createAxesLayer(gAxes, layerCtx));
  if (layersWanted.includes('rug')) children.push(createRugLayer(gRug, layerCtx));
  if (layersWanted.includes('trend')) children.push(createTrendLayer(gBand, gTrend, gAnnotations, layerCtx));
  if (layersWanted.includes('brush')) children.push(createBrushLayer(gBrush, layerCtx));
  if (layersWanted.includes('points')) children.push(createPointsLayer(gPoints, gConnectors, layerCtx));
  if (layersWanted.includes('annotations')) children.push(createAnnotationsLayer(gAnnotations, layerCtx));

  return {
    // Skalen/Innenmaße für Zusatz-Layer im selben SVG (Formations-Morph, Paket 10 Task 8);
    // Ownership bleibt beim Kompositor - Leser dürfen nicht mutieren.
    get scales() { return layerCtx.scales; },
    inner,
    root,
    update(state, patch) {
      if (!patch || 'mode' in patch) setScales(state.mode); // Skalen VOR den Layern
      for (const child of children) child.update(state, patch);
    },
    destroy() {
      for (const child of children) child.destroy();
      svg.remove();
    },
  };
}
