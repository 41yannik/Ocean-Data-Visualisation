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
//       zeroCount · zeroWithStorm · zeroStrong · noReport · stormExposed
//       medianShare                          Median-Anteil über alle Fit-Records
//       smallCountryAbove                    "12 of 14" - Records kleiner Länder über dem Median
//       smallCountryMax                      Bevölkerungsschwelle „klein" (formatiert)
//       affectedRatio.<idA>.<idB>            gerundetes Verhältnis affected(A)/affected(B)
//       affectedPcRatio.<idA>.<idB>          gerundetes Verhältnis affected_pc(A)/affected_pc(B)
//
// Entfallen (Audit 2026-07): aboveShare/aboveCount/subregionAboveCount zählten Punkte
// über einer wind-only line, die nichts erklärt - bei einer Basisrate von 56 % war
// „über der Linie" der Normalfall und kein Befund.
import { fmtInt, fmtPct, fmtKt, fmtCategory } from '../core/format.js';
import { isScatterable, isZeroLane } from '../core/filters.js';

// Schwelle „kleines Land" für den Landesgrößen-Beat: unter 60 000 Einwohnern.
// Bewusst eine runde Zahl, die im Text steht - keine aus den Daten optimierte Grenze.
export const SMALL_COUNTRY_POP = 60000;

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

// Median des gemeldeten Anteils über alle Fit-Records - Bezugsgröße des Landesgrößen-Beats.
function medianShare(events) {
  const vals = events.filter(isScatterable).map((e) => e.affected_pc).sort((a, b) => a - b);
  if (!vals.length) return 0;
  const mid = vals.length >> 1;
  return vals.length % 2 ? vals[mid] : (vals[mid - 1] + vals[mid]) / 2;
}

function lookupStat([name, ...args], ctx, token) {
  const events = ctx.data.events;
  if (name === 'scatterCount') return fmtInt(events.filter(isScatterable).length);
  if (name === 'eventCount') return fmtInt(events.length);
  if (name === 'missingPairs') return fmtInt(events.length - events.filter(isScatterable).length);
  // Ehrliche Zerlegung der nicht-scatterbaren Records: ohne gemeldeten Impact vs.
  // mit Impact, aber ohne Sturm im Naehe-Radius (missingWind).
  if (name === 'missingToll') return fmtInt(events.filter((e) => e.affected == null).length);
  // NUR Records mit POSITIVEM Toll und ohne Sturm im Radius. Die Vorgaengerformel
  // (affected != null && !isScatterable) zaehlte die 75 gemeldeten Nullen mit und ergab
  // 104 - die Nullen stehen im selben Satz aber schon separat, und eine gemeldete Null
  // ist kein "reported toll". 29 ist zugleich der Wert in meta.coverage.missing_wind,
  // den der Methodenabschnitt ausweist (Audit 2026-07-26).
  if (name === 'missingWind') {
    return fmtInt(events.filter((e) => (e.affected ?? 0) > 0 && e.intensity_kt == null).length);
  }
  // Challenge-Ehrlichkeit: Land-Jahre, die ein Sturm im Nähe-Radius erreichte (aus meta.coverage).
  if (name === 'stormExposed') {
    const n = ctx.meta?.coverage?.storm_exposed;
    if (n == null) throw new Error(`Story-Referenz: coverage.storm_exposed fehlt (${token})`);
    return fmtInt(n);
  }
  if (name === 'yearMin') return String(Math.min(...events.map((e) => e.year)));
  if (name === 'yearMax') return String(Math.max(...events.map((e) => e.year)));
  // Ehrlichkeits-Beat: ausdrücklich als 0 gemeldete Land-Jahre.
  if (name === 'zeroCount') return fmtInt(events.filter((e) => e.affected === 0).length);
  if (name === 'zeroWithStorm') return fmtInt(events.filter(isZeroLane).length);
  if (name === 'zeroStrong') {
    // Wie viele der gemeldeten Nullen trafen ein Land mit Hurrikanstärke (>= 64 kt)?
    return fmtInt(events.filter((e) => isZeroLane(e) && e.intensity_kt >= 64).length);
  }
  if (name === 'noReport') {
    const n = ctx.meta?.coverage?.no_report;
    if (n == null) throw new Error(`Story-Referenz: coverage.no_report fehlt (${token})`);
    return fmtInt(n);
  }
  // Landesgrößen-Beat: Median-Anteil und die Bilanz der kleinsten Länder.
  if (name === 'medianShare') return fmtPct(medianShare(events));
  if (name === 'smallCountryAbove') {
    const med = medianShare(events);
    const rows = events.filter((e) => isScatterable(e) && e.pop < SMALL_COUNTRY_POP);
    if (!rows.length) throw new Error(`Story-Referenz: keine Records kleiner Länder (${token})`);
    return `${rows.filter((e) => e.affected_pc > med).length} of ${rows.length}`;
  }
  if (name === 'smallCountryMax') return `${Math.round(SMALL_COUNTRY_POP / 1000)},000`;
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
