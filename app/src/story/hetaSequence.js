// Geteilte Timing-/Geometrie-Quelle für die Heta-Hook-Choreografie (Step 2).
// Der wandernde Windkreis (swathLayer) ist die Uhr; er braucht dieselbe Geometrie wie die
// gezoomte Karte (makeFittedProjection(HETA_FOCUS)) - deterministisch, daher hier einmalig
// berechnet und memoisiert. Liefert die Bruchteile entlang der GEZEICHNETEN Zugbahn, an
// denen der Kreis (Radius R34) erstmals einen Insel-Zentroid überdeckt → Pop-Zeitpunkt.
//
// Die Pfadlänge wird an einem echten, kurz an den Body gehängten <path> gemessen, damit die
// Samples exakt der stroke-dashoffset-Animation des Track-Layers entsprechen (gleiches d,
// gleiche Länge). Keine Punkt-für-Punkt-Projektion (Antimeridian!) - d3.geoPath clippt.
import { makeFittedProjection, makeGeoPath } from '../core/scales.js';
import { DUR_DRAW } from '../core/config.js';
import { HETA_FOCUS, SID_HETA, HETA_R34_KM, HETA_FLY_MS } from './steps.js';

const KM_PER_DEG_LAT = 111.32;
const SVG_NS = 'http://www.w3.org/2000/svg';
const SAMPLES = 240;
export const HETA_IMPACT_IDS = ['2004-0004-ASM', '2004-0004-NIU'];

let cache = null;

export function computeHetaSequence(ctx) {
  if (cache) return cache;

  const track = ctx.data.tracks[SID_HETA];
  const projection = makeFittedProjection(HETA_FOCUS);
  const path = makeGeoPath(projection);
  const line = { type: 'LineString', coordinates: track.map((p) => [p[0], p[1]]) };
  const d = path(line);

  // R34-Radius in Pixeln (Breitengrad-Delta; in der Äquirektangular-Projektion in y unverzerrt).
  const [, y1] = projection([0, -17]);
  const [, y2] = projection([0, -17 + HETA_R34_KM / KM_PER_DEG_LAT]);
  const radiusPx = Math.abs(y2 - y1);

  // Pfad off-DOM vermessen (dieselbe Länge wie der animierte Track).
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden;left:-9999px');
  const pathEl = document.createElementNS(SVG_NS, 'path');
  pathEl.setAttribute('d', d);
  svg.appendChild(pathEl);
  document.body.appendChild(svg);
  const total = pathEl.getTotalLength();
  const samples = [];
  for (let i = 0; i <= SAMPLES; i += 1) {
    const pt = pathEl.getPointAtLength((total * i) / SAMPLES);
    samples.push({ frac: i / SAMPLES, x: pt.x, y: pt.y });
  }
  document.body.removeChild(svg);

  // Je Insel: erster Bruchteil, an dem der Kreis-Mittelpunkt den Zentroid überdeckt
  // (Fallback: Punkt der größten Annäherung, falls die Bahn knapp vorbeizieht).
  const perEvent = {};
  for (const id of HETA_IMPACT_IDS) {
    const e = ctx.data.index.byId.get(id);
    const c = e ? ctx.data.index.centroids[e.iso3] : null;
    if (!c) continue;
    const [cx, cy] = projection(c);
    let reached = null;
    let bestFrac = 1;
    let bestDist = Infinity;
    for (const s of samples) {
      const dist = Math.hypot(s.x - cx, s.y - cy);
      if (dist < bestDist) { bestDist = dist; bestFrac = s.frac; }
      if (dist <= radiusPx) { reached = s.frac; break; }
    }
    const fraction = reached ?? bestFrac;
    perEvent[id] = { iso3: e.iso3, fraction, reachMs: HETA_FLY_MS + fraction * DUR_DRAW, cx, cy };
  }

  cache = { samples, radiusPx, perEvent, flyMs: HETA_FLY_MS, drawMs: DUR_DRAW };
  return cache;
}

// Position auf der Bahn zu einem Bruchteil f∈[0,1] (lineare Interpolation der Samples).
export function sampleAt(samples, f) {
  const n = samples.length - 1;
  const x = Math.max(0, Math.min(1, f)) * n;
  const i = Math.min(n - 1, Math.floor(x));
  const t = x - i;
  return [
    samples[i].x + (samples[i + 1].x - samples[i].x) * t,
    samples[i].y + (samples[i + 1].y - samples[i].y) * t,
  ];
}
