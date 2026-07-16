// Sichtbarer, gestufter Abschluss der Story. Messwerte, Formeln, Quellen und
// Freigabestatus kommen aus meta.json; hier liegt nur die laienfreundliche Redaktion.
import { SECTIONS } from './sections.js';

const DATA_BASE = import.meta.env?.BASE_URL ?? './';

const esc = (value) => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;');

const link = (href, label, className = '') => (
  `<a${className ? ` class="${className}"` : ''} href="${esc(href)}" target="_blank" rel="noreferrer">${esc(label)}</a>`
);

const sourceNames = (meta, ids) => {
  const byId = new Map(meta.sources.map((source) => [source.id, source.shortName]));
  return ids.map((id) => byId.get(id)).filter(Boolean).join(' · ');
};

const r2Words = (meta) => {
  const r2 = meta.fits?.perCapita?.r2;
  if (r2 == null) return 'No public impact model is available in this build.';
  const percent = (r2 * 100).toFixed(1).replace('.0', '');
  return `Wind accounts for about ${percent}% of the observed differences in reported affected share.`;
};

export const METHOD_CATALOG = [
  {
    id: 'sst', title: 'A warming ocean',
    dataUsed: (m) => sourceNames(m, ['pdh-sst']),
    calculated: (m) => `For every year from ${m.analysis.sst.yearMin} to ${m.analysis.sst.yearMax}, the pipeline takes an ${m.analysis.sst.aggregation} across ${m.analysis.sst.placeCount} Pacific places.`,
    seen: 'One stripe and one point on the line represent the same annual anomaly.',
    limit: 'This is a place-average of already published anomalies, not an ocean-area-weighted Pacific temperature.',
  },
  {
    id: 'storm-trend', title: 'Not more storms, not stronger',
    dataUsed: (m) => sourceNames(m, ['ibtracs']),
    calculated: (m) => `The full SP and WP record keeps storms at or above ${m.analysis.stormTrend.thresholdKt} kt, then counts storms and averages lifetime peak wind for each season from ${m.analysis.stormTrend.yearMin} to ${m.analysis.stormTrend.yearMax}. Straight trend lines are fitted against season.`,
    seen: 'The upper panel shows annual storm counts; the lower panel shows average lifetime peak wind.',
    limit: 'A flat trend in this window does not show that ocean warming has no effect on cyclone physics. It only describes these two basin-wide measures.',
  },
  {
    id: 'heta', title: 'Heta: one storm, two scales',
    dataUsed: (m) => sourceNames(m, ['ibtracs', 'emdat', 'wpp', 'natural-earth']),
    calculated: (m) => `Heta's track is surrounded by a ${m.analysis.storyEvidence.heta.radiusKm} km gale-wind corridor. The radius is the median largest R34 quadrant across ${m.analysis.storyEvidence.heta.validRadiusTimes} valid IBTrACS times. Reported people affected are also divided by each island's population.`,
    seen: 'Circle and bar area encode reported people; the second bar scale shows each toll as a population share.',
    limit: 'Being inside the gale-wind corridor does not mean both islands experienced the same local wind. The comparison changes the denominator, not the event.',
  },
  {
    id: 'scatter', title: 'The wind-only baseline',
    dataUsed: (m) => sourceNames(m, ['ibtracs', 'emdat', 'wpp']),
    calculated: (m) => `${m.analysis.join.matchedRows} of ${m.analysis.join.totalRows} storm-country records matched by ${m.analysis.join.rule}. The chart fits ${m.analysis.model.perCapitaFormula}. ${r2Words(m)}`,
    seen: 'Right means stronger lifetime peak wind. Higher means a larger reported affected share. The dashed line is the fitted average relationship.',
    limit: 'Rows from the same storm share one peak wind and are not independent. The line is descriptive and does not identify causal vulnerability.',
  },
  {
    id: 'pam', title: 'Pam: track, wind field and reported outcomes',
    dataUsed: (m) => sourceNames(m, ['ibtracs', 'emdat', 'wpp', 'ifrc-pam', 'wmo-pam', 'natural-earth']),
    calculated: (m) => `The pipeline selects ${m.analysis.storyEvidence.pam.windFields.length} documented R34 observations and Pam's ${m.analysis.storyEvidence.pam.peakWindKt} kt lifetime peak. Country totals are normalised by population. Representative country markers and mechanism notes are editorial annotations tied to IFRC and WMO sources.`,
    seen: "The orange path is Pam's track; pale shapes are observed gale-force extents; blue points are country records, not local wind measurements.",
    limit: "Some country records include remote swell, flooding or another weather system. They must not be read as equal exposure to Pam's core.",
  },
  {
    id: 'repeat-victims', title: 'Repeat outcomes above the line',
    dataUsed: (m) => sourceNames(m, ['ibtracs', 'emdat', 'wpp']),
    calculated: (m) => `For each complete record, the residual is ${m.analysis.model.residual}. The highlighted records are one country's positive residuals.`,
    seen: 'A stem connects each highlighted dot to the toll predicted by the wind-only line.',
    limit: 'A positive residual is an unexplained difference, not a direct measurement of vulnerability, exposure or preparedness.',
  },
  {
    id: 'country-residuals', title: 'Country rows',
    dataUsed: (m) => sourceNames(m, ['ibtracs', 'emdat', 'wpp']),
    calculated: (m) => `The same residuals from ${m.fits.perCapita.n} complete records are regrouped by country without refitting the model.`,
    seen: 'Dots to the right had a larger reported toll than the line predicts; dots to the left had a smaller one.',
    limit: 'Countries with few complete records are folded into “Other”, and medians do not remove differences in reporting quality.',
  },
  {
    id: 'subregions', title: 'Subregion rows',
    dataUsed: (m) => sourceNames(m, ['ibtracs', 'emdat', 'wpp']),
    calculated: (m) => `The same ${m.fits.perCapita.n} residuals are regrouped into Melanesia, Micronesia and Polynesia; the model is not refitted.`,
    seen: 'Each row shows every record and a short median marker for that subregion.',
    limit: 'Regional aggregation can hide opposite country-level patterns. It should not be used to assign a single regional fate.',
  },
  {
    id: 'completeness', title: 'What the records contain',
    dataUsed: (m) => sourceNames(m, ['ibtracs', 'emdat']),
    calculated: (m) => `The pipeline classifies all ${m.coverage.rows} storm-country pairs by whether wind and reported impact are both present. ${m.coverage.scatterable} records enter the wind-impact model.`,
    seen: 'Filled, hollow, half-filled and dashed circles keep different kinds of missingness visible.',
    limit: 'Missing impact is unknown, not zero. Recent records and reconstructed fallback wind carry additional uncertainty.',
  },
  {
    id: 'conclusion', title: 'Ranking wind against impact',
    dataUsed: (m) => sourceNames(m, ['ibtracs', 'emdat', 'wpp']),
    calculated: (m) => `The same ${m.fits.perCapita.n} complete records are independently ordered by lifetime peak wind and reported affected share. No new model is fitted.`,
    seen: 'The lists show the high ends of both measures; the paired columns keep every record visible while the order changes.',
    limit: 'A rank mismatch shows that the measures order events differently. It cannot reveal which social condition caused an outcome.',
  },
  {
    id: 'explore', title: 'Evidence Lab',
    dataUsed: (m) => sourceNames(m, ['ibtracs', 'emdat', 'wpp', 'natural-earth']),
    calculated: (m) => `All views reuse the same storm-country table, shared filters and selection. Residuals come from ${m.analysis.model.perCapitaFormula}; map hot zones aggregate sampled track points into fixed geographic cells.`,
    seen: 'Outliers, country rows, recurrence marks and map layers are linked views of the same filtered records.',
    limit: 'Filtering changes the visible subset but does not refit the baseline. Country circles use representative centroids, not exact impact footprints.',
  },
];

const methodById = new Map(METHOD_CATALOG.map((method) => [method.id, method]));

function sourceCard(source) {
  return `<article class="methods-source" id="source-${esc(source.id)}">
    <p class="methods-source__role">Used for ${esc(source.usedFor)}</p>
    <h4>${esc(source.shortName)}</h4>
    <p>${esc(source.provider)}</p>
    <dl>
      <div><dt>Version</dt><dd>${esc(source.version)}</dd></div>
      <div><dt>Subset</dt><dd>${esc(source.subset)}</dd></div>
      <div><dt>Period</dt><dd>${esc(source.period)}</dd></div>
      <div><dt>Accessed</dt><dd>${esc(source.accessed)}</dd></div>
      <div><dt>Licence</dt><dd>${link(source.license.url, source.license.name)}</dd></div>
    </dl>
    <details class="methods-source__fields"><summary>Fields used</summary><p>${source.fields.map((field) => `<code>${esc(field)}</code>`).join(' ')}</p></details>
    <p class="methods-source__links">${link(source.url, 'Official source')} ${link(source.citationUrl, 'Citation')}</p>
  </article>`;
}

function trailHtml(meta) {
  const sourceNodes = meta.sources
    .filter((source) => ['ibtracs', 'wpp', 'pdh-sst', 'emdat', 'natural-earth'].includes(source.id))
    .map((source) => `<a href="#source-${esc(source.id)}">${esc(source.shortName)}</a>`).join('');
  const processNodes = meta.transformations
    .map((step) => `<span>${esc(step.title)}</span>`).join('');
  return `<div class="methods-trail" aria-label="Data trail from sources through processing to the visual story">
    <div class="methods-trail__column"><p>Sources</p>${sourceNodes}</div>
    <span class="methods-trail__arrow" aria-hidden="true">→</span>
    <div class="methods-trail__column"><p>Processing</p>${processNodes}</div>
    <span class="methods-trail__arrow" aria-hidden="true">→</span>
    <div class="methods-trail__column methods-trail__column--outputs"><p>Outputs</p><span>Story chapters</span><span>Evidence Lab</span><span>Documented data files</span></div>
  </div>`;
}

function methodCard(meta, section) {
  const method = methodById.get(section.methodId);
  if (!method) return '';
  return `<article class="method-card" id="method-${esc(method.id)}" tabindex="-1">
    <p class="method-card__chapter">Chapter ${section.step + 1}</p>
    <h4>${esc(method.title)}</h4>
    <dl>
      <div><dt>Data used</dt><dd>${esc(method.dataUsed(meta))}</dd></div>
      <div><dt>What we calculated</dt><dd>${esc(method.calculated(meta))}</dd></div>
      <div><dt>What you see</dt><dd>${esc(method.seen)}</dd></div>
      <div><dt>What it does not prove</dt><dd>${esc(method.limit)}</dd></div>
    </dl>
  </article>`;
}

function artifactLink(artifact) {
  const kb = Math.max(1, Math.round(artifact.bytes / 1024));
  return `<li><a href="${esc(`${DATA_BASE}data/${artifact.file}`)}" download>${esc(artifact.name)}</a><span>${esc(artifact.format)} · ${kb} KB</span><code>SHA-256 ${esc(artifact.sha256)}</code></li>`;
}

function disclosure(title, intro, body, id, open = false) {
  return `<details class="methods-block" id="${id}"${open ? ' open' : ''}>
    <summary><span>${esc(title)}</span><small>${esc(intro)}</small></summary>
    <div class="methods-block__body">${body}</div>
  </details>`;
}

export function methodsHtml(meta) {
  const c = meta.coverage;
  const outcomeAvailable = meta.analysis?.outcome?.available && c.scatterable != null;
  const availableSourceIds = new Set(meta.sources.map((source) => source.id));
  const availableSections = SECTIONS.filter((section) =>
    section.sourceIds.every((sourceId) => availableSourceIds.has(sourceId)));
  const publication = meta.publication;
  const statusLabel = publication.status === 'permissioned' || publication.status === 'open'
    ? 'Publication cleared' : 'Publication gate active';
  const facts = outcomeAvailable ? [
    ['Time window', `${meta.window[0]}–${meta.window[1]}`],
    ['Unit', `${c.rows} storm-country pairs from ${c.distinct_storms} storms`],
    ['Complete records', `${c.scatterable} of ${c.rows}`],
    ['Wind-only result', r2Words(meta)],
  ] : [
    ['Time window', `${meta.window[0]}–${meta.window[1]}`],
    ['Build', 'Open-data placeholder'],
    ['Outcome', 'Not selected'],
    ['Status', 'Not publishable as the impact story'],
  ];

  const sourceBody = `<div class="methods-source-grid">${meta.sources.map(sourceCard).join('')}</div>`;
  const processBody = `${trailHtml(meta)}<ol class="methods-steps">${meta.transformations.map((step) =>
    `<li><h4>${esc(step.title)}</h4><p>${esc(step.summary)}</p><p>Sources: ${esc(sourceNames(meta, step.sourceIds))}</p></li>`).join('')}</ol>`;
  const visualBody = availableSections.length
    ? `<div class="method-card-grid">${availableSections.map((section) => methodCard(meta, section)).join('')}</div>`
    : '<p>This build has no complete public impact methods yet.</p>';
  const caveatBody = `<ul class="methods-limit-list">${meta.caveats.map((caveat) => `<li>${esc(caveat)}</li>`).join('')}</ul>
    <p class="methods-plain-note">This project compares reported patterns with a simple wind-only baseline. It does not prove why one community suffered more than another.</p>`;
  const downloads = meta.artifacts.filter((artifact) => artifact.downloadable);
  const commit = meta.build.gitCommit;
  const reproduceBody = `<div class="methods-reproduce">
    <div><h4>Run the pipeline</h4><code>${esc(meta.build.command)}</code><p>Generated ${esc(meta.build.generated)}${meta.build.gitDirty ? ' from a working tree with uncommitted changes' : ''}.</p></div>
    <div><h4>Inspect the code</h4><p>${link(meta.build.codeUrl, commit ? `Commit ${commit.slice(0, 8)}` : 'Repository')}</p><p>Pipeline schema ${esc(meta.build.pipelineVersion)}</p></div>
  </div>
  ${downloads.length ? `<ul class="methods-downloads">${downloads.map(artifactLink).join('')}</ul>` : '<p>No processed downloads are cleared for this build.</p>'}`;

  return `<section class="section section--methods" id="methods" aria-labelledby="methods-summary-title">
    <details class="methods-root" id="methods-root">
      <summary id="methods-summary-title">Data &amp; methods</summary>
      <div class="methods-shell">
        <p class="methods-intro">Where the records came from, how they became the charts, and where this analysis stops.</p>
        <dl class="methods-facts">${facts.map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>
        <aside class="methods-publication methods-publication--${esc(publication.status)}" aria-label="Publication status">
          <strong>${statusLabel}</strong><p>${esc(publication.note)}</p><span>Checked ${esc(publication.checked)}</span>
        </aside>
        <div class="methods-disclosures">
          ${disclosure('Where the data comes from', `${meta.sources.length} documented sources`, sourceBody, 'methods-sources')}
          ${disclosure('How the data became the charts', `${meta.transformations.length} reproducible steps`, processBody, 'methods-process')}
          ${disclosure('How each visual was built', `${availableSections.length} chapter methods`, visualBody, 'methods-visuals')}
          ${disclosure('What the data cannot tell us', `${meta.caveats.length} limits kept visible`, caveatBody, 'methods-limits')}
          ${disclosure('Reproduce this analysis', `${downloads.length} cleared downloads`, reproduceBody, 'methods-reproduce')}
        </div>
      </div>
    </details>
  </section>`;
}

export function wireMethodsSection(root = document) {
  const revealTarget = (hash) => {
    if (!hash?.startsWith('#method-')) return false;
    const target = root.querySelector(hash);
    if (!target) return false;
    for (let parent = target.closest('details'); parent; parent = parent.parentElement?.closest('details')) {
      parent.open = true;
    }
    requestAnimationFrame(() => {
      target.scrollIntoView({ block: 'center', behavior: 'smooth' });
      target.focus({ preventScroll: true });
    });
    return true;
  };
  root.addEventListener('click', (event) => {
    const anchor = event.target.closest('.source-method-link');
    if (!anchor || !revealTarget(anchor.hash)) return;
    event.preventDefault();
    history.replaceState(null, '', anchor.hash);
  });
  if (location.hash.startsWith('#method-')) revealTarget(location.hash);
}
