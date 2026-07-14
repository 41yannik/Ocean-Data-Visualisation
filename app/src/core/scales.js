// Pure Skalen-/Projektions-Fabriken - kein State, kein DOM.
import { geoEquirectangular, geoPath, scaleLinear, scaleSqrt } from 'd3';
import { MAP, SCATTER, R_MIN, R_MAX } from './config.js';

// PICT-Region als MultiPoint: fitExtent berücksichtigt die Rotation korrekt.
const PICT_EXTENT = {
  type: 'MultiPoint',
  coordinates: [[130, -27], [130, 25], [-130, -27], [-130, 25]],
};

// Dateline-Zentrierung AUSSCHLIESSLICH über rotate([-192, 0]) - Daten bleiben [-180, 180];
// d3.geoPath clippt Antimeridian-Kreuzungen korrekt (Stolperstein 7; 35 echte Crosser).
export function makePacificProjection(width = MAP.width, height = MAP.height, pad = MAP.pad) {
  return geoEquirectangular()
    .rotate([-192, 0])
    .fitExtent([[pad, pad], [width - pad, height - pad]], PICT_EXTENT);
}

// Auf einen Ausschnitt gefittete Projektion (Story-Zoom, z. B. Heta-Fokus):
// gleiche Rotation (Antimeridian-sicher), aber fitExtent auf das übergebene GeoJSON.
export function makeFittedProjection(fitGeo, width = MAP.width, height = MAP.height, pad = MAP.pad) {
  return geoEquirectangular()
    .rotate([-192, 0])
    .fitExtent([[pad, pad], [width - pad, height - pad]], fitGeo);
}

export function makeGeoPath(projection) {
  return geoPath(projection);
}

// x fix über beide Modi (Objektkonstanz beim Toggle): Daten 35–170 kt.
export function makeXScale(innerWidth) {
  return scaleLinear().domain([30, 175]).range([0, innerWidth]);
}

// y = Linearskala über dem log10-transformierten Raum - exakt die y_transform der Fits
// aus meta.json (Lücke L7): Punkte, Linie und Band teilen dieselbe Mathematik.
export function makeYScale(mode, innerHeight) {
  const isAbs = mode === 'absolute';
  const domain = isAbs ? [1, 6] : [-4.5, 0.15];
  const scale = scaleLinear().domain(domain).range([innerHeight, 0]);
  return {
    scale,
    mode,
    value: (e) => (isAbs ? Math.log10(e.affected + 1) : Math.log10(e.affected_pc)),
    ticks: isAbs ? [1, 2, 3, 4, 5, 6] : [-4, -3, -2, -1, 0],
    tickFormat: (v) => {
      if (isAbs) {
        const n = 10 ** v;
        return n >= 1e6 ? `${n / 1e6}M` : n >= 1e3 ? `${n / 1e3}k` : String(n);
      }
      const pct = 10 ** v * 100;
      return pct >= 1 ? `${pct}%` : `${pct.toFixed(pct >= 0.1 ? 1 : 2)}%`;
    },
    axisLabel: isAbs ? 'people reported affected' : 'share of population reported affected',
  };
}

export function makeRScale(events) {
  const maxDeaths = Math.max(...events.map((e) => e.deaths ?? 0), 1);
  return scaleSqrt().domain([0, maxDeaths]).range([R_MIN, R_MAX]);
}

// Kategorie → Strichstärke (Lücke L5). Quelle: Event-category (Peak) via index.bySid,
// NICHT die per-Punkt-sshs aus tracks.json.
const CAT_STROKE = { 1: 0.9, 2: 1.2, 3: 1.6, 4: 2.1, 5: 2.7 };
export function strokeForCategory(cat) {
  return CAT_STROKE[cat] ?? 0.7;
}

// Innenmaße aus den übergebenen Scatter-Dims (Default = globales SCATTER). Der Explore-
// Tile reicht kompakte Dims durch (opts.dims), Story-Instanzen bleiben bei SCATTER.
export const scatterInner = (s = SCATTER) => ({
  width: s.width - s.margin.left - s.margin.right,
  height: s.height - s.margin.top - s.margin.bottom,
});
