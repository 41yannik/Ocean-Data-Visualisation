// Lädt die gewählte Pipeline-Variante und baut die Indizes. Der Public-Build-Check
// entscheidet separat, ob eine Variante veröffentlicht werden darf.
import { feature } from 'topojson-client';

export function dataFilesForVariant(variant = 'kurs') {
  if (!['kurs', 'challenge'].includes(variant)) throw new Error(`Unknown data variant: ${variant}`);
  const suffix = variant === 'challenge' ? '.challenge' : '';
  return { events: `events${suffix}.json`, meta: `meta${suffix}.json` };
}

async function fetchJson(url) {
  let res;
  try {
    res = await fetch(url);
  } catch {
    throw new Error(missingMsg(url));
  }
  const text = await res.text();
  // Vite/Preview liefern bei fehlender Datei die index.html → "Antwort ist HTML"-Fall
  if (!res.ok || text.trimStart().startsWith('<')) throw new Error(missingMsg(url));
  return JSON.parse(text);
}

function missingMsg(url) {
  const variant = import.meta.env?.VITE_DATA_VARIANT || 'kurs';
  return [
    `Data file missing or invalid: ${url}`,
    '',
    `The ${variant} pipeline artifacts are missing. Generate them locally:`,
    `  python3 scripts/build_track_to_toll.py --variant ${variant}`,
  ].join('\n');
}

export async function loadData() {
  const variant = import.meta.env?.VITE_DATA_VARIANT || 'kurs';
  const files = dataFilesForVariant(variant);
  const base = `${import.meta.env.BASE_URL}data`;
  const [events, tracks, meta, sst, trends, world] = await Promise.all([
    fetchJson(`${base}/${files.events}`),
    fetchJson(`${base}/tracks.json`),
    fetchJson(`${base}/${files.meta}`),
    fetchJson(`${base}/sst.json`),
    fetchJson(`${base}/trends.json`),
    fetchJson(`${base}/land-110m.json`),
  ]);

  const land = feature(world, world.objects.land);
  const deployedCommit = import.meta.env?.VITE_COMMIT_SHA;
  if (deployedCommit && meta.build) {
    meta.build.gitCommit = deployedCommit;
    meta.build.gitDirty = false;
    meta.build.codeUrl = `https://github.com/41yannik/Ocean-Data-Visualisation/tree/${deployedCommit}`;
  }

  const bySid = new Map();
  const byId = new Map();
  for (const e of events) {
    byId.set(e.id, e);
    if (e.sid) {
      if (!bySid.has(e.sid)) bySid.set(e.sid, []);
      bySid.get(e.sid).push(e);
    }
  }

  return {
    data: {
      events,
      tracks,
      land,
      sst,
      trends,
      index: { bySid, byId, centroids: meta.centroids }, // Zentroide liegen in meta.json!
    },
    meta,
  };
}
