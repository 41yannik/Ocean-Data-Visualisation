// Wind-Front des Heta-Hooks (Step 2). Zwei Ebenen:
//  1. Korridor (.track-swath): halbtransparenter dicker Stroke = überstrichenes R34-Feld,
//     zeichnet sich synchron zum Track ein (Trail).
//  2. Wandernder Kreis (.wind-front): der Gale-force-Radius an der Spitze der Zugbahn - die
//     ANIMATIONS-UHR des Hooks. Er läuft (nach dem Kamera-Einflug) von Nord nach Süd; sobald
//     sein Mittelpunkt eine Insel überdeckt, meldet er das über den Store (hetaReached) →
//     die Impact-Bubble (Karte) und der Balken (Chart) poppen ereignisgesteuert auf.
// Dazu: dezenter Replay-Button unter der Karte und - wenn die Animation steht - ein
// Hover-Tooltip auf der Zugbahn mit der Windgeschwindigkeit (kt) am nächsten Bahnpunkt.
// storyFx.swath.radiusKm liefert R34 (Heta: IBTrACS, siehe steps.js); reducedMotion: statisch.
import { select, timer, easeCubicInOut, pointer } from 'd3';
import { DUR_DRAW } from '../core/config.js';
import { computeHetaSequence, sampleAt } from '../story/hetaSequence.js';

export function createSwathLayer(g, layerCtx) {
  const { data, geo, bus } = layerCtx;

  const corridor = g.append('path').attr('class', 'track-swath').style('display', 'none');
  const circle = g.append('circle').attr('class', 'wind-front').style('display', 'none');

  // Die kt-Hover-Bahn muss ÜBER dem Track-Layer liegen (sonst fängt dessen inline
  // pointer-events:stroke den Hover ab), aber UNTER den Impact-Bubbles (die auf der Bahn
  // sitzen und ihren Bereich behalten sollen). Darum eine eigene Gruppe direkt vor g-impact.
  const gCam = select(g.node().parentNode);
  const gImpactNode = gCam.node().querySelector('.g-impact');
  const gHover = gImpactNode
    ? gCam.insert('g', () => gImpactNode).attr('class', 'g-heta-hover')
    : gCam.append('g').attr('class', 'g-heta-hover');
  const hit = gHover.append('path').attr('class', 'heta-hit').style('display', 'none');
  const marker = gHover.append('circle').attr('class', 'heta-marker').attr('r', 3.2).style('display', 'none');

  // Lokaler kt-Tooltip (die gefrorene Sektion mountet den globalen ui/tooltip nicht).
  const tip = document.createElement('div');
  tip.className = 'tooltip';
  document.body.appendChild(tip);

  let clock = null;
  let hetaPts = null;       // [{wind, x, y}] projizierte Bahnpunkte für den kt-Tooltip
  let currentSwath = null;  // { sid, radiusKm } des aktiven Hooks

  function stopClock() {
    if (clock) { clock.stop(); clock = null; }
  }

  function runClock(seq) {
    stopClock();
    const impacts = Object.values(seq.perEvent);
    const done = new Set();
    circle.style('display', null).attr('r', seq.radiusPx);
    const [x0, y0] = sampleAt(seq.samples, 0);
    circle.attr('cx', x0).attr('cy', y0).attr('opacity', 0);

    clock = timer((elapsed) => {
      if (elapsed < seq.flyMs) return;              // erst der Kamera-Einflug
      const raw = Math.min(1, (elapsed - seq.flyMs) / seq.drawMs);
      const f = easeCubicInOut(raw);                // Spitzen-Bruchteil = Reveal des Tracks
      const [cx, cy] = sampleAt(seq.samples, f);
      circle.attr('cx', cx).attr('cy', cy).attr('opacity', 1);

      for (const info of impacts) {
        if (!done.has(info.iso3) && f >= info.fraction) {
          done.add(info.iso3);
          bus.set({ hetaReached: { ...bus.get().hetaReached, [info.iso3]: true } });
        }
      }
      if (raw >= 1) {
        stopClock();
        circle.transition('wind-fade').duration(500).attr('opacity', 0)
          .on('end', () => circle.style('display', 'none'));
        bus.set({ hetaAnimDone: true });
      }
    });
  }

  // kt-Tooltip: nur wenn die Animation steht (pausiert/beendet). Nächster Bahnpunkt.
  function onMove(event) {
    if (!bus.get().hetaAnimDone || !hetaPts) return;
    const [mx, my] = pointer(event, g.node());
    let best = null;
    let bestD = Infinity;
    for (const p of hetaPts) {
      const dd = (p.x - mx) ** 2 + (p.y - my) ** 2;
      if (dd < bestD) { bestD = dd; best = p; }
    }
    if (!best) return;
    marker.style('display', null).attr('cx', best.x).attr('cy', best.y);
    tip.innerHTML = `<div class="tt-title">Cyclone Heta</div>`
      + `<dl><dt>Wind along track</dt><dd>${best.wind != null ? `${Math.round(best.wind)} kt` : '&lt; 34 kt'}</dd></dl>`;
    tip.classList.add('visible');
    const pad = 14;
    const r = tip.getBoundingClientRect();
    let x = event.clientX + pad;
    let y = event.clientY + pad;
    if (x + r.width > innerWidth - 8) x = event.clientX - r.width - pad;
    if (y + r.height > innerHeight - 8) y = event.clientY - r.height - pad;
    tip.style.left = `${Math.max(8, x)}px`;
    tip.style.top = `${Math.max(8, y)}px`;
  }
  function onLeave() {
    marker.style('display', 'none');
    tip.classList.remove('visible');
  }

  function ensureReplayButton(state, seq) {
    const svg = g.node().ownerSVGElement;
    const figure = svg?.parentNode;
    if (!figure || figure.querySelector('.heta-replay')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'heta-replay';
    btn.textContent = '↺ Replay';
    btn.addEventListener('click', () => {
      onLeave();
      corridor.interrupt('swath-draw');
      bus.set({ hetaReached: {}, hetaAnimDone: false });
      drawCorridor(seq, /* animate */ true);
      runClock(seq);
    });
    figure.appendChild(btn);
  }

  function drawCorridor(seq, animate) {
    if (!currentSwath) return;
    const line = { type: 'LineString', coordinates: data.tracks[currentSwath.sid].map((p) => [p[0], p[1]]) };
    corridor.style('display', null)
      .attr('d', geo.path(line))
      .attr('stroke-width', 2 * seq.radiusPx)
      .attr('stroke-dasharray', null)
      .attr('stroke-dashoffset', null);
    if (!animate) return;
    const len = corridor.node().getTotalLength();
    corridor.attr('stroke-dasharray', `${len} ${len}`)
      .attr('stroke-dashoffset', len)
      .transition('swath-draw')
      .delay(seq.flyMs)
      .duration(DUR_DRAW)
      .attr('stroke-dashoffset', 0)
      .on('end', () => corridor.attr('stroke-dasharray', null).attr('stroke-dashoffset', null));
  }

  let lastKey = null;
  function render(state) {
    const swath = state.storyFx?.swath ?? null;
    const key = swath ? `${swath.sid}:${swath.radiusKm}` : null;
    if (key === lastKey) return;
    lastKey = key;

    stopClock();
    corridor.interrupt('swath-draw');
    onLeave();

    if (!swath || !data.tracks[swath.sid]) {
      corridor.style('display', 'none');
      circle.style('display', 'none');
      hit.style('display', 'none');
      currentSwath = null;
      return;
    }
    currentSwath = swath;

    const seq = computeHetaSequence(layerCtx);

    // Bahnpunkte für den kt-Tooltip projizieren (nur gültige = ohne Antimeridian-Clip).
    hetaPts = data.tracks[swath.sid]
      .map((p) => { const xy = geo.projection([p[0], p[1]]); return xy ? { wind: p[2], x: xy[0], y: xy[1] } : null; })
      .filter(Boolean);

    // Unsichtbare, breitere Hover-Bahn für den kt-Tooltip.
    const line = { type: 'LineString', coordinates: data.tracks[swath.sid].map((p) => [p[0], p[1]]) };
    hit.attr('d', geo.path(line)).style('display', null)
      .on('mousemove', onMove).on('mouseleave', onLeave);

    ensureReplayButton(state, seq);

    if (state.reducedMotion) {
      drawCorridor(seq, false);
      circle.style('display', 'none');
      // Ohne Uhr sofort beide Inseln „erreicht" + Track-Hover frei (deferred: keine Reentranz
      // während des synchronen Mount-Updates).
      Promise.resolve().then(() => bus.set({ hetaReached: { ASM: true, NIU: true }, hetaAnimDone: true }));
      return;
    }

    drawCorridor(seq, true);
    runClock(seq);
  }

  return {
    update(state, patch) {
      if (!patch || 'storyFx' in patch) render(state);
    },
    destroy() {
      stopClock();
      tip.remove();
      const btn = g.node().ownerSVGElement?.parentNode?.querySelector('.heta-replay');
      btn?.remove();
      gHover.remove();
      g.selectAll('*').remove();
    },
  };
}
