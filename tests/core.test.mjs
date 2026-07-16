import assert from 'node:assert/strict';
import test from 'node:test';

import { isScatterable, matchesFilters } from '../app/src/core/filters.js';
import { makeInitialState } from '../app/src/core/initialState.js';
import { createStore } from '../app/src/core/state.js';
import { buildConclusionSynthesisModel } from '../app/src/story/conclusionSynthesis.js';
import { buildDamageStrip } from '../app/src/story/damageStrip.js';
import { fmtUsdCompact } from '../app/src/core/format.js';
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

test('subregion rows collapse the same 78 pairs into three honest groups', async () => {
  const events = JSON.parse(await readFile(new URL('../app/public/data/events.json', import.meta.url)));
  const rr = computeSubregionRows(events, { W: 562, H: 416 });

  // Drei Zeilen, aboveShare absteigend: Polynesien lehnt schwer, Melanesien teilt
  // sich fast gleich (Vanuatus Signal verschwindet in Fijis Balance) - die Pointe des Beats.
  assert.deepEqual(rr.rows.map((row) => row.key), ['Polynesia', 'Melanesia', 'Micronesia']);
  assert.deepEqual(rr.rows.map((row) => [row.nAbove, row.n]), [[12, 17], [22, 44], [8, 17]]);
  assert.equal(rr.rows.reduce((sum, row) => sum + row.n, 0), 78);

  // Gruppen-Median: Polynesien klar rechts der Null-Linie, Mikronesien links.
  assert.ok(rr.rows[0].median > 0);
  assert.ok(rr.rows[2].median < 0);

  // Jeder scatterbare Punkt hat eine Position; Ghosts (kein Residuum) keine.
  const scatterable = events.filter(isScatterable);
  assert.ok(scatterable.every((e) => rr.pos(e) != null));
  assert.ok(events.filter((e) => !isScatterable(e)).every((e) => rr.pos(e) == null));

  // Regression: die Länder-Variante bleibt unter der Generalisierung bit-identisch
  // (Zeilenfolge + Zähler wie vor dem Refactor; eigene Detail-Tests oben).
  const country = computeResidualRows(events, { W: 562, H: 416 });
  assert.equal(country.rows.length, 8);
  assert.equal(country.rows[0].key, 'VUT');
});

test('subregionAboveCount stat renders a countable claim and fails loud on unknown regions', async () => {
  const events = JSON.parse(await readFile(new URL('../app/public/data/events.json', import.meta.url)));
  const ctx = { data: { events } };
  assert.equal(resolveRefs('{{stat:subregionAboveCount.Polynesia}}', ctx), '12 of 17');
  assert.equal(resolveRefs('{{stat:subregionAboveCount.Melanesia}}', ctx), '22 of 44');
  assert.throws(() => resolveRefs('{{stat:subregionAboveCount.Atlantis}}', ctx));
});

test('aboveCount stat renders a countable claim and fails loud on unknown countries', async () => {
  const events = JSON.parse(await readFile(new URL('../app/public/data/events.json', import.meta.url)));
  const ctx = { data: { events } };
  assert.equal(resolveRefs('{{stat:aboveCount.VUT}}', ctx), '8 of 10');
  assert.throws(() => resolveRefs('{{stat:aboveCount.XXX}}', ctx));
});

test('story has thirteen steps and the row beats morph the dots2 stage', async () => {
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
  assert.equal(steps.length, 13);
  assert.equal(steps.length, STEP_COUNT);
  assert.equal(SECTIONS.length, 13);
  assert.deepEqual(SECTIONS.map((section) => section.step), [...steps.keys()]);
  assert.ok(steps.every((step) => step.source?.trim()), 'every visualisation has a source');
  assert.ok(steps.every((step) => step.hint?.trim()), 'every visualisation has a How to read explanation');

  // Index-Zugriff über die Step-id statt harter Zahlen: Einfügungen verschieben
  // Indizes, die inhaltlichen Zusicherungen je Beat bleiben stabil.
  const at = (id) => {
    const index = steps.findIndex((step) => step.id === id);
    assert.ok(index >= 0, `step ${id} exists`);
    return index;
  };

  // Genesis-Beat: direkt nach dem no-trend-Beat, im Frage-Akt, neutraler Zustand.
  const genesis = at('genesis-shift');
  assert.equal(genesis, at('storm-trend') + 1);
  assert.equal(SECTIONS[genesis].act, 'The question');
  assert.deepEqual(SECTIONS[genesis].views, ['genesisTrend']);
  assert.ok(steps[genesis].html.includes('322 km'));
  assert.ok(steps[genesis].html.includes('0.710'), 'SP-Nullbefund steht im Text');

  const evidence = at('evidence');
  assert.equal(steps[evidence].caveat, undefined);
  assert.equal(steps[evidence].transition, undefined);
  assert.deepEqual(steps[evidence].apply().storyFx.annotations, []);
  assert.equal(steps[evidence].apply().storyFx.stormSpine, true);
  assert.equal(steps[evidence].apply().stormPin, null);

  // Pam uses five complete country records but does not mistake lifetime peak
  // wind for equal local exposure across all five countries.
  const pam = at('pam');
  assert.equal(steps[pam].title, 'One storm, several kinds of exposure');
  assert.equal(steps[pam].apply().detailSid, '2015066S08170');
  assert.equal(steps[pam].apply().storyFx.focusEventIds.length, 5);
  assert.ok(steps[pam].html.includes('672× span'));

  // Residual-Beat: gleiche Bühne wie patterns/honesty, Formation residualRows.
  const rr = at('residual-rows');
  assert.equal(steps[rr].apply().formation, 'residualRows');
  assert.equal(SECTIONS[rr].stage, 'dots2');
  assert.ok(steps[rr].html.includes('8 of 10'));

  // Subregion-Beat: direkt nach den Länderzeilen, gleiche Bühne, Formation subregion;
  // beide Zähler stehen als abzählbare Behauptungen im Text.
  const sub = at('subregion-rows');
  assert.equal(sub, rr + 1);
  assert.equal(steps[sub].apply().formation, 'subregion');
  assert.equal(SECTIONS[sub].stage, 'dots2');
  assert.ok(steps[sub].html.includes('12 of 17'));
  assert.ok(steps[sub].html.includes('22 of 44'));

  // Two-Currencies-Beat: nach dem Honesty-Beat, Akt „The people", eingefrorene Sektion;
  // die Register-Zahlen stehen als generierte Behauptungen im Text.
  const currencies = at('two-currencies');
  assert.equal(currencies, at('honesty') + 1);
  assert.equal(SECTIONS[currencies].act, 'The people');
  assert.deepEqual(SECTIONS[currencies].views, ['damageStrip']);
  assert.ok(steps[currencies].html.includes('US$6.3 bn'));
  assert.ok(steps[currencies].html.includes('68%'));
  assert.ok(steps[currencies].html.includes('2 of 12'));

  // patterns zeichnet die Stems; apply() liefert stets frische Objekte (Store-Konvention).
  const patterns = at('patterns');
  assert.equal(steps[patterns].apply().storyFx.residualStems, true);
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

test('damage strip lays out the recorded dollar ledger and keeps missingness explicit', async () => {
  const events = JSON.parse(await readFile(new URL('../app/public/data/events.json', import.meta.url)));
  const model = buildDamageStrip(events, { W: 960, H: 560 });

  // 11 Länder mit mindestens einem Dollarwert, nach Schadenssumme absteigend.
  assert.deepEqual(model.rows.map((row) => row.key),
    ['GUM', 'FJI', 'VUT', 'TON', 'ASM', 'WSM', 'NCL', 'NIU', 'FSM', 'PYF', 'SLB']);
  assert.equal(model.nWith, 32);
  assert.equal(model.nWithout, 67);
  assert.equal(model.totalKusd, 6301099);
  assert.deepEqual(model.silent, { countries: 9, records: 23 });

  // Der eine dominante Record: Mawar/Guam 2023 = 68 % der Gesamtsumme.
  assert.equal(model.topRecord.id, '2023-0300-GUM');
  assert.ok(Math.abs(model.topRecord.share - 0.682) < 0.005);

  // Jede Zeile zählt ehrlich („x of y"); jeder Punkt liegt im Achsenbereich.
  assert.deepEqual([model.rows[0].nDollars, model.rows[0].nRecords], [4, 6]);
  assert.deepEqual([model.rows[2].nDollars, model.rows[2].nRecords], [2, 12]);
  assert.equal(model.rows.reduce((sum, row) => sum + row.nDollars, 0), 32);
  const [x0, x1] = model.x.range();
  assert.ok(model.rows.every((row) => row.dots.every((d) => d.x >= x0 && d.x <= x1)));

  // Challenge-Guard: ohne damage_kusd-Feld leeres Modell statt Throw.
  const stripped = events.map(({ damage_kusd, ...rest }) => rest);
  const empty = buildDamageStrip(stripped, { W: 960, H: 560 });
  assert.equal(empty.rows.length, 0);
  assert.equal(empty.nWith, 0);
});

test('fmtUsdCompact speaks the ledger language including missing values', () => {
  assert.equal(fmtUsdCompact(4300000), 'US$4.3 bn');
  assert.equal(fmtUsdCompact(600000), 'US$600 m');
  assert.equal(fmtUsdCompact(6301099), 'US$6.3 bn');
  assert.equal(fmtUsdCompact(500), 'US$500 k');
  assert.equal(fmtUsdCompact(null), 'not recorded');
});

test('damage refs resolve computed ledger numbers and fail loud without data', async () => {
  const events = JSON.parse(await readFile(new URL('../app/public/data/events.json', import.meta.url)));
  const ctx = { data: { events } };
  assert.equal(resolveRefs('{{stat:damageCount}}', ctx), '32');
  assert.equal(resolveRefs('{{stat:damageMissing}}', ctx), '67');
  assert.equal(resolveRefs('{{stat:damageTotal}}', ctx), 'US$6.3 bn');
  assert.equal(resolveRefs('{{stat:damageTopShare}}', ctx), '68%');
  assert.equal(resolveRefs('{{stat:damageDollarCount.VUT}}', ctx), '2 of 12');
  const stripped = { data: { events: events.map(({ damage_kusd, ...rest }) => rest) } };
  assert.throws(() => resolveRefs('{{stat:damageTotal}}', stripped));
});

test('residual lab groups by subregion and fixed-order size classes on demand', async () => {
  const events = JSON.parse(await readFile(new URL('../app/public/data/events.json', import.meta.url)));

  // Subregion: 3 Zeilen, Summe 78, aboveShare-Sortierung wie gehabt.
  const sub = buildResidualLab(events, { groupBy: 'subregion' });
  assert.deepEqual(sub.rows.map((row) => [row.iso3, row.nAbove, row.n]),
    [['Polynesia', 12, 17], ['Melanesia', 22, 44], ['Micronesia', 8, 17]]);
  assert.equal(sub.rows.reduce((sum, row) => sum + row.n, 0), 78);

  // Größenklassen: FESTE klein→groß-Reihenfolge (Ordinalkategorien sortieren
  // nicht nach Anteil um); large = nur Papua-Neuguinea (n 4, ehrlich klein).
  const size = buildResidualLab(events, { groupBy: 'sizeClass' });
  assert.deepEqual(size.rows.map((row) => [row.iso3, row.nAbove, row.n]),
    [['small', 9, 14], ['medium', 32, 60], ['large', 1, 4]]);

  // Feste Reihenfolge bleibt auch unter Filtern stabil (nur PNG → nur large).
  const filtered = buildResidualLab(events, {
    groupBy: 'sizeClass',
    filters: { yearRange: [2001, 2026], categories: null, countries: ['PNG'] },
  });
  assert.deepEqual(filtered.rows.map((row) => row.iso3), ['large']);

  // Regression: Default-Gruppierung unverändert (19 Länder-Zeilen).
  assert.equal(buildResidualLab(events).rows.length, 19);
});

test('lab hero stat reacts to view, filters and mode with computed numbers', async () => {
  const events = JSON.parse(await readFile(new URL('../app/public/data/events.json', import.meta.url)));

  assert.deepEqual(buildLabHeroStat(events, { view: 'outliers' }), { view: 'outliers', above: 42, total: 78 });
  assert.deepEqual(buildLabHeroStat(events, { view: 'residuals', mode: 'absolute' }),
    { view: 'residuals', above: 40, total: 78 });
  assert.deepEqual(buildLabHeroStat(events, {
    view: 'residuals',
    filters: { yearRange: [2001, 2026], categories: null, countries: ['VUT'] },
  }), { view: 'residuals', above: 8, total: 10 });
  assert.deepEqual(buildLabHeroStat(events, { view: 'countries' }), { view: 'countries', total: 99, reported: 79 });
  assert.deepEqual(buildLabHeroStat(events, { view: 'geography' }), { view: 'geography', storms: 69 });
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
