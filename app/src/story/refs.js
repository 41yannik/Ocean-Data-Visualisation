// Referenz-Resolver für Story-Texte: {{ns:pfad[:fmt]}} → formatierter Wert aus echten Daten.
// Wirft bei unbekannter oder leerer Referenz (Paket-06-DoD: keine hart getippte Datenzahl —
// ein Fehler soll als Banner knallen, nicht als stilles falsches Faktum durchrutschen).
//
// Grammatik:
//   {{event:<id>.<feld>[:int|pct|kt|cat]}}   Feld einer events.json-Zeile, optional formatiert
//   {{fit:<mode>.<r2|r2pct|p|n>}}            meta.fits, vor-formatiert (kein :fmt erlaubt)
//   {{sst:<latest|first>.<year|anom>}}       sst.json-Randwerte, vor-formatiert
//   {{stat:<name>[.<args>]}}                 abgeleitete Statistik, vor-formatiert:
//       scatterCount · eventCount · yearMin · yearMax
//       aboveShare.<iso3>                    Anteil der Scatter-Punkte des Landes über der Linie
//       affectedRatio.<idA>.<idB>            gerundetes Verhältnis affected(A)/affected(B)
import { fmtInt, fmtPct, fmtKt, fmtCategory } from '../core/format.js';
import { isScatterable } from '../core/filters.js';

const EVENT_FORMATTERS = {
  int: fmtInt, pct: fmtPct, kt: fmtKt, cat: fmtCategory,
  raw: (v) => String(v),
};

export function resolveRefs(template, ctx) {
  return template.replace(/\{\{([a-z]+):([^}\s]+)\}\}/g, (token, ns, rest) => {
    const [path, fmt] = rest.split(':');
    if (ns !== 'event' && fmt) {
      throw new Error(`Story-Referenz: ${ns}-Werte sind vor-formatiert, ":${fmt}" ist unzulässig — ${token}`);
    }
    const value = lookup(ns, path.split('.'), fmt ?? 'raw', ctx, token);
    if (value == null) throw new Error(`Story-Referenz ohne Wert: ${token}`);
    return value;
  });
}

function lookup(ns, parts, fmt, ctx, token) {
  if (ns === 'event') return lookupEvent(parts, fmt, ctx, token);
  if (ns === 'fit') return lookupFit(parts, ctx, token);
  if (ns === 'sst') return lookupSst(parts, ctx, token);
  if (ns === 'stat') return lookupStat(parts, ctx, token);
  throw new Error(`Story-Referenz mit unbekanntem Namensraum: ${token}`);
}

function lookupEvent([id, field, ...extra], fmt, ctx, token) {
  if (extra.length) throw new Error(`Story-Referenz mit ungültigem Pfad: ${token}`);
  const formatter = EVENT_FORMATTERS[fmt];
  if (!formatter) throw new Error(`Story-Referenz mit unbekanntem Format: ${token}`);
  const event = ctx.data.index.byId.get(id);
  if (!event) throw new Error(`Story-Referenz auf unbekanntes Event: ${token}`);
  if (!field || !(field in event)) throw new Error(`Story-Referenz auf unbekanntes Feld: ${token}`);
  const value = event[field];
  if (value == null) return null; // resolveRefs wirft mit Token-Kontext
  return formatter(value);
}

function lookupFit([mode, key], ctx, token) {
  const fit = ctx.meta?.fits?.[mode];
  if (!fit) throw new Error(`Story-Referenz auf unbekannten Fit: ${token}`);
  if (key === 'r2') return fit.r2.toFixed(2);
  if (key === 'r2pct') return fmtPct(fit.r2);
  if (key === 'p') return fit.p < 0.001 ? '< 0.001' : fit.p.toFixed(3);
  if (key === 'n') return fmtInt(fit.n);
  throw new Error(`Story-Referenz auf unbekannten Fit-Schlüssel: ${token}`);
}

function lookupSst([which, field], ctx, token) {
  const sst = ctx.data.sst;
  if (!Array.isArray(sst) || !sst.length) throw new Error(`Story-Referenz: sst-Daten fehlen — ${token}`);
  const row = which === 'latest' ? sst[sst.length - 1] : which === 'first' ? sst[0] : null;
  if (!row) throw new Error(`Story-Referenz auf unbekannten sst-Selektor: ${token}`);
  if (field === 'year') return String(row.year);
  if (field === 'anom') return `${row.anom > 0 ? '+' : ''}${row.anom.toFixed(2)} °C`;
  throw new Error(`Story-Referenz auf unbekanntes sst-Feld: ${token}`);
}

function lookupStat([name, ...args], ctx, token) {
  const events = ctx.data.events;
  if (name === 'scatterCount') return fmtInt(events.filter(isScatterable).length);
  if (name === 'eventCount') return fmtInt(events.length);
  if (name === 'yearMin') return String(Math.min(...events.map((e) => e.year)));
  if (name === 'yearMax') return String(Math.max(...events.map((e) => e.year)));
  if (name === 'aboveShare') {
    const rows = events.filter((e) => e.iso3 === args[0] && isScatterable(e));
    if (!rows.length) throw new Error(`Story-Referenz: keine Scatter-Punkte für ${args[0]} — ${token}`);
    return fmtPct(rows.filter((e) => (e.residual_pc ?? 0) > 0).length / rows.length);
  }
  if (name === 'affectedRatio') {
    const [a, b] = args.map((id) => ctx.data.index.byId.get(id));
    if (!a || !b) throw new Error(`Story-Referenz auf unbekanntes Event: ${token}`);
    if (a.affected == null || b.affected == null || !b.affected) return null;
    return String(Math.round(a.affected / b.affected));
  }
  throw new Error(`Story-Referenz auf unbekannte Statistik: ${token}`);
}
