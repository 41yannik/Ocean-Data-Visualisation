// Zeilen-Layout des Evidenz-Beats: dieselben Land-Jahre, umgeordnet zu EINER Zeile
// je Land, sortiert nach Bevölkerung (kleinstes Land oben). x = log10(affected_pc),
// also der gemeldete Anteil auf derselben Log-Skala wie im Scatter.
//
// Warum diese Achse (Audit 2026-07): Der Vorgänger zeigte hier residual_pc, den Abstand
// zu einer wind-only-Linie. Diese Linie erklärt nichts (R² 0.015, p 0.31), und 56 % aller
// Punkte lagen ohnehin über ihr — „über der Linie" war der Normalfall, kein Befund. Kein
// einziges Land wich signifikant von dieser Basisrate ab. Was die Daten wirklich zeigen:
// der gemeldete Anteil hängt an der Bevölkerungsgröße (R² 0.127, p 0.0025). Genau das
// macht diese Sortierung sichtbar — und sie erklärt sich selbst, weil der Nenner in der
// Zeilenordnung steht.
//
// Reines Layout-Modul (Muster computeUnitLayout): keine DOM-Zugriffe, deterministisch,
// unit-testbar. Der Formations-Morph (formationLayer) konsumiert nur pos(e).
//
// Gemeldete Nullen liefern pos(e) = null und bleiben hier versteckt: log10(0) existiert
// nicht, und ein Marker am Achsenrand würde eine Position auf einer quantitativen Achse
// erfinden. Sie sind Gegenstand des NÄCHSTEN Beats (Exposure-Grid), nicht dieses.
import { scaleLinear, median as d3median } from 'd3';
import { isScatterable } from '../core/filters.js';

export const RR_R = 6;          // Punktradius der Zeilen-Formation
// JEDES Land bekommt eine Zeile (minRowN 1). Der Vorgänger faltete Länder mit weniger
// als vier Records in eine „Other"-Zeile — und versteckte damit ausgerechnet die
// kleinsten Staaten, um die es in diesem Beat geht (Tuvalu, Nauru, Cook Islands,
// Marshallinseln). Der Text hätte einen Befund behauptet, den die Grafik nicht zeigt.
const MIN_ROW_N = 1;
const LABEL_W = 132;            // links reservierte Label-Spalte (längster Name + Bevölkerung)
const PAD_TOP = 14;
const AXIS_H = 34;              // Platz für Ticks + Achsen-Beschriftung unten

const BY_COUNTRY = (e) => ({ key: e.iso3, label: e.country });
const shareLog = (e) => Math.log10(e.affected_pc);

// Edge-Band für den extremen unteren Rand (Audit 2026-07): die volle Domain reicht von
// log10 ≈ -6.5 bis +0.13 (8 Dekaden), weil ein paar sehr kleine Anteile (u. a. Papua-
// Neuguinea: 2 von 6,5 Mio.) den Boden setzen. Jede Dekade als Tick+Label wäre eine
// dichte Wand aus Kleinstprozenten ohne Gefühl für die Skala. Records unter EDGE_FLOOR
// (16 % aller Punkte) bekommen stattdessen einen eigenen, schmalen komprimierten
// Streifen links der Hauptachse — dieselbe Idee wie die Zero-Lane für exakte Nullen,
// nur für "sehr klein, aber nicht null". Reihenfolge innerhalb des Streifens bleibt
// erhalten (eigene Sub-Skala), es wird nichts auf denselben Pixel gleichgesetzt.
const EDGE_FLOOR = -4;   // Anteil < 0.01 %
const EDGE_W = 34;       // px, Breite des Streifens
const EDGE_GAP = 10;     // px, Abstand Streifen ↔ Hauptachse

// x-Domain AUS DEN DATEN (kein Clamp auf eine feste Spanne mehr - der Vorgänger stapelte
// so 12 von 71 Punkten unsichtbar am Rand). Obergrenze rundet auf eine Nachkommastelle
// der Dekade (nicht die ganze Dekade hoch), sonst bliebe eine ganze leere Dekade am
// rechten Rand stehen (realer Maximalwert 136 %, nicht 1000 %).
function shareDomain(mainVals) {
  if (!mainVals.length) return [EDGE_FLOOR, 0.2];
  return [EDGE_FLOOR, Math.ceil(Math.max(...mainVals) * 10) / 10];
}

const fmtPop = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(n));

export function computeSizeRows(rawEvents, { W, H, groupBy = BY_COUNTRY, minRowN = MIN_ROW_N } = {}) {
  const plotted = rawEvents.filter(isScatterable);

  // Gruppen bilden; kleine (< minRowN Records) in „Other" falten statt vieler Mini-Zeilen.
  const byKey = new Map();
  for (const e of plotted) {
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
  // Erzähl-Reihenfolge: kleinste Bevölkerung zuerst. Das IST die Aussage des Beats —
  // die Zeilenordnung ist die erklärende Variable, nicht bloß eine Sortierung.
  const groupPop = (g) => d3median(g.events, (e) => e.pop) ?? 0;
  own.sort((a, b) => groupPop(a) - groupPop(b) || a.label.localeCompare(b.label));
  const groups = other.events.length ? [...own, other] : own;

  const allLogs = plotted.map(shareLog).filter(Number.isFinite);
  const mainLogs = allLogs.filter((v) => v >= EDGE_FLOOR);
  const edgeLogs = allLogs.filter((v) => v < EDGE_FLOOR);
  const hasEdge = edgeLogs.length > 0;

  const mainX0 = LABEL_W + (hasEdge ? EDGE_W + EDGE_GAP : 0);
  const edgeDividerX = LABEL_W + EDGE_W + EDGE_GAP / 2;

  const domain = shareDomain(mainLogs);
  const x = scaleLinear().domain(domain).range([mainX0, W - 12]).clamp(true);
  // Edge-Substrahl: eigene lineare Skala für den komprimierten Rand, damit die relative
  // Reihenfolge innerhalb des Tails erhalten bleibt (kein Gleichsetzen unterschiedlicher
  // Größenordnungen auf denselben Pixel).
  const edgeLo = hasEdge ? Math.floor(Math.min(...edgeLogs)) : EDGE_FLOOR - 1;
  const edgeX = scaleLinear().domain([edgeLo, EDGE_FLOOR]).range([LABEL_W + 4, LABEL_W + EDGE_W - 4]);
  // EINE gemeinsame Verzweigung für Datenpunkte UND Zeilen-Mediane (Audit-Fund der
  // Kritik): ein Median, der unter EDGE_FLOOR fällt, muss auf der Edge-Skala stehen,
  // nicht per .clamp(true) an den Hauptachsen-Nullpunkt gepinnt werden - sonst zeigt die
  // Median-Markierung z. B. bei Kiribati (n=1) auf einen anderen Pixel als der Punkt
  // selbst, den sie markieren soll.
  const xOf = (v) => (v < EDGE_FLOOR ? edgeX(v) : x(v));

  const rowH = (H - PAD_TOP - AXIS_H) / Math.max(1, groups.length);
  const overall = d3median(plotted, shareLog) ?? 0;

  // Lane-Versätze für den deterministischen Dodge (statt d3-force: reproduzierbar,
  // testbar). Der Versatz richtet sich nach der Zeilenhöhe: bei 15 Ländern wären feste
  // ±26 px Nachbarzeilen überlappt. Mindestabstand = Durchmesser, sonst berühren sich
  // die Kreise innerhalb einer Lane-Spalte.
  const laneStep = Math.max(RR_R * 2 + 1, Math.min(13, (rowH - RR_R * 2) / 2));
  const LANES = [0, -laneStep, laneStep, -laneStep * 2, laneStep * 2];

  // Dodge je Zeile: nach Anteil sortiert von links nach rechts in die erste Lane legen,
  // deren letzter Punkt weit genug entfernt ist; sonst die Lane mit dem größten Abstand.
  const posById = new Map();
  const rows = groups.map((g, i) => {
    const cy = PAD_TOP + i * rowH + rowH / 2;
    const lastX = LANES.map(() => -Infinity);
    const sorted = [...g.events].sort((a, b) => shareLog(a) - shareLog(b) || a.id.localeCompare(b.id));
    for (const e of sorted) {
      const px = xOf(shareLog(e));
      let lane = LANES.findIndex((_, k) => px - lastX[k] >= RR_R * 2 + 1);
      if (lane < 0) lane = lastX.indexOf(Math.min(...lastX));
      lastX[lane] = px;
      posById.set(e.id, [px, cy + LANES[lane]]);
    }
    const pop = groupPop(g);
    const median = d3median(g.events, shareLog);
    return {
      key: g.key,
      label: g.label,
      // Die Bevölkerung steht als Sublabel in der Zeile: der Leser sieht den Nenner,
      // von dem der Anteil abhängt, ohne ihn erraten zu müssen.
      sublabel: g.key === 'OTHER' ? `${g.events.length} records` : `${fmtPop(pop)} people`,
      pop,
      y: cy,
      n: g.events.length,
      nAbove: g.events.filter((e) => shareLog(e) > overall).length,
      median,
      medianX: median != null ? xOf(median) : null,
    };
  });

  return {
    rows,
    pos: (e) => posById.get(e.id) ?? null, // null = gemeldete Null (kein Logarithmus)
    x,
    // Bezugslinie: Median aller geplotteten Anteile. Sie behauptet nichts über den Wind.
    zeroX: xOf(overall),
    overallMedian: overall,
    labelX: LABEL_W - 10,
    axisY: H - AXIS_H + 16,
    hasEdge,
    edgeDividerX,
    ticks: (() => {
      const out = [];
      for (let v = domain[0]; v <= domain[1]; v += 1) {
        const pct = 10 ** v * 100;
        out.push({ v, label: pct >= 1 ? `${pct}%` : `${Number(pct.toPrecision(1))}%`, x: x(v) });
      }
      return out;
    })(),
  };
}

// Subregion-Faltung: dieselben Records auf die drei Pazifik-Subregionen. minRowN 1:
// keine „Other"-Faltung. Wird von der Explore-Linse genutzt; in der Story trägt der
// Beat die Länderzeilen, weil das Subregionen-Muster nachweislich ein Größeneffekt ist
// (Micronesia = die kleinsten Nenner, nicht die verwundbarste Region).
export function computeSubregionRows(rawEvents, { W, H }) {
  return computeSizeRows(rawEvents, {
    W, H,
    groupBy: (e) => ({ key: e.subregion, label: e.subregion }),
    minRowN: 1,
  });
}
