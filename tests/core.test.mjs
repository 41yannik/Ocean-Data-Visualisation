import assert from 'node:assert/strict';
import test from 'node:test';

import { isScatterable, matchesFilters } from '../app/src/core/filters.js';
import { makeInitialState } from '../app/src/core/initialState.js';
import { createStore } from '../app/src/core/state.js';
import { buildConclusionSynthesisModel } from '../app/src/story/conclusionSynthesis.js';
import { computeResidualRows, RR_R } from '../app/src/story/residualRows.js';
import { resolveRefs } from '../app/src/story/refs.js';
import { buildSteps, STEP_COUNT } from '../app/src/story/steps.js';
import { SECTIONS } from '../app/src/story/sections.js';
import { buildCountryRecurrence } from '../app/src/ui/countryRecurrence.js';
import { aggregateHotZoneCells } from '../app/src/ui/trackHeatmap.js';
import { buildResidualLab } from '../app/src/ui/residualLab.js';
import { buildCountryToll } from '../app/src/ui/tollMap.js';
import { readFile } from 'node:fs/promises';


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
  first.hetaReached.VUT = true;

  assert.deepEqual(second.filters.yearRange, [2001, 2026]);
  assert.deepEqual(second.hetaReached, {});
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

  assert.equal(model.rows.length, 78);
  assert.equal(model.topWind.length, 5);
  assert.equal(model.topImpact.length, 5);
  assert.deepEqual(model.shared.map((event) => event.id), ['2023-0300-GUM']);
  assert.equal(model.byId.get('2015-0339-MNP').impactRank, 57);
  assert.equal(model.byId.get('2002-0811-SLB').impactRank, 67);
  assert.equal(model.byId.get('2023-0119-VUT').windRank, 50);
  assert.ok(model.ordered.every((row, i) => i === 0 || model.ordered[i - 1].intensity_kt <= row.intensity_kt));
});

test('conclusion keeps both top-five readings linked to the same complete rows', async () => {
  const events = JSON.parse(await readFile(new URL('../app/public/data/events.json', import.meta.url)));
  const model = buildConclusionSynthesisModel(events);

  assert.ok([...model.topWind, ...model.topImpact].every((row) => model.byId.get(row.id) === row));
  assert.equal(model.topWind.find((row) => row.id === '2023-0300-GUM').impactRank, 5);
  assert.equal(model.topImpact.find((row) => row.id === '2023-0300-GUM').windRank, 2);
  assert.equal(new Set(model.ordered.map((row) => row.id)).size, model.rows.length);
  assert.ok(model.orders.impact.every((row, i) =>
    i === 0 || model.orders.impact[i - 1].affected_pc <= row.affected_pc));
});

test('country recurrence sorts by reported impacts and preserves missing impact records', async () => {
  const events = JSON.parse(await readFile(new URL('../app/public/data/events.json', import.meta.url)));
  const rows = buildCountryRecurrence(events);
  assert.equal(rows.length, 20);
  assert.equal(rows[0].iso3, 'FJI');
  assert.ok(rows.every((row, index) => index === 0 || rows[index - 1].reportedCount >= row.reportedCount));
  assert.equal(rows.reduce((sum, row) => sum + row.totalCount, 0), 99);
  assert.equal(rows.reduce((sum, row) => sum + row.reportedCount, 0), 79);
});

test('residual rows lay out all scatterable pairs and hide ghosts', async () => {
  const events = JSON.parse(await readFile(new URL('../app/public/data/events.json', import.meta.url)));
  const rr = computeResidualRows(events, { W: 562, H: 416 });

  const scatterable = events.filter(isScatterable);
  assert.equal(scatterable.length, 78);
  assert.ok(scatterable.every((e) => rr.pos(e) != null));
  assert.ok(events.filter((e) => !isScatterable(e)).every((e) => rr.pos(e) == null));

  // Zeilen: 7 Länder mit ≥4 Records + „Other" zuletzt; Summen decken alle 78 Paare ab.
  assert.equal(rr.rows.length, 8);
  assert.equal(rr.rows.at(-1).key, 'OTHER');
  assert.equal(rr.rows.at(-1).n, 18);
  assert.equal(rr.rows.reduce((sum, row) => sum + row.n, 0), 78);

  // Erzähl-Reihenfolge: Vanuatu (8/10 über der Linie) zuerst.
  assert.equal(rr.rows[0].key, 'VUT');
  assert.equal(rr.rows[0].nAbove, 8);
  assert.equal(rr.rows[0].n, 10);
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

test('aboveCount stat renders a countable claim and fails loud on unknown countries', async () => {
  const events = JSON.parse(await readFile(new URL('../app/public/data/events.json', import.meta.url)));
  const ctx = { data: { events } };
  assert.equal(resolveRefs('{{stat:aboveCount.VUT}}', ctx), '8 of 10');
  assert.throws(() => resolveRefs('{{stat:aboveCount.XXX}}', ctx));
});

test('story has ten steps and the residual beat morphs the dots2 stage', async () => {
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
  assert.equal(steps.length, 10);
  assert.equal(steps.length, STEP_COUNT);
  assert.equal(SECTIONS.length, 10);
  assert.deepEqual(SECTIONS.map((section) => section.step), [...steps.keys()]);
  assert.ok(steps.every((step) => step.source?.trim()), 'every visualisation has a source');
  assert.ok(steps.every((step) => step.hint?.trim()), 'every visualisation has a How to read explanation');
  assert.equal(steps[3].caveat, undefined);
  assert.equal(steps[3].transition, undefined);
  assert.deepEqual(steps[3].apply().storyFx.annotations, []);
  assert.equal(steps[3].apply().storyFx.stormSpine, true);
  assert.equal(steps[3].apply().stormPin, null);

  // Step 4 uses Pam's five complete country records but does not mistake lifetime peak
  // wind for equal local exposure across all five countries.
  assert.equal(steps[4].id, 'pam');
  assert.equal(steps[4].title, 'One storm, several kinds of exposure');
  assert.equal(steps[4].apply().detailSid, '2015066S08170');
  assert.equal(steps[4].apply().storyFx.focusEventIds.length, 5);
  assert.ok(steps[4].html.includes('672× span'));

  // Residual-Beat: Index 6, gleiche Bühne wie Step 5/7, Formation residualRows.
  assert.equal(steps[6].id, 'residual-rows');
  assert.equal(steps[6].apply().formation, 'residualRows');
  assert.equal(SECTIONS[6].stage, 'dots2');
  assert.ok(steps[6].html.includes('8 of 10'));

  // Step 5 zeichnet die Stems; apply() liefert stets frische Objekte (Store-Konvention).
  assert.equal(steps[5].apply().storyFx.residualStems, true);
  const first = steps[5].apply();
  const second = steps[5].apply();
  assert.notEqual(first, second);
  assert.notEqual(first.storyFx, second.storyFx);
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

  // 19 Länder haben Residuen (MHL nicht); zusammen exakt die 78 scatterbaren Paare.
  assert.equal(pc.field, 'residual_pc');
  assert.equal(pc.rows.length, 19);
  assert.equal(pc.rows.reduce((sum, row) => sum + row.n, 0), 78);
  assert.ok(pc.rows.every((row) => row.events.every((event) => event.residual_pc != null)));

  // Sortierung: aboveShare absteigend, Ties nach n absteigend (PLW 2/2 vor 1/1-Ländern).
  assert.equal(pc.rows[0].iso3, 'PLW');
  assert.ok(pc.rows.every((row, index) => index === 0
    || pc.rows[index - 1].aboveShare > row.aboveShare
    || (pc.rows[index - 1].aboveShare === row.aboveShare && pc.rows[index - 1].n >= row.n)));

  // Vanuatu: das Story-Muster (8 von 10 über der Linie) bleibt in der Lab-Sicht messbar.
  const vut = pc.rows.find((row) => row.iso3 === 'VUT');
  assert.equal(vut.n, 10);
  assert.equal(vut.nAbove, 8);
  assert.ok(vut.median > 0);

  // Mode wechselt das Residual-Feld (nicht nur die Beschriftung).
  const abs = buildResidualLab(events, { mode: 'absolute' });
  assert.equal(abs.field, 'residual_abs');
  assert.equal(abs.rows.reduce((sum, row) => sum + row.n, 0), 78);
  assert.notEqual(abs.rows.find((row) => row.iso3 === 'VUT').median, vut.median);

  // Filter wirken vor der Gruppierung.
  const filtered = buildResidualLab(events, {
    filters: { yearRange: [2001, 2026], categories: null, countries: ['VUT'] },
  });
  assert.equal(filtered.rows.length, 1);
  assert.equal(filtered.rows[0].iso3, 'VUT');
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
    filters: { yearRange: [2001, 2026], categories: null, countries: ['BBB'] },
  }).length, 1);
});
