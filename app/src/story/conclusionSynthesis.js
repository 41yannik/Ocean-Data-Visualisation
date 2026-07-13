// Reduziertes Fazit: zwei Top-5-Lesarten links, dieselben vollständigen
// Sturm-Land-Paare als gekoppelte Kalt-Warm-Bänder rechts. Keine Filter und
// kein Dashboard-State – Hover, Fokus oder Tap verbindet genau einen Namen.
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
  const controller = new AbortController();
  let pinnedId = null;
  let hoverId = null;
  let orderMode = 'wind';

  container.classList.add('conclusion-synthesis');
  container.innerHTML = `
    <header class="cs-head">
      <!-- Kicker-Diät (Review 2026-07-13): der Sektions-Kicker "The conclusion" genügt -
           Unterköpfe tragen keine eigenen Eyebrows mehr; nur die beiden Spalten-Label
           (Physical hazard / Human impact) bleiben, weil sie Spalten benennen. -->
      <div><h3>The lists barely meet</h3>
        <p>The strongest winds and the highest affected shares describe different extremes.</p></div>
    </header>
    <div class="cs-board" role="group" aria-label="Top wind and affected-share lists linked to paired heat ribbons">
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
        <header><div>
          <h4 id="cs-ribbons-title">One order cannot explain the other</h4>
          <small>All ${model.rows.length} complete records</small></div>
        </header>
        <div class="cs-order" role="group" aria-label="Order records from low to high">
          <span>Order bottom → top</span>
          <button type="button" data-order="wind" aria-pressed="true">Wind</button>
          <button type="button" data-order="impact" aria-pressed="false">Affected</button>
        </div>
        <div class="cs-thermo-chart">
          <div class="cs-thermo-axis" aria-hidden="true"><strong>High</strong><i></i><strong>Low</strong></div>
          <div class="cs-thermo-plot">
            <div class="cs-thermo-heads"><span>Wind strength</span><span>Affected share</span></div>
            <div class="cs-thermo-rows" aria-label="Every complete record ordered vertically from low to high"></div>
          </div>
        </div>
      </section>
    </div>`;

  const thermoRows = container.querySelector('.cs-thermo-rows');
  const focusId = () => hoverId ?? pinnedId;

  function renderThermometer() {
    // DOM order is high → low so the strongest value sits at the top.
    thermoRows.innerHTML = [...model.orders[orderMode]].reverse().map((d) => `
      <span class="cs-thermo-row" data-record-id="${esc(d.id)}" data-wind="${d.intensity_kt}"
        data-impact="${d.affected_pc}" aria-hidden="true">
        <i class="cs-thermo-cell cs-thermo-cell--wind" style="--cs-color:${temperature(d.windPercentile)}"></i>
        <i class="cs-thermo-cell cs-thermo-cell--impact" style="--cs-color:${temperature(d.impactPercentile)}"></i>
      </span>`).join('');
    container.querySelectorAll('[data-order]').forEach((button) =>
      button.setAttribute('aria-pressed', String(button.dataset.order === orderMode)));
    renderFocus();
  }

  function renderFocus() {
    const d = model.byId.get(focusId());
    container.querySelectorAll('[data-record-id]').forEach((node) => {
      node.classList.toggle('active', !!d && node.dataset.recordId === d.id);
      node.classList.toggle('muted', !!d && node.dataset.recordId !== d.id);
    });
  }

  container.addEventListener('pointerover', (event) => {
    const row = event.target.closest('.cs-rank-row');
    if (!row) return;
    hoverId = row.dataset.recordId; renderFocus();
  }, { signal: controller.signal });
  container.addEventListener('pointerout', (event) => {
    const row = event.target.closest('.cs-rank-row');
    if (!row || row.contains(event.relatedTarget)) return;
    hoverId = null; renderFocus();
  }, { signal: controller.signal });
  container.addEventListener('focusin', (event) => {
    const row = event.target.closest('.cs-rank-row');
    if (!row) return;
    hoverId = row.dataset.recordId; renderFocus();
  }, { signal: controller.signal });
  container.addEventListener('focusout', (event) => {
    const row = event.target.closest('.cs-rank-row');
    if (!row || row.contains(event.relatedTarget)) return;
    hoverId = null; renderFocus();
  }, { signal: controller.signal });
  container.addEventListener('click', (event) => {
    const order = event.target.closest('[data-order]');
    if (order) { orderMode = order.dataset.order; renderThermometer(); return; }
    const row = event.target.closest('.cs-rank-row');
    if (!row) return;
    pinnedId = pinnedId === row.dataset.recordId ? null : row.dataset.recordId;
    hoverId = null; renderFocus();
  }, { signal: controller.signal });
  container.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    pinnedId = null; hoverId = null; renderFocus();
  }, { signal: controller.signal });

  renderThermometer();

  return { update() {}, destroy() {
    controller.abort(); container.classList.remove('conclusion-synthesis'); container.innerHTML = '';
  } };
}
