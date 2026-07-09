// "Methods & data": kompakter, ausklappbarer Abschluss der Seite - transparente
// Absicherung der Story. ALLE Zahlen kommen aus meta.json (window/unit/coverage/fits/
// sources/caveats), keine ist getippt; die Fit-Statistik nutzt fitLabel() aus format.js
// (dieselbe Formulierung wie die Trend-Annotation im Chart). meta.license_note und
// sources[].license werden bewusst NICHT gerendert (deutscher Kurs-/Lizenztext).
import { fitLabel } from '../core/format.js';

export function methodsHtml(meta) {
  const c = meta.coverage;
  const rows = [
    ['Time period', `${meta.window[0]}–${meta.window[1]}`],
    ['Unit of analysis', `${meta.unit} — ${c.rows} pairs from ${c.distinct_storms} storms`],
    ['Outcome', 'reported share of national population affected (EM-DAT affected ÷ UN WPP population)'],
    ['Predictor', 'maximum sustained wind (USA agency, kt; basin-lifetime peak, not wind at landfall)'],
    ['Model', `simple wind-only baseline — per capita: ${fitLabel(meta.fits.perCapita)} · absolute: ${fitLabel(meta.fits.absolute)}`],
    ['Data completeness', `${c.scatterable} of ${c.rows} pairs have both a measured wind and a reported impact`],
    ['Sources', meta.sources.map((s) => `${s.name} — ${s.provider}`).join(' · ')],
  ];
  return `
    <section class="section section--methods" id="methods">
      <div class="section-text">
        <details class="methods">
          <summary>Methods &amp; data</summary>
          <dl class="methods-grid">
            ${rows.map(([dt, dd]) => `<dt>${dt}</dt><dd>${dd}</dd>`).join('')}
          </dl>
          <ul class="methods-caveats">
            ${meta.caveats.map((cv) => `<li>${cv}</li>`).join('')}
          </ul>
          <p class="methods-note">Reported impacts are incomplete and shaped by reporting
            quality. This piece compares reported impact patterns against a simple wind-only
            baseline — it does not prove causal vulnerability. Impact figures are EM-DAT
            derivatives, used for educational purposes only.</p>
        </details>
      </div>
    </section>`;
}
