import { readFile } from 'node:fs/promises';
import process from 'node:process';

const variant = process.env.VITE_DATA_VARIANT || 'challenge';
if (!['kurs', 'challenge'].includes(variant)) throw new Error(`Unknown VITE_DATA_VARIANT=${variant}`);
const suffix = variant === 'challenge' ? '.challenge' : '';
const meta = JSON.parse(await readFile(new URL(`../public/data/meta${suffix}.json`, import.meta.url)));
const events = JSON.parse(await readFile(new URL(`../public/data/events${suffix}.json`, import.meta.url)));

const fail = (message) => {
  throw new Error(`PUBLICATION GATE: ${message}`);
};

if (!['open', 'permissioned'].includes(meta.publication?.status)) {
  fail(`${variant} has publication.status=${meta.publication?.status ?? 'missing'}`);
}
if (!meta.publication.publicBuild) fail(`${variant} is not marked publicBuild=true`);
if (!meta.publication.checked || !meta.publication.evidenceRef) fail('publication evidence metadata is incomplete');
if (!meta.analysis?.outcome?.available || !meta.fits?.perCapita) {
  fail(`${variant} has no complete public outcome model for the impact story`);
}

const unresolved = meta.sources.filter((source) => source.verification !== 'verified');
if (unresolved.length) {
  fail(`source verification pending: ${unresolved.map((source) => `${source.id}:${source.verification}`).join(', ')}`);
}

const allowed = new Set(meta.publication.allowedDownloads || []);
for (const artifact of meta.artifacts || []) {
  if (artifact.downloadable && !allowed.has(artifact.file)) fail(`download not allowed: ${artifact.file}`);
}

if (meta.publication.status === 'open') {
  const restrictedFields = new Set([
    'disno', 'affected', 'affected_pc', 'deaths', 'damage_kusd', 'damage_adj_kusd',
    'magnitude', 'residual_abs', 'residual_pc', 'intensity_source',
  ]);
  for (const event of events) {
    const leaked = Object.keys(event).filter((key) => restrictedFields.has(key));
    if (leaked.length) fail(`restricted fields in ${event.id}: ${leaked.join(', ')}`);
  }
  if (JSON.stringify(meta).includes('EM-DAT')) fail('open metadata contains restricted-source text');
}

console.log(`Publication gate passed: ${variant} (${meta.publication.status})`);
