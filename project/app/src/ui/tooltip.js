// Tooltip: Singleton-Div (position: fixed), reagiert AUSSCHLIESSLICH auf hover-Patches.
// Position aus hover.x/y (clientX/clientY, Lücke L11) mit Viewport-Flip.
import { fmtInt, fmtPct, fmtKt, fmtCategory } from '../core/format.js';
import { isScatterable, matchesFilters } from '../core/filters.js';

export function createTooltip(body, ctx) {
  const { byId, bySid } = ctx.data.index;
  const el = document.createElement('div');
  el.className = 'tooltip';
  body.appendChild(el);
  let contentKey = null;

  function contentForEvent(e) {
    return `
      <div class="tt-title">${e.name ?? 'Unnamed storm'} · ${e.year}</div>
      <div class="tt-sub">${e.country} · ${fmtCategory(e.category)}</div>
      <dl>
        <dt>Max sustained wind</dt><dd>${fmtKt(e.intensity_kt)}</dd>
        <dt>Reported affected</dt><dd>${fmtInt(e.affected)}</dd>
        <dt>Share of population affected</dt><dd>${fmtPct(e.affected_pc)}${e.pop_extrapolated ? ' *' : ''}</dd>
      </dl>
      ${e.pop_extrapolated ? '<div class="tt-sub">* population extrapolated from 2023</div>' : ''}`;
  }

  // Einfache Sprache (Story-Step 3): ein Satz, kein Fachjargon.
  function contentSimple(e, state) {
    if (!e) return '';
    const sameStorm = e.sid
      ? (bySid.get(e.sid) ?? []).filter((event) => isScatterable(event)
        && matchesFilters(event, state.filters))
        .sort((a, b) => (b.affected_pc ?? 0) - (a.affected_pc ?? 0))
      : [e];
    if (sameStorm.length > 1) {
      const countries = new Set(sameStorm.map((event) => event.iso3)).size;
      return `
        <div class="tt-storm-kicker">One storm · ${countries} affected countries</div>
        <div class="tt-title">${e.name ?? 'A storm'} · ${e.year} · ${fmtKt(e.intensity_kt)}</div>
        <div class="tt-country-list">
          ${sameStorm.map((event) => `
            <div class="tt-country-row${event.id === e.id ? ' active' : ''}">
              <span>${event.country}</span><strong>${fmtPct(event.affected_pc)}</strong>
            </div>`).join('')}
        </div>
        <div class="tt-sub">Selected: ${e.country}</div>`;
    }
    return `
      <div class="tt-title">${e.name ?? 'A storm'} · ${e.country} · ${e.year}</div>
      <div class="tt-simple">At <strong>${fmtKt(e.intensity_kt)}</strong> of wind,
        <strong>${fmtPct(e.affected_pc)}</strong> of the population was reported affected.</div>
      <div class="tt-sub">Annual count across all disasters that year.</div>`;
  }

  function contentForStorm(sid) {
    const list = bySid.get(sid) ?? [];
    const first = list[0];
    if (!first) return '';
    const affectedTotal = list.reduce((s, e) => s + (e.affected ?? 0), 0);
    return `
      <div class="tt-title">${first.name ?? 'Unnamed storm'} · ${first.year}</div>
      <div class="tt-sub">${list.length} ${list.length === 1 ? 'country' : 'countries'} · ${fmtCategory(first.category)}</div>
      <dl>
        <dt>Max sustained wind</dt><dd>${fmtKt(first.intensity_kt)}</dd>
        <dt>Reported affected</dt><dd>${affectedTotal ? fmtInt(affectedTotal) : 'not reported'}</dd>
        <dt>Countries</dt><dd>${list.map((e) => e.iso3).join(', ')}</dd>
      </dl>
      <div class="tt-sub">click for details</div>`;
  }

  function render(state) {
    const h = state.hover;
    if (!h) {
      contentKey = null;
      el.classList.remove('visible');
      return;
    }
    // Text-getriebener Hover (Mawar/Percy im Fließtext) hat keine x/y → kein Tooltip,
    // nur Punkt-Highlight/Residuum. Der Tooltip erscheint nur bei Zeiger-Hover.
    if (h.x == null || h.y == null) { el.classList.remove('visible'); return; }
    const nextContentKey = `${h.variant ?? 'full'}|${h.eventId ?? ''}|${h.sid ?? ''}`;
    if (nextContentKey !== contentKey) {
      el.innerHTML = h.variant === 'simple'
        ? contentSimple(byId.get(h.eventId), state)
        : h.eventId ? contentForEvent(byId.get(h.eventId)) : contentForStorm(h.sid);
      contentKey = nextContentKey;
    }
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
