// Zahlen-/Textformatierung - pure Funktionen, keine DOM-/State-Abhängigkeit.
import { format } from 'd3';

const intFmt = format(',d');
const pctFmt = format('.2~p');

// Fehlwerte sprechen die Methodik-Sprache: Impacts sind BERICHTET (not reported),
// Wind ist GEMESSEN (not measured). Dichte Tabellen nutzen lokal "—" (detailPanel).
export const fmtInt = (v) => (v == null ? 'not reported' : intFmt(v));
export const fmtPct = (v) => (v == null ? 'not reported' : pctFmt(v));
export const fmtKt = (v) => (v == null ? 'not measured' : `${Math.round(v)} kt`);

export function fmtCategory(cat) {
  if (cat == null) return 'uncategorised';
  return cat >= 1 ? `Category ${cat}` : 'below Cat 1';
}

export function fmtSource(src) {
  if (src === 'ibtracs') return 'IBTrACS max sustained wind (1-min)';
  if (src === 'emdat_fallback') return 'wind reconstructed from disaster records (no track)';
  return 'no wind data';
}

// Trend-Annotation IMMER generiert, nie getippt (Lücke L8):
// p ≥ 0.05 macht die Nicht-Signifikanz zur Pointe.
export function fitLabel(fit) {
  const p = fit.p < 0.001 ? 'p < 0.001' : `p = ${fit.p.toFixed(3)}`;
  // 3 Nachkommastellen: 0.065 statt 0.06 - konsistent mit dem Fließtext-„6.5%"
  // (fmtPct(0.0647)). toFixed(2) rundete auf 0.06 → Leser rechnet fälschlich 6%.
  const base = `R² = ${fit.r2.toFixed(3)} · n = ${fit.n} · ${p}`;
  return fit.p >= 0.05
    ? `${base} · not significant: wind alone explains almost nothing`
    : base;
}

// Neutrale Trend-Caption für Zeitreihen (storm-trend-Sektion) - gleiche Form wie
// fitLabel, aber OHNE den wind-spezifischen Nachsatz: hier ist die Nicht-Signifikanz
// die Aussage ("kein klarer Trend"), nicht "Wind erklärt nichts".
export function trendCaption(fit) {
  const p = fit.p < 0.001 ? 'p < 0.001' : `p = ${fit.p.toFixed(3)}`;
  const base = `R² = ${fit.r2.toFixed(3)} · n = ${fit.n} · ${p}`;
  return fit.p >= 0.05 ? `${base} · not significant` : base;
}
