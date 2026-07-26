import assert from 'node:assert/strict';
import test from 'node:test';

import { isScatterable, isZeroLane, isPlottable, matchesFilters } from '../app/src/core/filters.js';
import { makeInitialState } from '../app/src/core/initialState.js';
import { createStore } from '../app/src/core/state.js';
import { buildConclusionSynthesisModel } from '../app/src/story/conclusionSynthesis.js';
import { computeSizeRows, computeSubregionRows, RR_R } from '../app/src/story/sizeRows.js';
import { resolveRefs } from '../app/src/story/refs.js';
import { buildSteps, STEP_COUNT } from '../app/src/story/steps.js';
import { buildGenesisModel } from '../app/src/story/stormTrend.js';
import { SECTIONS } from '../app/src/story/sections.js';
import { buildCountryRecurrence } from '../app/src/ui/countryRecurrence.js';
import { aggregateHotZoneCells } from '../app/src/ui/trackHeatmap.js';
import { buildResidualLab } from '../app/src/ui/residualLab.js';
import { buildLabHeroStat } from '../app/src/ui/exploreLab.js';
import { buildCountryToll } from '../app/src/ui/tollMap.js';
import { DATA_FILES } from '../app/src/core/dataLoader.js';
import { METHOD_CATALOG, methodsHtml } from '../app/src/story/methods.js';
import { THEME_PALETTES } from '../app/src/core/config.js';
import {
  applyTheme,
  DEFAULT_THEME,
  getActivePalette,
  getInitialTheme,
  THEME_CHANGE_EVENT,
  THEME_STORAGE_KEY,
} from '../app/src/core/theme.js';
import { readFile } from 'node:fs/promises';


function fakeThemeRoot(theme = 'light') {
  const properties = new Map();
  return {
    dataset: { theme },
    style: {
      colorScheme: '',
      setProperty(name, value) { properties.set(name, value); },
    },
    properties,
  };
}

function contrastRatio(foreground, background) {
  const luminance = (hex) => {
    const channels = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16) / 255)
      .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const first = luminance(foreground); const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}


test('theme preference defaults safely and accepts only known stored values', () => {
  const storage = (value) => ({ getItem: () => value });
  assert.equal(getInitialTheme(storage(null)), DEFAULT_THEME);
  assert.equal(getInitialTheme(storage('ocean')), 'ocean');
  assert.equal(getInitialTheme(storage('sepia')), DEFAULT_THEME);
  assert.equal(getInitialTheme({ getItem() { throw new Error('blocked'); } }), DEFAULT_THEME);
});

test('applyTheme updates semantic tokens, persistence and the public theme event', () => {
  const root = fakeThemeRoot('light');
  const writes = [];
  const storage = { setItem: (...args) => writes.push(args) };
  const events = [];
  class FakeCustomEvent {
    constructor(type, options) { this.type = type; this.detail = options.detail; }
  }
  const eventTarget = { CustomEvent: FakeCustomEvent, dispatchEvent: (event) => events.push(event) };

  assert.equal(applyTheme('ocean', { root, storage, eventTarget }), 'ocean');
  assert.equal(root.dataset.theme, 'ocean');
  assert.equal(root.style.colorScheme, 'dark');
  assert.equal(root.properties.get('--bg'), THEME_PALETTES.ocean.bg);
  assert.equal(root.properties.get('--surface'), THEME_PALETTES.ocean.surface);
  assert.deepEqual(writes, [[THEME_STORAGE_KEY, 'ocean']]);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, THEME_CHANGE_EVENT);
  assert.equal(events[0].detail.theme, 'ocean');
  assert.equal(getActivePalette(root), THEME_PALETTES.ocean);

  applyTheme('unknown', { root, persist: false, eventTarget });
  assert.equal(root.dataset.theme, DEFAULT_THEME);
  assert.equal(root.style.colorScheme, 'light');
});

test('both theme palettes meet text and data-mark contrast floors on the page background', () => {
  for (const [name, palette] of Object.entries(THEME_PALETTES)) {
    assert.ok(contrastRatio(palette.text, palette.bg) >= 4.5, `${name} primary text contrast`);
    assert.ok(contrastRatio(palette.muted, palette.bg) >= 4.5, `${name} muted text contrast`);
    assert.ok(contrastRatio(palette.accentText, palette.bg) >= 4.5, `${name} accent text contrast`);
    assert.ok(contrastRatio(palette.point, palette.bg) >= 3, `${name} data blue contrast`);
  }
});


test('store only notifies for changed top-level values', () => {
  const store = createStore({ count: 1, label: 'storm' });
  const notifications = [];
  store.subscribe((state, patch) => notifications.push({ state, patch }));

  store.set({ count: 1 });
  assert.equal(notifications.length, 0);

  store.set({ count: 2, label: 'storm' });
  assert.equal(notifications.length, 1);
  assert.deepEqual(notifications[0].patch, { count: 2 });
  assert.deepEqual(store.get(), { count: 2, label: 'storm' });
});

test('initial state returns independent mutable containers', () => {
  const first = makeInitialState();
  const second = makeInitialState();

  first.filters.yearRange[0] = 2010;

  assert.deepEqual(second.filters.yearRange, [2005, 2023]);
  assert.equal(second.stormPin, null);
});

test('filters combine inclusive year, minimum-category set, and countries', () => {
  const event = { year: 2015, category: 3, iso3: 'VUT' };
  const filters = {
    yearRange: [2015, 2020],
    categories: [3, 4, 5],
    countries: ['VUT'],
  };

  assert.equal(matchesFilters(event, filters), true);
  assert.equal(matchesFilters({ ...event, year: 2014 }, filters), false);
  assert.equal(matchesFilters({ ...event, category: null }, filters), false);
  assert.equal(matchesFilters({ ...event, iso3: 'FJI' }, filters), false);
});

test('scatterable needs a positive toll; reported zeros form their own class', () => {
  // Der Log-Bereich verlangt einen POSITIVEN Toll - log10(0) existiert nicht.
  assert.equal(isScatterable({ intensity_kt: 80, affected: 100 }), true);
  assert.equal(isScatterable({ intensity_kt: 80, affected: 0 }), false);
  assert.equal(isScatterable({ intensity_kt: null, affected: 100 }), false);
  assert.equal(isScatterable({ intensity_kt: 80, affected: null }), false);
  // Gemeldete Nullen mit Sturm im Radius sind Records, keine Lücken: eigene Klasse.
  assert.equal(isZeroLane({ intensity_kt: 80, affected: 0 }), true);
  assert.equal(isZeroLane({ intensity_kt: null, affected: 0 }), false);
  assert.equal(isZeroLane({ intensity_kt: 80, affected: 5 }), false);
  // Beide erscheinen im Plot, ein Toll ohne Sturm nicht.
  assert.equal(isPlottable({ intensity_kt: 80, affected: 0 }), true);
  assert.equal(isPlottable({ intensity_kt: 80, affected: 5 }), true);
  assert.equal(isPlottable({ intensity_kt: null, affected: 5 }), false);
});

test('events carry local wind and no residual fields', async () => {
  const events = JSON.parse(await readFile(new URL('../app/public/data/events.json', import.meta.url)));
  const meta = JSON.parse(await readFile(new URL('../app/public/data/meta.json', import.meta.url)));
  // Residuen beziehen sich auf einen Fit ohne Erklärungswert und werden nicht mehr geliefert.
  for (const e of events) {
    assert.equal('residual_pc' in e, false, `${e.id} still carries residual_pc`);
    assert.equal('residual_abs' in e, false, `${e.id} still carries residual_abs`);
  }
  // intensity_kt ist der lokal erreichte Wind und darf den Lifetime-Peak nie übersteigen.
  const withBoth = events.filter((e) => e.intensity_kt != null && e.peak_kt != null);
  assert.ok(withBoth.length > 0, 'no records with both winds');
  for (const e of withBoth) {
    assert.ok(e.intensity_kt <= e.peak_kt, `${e.id}: local wind above lifetime peak`);
  }
  // Mindestens ein Record, wo beide auseinanderfallen - sonst wäre die Umstellung wirkungslos.
  assert.ok(withBoth.some((e) => e.intensity_kt < e.peak_kt), 'local wind never differs from peak');
  // Zähler-Konsistenz gegen die Daten.
  assert.equal(meta.coverage.rows, events.length);
  assert.equal(meta.coverage.scatterable, events.filter(isScatterable).length);
  assert.equal(meta.coverage.zero_lane, events.filter(isZeroLane).length);
  assert.equal(meta.fits.perCapita.n, meta.coverage.scatterable);
  // popSize läuft auf derselben Stichprobe - nur so ist der R²-Vergleich zulässig.
  assert.equal(meta.fits.popSize.n, meta.fits.perCapita.n);
});

test('conclusion synthesis exposes the mismatch and keeps one ordered dataset', async () => {
  const events = JSON.parse(await readFile(new URL('../app/public/data/events.json', import.meta.url)));
  const model = buildConclusionSynthesisModel(events);

  // Datengetrieben statt hartkodiert (Audit 2026-07): der Test sichert die Mechanik,
  // nicht eine bestimmte Rangliste. Sonst zementieren Tests die Story-Schlussfolgerung.
  assert.equal(model.rows.length, events.filter(isScatterable).length);
  assert.ok(model.topWind.length >= 5 && model.topImpact.length >= 5);
  // Die Pointe des Beats: die beiden Ranglisten stimmen NICHT überein.
  assert.ok(model.shared.length < 5, 'top five identical in both orders - no mismatch to tell');
  assert.ok(model.ordered.every((row, i) => i === 0 || model.ordered[i - 1].intensity_kt <= row.intensity_kt));
  // Rang 1 je Kriterium gehört wirklich dem Maximum.
  const maxWind = Math.max(...model.rows.map((r) => r.intensity_kt));
  const maxShare = Math.max(...model.rows.map((r) => r.affected_pc));
  assert.equal(model.topWind[0].intensity_kt, maxWind);
  assert.equal(model.topImpact[0].affected_pc, maxShare);
});

test('conclusion keeps both top-five readings linked to the same complete rows', async () => {
  const events = JSON.parse(await readFile(new URL('../app/public/data/events.json', import.meta.url)));
  const model = buildConclusionSynthesisModel(events);

  assert.ok([...model.topWind, ...model.topImpact].every((row) => model.byId.get(row.id) === row));
  assert.equal(new Set(model.ordered.map((row) => row.id)).size, model.rows.length);
  assert.ok(model.orders.impact.every((row, i) =>
    i === 0 || model.orders.impact[i - 1].affected_pc <= row.affected_pc));
  // Jede Zeile trägt beide Ränge, sonst kann die verlinkte Ansicht nicht koppeln.
  assert.ok(model.rows.every((row) => row.windRank >= 1 && row.impactRank >= 1));
});

test('country recurrence sorts by reported impacts and keeps every record counted', async () => {
  const events = JSON.parse(await readFile(new URL('../app/public/data/events.json', import.meta.url)));
  const rows = buildCountryRecurrence(events);
  assert.equal(rows.length, new Set(events.map((e) => e.iso3)).size);
  assert.ok(rows.every((row, index) => index === 0 || rows[index - 1].reportedCount >= row.reportedCount));
  // Jede gemeldete Zeile ist genau einmal gezählt - auch die gemeldeten Nullen.
  assert.equal(rows.reduce((sum, row) => sum + row.totalCount, 0), events.length);
  assert.equal(
    rows.reduce((sum, row) => sum + row.reportedCount, 0),
    events.filter((e) => e.affected > 0).length,
  );
});

test('size rows give every country its own row, ordered by population', async () => {
  const events = JSON.parse(await readFile(new URL('../app/public/data/events.json', import.meta.url)));
  const rr = computeSizeRows(events, { W: 562, H: 416 });

  const scatterable = events.filter(isScatterable);
  assert.ok(scatterable.every((e) => rr.pos(e) != null));
  // Gemeldete Nullen haben keinen Logarithmus und bekommen deshalb keine Position.
  assert.ok(events.filter((e) => !isScatterable(e)).every((e) => rr.pos(e) == null));
  assert.equal(rr.rows.reduce((sum, row) => sum + row.n, 0), scatterable.length);

  // KEINE „Other"-Faltung mehr: sie versteckte ausgerechnet die kleinsten Staaten,
  // um die es im Beat geht (Regression zum Audit 2026-07).
  assert.ok(!rr.rows.some((row) => row.key === 'OTHER'), 'small countries folded away again');
  assert.equal(rr.rows.length, new Set(scatterable.map((e) => e.iso3)).size);

  // Zeilenordnung IST die Aussage: kleinste Bevölkerung zuerst.
  for (let i = 1; i < rr.rows.length; i++) {
    assert.ok(rr.rows[i - 1].pop <= rr.rows[i].pop, `row order broken at ${rr.rows[i].label}`);
  }
  assert.ok(rr.rows[0].pop < 50_000, 'first row should be a very small state');
  assert.equal(rr.rows.at(-1).key, 'PNG');
});

test('size rows place dots by reported share, unclamped and without overlap', async () => {
  const events = JSON.parse(await readFile(new URL('../app/public/data/events.json', import.meta.url)));
  const rr = computeSizeRows(events, { W: 562, H: 416 });
  const scatterable = events.filter(isScatterable);

  // Seite relativ zum Gesamtmedian stimmt mit dem Wert überein.
  for (const e of scatterable) {
    const [px] = rr.pos(e);
    const v = Math.log10(e.affected_pc);
    if (v > rr.overallMedian) assert.ok(px > rr.zeroX, `${e.id} should sit right of the median`);
    else assert.ok(px <= rr.zeroX, `${e.id} should sit left of the median`);
  }
  assert.equal(rr.zeroX, rr.x(rr.overallMedian));

  // KEIN Clamp: die Extremwerte bekommen echte Positionen, nicht den Rand. Der Vorgänger
  // stapelte 12 von 71 Punkten unsichtbar am Rand, darunter den Hauptdarsteller der Story.
  const sorted = [...scatterable].sort((a, b) => a.affected_pc - b.affected_pc);
  assert.ok(rr.pos(sorted[0])[0] < rr.pos(sorted.at(-1))[0], 'x order does not follow the value');
  const xs = scatterable.map((e) => rr.pos(e)[0]);
  assert.ok(xs.filter((x) => x === Math.max(...xs)).length === 1, 'dots stacked at the right edge');

  // Dodge: kein Punktepaar derselben Zeile+Lane näher als ein Durchmesser.
  const byLane = new Map();
  for (const e of scatterable) {
    const [px, py] = rr.pos(e);
    const key = py.toFixed(2);
    if (!byLane.has(key)) byLane.set(key, []);
    byLane.get(key).push(px);
  }
  for (const xsInLane of byLane.values()) {
    xsInLane.sort((a, b) => a - b);
    for (let i = 1; i < xsInLane.length; i++) {
      assert.ok(xsInLane[i] - xsInLane[i - 1] >= RR_R * 2, `lane collision: ${xsInLane[i] - xsInLane[i - 1]}`);
    }
  }
});

test('subregion rows stay available as a folded view of the same records', async () => {
  const events = JSON.parse(await readFile(new URL('../app/public/data/events.json', import.meta.url)));
  const rr = computeSubregionRows(events, { W: 562, H: 416 });
  const scatterable = events.filter(isScatterable);

  assert.equal(rr.rows.length, 3);
  assert.deepEqual([...rr.rows.map((r) => r.key)].sort(), ['Melanesia', 'Micronesia', 'Polynesia']);
  assert.equal(rr.rows.reduce((sum, row) => sum + row.n, 0), scatterable.length);
  assert.ok(scatterable.every((e) => rr.pos(e) != null));
});

test('the population signal the story tells is present in the data', async () => {
  const events = JSON.parse(await readFile(new URL('../app/public/data/events.json', import.meta.url)));
  const meta = JSON.parse(await readFile(new URL('../app/public/data/meta.json', import.meta.url)));
  const ctx = { data: { events }, meta };

  // Der Beat behauptet, Landesgröße erkläre mehr als Wind. Das kommt aus meta und darf
  // nicht still kippen, ohne dass ein Test anschlägt.
  assert.ok(meta.fits.popSize.r2 > meta.fits.perCapita.r2,
    'story claims population explains more than wind');
  assert.ok(meta.fits.popSize.p < 0.05, 'population fit no longer significant');

  // Die Zähler-Referenz des Textes ist abzählbar und deckt sich mit den Daten.
  const rendered = resolveRefs('{{stat:smallCountryAbove}}', ctx);
  const [above, , total] = rendered.split(' ');
  assert.ok(Number(above) > 0 && Number(total) > 0);
  assert.ok(Number(above) <= Number(total));
  // Entfernte Residuen-Statistiken müssen laut scheitern, nicht still etwas rendern.
  assert.throws(() => resolveRefs('{{stat:aboveCount.FJI}}', ctx));
  assert.throws(() => resolveRefs('{{stat:subregionAboveCount.Micronesia}}', ctx));
});

test('zero-report stats are countable and consistent with coverage', async () => {
  const events = JSON.parse(await readFile(new URL('../app/public/data/events.json', import.meta.url)));
  const meta = JSON.parse(await readFile(new URL('../app/public/data/meta.json', import.meta.url)));
  const ctx = { data: { events }, meta };

  assert.equal(resolveRefs('{{stat:zeroCount}}', ctx), String(meta.coverage.zero_toll));
  assert.equal(resolveRefs('{{stat:zeroWithStorm}}', ctx), String(meta.coverage.zero_with_storm));
  assert.equal(resolveRefs('{{stat:noReport}}', ctx), String(meta.coverage.no_report));
  // Der Story-Satz "N reported tolls had no cyclone within range" darf die gemeldeten
  // Nullen NICHT mitzaehlen - sie stehen im selben Satz schon separat. Die Zahl muss
  // deshalb identisch zu der sein, die der Methodenabschnitt aus meta ausweist.
  assert.equal(resolveRefs('{{stat:missingWind}}', ctx), String(meta.coverage.missing_wind));
  // Die Ehrlichkeits-Zerlegung muss aufgehen.
  assert.equal(
    meta.coverage.scatterable + meta.coverage.zero_with_storm + meta.coverage.no_report,
    meta.coverage.storm_exposed,
  );
  // Der stärkste Fall der Story: ein Land meldet 0 trotz sehr starkem Wind.
  const strongZero = events.filter(isZeroLane).sort((a, b) => b.intensity_kt - a.intensity_kt)[0];
  assert.ok(strongZero.intensity_kt >= 100, 'no strong-wind zero report left to tell');
});

test('story has nine steps and the country-size beat morphs the dots2 stage', async () => {
  const [events, meta, sst, trends] = await Promise.all([
    'events.json', 'meta.json', 'sst.json', 'trends.json',
  ].map(async (file) => JSON.parse(await readFile(new URL(`../app/public/data/${file}`, import.meta.url)))));
  const byId = new Map(events.map((e) => [e.id, e]));
  const bySid = new Map();
  for (const e of events) {
    if (!bySid.has(e.sid)) bySid.set(e.sid, []);
    bySid.get(e.sid).push(e);
  }
  const ctx = { data: { events, sst, trends, index: { byId, bySid } }, meta };

  const steps = buildSteps(ctx);
  assert.equal(steps.length, 9);
  assert.equal(steps.length, STEP_COUNT);
  assert.equal(SECTIONS.length, 9);
  assert.deepEqual(SECTIONS.map((section) => section.step), [...steps.keys()]);
  assert.ok(steps.every((step) => step.source?.trim()), 'every visualisation has a source');
  assert.ok(steps.every((step) => step.hint?.trim()), 'every visualisation has a How to read explanation');
  assert.ok(steps.every((step) => !/EM-DAT/.test(step.source)), 'no restricted source line');

  const at = (id) => {
    const index = steps.findIndex((step) => step.id === id);
    assert.ok(index >= 0, `step ${id} exists`);
    return index;
  };

  // Hook: zwei Impact-Bubbles (VUT + FJI) und Kamera-Einflug.
  const hook = at('hook');
  const hookFx = steps[hook].apply().storyFx;
  assert.deepEqual(hookFx.impactBubbles.map((b) => b.eventId), ['VUT-2020', 'FJI-2020']);
  assert.ok(hookFx.camera.flyMs > 0);
  // Der Hook benennt beide Stuerme, weil ihn nicht mehr ein einziger traegt.
  assert.match(steps[hook].html, /Harold/);
  assert.match(steps[hook].html, /Yasa/);

  const evidence = at('evidence');
  assert.deepEqual(steps[evidence].apply().storyFx.annotations, []);
  assert.equal(steps[evidence].apply().storyFx.uniformPoints, true);
  assert.equal(steps[evidence].apply().stormPin, null);
  assert.ok(SECTIONS[evidence].split, 'evidence panel keeps its interactive controls');
  // Der Beat nennt die Nicht-Signifikanz, statt eine erklaerende Linie zu behaupten.
  assert.match(steps[evidence].html, /not statistically detectable/);

  // Winston-Fallstudie: eine Bubble ueber Fiji.
  const winston = at('winston');
  assert.deepEqual(steps[winston].apply().storyFx.impactBubbles.map((b) => b.eventId), ['FJI-2016']);

  // Landesgroessen-Beat: ersetzt die drei Residuen-Beats, Formation sizeRows.
  const size = at('country-size');
  assert.equal(steps[size].apply().formation, 'sizeRows');
  assert.equal(SECTIONS[size].stage, 'dots2');
  assert.match(steps[size].html, /population/i);

  // Ehrlichkeits-Beat: Unit-Formation, nennt die gemeldeten Nullen und Pam.
  const honesty = at('honesty');
  assert.equal(steps[honesty].apply().formation, 'unit');
  assert.equal(SECTIONS[honesty].stage, 'dots2');
  assert.match(steps[honesty].html, /zero/i);
  assert.ok(steps[honesty].html.includes('Pam'));

  // Entfernte Beats duerfen nicht zurueckkehren.
  for (const gone of ['patterns', 'residual-rows', 'subregion-rows']) {
    assert.equal(steps.findIndex((s) => s.id === gone), -1, `${gone} should be gone`);
  }

  // apply() liefert stets frische Objekte (Store-Konvention).
  const first = steps[size].apply();
  const second = steps[size].apply();
  assert.notEqual(first, second);
  assert.notEqual(first.storyFx, second.storyFx);
});

test('genesis model contrasts both basins on one shared latitude scale', async () => {
  const trends = JSON.parse(await readFile(new URL('../app/public/data/trends.json', import.meta.url)));
  const model = buildGenesisModel(trends);

  // Zwei Panels, WP zuerst; Verdicts in der Klartext-Sprache von Step 1.
  assert.deepEqual(model.panels.map((p) => p.key), ['wp', 'sp']);
  assert.equal(model.panels[0].caption, 'A clear upward trend');
  assert.equal(model.panels[1].caption, 'No clear trend');

  // Ehrlichkeits-Mechanik: BEIDE Panels teilen dieselbe y-Domain, und sie deckt
  // alle beobachteten Saisonmittel beider Becken ab.
  const [d0, d1] = model.panels[0].yDomain;
  assert.deepEqual(model.panels[1].yDomain, model.panels[0].yDomain);
  const all = [...trends.series.genesisWP, ...trends.series.genesisSP].filter((v) => v != null);
  assert.ok(Math.min(...all) >= d0 && Math.max(...all) <= d1);

  // Jede Serie trägt einen Fit (Trendlinie) und alle 25 Saisons.
  assert.ok(model.panels.every((p) => p.series[0].trend && p.series[0].values.length === trends.series.season.length));
  assert.equal(model.northKm, 322);
});

test('genesisSP trend refs resolve pre-formatted and fail loud on unknown keys', async () => {
  const trends = JSON.parse(await readFile(new URL('../app/public/data/trends.json', import.meta.url)));
  const ctx = { data: { trends } };
  assert.equal(resolveRefs('{{trend:genesisSP.p}}', ctx), '0.710');
  assert.equal(resolveRefs('{{trend:genesisWP.northKm}}', ctx), '322');
  assert.throws(() => resolveRefs('{{trend:genesisSP.northKm}}', ctx));
});

test('hot-zone aggregation separates frequency from average wind', () => {
  const storms = [
    { sid: 'a', events: [{ id: 'a1', year: 2020, category: 3, iso3: 'FJI' }], cells: new Map([[0, 100], [1, 80]]) },
    { sid: 'b', events: [{ id: 'b1', year: 2020, category: 4, iso3: 'VUT' }], cells: new Map([[0, 140]]) },
  ];
  const frequency = aggregateHotZoneCells(storms, null, 'frequency');
  const average = aggregateHotZoneCells(storms, null, 'averageWind');
  assert.equal(frequency.find((cell) => cell.idx === 0).value, 2);
  assert.equal(average.find((cell) => cell.idx === 0).value, 120);
  assert.equal(frequency.find((cell) => cell.idx === 1).value, 1);
  assert.equal(aggregateHotZoneCells(storms, null, 'frequency', 2019).length, 0);
});

test('impact lab groups by country, orders by population, and switches field by mode', async () => {
  const events = JSON.parse(await readFile(new URL('../app/public/data/events.json', import.meta.url)));
  const scatterable = events.filter(isScatterable);
  const pc = buildResidualLab(events);

  // Alle Laender mit positivem Toll, zusammen exakt die Fit-Basis.
  assert.equal(pc.field, 'affected_pc');
  assert.equal(pc.rows.length, new Set(scatterable.map((e) => e.iso3)).size);
  assert.equal(pc.rows.reduce((sum, row) => sum + row.n, 0), scatterable.length);
  // Gemeldete Nullen gehoeren nicht in eine Log-Achse.
  assert.ok(pc.rows.every((row) => row.events.every((event) => event.affected > 0)));

  // Sortierung: kleinste Bevoelkerung zuerst - dieselbe Lesart wie im Story-Beat.
  for (let i = 1; i < pc.rows.length; i++) {
    assert.ok(pc.rows[i - 1].pop <= pc.rows[i].pop, `row order broken at ${pc.rows[i].country}`);
  }

  // nAbove zaehlt gegen den Gesamtmedian, nicht gegen eine Fit-Linie.
  const total = pc.rows.reduce((sum, row) => sum + row.nAbove, 0);
  assert.ok(total > 0 && total < scatterable.length);

  // Mode wechselt die gemessene Groesse (nicht nur die Beschriftung).
  const abs = buildResidualLab(events, { mode: 'absolute' });
  assert.equal(abs.field, 'affected');
  assert.equal(abs.rows.reduce((sum, row) => sum + row.n, 0), scatterable.length);
  assert.notEqual(abs.overall, pc.overall);
});

test('impact lab groups by subregion and fixed-order size classes on demand', async () => {
  const events = JSON.parse(await readFile(new URL('../app/public/data/events.json', import.meta.url)));
  const scatterable = events.filter(isScatterable);

  const sub = buildResidualLab(events, { groupBy: 'subregion' });
  assert.equal(sub.rows.length, 3);
  assert.deepEqual([...sub.rows.map((r) => r.iso3)].sort(), ['Melanesia', 'Micronesia', 'Polynesia']);
  assert.equal(sub.rows.reduce((sum, row) => sum + row.n, 0), scatterable.length);

  // Groessenklassen behalten ihre feste klein-nach-gross-Reihenfolge.
  const size = buildResidualLab(events, { groupBy: 'sizeClass' });
  assert.deepEqual(size.rows.map((row) => row.iso3), ['small', 'medium', 'large']);
  assert.equal(size.rows.reduce((sum, row) => sum + row.n, 0), scatterable.length);
});

test('lab hero stat reacts to view and filters with computed numbers', async () => {
  const events = JSON.parse(await readFile(new URL('../app/public/data/events.json', import.meta.url)));
  const meta = JSON.parse(await readFile(new URL('../app/public/data/meta.json', import.meta.url)));

  const outliers = buildLabHeroStat(events, { view: 'outliers' });
  assert.equal(outliers.total, meta.coverage.scatterable);
  assert.equal(outliers.zero, meta.coverage.zero_lane);

  const countries = buildLabHeroStat(events, { view: 'countries' });
  assert.equal(countries.total, events.length);
  assert.equal(countries.reported, events.filter((e) => e.affected > 0).length);

  const geography = buildLabHeroStat(events, { view: 'geography' });
  assert.equal(geography.storms, new Set(events.map((e) => e.sid).filter(Boolean)).size);

  // Filter wirken auf die Zahlen.
  const filtered = buildLabHeroStat(events, {
    view: 'outliers', filters: { yearRange: [2020, 2020], categories: null, countries: null },
  });
  assert.ok(filtered.total < outliers.total);
});

test('country toll aggregates reported impacts per country and mode', () => {
  const events = [
    { id: 'a1', iso3: 'AAA', country: 'Aland', year: 2019, category: 3, affected: 100, affected_pc: 0.1 },
    { id: 'a2', iso3: 'AAA', country: 'Aland', year: 2020, category: 4, affected: 300, affected_pc: 0.3 },
    { id: 'b1', iso3: 'BBB', country: 'Bland', year: 2020, category: 2, affected: null, affected_pc: null },
  ];

  const absolute = buildCountryToll(events, { mode: 'absolute' });
  const aaa = absolute.find((row) => row.iso3 === 'AAA');
  assert.equal(aaa.value, 400);
  assert.equal(aaa.n, 2);
  assert.equal(aaa.reported, 2);

  const perCapita = buildCountryToll(events, { mode: 'perCapita' });
  assert.equal(perCapita.find((row) => row.iso3 === 'AAA').value, 0.2);

  // Nicht gemeldete Länder bleiben als hohle Ringe erhalten (value 0, unreported).
  const bbb = absolute.find((row) => row.iso3 === 'BBB');
  assert.equal(bbb.unreported, true);
  assert.equal(bbb.value, 0);
  assert.deepEqual(bbb.eventIds, ['b1']);

  // Sortierung nach value absteigend: große Kreise zuerst gezeichnet.
  assert.deepEqual(absolute.map((row) => row.iso3), ['AAA', 'BBB']);

  // activeYear schneidet auf das Jahr; Filter wirken zusätzlich.
  assert.equal(buildCountryToll(events, { mode: 'absolute', activeYear: 2019 })
    .find((row) => row.iso3 === 'AAA').value, 100);
  assert.equal(buildCountryToll(events, {
    filters: { yearRange: [2005, 2023], categories: null, countries: ['BBB'] },
  }).length, 1);
});

test('data loader declares the fixed open artifact set', () => {
  assert.deepEqual(DATA_FILES,
    ['events.json', 'meta.json', 'tracks.json', 'sst.json', 'trends.json', 'land-110m.json']);
});

test('every story section resolves to one documented method and known sources', async () => {
  const meta = JSON.parse(await readFile(new URL('../app/public/data/meta.json', import.meta.url)));
  const methodIds = new Set(METHOD_CATALOG.map((method) => method.id));
  const sourceIds = new Set(meta.sources.map((source) => source.id));

  assert.equal(SECTIONS.length, 9);
  for (const section of SECTIONS) {
    assert.ok(methodIds.has(section.methodId), `missing method ${section.methodId}`);
    assert.ok(section.sourceIds.length > 0, `section ${section.step} has no sources`);
    assert.deepEqual(section.sourceIds.filter((id) => !sourceIds.has(id)), []);
  }
});

test('methods render open facts, cleared publication and downloadable data', async () => {
  const meta = JSON.parse(await readFile(new URL('../app/public/data/meta.json', import.meta.url)));
  const html = methodsHtml(meta);

  assert.match(html, /Data &amp; methods/);
  assert.match(html, /Where the data comes from/);
  assert.match(html, /How the data became the charts/);
  assert.match(html, /How each visual was built/);
  assert.match(html, /What the data cannot tell us/);
  assert.match(html, /Reproduce this analysis/);
  assert.match(html, /Publication cleared/);
  assert.match(html, /\d+ of \d+/);
  assert.match(html, /country-years/);
  assert.match(html, /SDG 11\.5\.1/);
  assert.match(html, /Wind accounts for about/);
  // Der Befund wird ausgeschrieben, nicht beschoenigt.
  assert.match(html, /within the range of chance/);
  // Offene Daten sind freigegeben: events.json ist als Download gelistet.
  assert.match(html, /href="[^"]*events\.json" download/);
  // Keine gesperrten Quellen und keine kurs-Beat-Karten mehr.
  assert.doesNotMatch(html, /EM-DAT/);
  assert.doesNotMatch(html, /id="method-heta"/);
  assert.doesNotMatch(html, /id="method-pam"/);
  assert.match(html, /id="method-hook"/);
  assert.match(html, /id="method-open-scatter"/);
  assert.match(html, /id="method-open-conclusion"/);
  for (const method of METHOD_CATALOG) assert.match(html, new RegExp(`id="method-${method.id}"`));
});
