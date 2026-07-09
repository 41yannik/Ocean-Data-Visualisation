// Detailpanel je STURM (Analyseeinheit: aggregiert über alle Sturm-Land-Zeilen).
// Mini-Track mit EIGENER Projektions-Instanz (fitExtent mutiert - nie die Haupt-Karte teilen,
// Stolperstein 5). Esc/× schließen; Fokus-Management für Tastaturpfad.
import { select, geoEquirectangular, geoPath } from 'd3';
import { fmtInt, fmtPct, fmtKt, fmtSource, fmtCategory } from '../core/format.js';

const MINI = { width: 340, height: 190, pad: 14 };

// Fehlwerte in der dichten 4-Spalten-Tabelle als "—" (die Fußnote erklärt die
// Bedeutung) - der lange globale Fallback "not reported" würde die Spalten sprengen.
const cell = (v, fmt) => (v == null ? '—' : fmt(v));

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

    container.innerHTML = `
      <button class="dp-close" aria-label="Close details">×</button>
      <h2>${first.name ?? 'Unnamed storm'} · ${first.year}</h2>
      <p class="dp-sub">${fmtCategory(first.category)} · max sustained wind ${fmtKt(first.intensity_kt)} · ${fmtSource(first.intensity_source)}</p>
      <div class="dp-map"></div>
      <table>
        <thead><tr><th>Country</th><th class="num">Affected</th><th class="num">Share</th><th class="num">Deaths</th></tr></thead>
        <tbody>
          ${events.map((e) => `
            <tr>
              <td>${e.country}</td>
              <td class="num">${cell(e.affected, fmtInt)}</td>
              <td class="num">${cell(e.affected_pc, fmtPct)}</td>
              <td class="num">${cell(e.deaths, fmtInt)}</td>
            </tr>`).join('')}
        </tbody>
      </table>
      <p class="dp-note">Same storm, same maximum sustained wind, different reported toll per country (unit: storm-country pair). "—" = not reported.</p>`;

    container.setAttribute('aria-label', `Details for ${first.name ?? 'unnamed storm'} ${first.year}`);
    container.querySelector('.dp-close').addEventListener('click', close);
    renderMiniTrack(container.querySelector('.dp-map'), sid, events);

    lastFocused = document.activeElement;
    container.classList.add('open');
    container.setAttribute('aria-hidden', 'false');
    container.focus();

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
