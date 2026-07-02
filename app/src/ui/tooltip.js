// Tooltip: Singleton-Div (position: fixed), reagiert AUSSCHLIESSLICH auf hover-Patches.
// Position aus hover.x/y (clientX/clientY, Lücke L11) mit Viewport-Flip.
import { fmtInt, fmtPct, fmtKt, fmtSource, fmtCategory } from '../core/format.js';

export function createTooltip(body, ctx) {
  const { byId, bySid } = ctx.data.index;
  const el = document.createElement('div');
  el.className = 'tooltip';
  body.appendChild(el);

  function contentForEvent(e) {
    return `
      <div class="tt-title">${e.name ?? 'Unnamed storm'} · ${e.year}</div>
      <div class="tt-sub">${e.country} · ${fmtCategory(e.category)} · ${fmtSource(e.intensity_source)}</div>
      <dl>
        <dt>Peak wind</dt><dd>${fmtKt(e.intensity_kt)}</dd>
        <dt>People affected</dt><dd>${fmtInt(e.affected)}</dd>
        <dt>Share of population</dt><dd>${fmtPct(e.affected_pc)}${e.pop_extrapolated ? ' *' : ''}</dd>
        <dt>Deaths</dt><dd>${e.deaths == null ? 'not reported' : fmtInt(e.deaths)}</dd>
      </dl>
      ${e.pop_extrapolated ? '<div class="tt-sub">* population extrapolated from 2023</div>' : ''}`;
  }

  function contentForStorm(sid) {
    const list = bySid.get(sid) ?? [];
    const first = list[0];
    if (!first) return '';
    const affectedTotal = list.reduce((s, e) => s + (e.affected ?? 0), 0);
    return `
      <div class="tt-title">${first.name ?? 'Unnamed storm'} · ${first.year}</div>
      <div class="tt-sub">${list.length} ${list.length === 1 ? 'country' : 'countries'} · ${fmtCategory(first.category)} · ${fmtSource(first.intensity_source)}</div>
      <dl>
        <dt>Peak wind</dt><dd>${fmtKt(first.intensity_kt)}</dd>
        <dt>People affected</dt><dd>${affectedTotal ? fmtInt(affectedTotal) : '—'}</dd>
        <dt>Countries</dt><dd>${list.map((e) => e.iso3).join(', ')}</dd>
      </dl>
      <div class="tt-sub">click for details</div>`;
  }

  function render(state) {
    const h = state.hover;
    if (!h) { el.classList.remove('visible'); return; }
    el.innerHTML = h.eventId
      ? contentForEvent(byId.get(h.eventId))
      : contentForStorm(h.sid);
    el.classList.add('visible');

    // Position + Flip am Viewport-Rand
    const pad = 14;
    const rect = el.getBoundingClientRect();
    let x = h.x + pad;
    let y = h.y + pad;
    if (x + rect.width > innerWidth - 8) x = h.x - rect.width - pad;
    if (y + rect.height > innerHeight - 8) y = h.y - rect.height - pad;
    el.style.left = `${Math.max(8, x)}px`;
    el.style.top = `${Math.max(8, y)}px`;
  }

  return {
    update(state, patch) {
      if (!patch || 'hover' in patch) render(state);
    },
    destroy() { el.remove(); },
  };
}
