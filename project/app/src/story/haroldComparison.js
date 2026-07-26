// Vergleichsgrafik des Hook-Beats: zwei Land-Jahre, zwei Maßstäbe.
// Oben die absoluten Meldungen (fast gleich), unten derselbe Wert als Anteil an der
// Bevölkerung (dreifach verschieden). Genau dieser Sprung begründet, warum die Story
// ab hier pro Kopf zählt.
//
// Korrekturen aus dem Audit 2026-07:
//  - ALLE Zahlen kommen aus events.json (ctx.data.index.byId), keine Literale mehr.
//  - Die Anteils-Säulen laufen gegen 100 % der Bevölkerung, nicht gegen den Vanuatu-Wert.
//
// Korrekturen aus dem Review 2026-07-26:
//  - KEIN easeBackOut mehr auf den Anteils-Balken. Der Overshoot (1.15) trieb Vanuatus
//    83-%-Balken waehrend der Animation ueber die 100-%-Linie, also ueber die eigene
//    Bevoelkerung hinaus. Auf einer Skala mit hartem Maximum ist das ein falscher Wert,
//    nicht nur ein Effekt. Jetzt easeCubicOut: monoton, kein Ueberschwingen.
//  - Fussnote in der Grafik: "affected" ist der PDH-Jahreswert ueber alle Katastrophen,
//    nicht der Toll dieses einen Sturms. Die Sturm-Labels unter den Balken legten die
//    Sturm-Attribution nahe; der Hinweis stand nur im "How to read" ausserhalb der Figur.
//  - Panel 1 ist eigenstaendig lesbar (Laender-Labels + Grundlinie), statt seine
//    Identitaet nur ueber die Spaltenflucht zum 250 px entfernten Panel 2 zu beziehen.
//  - Balken schlanker, Fuss eckig an der Grundlinie / nur die Datenkante gerundet,
//    Achsenlinien solide statt gestrichelt (dataviz: marks-and-anatomy, anti-patterns).
//  - Hover koppelt beide Panels: ein Land hervorheben zeigt seine Rohzahl UND seinen
//    Anteil gleichzeitig - die Kernaussage des Beats wird dadurch anfassbar.
import { select, easeCubicOut } from 'd3';
import { fmtPct } from '../core/format.js';

const IDS = ['VUT-2020', 'FJI-2020'];

// Balken mit gerundeter Datenkante und eckigem Fuss an der Grundlinie: der Balken
// sitzt sichtbar auf der Achse, statt wie eine Pille frei zu schweben.
function barPath(x, y, w, h, r) {
  if (h <= 0.5) return `M ${x} ${y + h} L ${x + w} ${y + h}`;
  const rr = Math.min(r, h, w / 2);
  return `M ${x} ${y + h} L ${x} ${y + rr} Q ${x} ${y} ${x + rr} ${y} `
    + `L ${x + w - rr} ${y} Q ${x + w} ${y} ${x + w} ${y + rr} L ${x + w} ${y + h} Z`;
}

export function createHaroldComparison(container, ctx) {
  const { bus, data } = ctx;
  const reducedMotion = bus?.get?.().reducedMotion ?? false;

  const rows = IDS.map((id) => data.index.byId.get(id)).filter(Boolean);
  if (rows.length < 2) return { update() {}, destroy() {} };

  // ---- Layout-Konstanten ----
  const W = 340;
  const H = 480;
  const maxCount = Math.max(...rows.map((e) => e.affected));
  const ratio = rows[0].affected_pc / rows[1].affected_pc;
  const countRatio = rows[0].affected / rows[1].affected;

  const svg = select(container).append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('class', 'harold-comparison-svg')
    .attr('role', 'img')
    .attr('aria-label', `Two panels for ${rows[0].country} and ${rows[1].country} in 2020: `
      + `almost equal absolute counts (${rows[0].affected.toLocaleString('en-US')} and `
      + `${rows[1].affected.toLocaleString('en-US')} people), but ${fmtPct(rows[0].affected_pc)} `
      + `versus ${fmtPct(rows[1].affected_pc)} of the population`);

  // ========== Gemeinsame Spalten-Positionen ==========
  // Beide Panels nutzen exakt dieselben X-Positionen: so steht Vanuatus Absolut-Balken
  // direkt ueber seinem Prozent-Balken. Schlanker als zuvor (48 statt 62 px) - die
  // Aussage steckt in der Hoehe, breite Bloecke tragen nur Gewicht.
  const colW = 48;
  const colGap = 26;
  const pairW = colW * 2 + colGap;
  const pairX0 = (W - pairW) / 2;
  const xs = [pairX0 + colW / 2, pairX0 + colW + colGap + colW / 2];

  // Wachstums-Animation ohne Ueberschwingen: der Balken erreicht seinen Wert und
  // bleibt dort. Auf der 100-%-Skala unten ist das keine Geschmacksfrage.
  function growBar(sel, x0, w, base, targetH, delay) {
    if (reducedMotion) {
      sel.attr('d', barPath(x0, base - targetH, w, targetH, 4));
      return;
    }
    sel.attr('d', barPath(x0, base, w, 0, 4))
      .transition().duration(780).delay(delay).ease(easeCubicOut)
      .attrTween('d', () => (t) => barPath(x0, base - targetH * t, w, targetH * t, 4));
  }

  // Hover koppelt die Panels ueber das Land, nicht ueber das einzelne Rechteck.
  function setFocus(idx) {
    svg.selectAll('.hc-bar-fill').each(function () {
      const el = select(this);
      const own = +el.attr('data-idx');
      el.classed('hc-bar--hl', idx != null && own === idx)
        .classed('hc-bar--dim', idx != null && own !== idx);
    });
    svg.selectAll('.hc-col-label').each(function () {
      const el = select(this);
      el.classed('hc-col-label--dim', idx != null && +el.attr('data-idx') !== idx);
    });
  }

  // ===================================================================
  // PANEL 1 - Absolute Betroffene (de-emphasised: kompakt, kleine Balken)
  // ===================================================================
  const p1TitleY = 20;
  const p1SubY = 38;
  const p1AnnY = 59;                             // "nearly 1x the count"
  const p1BracketY = 70;
  const p1MaxH = 46;
  // +34 statt +30: bei voller Balkenhoehe sass die Zahl sonst nur 1.8 px unter den
  // Klammer-Beinen (gemessen per getBBox), was optisch als Beruehrung liest.
  const p1Base = p1BracketY + 34 + p1MaxH;       // Grundlinie der Abs-Balken

  svg.append('text').attr('class', 'hc-main-title')
    .attr('x', W / 2).attr('y', p1TitleY).attr('text-anchor', 'middle')
    .text('Same year, same near-equal counts');
  svg.append('text').attr('class', 'hc-section-subtitle')
    .attr('x', W / 2).attr('y', p1SubY).attr('text-anchor', 'middle')
    .text('People reported affected in 2020');

  // Verhaeltnis-Klammer oben - direktes Gegenstueck zur Klammer unten. Dieselbe
  // Form, dieselbe Einheit, damit "nearly 1x" gegen "3x" unmittelbar liest.
  svg.append('path').attr('class', 'hc-bracket')
    .attr('d', `M ${xs[0]} ${p1BracketY + 7} L ${xs[0]} ${p1BracketY} `
             + `L ${xs[1]} ${p1BracketY} L ${xs[1]} ${p1BracketY + 7}`);
  svg.append('text').attr('class', 'hc-annotation')
    .attr('x', W / 2).attr('y', p1AnnY).attr('text-anchor', 'middle')
    .text(`${countRatio < 1.1 ? 'nearly 1' : countRatio.toFixed(1)}× the count`);

  // Grundlinie: verankert die Balken sichtbar, statt sie schweben zu lassen.
  svg.append('line').attr('class', 'hc-axis-tick')
    .attr('x1', pairX0 - 6).attr('x2', pairX0 + pairW + 6)
    .attr('y1', p1Base).attr('y2', p1Base);

  rows.forEach((e, i) => {
    const x = xs[i];
    const h1 = (e.affected / maxCount) * p1MaxH;
    svg.append('text').attr('class', 'hc-bar-value')
      .attr('x', x).attr('y', p1Base - h1 - 8).attr('text-anchor', 'middle')
      .text(e.affected.toLocaleString('en-US'));

    const bar1 = svg.append('path').attr('class', 'hc-bar-fill hc-bar-count-mark')
      .attr('data-idx', i).attr('fill', 'var(--point)');
    growBar(bar1, x - colW / 2, colW, p1Base, h1, i * 140);

    // Panel 1 traegt seine eigenen Laender-Labels: bisher war die einzige Bruecke
    // zur Identitaet die Spaltenflucht zu Panel 2, ~250 px weiter unten.
    svg.append('text').attr('class', 'hc-col-label hc-col-label--sm')
      .attr('data-idx', i)
      .attr('x', x).attr('y', p1Base + 15).attr('text-anchor', 'middle')
      .text(e.country);

    svg.append('rect').attr('class', 'hc-hitarea')
      .attr('x', x - colW / 2 - 6).attr('y', p1Base - p1MaxH - 22)
      .attr('width', colW + 12).attr('height', p1MaxH + 40)
      .on('mouseenter', () => { showTip(e, x, p1Base - h1, 'count'); setFocus(i); })
      .on('mouseleave', () => { hideTip(); setFocus(null); });
  });

  // Trennlinie + Ueberleitung ──────────────────────────────────────
  const divY = p1Base + 33;
  svg.append('line').attr('class', 'hc-divider')
    .attr('x1', pairX0 - 10).attr('x2', pairX0 + pairW + 10)
    .attr('y1', divY).attr('y2', divY);
  svg.append('text').attr('class', 'hc-section-subtitle')
    .attr('x', W / 2).attr('y', divY + 19).attr('text-anchor', 'middle')
    .text('The same counts as a share of population');

  // ===================================================================
  // PANEL 2 - Prozentuale Betroffenheit (HELD: gross, farbstark)
  // ===================================================================
  const p2AnnY = divY + 49;
  const bracketY = p2AnnY + 9;
  const p2MaxH = 150;
  const p2Base = bracketY + 20 + p2MaxH;          // Grundlinie der %-Balken

  // Verhaeltnis-Klammer ────────────────────────────────────────
  const bPath = svg.append('path').attr('class', 'hc-bracket hc-bracket--highlight')
    .attr('d', `M ${xs[0]} ${bracketY + 7} L ${xs[0]} ${bracketY} `
             + `L ${xs[1]} ${bracketY} L ${xs[1]} ${bracketY + 7}`);
  const bLabel = svg.append('text').attr('class', 'hc-annotation hc-annotation--highlight')
    .attr('x', W / 2).attr('y', p2AnnY).attr('text-anchor', 'middle')
    .text(`${Math.round(ratio)}× the share`);
  if (!reducedMotion) {
    bPath.attr('opacity', 0).transition('hc-br').delay(1000).duration(350).attr('opacity', 1);
    bLabel.attr('opacity', 0).transition('hc-bl').delay(1100).duration(350).attr('opacity', 1);
  }

  // 100-%-Achse: solide Hairline statt gestrichelt (gestrichelt liest als Schwelle
  // oder Projektion, hier ist es schlicht das Maximum der Skala).
  svg.append('text').attr('class', 'hc-axis-label')
    .attr('x', pairX0 - 9).attr('y', p2Base - p2MaxH + 4)
    .attr('text-anchor', 'end').text('100 %');
  svg.append('text').attr('class', 'hc-axis-label hc-axis-label--sub')
    .attr('x', pairX0 - 9).attr('y', p2Base - p2MaxH + 18)
    .attr('text-anchor', 'end').text('of population');
  svg.append('line').attr('class', 'hc-axis-tick')
    .attr('x1', pairX0 - 4).attr('x2', pairX0 + pairW + 4)
    .attr('y1', p2Base - p2MaxH).attr('y2', p2Base - p2MaxH);
  // Grundlinie (0 %)
  svg.append('line').attr('class', 'hc-axis-tick')
    .attr('x1', pairX0 - 4).attr('x2', pairX0 + pairW + 4)
    .attr('y1', p2Base).attr('y2', p2Base);

  // Tooltip ────────────────────────────────────────────────────
  const tooltip = svg.append('g').attr('class', 'hc-tooltip').attr('opacity', 0);
  const ttBg = tooltip.append('rect').attr('class', 'hc-tooltip-bg').attr('rx', 6);
  const ttL1 = tooltip.append('text').attr('class', 'hc-tooltip-text');
  const ttL2 = tooltip.append('text').attr('class', 'hc-tooltip-text hc-tooltip-text--sub');

  function showTip(e, x, barTop, mode) {
    const pop = e.pop != null ? e.pop.toLocaleString('en-US') : '?';
    if (mode === 'count') {
      ttL1.text(`${e.affected.toLocaleString('en-US')} reported affected`);
      ttL2.text(`${e.country} · population ${pop}`);
    } else {
      ttL1.text(`${e.affected.toLocaleString('en-US')} of ${pop}`);
      ttL2.text(`= ${fmtPct(e.affected_pc)} of population`);
    }
    const tw = Math.max(ttL1.node().getBBox().width, ttL2.node().getBBox().width) + 20;
    const th = 42;
    let tx = x - tw / 2;
    if (tx < 4) tx = 4;
    if (tx + tw > W - 4) tx = W - tw - 4;
    const ty = barTop - th - 8;
    ttBg.attr('x', tx).attr('y', ty).attr('width', tw).attr('height', th);
    ttL1.attr('x', tx + 10).attr('y', ty + 17);
    ttL2.attr('x', tx + 10).attr('y', ty + 33);
    tooltip.raise().transition('tt').duration(120).attr('opacity', 1);
  }
  function hideTip() { tooltip.transition('tt').duration(180).attr('opacity', 0); }

  // %-Balken rendern ──────────────────────────────────────────
  rows.forEach((e, i) => {
    const x = xs[i];
    // Hintergrund-Track (= 100 %). Heller Schritt derselben Farbe statt neutralem
    // Grau: so liest der ganze Balken als eine Groesse - Bevoelkerung, davon betroffen.
    svg.append('rect').attr('class', 'hc-bar-bg')
      .attr('x', x - colW / 2).attr('y', p2Base - p2MaxH)
      .attr('width', colW).attr('height', p2MaxH).attr('rx', 4);

    const h2 = e.affected_pc * p2MaxH;
    const bar2 = svg.append('path').attr('class', 'hc-bar-fill hc-bar-pct')
      .attr('data-idx', i).attr('fill', 'var(--accent)');
    growBar(bar2, x - colW / 2, colW, p2Base, h2, 250 + i * 190);

    // Wertlabel adaptiv: bei hohen Anteilen bleibt zwischen Balkenkante und der
    // 100-%-Linie kein Platz (bei Vanuatus 83 % noch 25 px fuer 23 px Text), also
    // wandert das Label in den Balken und wechselt auf die Farbe fuer Fuellungen.
    // Nichts wird geclippt, und die Zahl klebt nicht an der Achse.
    const labelInside = (p2MaxH - h2) < 30;
    svg.append('text')
      .attr('class', `hc-bar-value hc-bar-value--pct${labelInside ? ' hc-bar-value--inside' : ''}`)
      .attr('x', x).attr('y', labelInside ? p2Base - h2 + 22 : p2Base - h2 - 7)
      .attr('text-anchor', 'middle')
      .text(fmtPct(e.affected_pc));

    // Unsichtbare Hover-Flaeche ueber dem gesamten %-Balken (incl. Track)
    svg.append('rect').attr('class', 'hc-hitarea')
      .attr('x', x - colW / 2 - 6).attr('y', p2Base - p2MaxH - 24)
      .attr('width', colW + 12).attr('height', p2MaxH + 24)
      .on('mouseenter', () => { showTip(e, x, p2Base - h2, 'pct'); setFocus(i); })
      .on('mouseleave', () => { hideTip(); setFocus(null); });

    // Land + Sturm-Label
    svg.append('text').attr('class', 'hc-col-label')
      .attr('data-idx', i)
      .attr('x', x).attr('y', p2Base + 18).attr('text-anchor', 'middle')
      .text(e.country);
    svg.append('text').attr('class', 'hc-bar-count')
      .attr('x', x).attr('y', p2Base + 34).attr('text-anchor', 'middle')
      .text(`${e.name ?? 'storm'} · ${Math.round(e.intensity_kt)} kt`);
  });

  // Attributions-Fussnote ─────────────────────────────────────
  // Ohne sie liest die Figur allein so, als sei der genannte Sturm die Ursache der
  // 83 % bzw. 26 %. Die Quelle (PDH SDG 11.5.1) meldet Jahreswerte ueber alle
  // Katastrophen; der Sturm ist das Ereignis des Jahres, nicht der ausgewiesene Toll.
  svg.append('text').attr('class', 'hc-footnote')
    .attr('x', W / 2).attr('y', p2Base + 54).attr('text-anchor', 'middle')
    .text('Affected = 2020 annual total, all disasters');

  return {
    update() {},
    destroy() { svg.remove(); },
  };
}
