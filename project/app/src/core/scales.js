// Pure Skalen-/Projektions-Fabriken - kein State, kein DOM.
import { geoEquirectangular, geoPath, scaleLinear } from 'd3';
import { MAP, SCATTER } from './config.js';

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

// x ist modusunabhängig (intensity_kt gilt in beiden Modi → Objektkonstanz beim Toggle).
// Die Domain schließt die realen Windwerte mit etwas Rand ein, damit kein Punkt auf der
// Achse klebt oder links herausragt: die offene Basis reicht von 25 bis 170 kt, der alte
// feste Floor 30 kt hätte den 25-kt-Punkt links neben die Achse gedrückt.
export function makeXScale(innerWidth, events = null) {
  let [lo, hi] = [30, 175];
  if (events) {
    const kts = events
      .filter((e) => e.intensity_kt != null && e.affected)
      .map((e) => e.intensity_kt);
    if (kts.length) {
      lo = Math.min(lo, Math.floor((Math.min(...kts) - 5) / 5) * 5);
      hi = Math.max(hi, Math.ceil((Math.max(...kts) + 5) / 5) * 5);
    }
  }
  return scaleLinear().domain([lo, hi]).range([0, innerWidth]).clamp(true);
}

// y = Linearskala über dem log10-transformierten Raum - exakt die y_transform der Fits
// aus meta.json (Lücke L7): Punkte, Linie und Band teilen dieselbe Mathematik.
// Die Domain schließt IMMER die realen Datenwerte ein: die offene Land-Jahr-Basis reicht
// bis ~0.0000003 pro Kopf (starke Stürme mit fast keinem gemeldeten Toll). Ein fixer Floor
// würde genau diese Gegenbeispiele unter die Achse drücken (unsichtbar) und die zentrale
// Aussage „Wind erklärt den Anteil kaum" visuell beschönigen. `events` liefert den Bereich;
// `.clamp(true)` ist die Sicherung gegen Rundungs-Ausreißer.
export function makeYScale(mode, innerHeight, events = null) {
  const isAbs = mode === 'absolute';
  const value = (e) => (isAbs ? Math.log10(e.affected + 1) : Math.log10(e.affected_pc));
  let [lo, hi] = isAbs ? [1, 6] : [-4.5, 0.15];
  if (events) {
    const vals = events
      .filter((e) => e.intensity_kt != null && e.affected)
      .map(value)
      .filter((v) => Number.isFinite(v));
    if (vals.length) {
      lo = Math.min(lo, Math.floor(Math.min(...vals)));
      hi = Math.max(hi, Math.ceil(Math.max(...vals) * 10) / 10);
    }
  }
  const scale = scaleLinear().domain([lo, hi]).range([innerHeight, 0]).clamp(true);
  const ticks = [];
  for (let t = Math.ceil(lo); t <= Math.floor(hi); t++) ticks.push(t);
  return {
    scale,
    mode,
    value,
    ticks,
    tickFormat: (v) => {
      if (isAbs) {
        const n = 10 ** v;
        return n >= 1e6 ? `${n / 1e6}M` : n >= 1e3 ? `${n / 1e3}k` : String(n);
      }
      const pct = 10 ** v * 100;
      return pct >= 1 ? `${pct}%` : `${Number(pct.toPrecision(1))}%`;
    },
    axisLabel: isAbs ? 'people reported affected' : 'share of population reported affected',
  };
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
