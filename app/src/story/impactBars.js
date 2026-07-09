// Vergleichsgrafik (Story-Hook, rechte Seite): der Kern-Kontrast dieses Abschnitts -
// ABSOLUTE Betroffene (hohe vertikale Balken, 33× auseinander) UND ihr BEVÖLKERUNGSANTEIL
// (kurze horizontale Balken darunter, fast gleich lang). So wird sichtbar: Rohzahlen und
// relative Betroffenheit erzählen unterschiedliche Geschichten - die Begründung für die
// spätere Normalisierung auf share of population affected.
// EREIGNISGESTEUERT: Balken wachsen erst, wenn der wandernde Windkreis die Insel erreicht
// (state.hetaReached[iso3]) - synchron zum Bubble-Pop. Hover spiegelt sich (hetaFocusIso3).
import { select, scaleLinear, easeCubicOut } from 'd3';
import { fmtInt, fmtPct } from '../core/format.js';
import { COUNTRY_LOOKUP } from '../map/countryNames.js';

const W = 360;
const H = 380; // kompakt (Review-Fix): beide Ebenen sollen zusammen sichtbar sein - die
               // Anteils-Pointe „41%≈38%" darf nicht unter die Falz rutschen.
// Absolute Balken (oben): kompakter, damit die relative Ebene gleichwertig Platz hat.
const ABS_TOP = 108;      // Oberkante der vertikalen Balken (Abstand zur Metrik-Caption)
const BASE_Y = 248;       // Grundlinie der vertikalen Balken
const BAR_W = 84;
const GAP = 60;
// Anteils-Ebene (unten): horizontale Balken, gemeinsame Skala 0–50 %.
const PCT_CAP_Y = 292;
const PCT_ROW0_Y = 310;
const PCT_ROW_H = 32;
const PCT_X0 = 118;       // linke Kante der horizontalen Balken (nach dem Inselnamen)
const PCT_BAR_H = 16;

export function createImpactBars(container, ctx) {
  const { byId } = ctx.data.index;
  const { bus } = ctx;

  const svg = select(container).append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('role', 'img');

  const bars = new Map(); // iso3 -> { rect, value, bh, pctRect, pctW, pctLabel, name, pctName, grown }

  const state0 = bus.get();
  const items = (state0.storyFx?.impactBubbles ?? [])
    .map((b) => byId.get(b.eventId))
    .filter((e) => e && e.affected != null)
    .sort((a, b) => b.affected - a.affected);

  if (items.length >= 2) {
    const vmax = items[0].affected;
    const ratio = Math.round(vmax / items[items.length - 1].affected);

    // Headline: nicht mehr nur die 33×-Differenz betonen - die Pointe ist der Widerspruch.
    svg.append('text').attr('class', 'ib-title')
      .attr('x', W / 2).attr('y', 24).attr('text-anchor', 'middle')
      .text('Raw counts differ.');
    svg.append('text').attr('class', 'ib-title-strong')
      .attr('x', W / 2).attr('y', 44).attr('text-anchor', 'middle')
      .text('Population share does not.');
    svg.append('text').attr('class', 'ib-sub')
      .attr('x', W / 2).attr('y', 62).attr('text-anchor', 'middle')
      .text(`${ratio}× apart in raw numbers — nearly the same as a share of people`);

    // ---- Ebene 1: absolute Betroffene (vertikale Balken) ----
    // Caption über der Wertzeile des höchsten Balkens (Wert sitzt bei ABS_TOP-10).
    svg.append('text').attr('class', 'ib-caption')
      .attr('x', W / 2).attr('y', 78).attr('text-anchor', 'middle')
      .text('Reported affected people');

    const innerH = BASE_Y - ABS_TOP;
    const y = scaleLinear().domain([0, vmax]).range([0, innerH]);
    const x0 = W / 2 - BAR_W - GAP / 2;

    // ---- Ebene 2: Bevölkerungsanteil (horizontale Balken, gemeinsame 0–50 %-Skala) ----
    svg.append('text').attr('class', 'ib-caption')
      .attr('x', W / 2).attr('y', PCT_CAP_Y).attr('text-anchor', 'middle')
      .text('Share of population affected');
    const pctX = scaleLinear().domain([0, 0.5]).range([0, W - PCT_X0 - 74]);

    items.forEach((e, i) => {
      const bx = x0 + i * (BAR_W + GAP);
      const bh = Math.max(2, y(e.affected));
      const rect = svg.append('rect').attr('class', 'impact-bar')
        .attr('x', bx).attr('width', BAR_W)
        .attr('y', BASE_Y).attr('height', 0);
      const value = svg.append('text').attr('class', 'ib-value')
        .attr('x', bx + BAR_W / 2).attr('y', BASE_Y - bh - 10)
        .attr('text-anchor', 'middle').attr('opacity', 0)
        .text(fmtInt(e.affected));
      svg.append('text').attr('class', 'ib-name')
        .attr('x', bx + BAR_W / 2).attr('y', BASE_Y + 18)
        .attr('text-anchor', 'middle')
        .text(COUNTRY_LOOKUP[e.iso3] ?? e.iso3);

      // Anteils-Zeile: Inselname links, horizontaler Balken, %-Label am Ende.
      const rowY = PCT_ROW0_Y + i * PCT_ROW_H;
      const pctName = svg.append('text').attr('class', 'ib-pct-name')
        .attr('x', PCT_X0 - 10).attr('y', rowY + PCT_BAR_H - 3).attr('text-anchor', 'end')
        .text(COUNTRY_LOOKUP[e.iso3] ?? e.iso3);
      const pctW = Math.max(1, pctX(e.affected_pc));
      const pctRect = svg.append('rect').attr('class', 'ib-pct-bar')
        .attr('x', PCT_X0).attr('y', rowY).attr('height', PCT_BAR_H)
        .attr('width', 0);
      const pctLabel = svg.append('text').attr('class', 'ib-pct-value')
        .attr('x', PCT_X0 + pctW + 6).attr('y', rowY + PCT_BAR_H - 3)
        .attr('opacity', 0)
        .text(fmtPct(e.affected_pc));

      // Unsichtbares Trefferfeld je Insel (vertikaler Balken + Anteilszeile) für stabiles Hover.
      svg.append('rect').attr('class', 'ib-hit')
        .attr('x', bx - GAP / 2).attr('width', BAR_W + GAP)
        .attr('y', ABS_TOP).attr('height', innerH + 8)
        .attr('fill', 'transparent')
        .on('mouseenter', () => bus.set({ hetaFocusIso3: e.iso3 }))
        .on('mouseleave', () => bus.set({ hetaFocusIso3: null }));

      bars.set(e.iso3, { rect, value, bh, pctRect, pctW, pctLabel, grown: false });
    });

    svg.append('line').attr('class', 'ib-base')
      .attr('x1', 28).attr('x2', W - 28)
      .attr('y1', BASE_Y).attr('y2', BASE_Y);
  }

  function grow(iso3, rm) {
    const b = bars.get(iso3);
    if (!b || b.grown) return;
    b.grown = true;
    const topY = BASE_Y - b.bh;
    if (rm) {
      b.rect.attr('y', topY).attr('height', b.bh);
      b.value.attr('opacity', 1);
      b.pctRect.attr('width', b.pctW);
      b.pctLabel.attr('opacity', 1);
      return;
    }
    b.rect.transition('ib-grow').duration(700).ease(easeCubicOut)
      .attr('y', topY).attr('height', b.bh);
    b.value.transition('ib-grow').delay(500).duration(300).attr('opacity', 1);
    b.pctRect.transition('ib-grow').duration(700).ease(easeCubicOut).attr('width', b.pctW);
    b.pctLabel.transition('ib-grow').delay(500).duration(300).attr('opacity', 1);
  }

  function reset(iso3) {
    const b = bars.get(iso3);
    if (!b) return;
    b.grown = false;
    b.rect.interrupt('ib-grow').attr('y', BASE_Y).attr('height', 0);
    b.value.interrupt('ib-grow').attr('opacity', 0);
    b.pctRect.interrupt('ib-grow').attr('width', 0);
    b.pctLabel.interrupt('ib-grow').attr('opacity', 0);
  }

  function applyReached(state) {
    const reached = state.hetaReached ?? {};
    for (const iso3 of bars.keys()) {
      if (reached[iso3]) grow(iso3, state.reducedMotion);
      else reset(iso3);
    }
  }

  function highlight(focus) {
    for (const [iso3, b] of bars) {
      const hl = focus === iso3;
      const dim = focus != null && focus !== iso3;
      b.rect.classed('hl', hl).classed('dim', dim);
      b.pctRect.classed('hl', hl).classed('dim', dim);
    }
  }

  return {
    update(state, patch) {
      if (!patch) { applyReached(state); highlight(state.hetaFocusIso3); return; }
      if ('hetaReached' in patch) applyReached(state);
      if ('hetaFocusIso3' in patch) highlight(state.hetaFocusIso3);
    },
    destroy() { svg.remove(); },
  };
}
