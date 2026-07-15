// Residual-Zeilen-Layout (Beat „Country by country"): dieselben 78 scatterbaren
// Sturm-Land-Paare, umgeordnet zu EINER Zeile je Land. x = residual_pc, also der
// log10-Abstand zur wind-only line (0 = genau auf der Linie, +1 = Toll 10× über der
// Erwartung). Damit wird „again and again" abzählbar: Vanuatus Zeile liegt fast
// komplett rechts der Null-Linie.
//
// Reines Layout-Modul (Muster computeUnitLayout): keine DOM-Zugriffe, deterministisch,
// unit-testbar. Der Formations-Morph (formationLayer) konsumiert nur pos(e).
//
// Ghosts (nicht scatterbar) liefern pos(e) = null und bleiben versteckt: ein fehlender
// Impact hat kein Residuum - ein hohler Marker am Achsenrand würde eine Position auf
// einer quantitativen Achse erfinden. Verworfene Alternative: Rand-Spalte „no record";
// die Lücken sind bewusst Gegenstand des NÄCHSTEN Beats (Unit-Chart), nicht dieses.
import { scaleLinear, median as d3median } from 'd3';
import { isScatterable } from '../core/filters.js';

export const RR_R = 6;          // Punktradius der Residual-Formation
const MIN_ROW_N = 4;            // Länder mit weniger scatterbaren Records → Zeile „Other"
const LABEL_W = 122;            // links reservierte Label-Spalte (längster Name: Papua New Guinea)
const PAD_TOP = 14;
const AXIS_H = 34;              // Platz für Ticks + Achsen-Beschriftung unten
// Feste x-Domain mit Luft um die beobachtete Spanne (−2.56…+1.46) - hartkodiert statt
// aus Daten, damit die Null-Linie über Datenstände hinweg stabil steht; clamp fängt Ausreißer.
const DOMAIN = [-2.8, 1.6];
// Lane-Versätze für den deterministischen Dodge (statt d3-force: reproduzierbar, testbar).
const LANES = [0, -9, 9, -18, 18];

// Default-Gruppierung (Länder-Beat) - groupBy ist parametrisierbar, damit der
// Subregion-Beat DASSELBE Layout mit anderer Faltung nutzt (Defaults bit-identisch).
const BY_COUNTRY = (e) => ({ key: e.iso3, label: e.country });

export function computeResidualRows(rawEvents, { W, H, groupBy = BY_COUNTRY, minRowN = MIN_ROW_N } = {}) {
  const scatterable = rawEvents.filter(isScatterable);

  // Gruppen bilden; kleine (< minRowN Records) in „Other" falten statt vieler Mini-Zeilen.
  const byKey = new Map();
  for (const e of scatterable) {
    const g = groupBy(e);
    if (!byKey.has(g.key)) byKey.set(g.key, { key: g.key, label: g.label, events: [] });
    byKey.get(g.key).events.push(e);
  }
  const own = [];
  const other = { key: 'OTHER', label: 'Other', events: [] };
  for (const g of byKey.values()) {
    if (g.events.length >= Math.max(1, minRowN)) own.push(g);
    else other.events.push(...g.events);
  }
  // Erzähl-Reihenfolge: absteigender Above-Anteil (VUT zuerst), Ties nach n, dann Name;
  // „Other" immer zuletzt. Aus Daten berechnet, nie hartkodiert.
  const aboveShare = (g) => g.events.filter((e) => (e.residual_pc ?? 0) > 0).length / g.events.length;
  own.sort((a, b) => aboveShare(b) - aboveShare(a)
    || b.events.length - a.events.length || a.label.localeCompare(b.label));
  const groups = other.events.length ? [...own, other] : own;

  const x = scaleLinear().domain(DOMAIN).range([LABEL_W, W - 12]).clamp(true);
  const rowH = (H - PAD_TOP - AXIS_H) / Math.max(1, groups.length);

  // Dodge je Zeile: nach Residuum sortiert von links nach rechts in die erste Lane legen,
  // deren letzter Punkt weit genug entfernt ist; sonst die Lane mit dem größten Abstand.
  const posById = new Map();
  const rows = groups.map((g, i) => {
    const cy = PAD_TOP + i * rowH + rowH / 2;
    const lastX = LANES.map(() => -Infinity);
    const sorted = [...g.events].sort((a, b) =>
      (a.residual_pc ?? 0) - (b.residual_pc ?? 0) || a.id.localeCompare(b.id));
    for (const e of sorted) {
      const px = x(e.residual_pc ?? 0);
      let lane = LANES.findIndex((_, k) => px - lastX[k] >= RR_R * 2 + 1);
      if (lane < 0) lane = lastX.indexOf(Math.min(...lastX));
      lastX[lane] = px;
      posById.set(e.id, [px, cy + LANES[lane]]);
    }
    return {
      key: g.key, label: g.label, y: cy, n: g.events.length,
      nAbove: g.events.filter((e) => (e.residual_pc ?? 0) > 0).length,
      // Gruppen-Median des Residuums - der Subregion-Beat zeichnet ihn als Tick;
      // für Länderzeilen ein harmloses Zusatzfeld.
      median: d3median(g.events, (e) => e.residual_pc ?? 0),
    };
  });

  return {
    rows,
    pos: (e) => posById.get(e.id) ?? null, // null = Ghost (kein Residuum)
    x,
    zeroX: x(0),
    labelX: LABEL_W - 10,
    axisY: H - AXIS_H + 16,
    ticks: [
      { v: -2, label: '÷100' },
      { v: -1, label: '÷10' },
      { v: 0, label: 'wind-only line' },
      { v: 1, label: '×10' },
    ].map((t) => ({ ...t, x: x(t.v) })),
  };
}

// Subregion-Beat: dieselben 78 Paare, gefaltet auf die drei Pazifik-Subregionen
// (Melanesien/Polynesien/Mikronesien liegen als Feld in jedem Event). minRowN 1:
// keine „Other"-Faltung - drei Zeilen sind der Punkt des Beats.
export function computeSubregionRows(rawEvents, { W, H }) {
  return computeResidualRows(rawEvents, {
    W, H,
    groupBy: (e) => ({ key: e.subregion, label: e.subregion }),
    minRowN: 1,
  });
}
