// Lädt die zur Build-Zeit erzeugten App-Daten (statisch, kein Backend).
const BASE = import.meta.env.BASE_URL; // dev & GitHub-Pages identisch

export async function loadData() {
  const [records, meta] = await Promise.all([
    fetch(`${BASE}data/ocean.json`).then((r) => r.json()),
    fetch(`${BASE}data/meta.json`).then((r) => r.json()),
  ]);
  // Schnellzugriff Land→Region etc.
  const byIso = new Map(meta.countries.map((c) => [c.iso3, c]));
  return { records, meta, byIso };
}
