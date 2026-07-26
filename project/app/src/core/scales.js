// Pure Skalen-/Projektions-Fabriken - kein State, kein DOM.
import { geoEquirectangular, geoPath, scaleLinear } from 'd3';
import { MAP, SCATTER } from './config.js';
import { isScatterable, isZeroLane } from './filters.js';

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

// x = Wind, den der Sturm AM LAND erreichte (seit Audit 2026-07 nicht mehr der globale
// Lifetime-Peak). Modusunabhängig → Objektkonstanz beim Mode-Toggle. Die Domain schließt
// ALLE geplotteten Zeilen ein, auch die Zero-Lane: dort stehen die stärksten Winde des
// Datensatzes (Pam 150 kt über Vanuatu, 0 gemeldet), die dürfen nicht herausfallen.
export function makeXScale(innerWidth, events = null) {
  let [lo, hi] = [30, 175];
  if (events) {
    const kts = events.filter(isPlottableRow).map((e) => e.intensity_kt);
    if (kts.length) {
      lo = Math.min(lo, Math.floor((Math.min(...kts) - 5) / 5) * 5);
      hi = Math.max(hi, Math.ceil((Math.max(...kts) + 5) / 5) * 5);
    }
  }
  return scaleLinear().domain([lo, hi]).range([0, innerWidth]).clamp(true);
}

const isPlottableRow = (e) => isScatterable(e) || isZeroLane(e);

// y = Linearskala über dem log10-transformierten Raum - exakt die y_transform der Fits
// aus meta.json (Lücke L7): Punkte und Referenzlinien teilen dieselbe Mathematik.
// Die Domain schließt IMMER die realen Datenwerte ein: die offene Land-Jahr-Basis reicht
// bis ~0.0000003 pro Kopf (starke Stürme mit fast keinem gemeldeten Toll). Ein fixer Floor
// würde genau diese Gegenbeispiele unter die Achse drücken (unsichtbar) und die zentrale
// Aussage „Wind erklärt den Anteil kaum" visuell beschönigen.
//
// ZERO-LANE: log10(0) existiert nicht, die 51 ausdrücklich als 0 gemeldeten Land-Jahre
// bekommen deshalb ein eigenes Band UNTER der Log-Achse (ZERO_LANE_FRAC der Höhe). Sie
// gehören in den Plot - unter ihnen sind die stärksten Winde des Datensatzes -, dürfen
// aber nicht so tun, als wären sie ein sehr kleiner positiver Wert.
export const ZERO_LANE_FRAC = 0.14;   // Anteil der Plothöhe für das 0-Band
const ZERO_LANE_GAP = 6;              // px Trennung zwischen Log-Bereich und Band

export function makeYScale(mode, innerHeight, events = null) {
  const isAbs = mode === 'absolute';
  const value = (e) => (isAbs ? Math.log10(e.affected + 1) : Math.log10(e.affected_pc));
  let [lo, hi] = isAbs ? [1, 6] : [-4.5, 0.15];
  if (events) {
    const vals = events.filter(isScatterable).map(value).filter((v) => Number.isFinite(v));
    if (vals.length) {
      lo = Math.min(lo, Math.floor(Math.min(...vals)));
      hi = Math.max(hi, Math.ceil(Math.max(...vals) * 10) / 10);
    }
  }
  const hasZeroLane = !!events?.some(isZeroLane);
  const laneH = hasZeroLane ? Math.round(innerHeight * ZERO_LANE_FRAC) : 0;
  const logBottom = Math.max(0, innerHeight - laneH);   // y-Pixel, wo der Log-Bereich endet
  const scale = scaleLinear().domain([lo, hi]).range([logBottom, 0]).clamp(true);
  const ticks = [];
  for (let t = Math.ceil(lo); t <= Math.floor(hi); t++) ticks.push(t);

  // Dodge im 0-Band: IBTrACS rundet Windwerte auf 5-kt-Stufen, deshalb teilen sich viele
  // gemeldete Nullen exakt dieselbe x-Position. Ohne Versatz verdeckten sich 28 der 51
  // Punkte gegenseitig - der Beat behauptet eine Zahl, die nicht abzählbar wäre.
  // Deterministisch (nach Wind und id sortiert), also test- und reproduzierbar.
  const bandTop = logBottom + ZERO_LANE_GAP;
  const bandH = Math.max(0, laneH - ZERO_LANE_GAP);
  const zeroCenter = bandTop + bandH / 2;
  const zeroDy = new Map();
  if (hasZeroLane && events) {
    const byKt = new Map();
    for (const e of events.filter(isZeroLane)) {
      const k = e.intensity_kt;
      if (!byKt.has(k)) byKt.set(k, []);
      byKt.get(k).push(e);
    }
    // Der Versatz richtet sich nach der größten Kollisionsgruppe UND der Bandhöhe:
    // die äußerste Lane muss innerhalb des Bandes bleiben, sonst ragen Nullen in den
    // Log-Bereich und behaupten dort einen Wert, den sie nicht haben.
    const maxRank = Math.max(...[...byKt.values()].map((l) => Math.ceil((l.length - 1) / 2)), 0);
    const step = maxRank > 0 ? Math.min(9, (bandH / 2 - 4) / maxRank) : 0;
    for (const list of byKt.values()) {
      list.sort((a, b) => a.id.localeCompare(b.id));
      list.forEach((e, i) => {
        // 0, -step, +step, -2·step, +2·step … um die Bandmitte
        const rank = Math.ceil(i / 2) * (i % 2 ? -1 : 1);
        zeroDy.set(e.id, rank * step);
      });
    }
  }
  return {
    scale,
    mode,
    value,
    ticks,
    hasZeroLane,
    laneH,
    logBottom,
    bandTop,                  // Oberkante des 0-Bands = Ort der Skalenbruch-Linie
    zeroY: zeroCenter,        // Mitte des 0-Bands (Label-Höhe)
    zeroLabel: '0 reported',
    // y-Pixel einer beliebigen geplotteten Zeile (Log-Wert oder Zero-Lane mit Dodge).
    yOf: (e) => (isZeroLane(e) ? zeroCenter + (zeroDy.get(e.id) ?? 0) : scale(value(e))),
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
