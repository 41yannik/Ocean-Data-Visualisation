// Referenz-Resolver für Story-Texte: {{ns:pfad[:fmt]}} → formatierter Wert aus echten Daten.
// Wirft bei unbekannter oder leerer Referenz (Paket-06-DoD: keine hart getippte Datenzahl -
// ein Fehler soll als Banner knallen, nicht als stilles falsches Faktum durchrutschen).
//
// Grammatik:
//   {{event:<id>.<feld>[:int|pct|kt|cat]}}   Feld einer events.json-Zeile, optional formatiert
//   {{fit:<mode>.<r2|r2pct|p|n>}}            meta.fits, vor-formatiert (kein :fmt erlaubt)
//   {{sst:<latest|first>.<year|anom>}}       sst.json-Randwerte, vor-formatiert
//   {{trend:<pfad>}}                         trends.json (physischer Sturmtrend), vor-formatiert:
//       yearMin · yearMax
//       count.<first5|last5|perDecade|r2|p>
//       windMean.<perDecade|r2|r2pct|p>
//       genesisWP.<perDecade|p|northKm|latFirst|latLast>
//       genesisSP.<perDecade|p>
//   {{stat:<name>[.<args>]}}                 abgeleitete Statistik, vor-formatiert:
//       scatterCount · eventCount · missingPairs · missingToll · missingWind
//       yearMin · yearMax · totalAffected
//       aboveShare.<iso3>                    Anteil der Scatter-Punkte des Landes über der Linie
//       aboveCount.<iso3>                    dito als Zähler, z. B. "8 of 10"
//       subregionAboveCount.<name>           Zähler je Subregion, z. B. "12 of 17"
//       affectedRatio.<idA>.<idB>            gerundetes Verhältnis affected(A)/affected(B)
//       affectedPcRatio.<idA>.<idB>          gerundetes Verhältnis affected_pc(A)/affected_pc(B)
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
      throw new Error(`Story-Referenz: ${ns}-Werte sind vor-formatiert, ":${fmt}" ist unzulässig (${token})`);
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
  if (ns === 'trend') return lookupTrend(parts, ctx, token);
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
  if (!Array.isArray(sst) || !sst.length) throw new Error(`Story-Referenz: sst-Daten fehlen (${token})`);
  const row = which === 'latest' ? sst[sst.length - 1] : which === 'first' ? sst[0] : null;
  if (!row) throw new Error(`Story-Referenz auf unbekannten sst-Selektor: ${token}`);
  if (field === 'year') return String(row.year);
  if (field === 'anom') return `${row.anom > 0 ? '+' : ''}${row.anom.toFixed(2)} °C`;
  throw new Error(`Story-Referenz auf unbekanntes sst-Feld: ${token}`);
}

// Physischer Sturmtrend aus trends.json - alle Werte vor-formatiert (kein :fmt).
function lookupTrend([group, key], ctx, token) {
  const t = ctx.data.trends;
  if (!t?.fits || !t?.summary) throw new Error(`Story-Referenz: trends-Daten fehlen (${token})`);
  const pfmt = (p) => (p < 0.001 ? '< 0.001' : p.toFixed(3));
  const signed1 = (v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}`;

  if (group === 'yearMin') return String(t.window[0]);
  if (group === 'yearMax') return String(t.window[1]);
  if (group === 'count') {
    if (key === 'first5') return String(Math.round(t.summary.count.first5));
    if (key === 'last5') return String(Math.round(t.summary.count.last5));
    if (key === 'perDecade') return signed1(t.fits.count.perDecade);
    if (key === 'r2') return t.fits.count.r2.toFixed(2);
    if (key === 'p') return pfmt(t.fits.count.p);
  }
  if (group === 'windMean') {
    if (key === 'perDecade') return signed1(t.fits.windMean.perDecade);
    if (key === 'r2') return t.fits.windMean.r2.toFixed(2);
    if (key === 'r2pct') return fmtPct(t.fits.windMean.r2);
    if (key === 'p') return pfmt(t.fits.windMean.p);
  }
  if (group === 'genesisWP') {
    if (key === 'perDecade') return signed1(t.fits.genesisWP.perDecade);
    if (key === 'p') return pfmt(t.fits.genesisWP.p);
    if (key === 'northKm') return String(t.summary.genesis.wpNorthKm);
    if (key === 'latFirst') return t.summary.genesis.wpLatFirst.toFixed(1);
    if (key === 'latLast') return t.summary.genesis.wpLatLast.toFixed(1);
  }
  // Südpazifik-Becken: bewusst NUR p und perDecade - eine km-Verschiebung gibt es
  // dort nicht zu behaupten (p = 0.71, kein Trend).
  if (group === 'genesisSP') {
    if (key === 'perDecade') return signed1(t.fits.genesisSP.perDecade);
    if (key === 'p') return pfmt(t.fits.genesisSP.p);
  }
  throw new Error(`Story-Referenz auf unbekannten Trend-Schlüssel: ${token}`);
}

function lookupStat([name, ...args], ctx, token) {
  const events = ctx.data.events;
  if (name === 'scatterCount') return fmtInt(events.filter(isScatterable).length);
  if (name === 'eventCount') return fmtInt(events.length);
  if (name === 'missingPairs') return fmtInt(events.length - events.filter(isScatterable).length);
  // Ehrliche Zerlegung der nicht-scatterbaren Records: ohne gemeldeten Impact vs.
  // mit Impact, aber ohne Sturm im Naehe-Radius (missingWind).
  if (name === 'missingToll') return fmtInt(events.filter((e) => e.affected == null).length);
  if (name === 'missingWind') return fmtInt(events.filter((e) => e.affected != null && !isScatterable(e)).length);
  // Challenge-Ehrlichkeit: Land-Jahre, die ein Sturm im Nähe-Radius erreichte (aus meta.coverage).
  if (name === 'stormExposed') {
    const n = ctx.meta?.coverage?.storm_exposed;
    if (n == null) throw new Error(`Story-Referenz: coverage.storm_exposed fehlt (${token})`);
    return fmtInt(n);
  }
  if (name === 'yearMin') return String(Math.min(...events.map((e) => e.year)));
  if (name === 'yearMax') return String(Math.max(...events.map((e) => e.year)));
  if (name === 'aboveShare') {
    const rows = events.filter((e) => e.iso3 === args[0] && isScatterable(e));
    if (!rows.length) throw new Error(`Story-Referenz: keine Scatter-Punkte für ${args[0]} (${token})`);
    return fmtPct(rows.filter((e) => (e.residual_pc ?? 0) > 0).length / rows.length);
  }
  if (name === 'aboveCount') {
    // Zähler-Variante von aboveShare: macht die Behauptung im Chart abzählbar ("8 of 10").
    const rows = events.filter((e) => e.iso3 === args[0] && isScatterable(e));
    if (!rows.length) throw new Error(`Story-Referenz: keine Scatter-Punkte für ${args[0]} (${token})`);
    return `${rows.filter((e) => (e.residual_pc ?? 0) > 0).length} of ${rows.length}`;
  }
  if (name === 'subregionAboveCount') {
    // Zähler je Subregion (Subregion-Beat): "12 of 17" für Polynesia.
    const rows = events.filter((e) => e.subregion === args[0] && isScatterable(e));
    if (!rows.length) throw new Error(`Story-Referenz: keine Scatter-Punkte für Subregion ${args[0]} (${token})`);
    return `${rows.filter((e) => (e.residual_pc ?? 0) > 0).length} of ${rows.length}`;
  }
  if (name === 'totalAffected') {
    const vals = events.map((e) => e.affected).filter((v) => v != null);
    if (!vals.length) throw new Error(`Story-Referenz: keine affected-Werte (${token})`);
    return fmtInt(vals.reduce((a, b) => a + b, 0));
  }
  if (name === 'affectedRatio') {
    const [a, b] = args.map((id) => ctx.data.index.byId.get(id));
    if (!a || !b) throw new Error(`Story-Referenz auf unbekanntes Event: ${token}`);
    if (a.affected == null || b.affected == null || !b.affected) return null;
    return String(Math.round(a.affected / b.affected));
  }
  if (name === 'affectedPcRatio') {
    const [a, b] = args.map((id) => ctx.data.index.byId.get(id));
    if (!a || !b) throw new Error(`Story-Referenz auf unbekanntes Event: ${token}`);
    if (a.affected_pc == null || b.affected_pc == null || !b.affected_pc) return null;
    return String(Math.round(a.affected_pc / b.affected_pc));
  }
  throw new Error(`Story-Referenz auf unbekannte Statistik: ${token}`);
}
