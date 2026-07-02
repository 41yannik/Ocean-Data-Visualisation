// Zahlen-/Textformatierung — pure Funktionen, keine DOM-/State-Abhängigkeit.
import { format } from 'd3';

const intFmt = format(',d');
const pctFmt = format('.2~p');

export const fmtInt = (v) => (v == null ? '—' : intFmt(v));
export const fmtPct = (v) => (v == null ? '—' : pctFmt(v));
export const fmtKt = (v) => (v == null ? '—' : `${Math.round(v)} kt`);

export function fmtCategory(cat) {
  if (cat == null) return 'uncategorised';
  return cat >= 1 ? `Category ${cat}` : 'below Cat 1';
}

export function fmtSource(src) {
  if (src === 'ibtracs') return 'IBTrACS peak wind (1-min)';
  if (src === 'emdat_fallback') return 'converted EM-DAT wind — no track';
  return 'no wind data';
}

// Trend-Annotation IMMER generiert, nie getippt (Lücke L8):
// p ≥ 0.05 macht die Nicht-Signifikanz zur Pointe.
export function fitLabel(fit) {
  const p = fit.p < 0.001 ? 'p < 0.001' : `p = ${fit.p.toFixed(3)}`;
  const base = `R² = ${fit.r2.toFixed(2)} · n = ${fit.n} · ${p}`;
  return fit.p >= 0.05
    ? `${base} — not significant: wind alone predicts almost nothing`
    : base;
}
