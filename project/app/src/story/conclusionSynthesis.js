// Reduziertes Fazit: zwei Top-5-Lesarten links, dieselben vollständigen
// Sturm-Land-Paare als gekoppelte Kalt-Warm-Bänder rechts. Keine Filter und
// kein Dashboard-State – Hover oder Fokus verbindet genau einen Namen.
import { scaleLinear } from 'd3';
import { isScatterable } from '../core/filters.js';
import { fmtPct } from '../core/format.js';

const TOP_N = 5;
const esc = (value) => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const wind = (value) => `${Math.round(value)} kt`;
const competitionRank = (rows, row, key) => 1 + rows.filter((d) => d[key] > row[key]).length;

function topWithTies(rows, key, secondary, n) {
  const sorted = [...rows].sort((a, b) =>
    b[key] - a[key] || b[secondary] - a[secondary] || a.id.localeCompare(b.id));
  const cutoff = sorted[Math.min(n, sorted.length) - 1]?.[key];
  return cutoff == null ? [] : sorted.filter((d) => d[key] >= cutoff);
}

export function buildConclusionSynthesisModel(events) {
  const complete = events.filter(isScatterable);
  const n = complete.length;
  const rows = complete.map((event) => {
    const windRank = competitionRank(complete, event, 'intensity_kt');
    const impactRank = competitionRank(complete, event, 'affected_pc');
    return {
      ...event,
      windRank,
      impactRank,
      windPercentile: n <= 1 ? 1 : (n - windRank) / (n - 1),
      impactPercentile: n <= 1 ? 1 : (n - impactRank) / (n - 1),
    };
  });
  const topWind = topWithTies(rows, 'intensity_kt', 'affected_pc', TOP_N);
  const topImpact = topWithTies(rows, 'affected_pc', 'intensity_kt', TOP_N);
  const impactIds = new Set(topImpact.map((d) => d.id));
  const shared = topWind.filter((d) => impactIds.has(d.id));
  const orders = {
    wind: [...rows].sort((a, b) =>
      a.intensity_kt - b.intensity_kt || a.affected_pc - b.affected_pc || a.id.localeCompare(b.id)),
    impact: [...rows].sort((a, b) =>
      a.affected_pc - b.affected_pc || a.intensity_kt - b.intensity_kt || a.id.localeCompare(b.id)),
  };
  return { rows, topWind, topImpact, shared, orders, ordered: orders.wind,
    byId: new Map(rows.map((d) => [d.id, d])) };
}

function rankRows(rows, side, maxValue) {
  const windSide = side === 'wind';
  return rows.map((d) => {
    const rank = windSide ? d.windRank : d.impactRank;
    const value = windSide ? d.intensity_kt : d.affected_pc;
    const primary = windSide ? wind(d.intensity_kt) : fmtPct(d.affected_pc);
    const counterpart = windSide
      ? `${fmtPct(d.affected_pc)} affected · #${d.impactRank}`
      : `${wind(d.intensity_kt)} · #${d.windRank}`;
    const aria = `${windSide ? 'Wind' : 'Affected-share'} rank ${rank}: ${d.name}, ${d.country}, ${d.year}. `
      + `${wind(d.intensity_kt)}, ${fmtPct(d.affected_pc)} affected. Hover or focus to locate this record in both heat ribbons.`;
    return `<li><button type="button" class="cs-rank-row" data-record-id="${esc(d.id)}" data-side="${side}"
      aria-label="${esc(aria)}" style="--cs-bar:${Math.max(3, value / maxValue * 100)}%">
      <span class="cs-rank">${rank}</span>
      <span class="cs-rank-main"><strong>${esc(d.name ?? 'Unnamed storm')}</strong><small>${esc(d.country)} · ${d.year}</small>
        <i aria-hidden="true"></i><em>${esc(counterpart)}</em></span>
      <strong class="cs-rank-value">${esc(primary)}</strong>
    </button></li>`;
  }).join('');
}

function rankExplanation(row) {
  const gap = Math.abs(row.windRank - row.impactRank);
  if (gap === 0) return 'Its wind and affected-share ranks are the same.';
  if (row.impactRank < row.windRank) {
    return `Its affected-share rank sits ${gap} ${gap === 1 ? 'place' : 'places'} higher than its wind rank.`;
  }
  return `Its wind rank sits ${gap} ${gap === 1 ? 'place' : 'places'} higher than its affected-share rank.`;
}

export function createConclusionSynthesis(container, ctx) {
  const model = buildConclusionSynthesisModel(ctx.data.events);
  // Divergierende Rampe aus den zwei Story-Farben (--point → neutral → --accent).
  // Mitte #dde4e4 statt #eef0ed (Review 2026-07-13): der alte Neutralton lag fast auf
  // dem Seiten-BG #f6f8f9 - mittlere Ränge verschwanden. Achsen-Gradient in styles.css
  // (.cs-thermo-axis i) synchron halten!
  const temperature = scaleLinear()
    .domain([0, 0.25, 0.5, 0.75, 1])
    .range(['#315f87', '#a8c0d1', '#dde4e4', '#f3b195', '#e4572e'])
    .clamp(true);
  const maxWind = Math.max(...model.topWind.map((d) => d.intensity_kt));
  const maxImpact = Math.max(...model.topImpact.map((d) => d.affected_pc));
  const rankBodyHeight = Math.max(model.topWind.length, model.topImpact.length) * 82;
  const controller = new AbortController();
  let hoverId = null;
  let orderMode = 'wind';

  container.classList.add('conclusion-synthesis');
  container.innerHTML = `
    <div class="cs-board" role="group" aria-label="Top wind and affected-share lists linked to paired heat ribbons"
      style="--cs-rank-body-height:${rankBodyHeight}px;--cs-record-count:${model.rows.length}">
      <div class="cs-lists">
        <section class="cs-rank-list cs-rank-list--wind" aria-labelledby="cs-wind-title">
          <header><p class="kicker">Physical hazard</p><h4 id="cs-wind-title">Strongest winds</h4><small>Peak sustained wind</small></header>
          <ol>${rankRows(model.topWind, 'wind', maxWind)}</ol>
        </section>
        <section class="cs-rank-list cs-rank-list--impact" aria-labelledby="cs-impact-title">
          <header><p class="kicker">Human impact</p><h4 id="cs-impact-title">Highest affected share</h4><small>Reported share of population</small></header>
          <ol>${rankRows(model.topImpact, 'impact', maxImpact)}</ol>
        </section>
      </div>
      <section class="cs-ribbons" aria-labelledby="cs-ribbons-title">
        <header>
          <div class="cs-ribbons-heading">
          <h4 id="cs-ribbons-title">One order cannot explain the other</h4>
          <small>All ${model.rows.length} complete records</small>
          </div>
          <div class="cs-order" role="group" aria-label="Order records from low to high">
            <span>Order low → high</span>
            <button type="button" data-order="wind" aria-pressed="true">Wind</button>
            <button type="button" data-order="impact" aria-pressed="false">Affected</button>
          </div>
        </header>
        <div class="cs-thermo-chart">
          <div class="cs-thermo-axis" aria-hidden="true"><strong>High</strong><i></i><strong>Low</strong></div>
          <div class="cs-thermo-plot">
            <div class="cs-thermo-heads"><span>Wind strength</span><span>Affected share</span></div>
            <div class="cs-thermo-rows" role="listbox" aria-label="Every complete country-year record ordered vertically from low to high"
              aria-describedby="cs-record-detail"></div>
          </div>
        </div>
      </section>
      <div class="cs-record-detail" id="cs-record-detail" aria-live="polite" aria-atomic="true"></div>
    </div>`;

  const thermoRows = container.querySelector('.cs-thermo-rows');
  const recordDetail = container.querySelector('.cs-record-detail');

  function renderRecordDetail(row) {
    if (!row) {
      recordDetail.innerHTML = `
        <span class="cs-record-detail__label">Read a pair</span>
        <p>Hover or focus any stripe pair to see the country-year record behind both colours.</p>`;
      return;
    }
    recordDetail.innerHTML = `
      <span class="cs-record-detail__label">Country-year record</span>
      <strong>${esc(row.name ?? 'Unnamed storm')} · ${esc(row.country)} · ${row.year}</strong>
      <span>${wind(row.intensity_kt)} wind · ${fmtPct(row.affected_pc)} reported affected</span>
      <small>Wind #${row.windRank} · affected share #${row.impactRank}. ${esc(rankExplanation(row))}</small>`;
  }

  function renderThermometer() {
    // DOM order is high → low so the strongest value sits at the top.
    thermoRows.innerHTML = [...model.orders[orderMode]].reverse().map((d, index) => `
      <div class="cs-thermo-row" data-record-id="${esc(d.id)}" data-wind="${d.intensity_kt}"
        data-impact="${d.affected_pc}" role="option" aria-selected="false" tabindex="${index === 0 ? 0 : -1}"
        aria-label="${esc(`${d.name ?? 'Unnamed storm'}, ${d.country}, ${d.year}: ${wind(d.intensity_kt)} wind, ${fmtPct(d.affected_pc)} reported affected. Wind rank ${d.windRank}, affected-share rank ${d.impactRank}.`)}">
        <i class="cs-thermo-cell cs-thermo-cell--wind" style="--cs-color:${temperature(d.windPercentile)}"></i>
        <i class="cs-thermo-cell cs-thermo-cell--impact" style="--cs-color:${temperature(d.impactPercentile)}"></i>
      </div>`).join('');
    container.querySelectorAll('[data-order]').forEach((button) =>
      button.setAttribute('aria-pressed', String(button.dataset.order === orderMode)));
    renderFocus();
  }

  function renderFocus() {
    const d = model.byId.get(hoverId);
    container.querySelectorAll('[data-record-id]').forEach((node) => {
      node.classList.toggle('active', !!d && node.dataset.recordId === d.id);
      node.classList.toggle('muted', !!d && node.dataset.recordId !== d.id);
      if (node.matches('.cs-thermo-row')) {
        node.setAttribute('aria-selected', String(!!d && node.dataset.recordId === d.id));
      }
    });
    renderRecordDetail(d);
  }

  function setHoverId(nextId) {
    if (hoverId === nextId) return;
    hoverId = nextId;
    renderFocus();
  }

  function linkedRow(target) {
    return target instanceof Element ? target.closest('.cs-rank-row, .cs-thermo-row') : null;
  }

  container.addEventListener('pointerover', (event) => {
    const row = linkedRow(event.target);
    if (!row || row.contains(event.relatedTarget)) return;
    setHoverId(row.dataset.recordId);
  }, { signal: controller.signal });
  container.addEventListener('pointerout', (event) => {
    const row = linkedRow(event.target);
    if (!row || row.contains(event.relatedTarget)) return;
    setHoverId(linkedRow(event.relatedTarget)?.dataset.recordId ?? null);
  }, { signal: controller.signal });
  container.addEventListener('focusin', (event) => {
    const row = linkedRow(event.target);
    if (!row) return;
    setHoverId(row.dataset.recordId);
  }, { signal: controller.signal });
  container.addEventListener('focusout', (event) => {
    const row = linkedRow(event.target);
    if (!row || row.contains(event.relatedTarget)) return;
    setHoverId(linkedRow(event.relatedTarget)?.dataset.recordId ?? null);
  }, { signal: controller.signal });
  container.addEventListener('click', (event) => {
    const order = event.target.closest('[data-order]');
    if (!order) return;
    orderMode = order.dataset.order; renderThermometer();
  }, { signal: controller.signal });
  container.addEventListener('keydown', (event) => {
    const current = event.target.closest('.cs-thermo-row');
    if (!current || !['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    const rows = [...thermoRows.querySelectorAll('.cs-thermo-row')];
    const currentIndex = rows.indexOf(current);
    const nextIndex = event.key === 'Home' ? 0
      : event.key === 'End' ? rows.length - 1
        : event.key === 'ArrowUp' ? Math.max(0, currentIndex - 1)
          : Math.min(rows.length - 1, currentIndex + 1);
    event.preventDefault();
    rows.forEach((row, index) => row.setAttribute('tabindex', index === nextIndex ? '0' : '-1'));
    rows[nextIndex]?.focus();
  }, { signal: controller.signal });

  renderThermometer();

  return { update() {}, destroy() {
    controller.abort(); container.classList.remove('conclusion-synthesis'); container.innerHTML = '';
  } };
}
