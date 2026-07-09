// Lädt alle Pipeline-JSONs, baut die Indizes - wirft mit klarer Anleitung, wenn die
// (gitignorten!) EM-DAT-Derivate fehlen.
import { feature } from 'topojson-client';

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
  return [
    `Data file missing or invalid: ${url}`,
    '',
    'events.json/meta.json are EM-DAT derivatives and intentionally not in the repo (license).',
    'Generate them once locally:',
    '  python3 scripts/build_track_to_toll.py --variant kurs',
  ].join('\n');
}

export async function loadData() {
  const base = `${import.meta.env.BASE_URL}data`;
  const [events, tracks, meta, sst, trends, world] = await Promise.all([
    fetchJson(`${base}/events.json`),
    fetchJson(`${base}/tracks.json`),
    fetchJson(`${base}/meta.json`),
    fetchJson(`${base}/sst.json`),
    fetchJson(`${base}/trends.json`),
    fetchJson(`${base}/land-110m.json`),
  ]);

  const land = feature(world, world.objects.land);

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
