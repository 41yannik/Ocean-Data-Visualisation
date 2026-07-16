// Zeit-Scrubber der Hero-Map (Explore, „Your turn"): bringt die Zeit als Dimension in die
// größte Visualisierung. Genau EIN Jahr wird auf der Karte gespotlightet (Rest = gedimmte
// Kulisse); Play/Pause fährt die Jahre automatisch ab, der Playhead lässt sich ziehen.
// Einziger Schreiber von activeYear/playing (Store-Konvention). Play-Loop nach dem d3-timer-
// Muster aus map/swathLayer.js. Domäne = filters.yearRange (die Sidebar-Felder „Play range").
// reducedMotion: der Timer stept weiterhin diskret, nur der Crossfade (CSS) entfällt.
import { timer } from 'd3';
import { matchesFilters } from '../core/filters.js';

const CADENCE = 700; // ms je Jahr im Autoplay
const DMIN = 2001;
const DMAX = 2026;

export function createTimeScrubber(container, ctx) {
  const { bus } = ctx;

  // Kanonisches Jahr je Sturm (frühestes Impact-Jahr) + Events für den gefilterten Zähler.
  const storms = Object.keys(ctx.data.tracks).map((sid) => {
    const events = ctx.data.index.bySid.get(sid) ?? [];
    return { events, year: events.length ? Math.min(...events.map((e) => e.year)) : null };
  });
  const countFor = (year) => {
    const f = bus.get().filters;
    return storms.filter((s) => s.year === year && s.events.some((e) => matchesFilters(e, f))).length;
  };

  container.className = 'map-timeline';
  container.innerHTML = `
    <button type="button" class="mt-play" aria-pressed="false" aria-label="Play years">
      <span class="mt-play-icon" aria-hidden="true">▶</span></button>
    <div class="mt-track">
      <input type="range" class="mt-range" min="${DMIN}" max="${DMAX}" step="1" value="${DMIN}"
             aria-label="Year" aria-valuetext="All years">
      <div class="mt-ticks" aria-hidden="true"></div>
    </div>
    <output class="mt-readout">All years</output>
    <button type="button" class="mt-all" aria-pressed="true">All years</button>
    <span class="mt-live" aria-live="polite"></span>`;

  const playBtn = container.querySelector('.mt-play');
  const playIcon = container.querySelector('.mt-play-icon');
  const range = container.querySelector('.mt-range');
  const ticks = container.querySelector('.mt-ticks');
  const readout = container.querySelector('.mt-readout');
  const allBtn = container.querySelector('.mt-all');
  const live = container.querySelector('.mt-live');

  // Jahres-Ticks; Dekaden (+ Ränder) beschriftet.
  ticks.innerHTML = Array.from({ length: DMAX - DMIN + 1 }, (_, i) => DMIN + i).map((y) => {
    const pct = ((y - DMIN) / (DMAX - DMIN)) * 100;
    // Keep endpoint labels legible when an endpoint sits next to a five-year tick
    // (2025/2026 would otherwise overlap on narrow screens).
    const major = y === DMIN || y === DMAX
      || (y % 5 === 0 && y - DMIN >= 2 && DMAX - y >= 2);
    return `<span class="mt-tick${major ? ' mt-tick--major' : ''}" style="left:${pct}%">`
      + `${major ? `<b>${y}</b>` : ''}</span>`;
  }).join('');

  const domain = () => bus.get().filters?.yearRange ?? [DMIN, DMAX];

  let clock = null;
  function stopClock() { if (clock) { clock.stop(); clock = null; } }
  function pause() { stopClock(); if (bus.get().playing) bus.set({ playing: false }); }
  function setYear(y, announce) {
    // Ein Track aus dem vorherigen Jahr darf weder als Tooltip noch im Drawer über den
    // neuen Jahresfokus gelegt bleiben.
    bus.set({ activeYear: y, hover: null, detailSid: null });
    if (announce) live.textContent = y == null ? 'All years' : `Year ${y}, ${countFor(y)} storms`;
  }
  function play() {
    const [lo, hi] = domain();
    const cur = bus.get().activeYear;
    const start = (cur == null || cur >= hi) ? lo : cur;
    stopClock();
    bus.set({ activeYear: start, playing: true, hover: null, detailSid: null });
    let lastY = start;
    clock = timer((elapsed) => {
      const y = Math.min(hi, start + Math.floor(elapsed / CADENCE));
      if (y !== lastY) {
        lastY = y;
        bus.set({ activeYear: y, hover: null, detailSid: null });
      }
      if (y >= hi) { stopClock(); bus.set({ playing: false }); }
    });
  }

  playBtn.addEventListener('click', () => { if (bus.get().playing) pause(); else play(); });
  allBtn.addEventListener('click', () => { pause(); setYear(null, true); });
  // 'input' feuert nur bei Nutzer-Interaktion (nicht beim programmatischen .value-Setzen) → keine Schleife.
  range.addEventListener('input', () => { pause(); setYear(+range.value, true); });
  container.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { pause(); setYear(null, true); }
  });

  function render(state) {
    const ay = state.activeYear ?? null;
    const [lo, hi] = state.filters?.yearRange ?? [DMIN, DMAX];
    container.dataset.disabled = String(!state.exploreUnlocked);
    container.dataset.active = String(ay != null);
    // Range-Domäne = Play-Bereich (Sidebar-Felder „Play range")
    range.min = String(lo);
    range.max = String(hi);
    range.value = String(ay == null ? lo : Math.min(hi, Math.max(lo, ay)));
    range.setAttribute('aria-valuetext', ay == null ? 'All years' : `${ay}, ${countFor(ay)} storms`);
    const n = ay == null ? 0 : countFor(ay);
    readout.textContent = ay == null ? 'All years' : `${ay} · ${n} storm${n === 1 ? '' : 's'}`;
    allBtn.setAttribute('aria-pressed', String(ay == null));
    const playing = !!state.playing;
    playBtn.setAttribute('aria-pressed', String(playing));
    playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play years');
    playIcon.textContent = playing ? '❚❚' : '▶';
  }

  return {
    update(state, patch) {
      // Play-Bereich verkleinert unter das aktive Jahr → einmalig ins neue Fenster klemmen.
      if (patch && 'filters' in patch && state.activeYear != null) {
        const [lo, hi] = state.filters?.yearRange ?? [DMIN, DMAX];
        if (state.activeYear < lo || state.activeYear > hi) {
          bus.set({ activeYear: Math.min(hi, Math.max(lo, state.activeYear)) });
          return; // Folge-Patch rendert
        }
      }
      if (!patch || 'activeYear' in patch || 'playing' in patch
        || 'filters' in patch || 'exploreUnlocked' in patch) {
        render(state);
      }
    },
    destroy() { stopClock(); container.innerHTML = ''; },
  };
}
