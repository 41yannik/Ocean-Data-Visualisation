import assert from 'node:assert/strict';
import test from 'node:test';

import { isScatterable, matchesFilters } from '../app/src/core/filters.js';
import { makeInitialState } from '../app/src/core/initialState.js';
import { createStore } from '../app/src/core/state.js';
import { buildConclusionSynthesisModel } from '../app/src/story/conclusionSynthesis.js';
import { computeResidualRows, computeSubregionRows, RR_R } from '../app/src/story/residualRows.js';
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

test('scatterability requires both wind and reported impact, including zero', () => {
  assert.equal(isScatterable({ intensity_kt: 80, affected: 0 }), true);
  assert.equal(isScatterable({ intensity_kt: null, affected: 100 }), false);
  assert.equal(isScatterable({ intensity_kt: 80, affected: null }), false);
});

test('conclusion synthesis exposes the mismatch and keeps one ordered dataset', async () => {
  const events = JSON.parse(await readFile(new URL('../app/public/data/events.json', import.meta.url)));
  const model = buildConclusionSynthesisModel(events);

  assert.equal(model.rows.length, 71);
  assert.equal(model.topWind.length, 6); // Gleichstand am fünften Windrang
  assert.equal(model.topImpact.length, 5);
  assert.deepEqual(model.shared.map((event) => event.id), ['PLW-2021', 'FJI-2016']);
  assert.equal(model.byId.get('PLW-2021').impactRank, 1);
  assert.equal(model.byId.get('PLW-2021').windRank, 1);
  assert.ok(model.ordered.every((row, i) => i === 0 || model.ordered[i - 1].intensity_kt <= row.intensity_kt));
});

test('conclusion keeps both top-five readings linked to the same complete rows', async () => {
  const events = JSON.parse(await readFile(new URL('../app/public/data/events.json', import.meta.url)));
  const model = buildConclusionSynthesisModel(events);

  assert.ok([...model.topWind, ...model.topImpact].every((row) => model.byId.get(row.id) === row));
  assert.equal(model.topImpact.find((row) => row.id === 'FJI-2016').windRank, 3);
  assert.equal(model.topWind.find((row) => row.id === 'FJI-2016').impactRank, 5);
  assert.equal(new Set(model.ordered.map((row) => row.id)).size, model.rows.length);
  assert.ok(model.orders.impact.every((row, i) =>
    i === 0 || model.orders.impact[i - 1].affected_pc <= row.affected_pc));
});

test('country recurrence sorts by reported impacts and keeps every record counted', async () => {
  const events = JSON.parse(await readFile(new URL('../app/public/data/events.json', import.meta.url)));
  const rows = buildCountryRecurrence(events);
  assert.equal(rows.length, 15);
  assert.equal(rows[0].iso3, 'SLB');
  assert.ok(rows.every((row, index) => index === 0 || rows[index - 1].reportedCount >= row.reportedCount));
  assert.equal(rows.reduce((sum, row) => sum + row.totalCount, 0), 99);
  // Offene Basis ist impact-led: jeder Record hat einen gemeldeten Toll.
  assert.equal(rows.reduce((sum, row) => sum + row.reportedCount, 0), 99);
});

test('residual rows lay out all scatterable records and hide ghosts', async () => {
  const events = JSON.parse(await readFile(new URL('../app/public/data/events.json', import.meta.url)));
  const rr = computeResidualRows(events, { W: 562, H: 416 });

  const scatterable = events.filter(isScatterable);
  assert.equal(scatterable.length, 71);
  assert.ok(scatterable.every((e) => rr.pos(e) != null));
  assert.ok(events.filter((e) => !isScatterable(e)).every((e) => rr.pos(e) == null));

  // Zeilen: 6 Länder mit ≥4 Records + „Other" zuletzt; Summen decken alle 71 Records ab.
  assert.equal(rr.rows.length, 7);
  assert.equal(rr.rows.at(-1).key, 'OTHER');
  assert.equal(rr.rows.at(-1).n, 21);
  assert.equal(rr.rows.reduce((sum, row) => sum + row.n, 0), 71);

  // Erzähl-Reihenfolge: Palau (4/4 über der Linie) zuerst.
  assert.equal(rr.rows[0].key, 'PLW');
  assert.equal(rr.rows[0].nAbove, 4);
  assert.equal(rr.rows[0].n, 4);
});

test('residual rows place dots on the correct side of the zero line without overlap', async () => {
  const events = JSON.parse(await readFile(new URL('../app/public/data/events.json', import.meta.url)));
  const rr = computeResidualRows(events, { W: 562, H: 416 });

  const scatterable = events.filter(isScatterable);
  for (const e of scatterable) {
    const [px] = rr.pos(e);
    if ((e.residual_pc ?? 0) > 0) assert.ok(px > rr.zeroX, `${e.id} sollte rechts der Null-Linie liegen`);
    else assert.ok(px <= rr.zeroX, `${e.id} sollte links der Null-Linie liegen`);
  }
  assert.equal(rr.zeroX, rr.x(0));

  // Dodge: kein Punktepaar derselben Zeile+Lane näher als ein Durchmesser.
  const byLane = new Map();
  for (const e of scatterable) {
    const [px, py] = rr.pos(e);
    const key = py.toFixed(2);
    if (!byLane.has(key)) byLane.set(key, []);
    byLane.get(key).push(px);
  }
  for (const xs of byLane.values()) {
    xs.sort((a, b) => a - b);
    for (let i = 1; i < xs.length; i++) {
      assert.ok(xs[i] - xs[i - 1] >= RR_R * 2, `Lane-Kollision: Abstand ${xs[i] - xs[i - 1]}`);
    }
  }
});

test('subregion rows collapse the same 71 records into three honest groups', async () => {
  const events = JSON.parse(await readFile(new URL('../app/public/data/events.json', import.meta.url)));
  const rr = computeSubregionRows(events, { W: 562, H: 416 });

  // Drei Zeilen, aboveShare absteigend: Mikronesien lehnt schwer, Melanesien lehnt
  // unter die Linie - die Pointe des offenen Subregion-Beats.
  assert.deepEqual(rr.rows.map((row) => row.key), ['Micronesia', 'Polynesia', 'Melanesia']);
  assert.deepEqual(rr.rows.map((row) => [row.nAbove, row.n]), [[11, 13], [10, 16], [19, 42]]);
  assert.equal(rr.rows.reduce((sum, row) => sum + row.n, 0), 71);

  // Gruppen-Median: Mikronesien klar rechts der Null-Linie, Melanesien links.
  assert.ok(rr.rows[0].median > 0);
  assert.ok(rr.rows[2].median < 0);

  // Jeder scatterbare Punkt hat eine Position; Ghosts (kein Residuum) keine.
  const scatterable = events.filter(isScatterable);
  assert.ok(scatterable.every((e) => rr.pos(e) != null));
  assert.ok(events.filter((e) => !isScatterable(e)).every((e) => rr.pos(e) == null));

  // Regression: die Länder-Variante bleibt unter der Generalisierung stabil.
  const country = computeResidualRows(events, { W: 562, H: 416 });
  assert.equal(country.rows.length, 7);
  assert.equal(country.rows[0].key, 'PLW');
});

test('subregionAboveCount stat renders a countable claim and fails loud on unknown regions', async () => {
  const events = JSON.parse(await readFile(new URL('../app/public/data/events.json', import.meta.url)));
  const ctx = { data: { events } };
  assert.equal(resolveRefs('{{stat:subregionAboveCount.Micronesia}}', ctx), '11 of 13');
  assert.equal(resolveRefs('{{stat:subregionAboveCount.Melanesia}}', ctx), '19 of 42');
  assert.throws(() => resolveRefs('{{stat:subregionAboveCount.Atlantis}}', ctx));
});

test('aboveCount stat renders a countable claim and fails loud on unknown countries', async () => {
  const events = JSON.parse(await readFile(new URL('../app/public/data/events.json', import.meta.url)));
  const ctx = { data: { events } };
  assert.equal(resolveRefs('{{stat:aboveCount.FJI}}', ctx), '8 of 13');
  assert.equal(resolveRefs('{{stat:aboveCount.PLW}}', ctx), '4 of 4');
  assert.throws(() => resolveRefs('{{stat:aboveCount.XXX}}', ctx));
});

test('story has eleven steps and the row beats morph the dots2 stage', async () => {
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
  assert.equal(steps.length, 11);
  assert.equal(steps.length, STEP_COUNT);
  assert.equal(SECTIONS.length, 11);
  assert.deepEqual(SECTIONS.map((section) => section.step), [...steps.keys()]);
  assert.ok(steps.every((step) => step.source?.trim()), 'every visualisation has a source');
  assert.ok(steps.every((step) => step.hint?.trim()), 'every visualisation has a How to read explanation');
  assert.ok(steps.every((step) => !/EM-DAT/.test(step.source)), 'no restricted source line');

  const at = (id) => {
    const index = steps.findIndex((step) => step.id === id);
    assert.ok(index >= 0, `step ${id} exists`);
    return index;
  };

  // Harold-Hook: zwei Impact-Bubbles (VUT + FJI) und Kamera-Einflug.
  const hook = at('hook-harold');
  assert.equal(steps[hook].title, 'One storm, two ways to count impact');
  const hookFx = steps[hook].apply().storyFx;
  assert.deepEqual(hookFx.impactBubbles.map((b) => b.eventId), ['VUT-2020', 'FJI-2020']);
  assert.ok(hookFx.camera.flyMs > 0);
  assert.ok(steps[hook].html.includes('3× gap'));

  const evidence = at('evidence');
  assert.equal(steps[evidence].caveat, undefined);
  assert.deepEqual(steps[evidence].apply().storyFx.annotations, []);
  assert.equal(steps[evidence].apply().storyFx.uniformPoints, true);
  assert.equal(steps[evidence].apply().stormPin, null);
  assert.ok(SECTIONS[evidence].split, 'evidence panel keeps its interactive controls');

  // Winston-Fallstudie: eine Bubble über Fiji.
  const winston = at('winston');
  assert.deepEqual(steps[winston].apply().storyFx.impactBubbles.map((b) => b.eventId), ['FJI-2016']);

  // Residual-Beat: gleiche Bühne wie patterns/honesty, Formation residualRows.
  const rr = at('residual-rows');
  assert.equal(steps[rr].apply().formation, 'residualRows');
  assert.equal(SECTIONS[rr].stage, 'dots2');
  assert.ok(steps[rr].html.includes('4 of 4'));   // Palau
  assert.ok(steps[rr].html.includes('8 of 13'));  // Fiji

  // Subregion-Beat: direkt nach den Länderzeilen, gleiche Bühne, Formation subregion.
  const sub = at('subregion-rows');
  assert.equal(sub, rr + 1);
  assert.equal(steps[sub].apply().formation, 'subregion');
  assert.equal(SECTIONS[sub].stage, 'dots2');
  assert.ok(steps[sub].html.includes('11 of 13'));
  assert.ok(steps[sub].html.includes('19 of 42'));

  // patterns zeichnet die Stems; apply() liefert stets frische Objekte (Store-Konvention).
  const patterns = at('patterns');
  assert.equal(steps[patterns].apply().storyFx.residualStems, true);
  assert.equal(steps[patterns].apply().storyFx.uniformPoints, true);
  assert.match(steps[patterns].hint, /Every dot uses the same size/);
  const first = steps[patterns].apply();
  const second = steps[patterns].apply();
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

test('residual lab groups by country, sorts by above-share, and switches fields by mode', async () => {
  const events = JSON.parse(await readFile(new URL('../app/public/data/events.json', import.meta.url)));
  const pc = buildResidualLab(events);

  // 15 Länder haben Residuen; zusammen exakt die 71 scatterbaren Records.
  assert.equal(pc.field, 'residual_pc');
  assert.equal(pc.rows.length, 15);
  assert.equal(pc.rows.reduce((sum, row) => sum + row.n, 0), 71);
  assert.ok(pc.rows.every((row) => row.events.every((event) => event.residual_pc != null)));

  // Sortierung: aboveShare absteigend (PLW 4/4 zuerst).
  assert.equal(pc.rows[0].iso3, 'PLW');
  assert.equal(pc.rows[0].nAbove, 4);
  assert.ok(pc.rows[0].median > 0);
  assert.ok(pc.rows.every((row, index) => index === 0
    || pc.rows[index - 1].aboveShare > row.aboveShare
    || (pc.rows[index - 1].aboveShare === row.aboveShare && pc.rows[index - 1].n >= row.n)));

  // Vanuatu: im offenen Datensatz KEIN Repeat-Victim mehr (4 von 12 über der Linie).
  const vut = pc.rows.find((row) => row.iso3 === 'VUT');
  assert.equal(vut.n, 12);
  assert.equal(vut.nAbove, 4);

  // Mode wechselt das Residual-Feld (nicht nur die Beschriftung).
  const abs = buildResidualLab(events, { mode: 'absolute' });
  assert.equal(abs.field, 'residual_abs');
  assert.equal(abs.rows.reduce((sum, row) => sum + row.n, 0), 71);

  // Filter wirken vor der Gruppierung.
  const filtered = buildResidualLab(events, {
    filters: { yearRange: [2005, 2023], categories: null, countries: ['VUT'] },
  });
  assert.equal(filtered.rows.length, 1);
  assert.equal(filtered.rows[0].iso3, 'VUT');
});

test('residual lab groups by subregion and fixed-order size classes on demand', async () => {
  const events = JSON.parse(await readFile(new URL('../app/public/data/events.json', import.meta.url)));

  // Subregion: 3 Zeilen, Summe 71, aboveShare-Sortierung wie gehabt.
  const sub = buildResidualLab(events, { groupBy: 'subregion' });
  assert.deepEqual(sub.rows.map((row) => [row.iso3, row.nAbove, row.n]),
    [['Micronesia', 11, 13], ['Polynesia', 10, 16], ['Melanesia', 19, 42]]);
  assert.equal(sub.rows.reduce((sum, row) => sum + row.n, 0), 71);

  // Größenklassen: FESTE klein→groß-Reihenfolge.
  const size = buildResidualLab(events, { groupBy: 'sizeClass' });
  assert.deepEqual(size.rows.map((row) => [row.iso3, row.nAbove, row.n]),
    [['small', 14, 14], ['medium', 25, 54], ['large', 1, 3]]);

  // Feste Reihenfolge bleibt auch unter Filtern stabil (nur PNG → nur large).
  const filtered = buildResidualLab(events, {
    groupBy: 'sizeClass',
    filters: { yearRange: [2005, 2023], categories: null, countries: ['PNG'] },
  });
  assert.deepEqual(filtered.rows.map((row) => row.iso3), ['large']);

  // Regression: Default-Gruppierung unverändert (15 Länder-Zeilen).
  assert.equal(buildResidualLab(events).rows.length, 15);
});

test('lab hero stat reacts to view, filters and mode with computed numbers', async () => {
  const events = JSON.parse(await readFile(new URL('../app/public/data/events.json', import.meta.url)));

  assert.deepEqual(buildLabHeroStat(events, { view: 'outliers' }), { view: 'outliers', above: 40, total: 71 });
  assert.deepEqual(buildLabHeroStat(events, { view: 'residuals', mode: 'absolute' }),
    { view: 'residuals', above: 35, total: 71 });
  assert.deepEqual(buildLabHeroStat(events, {
    view: 'residuals',
    filters: { yearRange: [2005, 2023], categories: null, countries: ['VUT'] },
  }), { view: 'residuals', above: 4, total: 12 });
  assert.deepEqual(buildLabHeroStat(events, { view: 'countries' }), { view: 'countries', total: 99, reported: 99 });
  assert.deepEqual(buildLabHeroStat(events, { view: 'geography' }), { view: 'geography', storms: 53 });
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

  assert.equal(SECTIONS.length, 11);
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
  assert.match(html, /71 of 99/);
  assert.match(html, /country-years/);
  assert.match(html, /SDG 11\.5\.1/);
  assert.match(html, /Wind accounts for about/);
  // Offene Daten sind freigegeben: events.json ist als Download gelistet.
  assert.match(html, /href="[^"]*events\.json" download/);
  // Keine gesperrten Quellen und keine kurs-Beat-Karten mehr.
  assert.doesNotMatch(html, /EM-DAT/);
  assert.doesNotMatch(html, /id="method-heta"/);
  assert.doesNotMatch(html, /id="method-pam"/);
  assert.match(html, /id="method-hook-harold"/);
  assert.match(html, /id="method-open-scatter"/);
  assert.match(html, /id="method-open-conclusion"/);
  for (const method of METHOD_CATALOG) assert.match(html, new RegExp(`id="method-${method.id}"`));
});
