// Detailpanel je STURM (Analyseeinheit: aggregiert über alle Sturm-Land-Zeilen).
// Mini-Track mit EIGENER Projektions-Instanz (fitExtent mutiert - nie die Haupt-Karte teilen,
// Stolperstein 5). Esc/× schließen; Fokus-Management für Tastaturpfad.
import { select, geoEquirectangular, geoPath } from 'd3';
import { fmtInt, fmtPct, fmtKt, fmtCategory } from '../core/format.js';

const MINI = { width: 440, height: 240, pad: 18 };

// Fehlwerte in der dichten 4-Spalten-Tabelle als "–" (die Fußnote erklärt die
// Bedeutung) - der lange globale Fallback "not reported" würde die Spalten sprengen.
const cell = (v, fmt) => (v == null ? '–' : fmt(v));
const esc = (value) => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const reportedSum = (events, key) => {
  const values = events.map((event) => event[key]).filter((value) => value != null);
  return values.length ? values.reduce((sum, value) => sum + value, 0) : null;
};

function comparisonText(events) {
  const shares = events.map((event) => event.affected_pc).filter((value) => value != null);
  if (shares.length > 1) {
    const low = Math.min(...shares);
    const high = Math.max(...shares);
    return `Across the countries linked to this track, reported affected share ranges from ${fmtPct(low)} to ${fmtPct(high)}.`;
  }
  if (shares.length === 1) return `One country linked to this track has a reported affected share of ${fmtPct(shares[0])}.`;
  return 'No affected-share value is reported for the countries linked to this track.';
}

export function createDetailPanel(container, ctx) {
  const { bySid } = ctx.data.index;
  const { tracks, index } = ctx.data;
  const bus = ctx.bus;
  let lastFocused = null;
  let escListener = null;

  container.setAttribute('role', 'dialog');
  container.setAttribute('tabindex', '-1');

  function close() {
    bus.set({ detailSid: null });
  }

  function open(sid) {
    const events = bySid.get(sid) ?? [];
    const first = events[0];
    if (!first) return;
    const affectedTotal = reportedSum(events, 'affected');
    const shareEvents = [...events]
      .filter((event) => event.affected_pc != null)
      .sort((a, b) => b.affected_pc - a.affected_pc || a.country.localeCompare(b.country));
    const maxShare = Math.max(...shareEvents.map((event) => event.affected_pc), 0);
    const countryCount = new Set(events.map((event) => event.iso3)).size;

    container.innerHTML = `
      <button class="dp-close" aria-label="Close details">×</button>
      <div class="dp-shell">
        <header class="dp-head">
          <span class="dp-eyebrow">Selected track</span>
          <h2>${esc(first.name ?? 'Unnamed storm')} · ${first.year}</h2>
          <p class="dp-sub">${fmtCategory(first.category)} · IBTrACS max sustained wind (1-min)</p>
        </header>
        <dl class="dp-stats" aria-label="Storm summary">
          <div><dt>Peak wind</dt><dd>${fmtKt(first.intensity_kt)}</dd></div>
          <div><dt>Countries</dt><dd>${countryCount}</dd></div>
          <div><dt>Reported affected</dt><dd>${cell(affectedTotal, fmtInt)}</dd></div>
        </dl>
        <div class="dp-map" role="img" aria-label="Track of ${esc(first.name ?? 'the selected storm')} and linked countries"></div>
        <section class="dp-records" aria-labelledby="dp-records-title">
          <div class="dp-section-head"><h3 id="dp-records-title">Country records</h3><span>${events.length} ${events.length === 1 ? 'record' : 'records'}</span></div>
          <div class="dp-table-wrap">
            <table>
              <thead><tr><th>Country</th><th class="num">Affected</th><th class="num">Share</th><th class="num">Year</th></tr></thead>
              <tbody>
                ${events.map((e) => `
                  <tr>
                    <td>${esc(e.country)}</td>
                    <td class="num">${cell(e.affected, fmtInt)}</td>
                    <td class="num">${cell(e.affected_pc, fmtPct)}</td>
                    <td class="num">${e.year}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </section>
        ${shareEvents.length ? `
          <section class="dp-country-profile" aria-labelledby="dp-profile-title">
            <div class="dp-section-head"><h3 id="dp-profile-title">How the reported shares compare</h3><span>Highest = full bar</span></div>
            <ul>
              ${shareEvents.map((event) => `
                <li>
                  <span>${esc(event.country)}</span>
                  <i aria-hidden="true"><b style="--dp-share:${maxShare ? event.affected_pc / maxShare * 100 : 0}%"></b></i>
                  <strong>${fmtPct(event.affected_pc)}</strong>
                </li>`).join('')}
            </ul>
          </section>` : ''}
        <aside class="dp-reading">
          <strong>What this comparison says</strong>
          <p>${comparisonText(events)} The unit is one country-year record; “–” means not reported.</p>
        </aside>
      </div>`;

    container.setAttribute('aria-label', `Details for ${first.name ?? 'unnamed storm'} ${first.year}`);
    container.querySelector('.dp-close').addEventListener('click', close);
    renderMiniTrack(container.querySelector('.dp-map'), sid, events);

    if (!container.classList.contains('open')) lastFocused = document.activeElement;
    container.classList.add('open');
    container.setAttribute('aria-hidden', 'false');
    container.focus();

    if (escListener) document.removeEventListener('keydown', escListener);
    escListener = (ev) => { if (ev.key === 'Escape') close(); };
    document.addEventListener('keydown', escListener);
  }

  function hide() {
    container.classList.remove('open');
    container.setAttribute('aria-hidden', 'true');
    if (escListener) { document.removeEventListener('keydown', escListener); escListener = null; }
    if (lastFocused?.focus) lastFocused.focus();
    lastFocused = null;
  }

  function renderMiniTrack(mount, sid, events) {
    const pts = tracks[sid];
    if (!pts) return;
    const lineString = { type: 'LineString', coordinates: pts.map((p) => [p[0], p[1]]) };

    // EIGENE Projektion, auf die Track-Bbox gefittet (Rotation zuerst → Dateline sauber)
    const projection = geoEquirectangular().rotate([-192, 0])
      .fitExtent([[MINI.pad, MINI.pad], [MINI.width - MINI.pad, MINI.height - MINI.pad]], lineString);
    const path = geoPath(projection);

    const svg = select(mount).append('svg')
      .attr('viewBox', `0 0 ${MINI.width} ${MINI.height}`);
    svg.append('path').datum(ctx.data.land).attr('class', 'land').attr('d', path);
    svg.append('path').datum(lineString)
      .attr('d', path)
      .attr('fill', 'none')
      .attr('stroke', 'var(--accent)')
      .attr('stroke-width', 1.8);

    const isos = new Set(events.map((e) => e.iso3));
    for (const iso3 of isos) {
      const c = index.centroids[iso3];
      if (!c) continue;
      const p = projection(c);
      if (!p) continue;
      svg.append('circle').attr('cx', p[0]).attr('cy', p[1]).attr('r', 3).attr('class', 'centroid emphasis');
    }
  }

  return {
    update(state, patch) {
      if (patch && !('detailSid' in patch)) return;
      if (state.detailSid) open(state.detailSid);
      else hide();
    },
    destroy() {
      hide();
      container.innerHTML = '';
    },
  };
}
