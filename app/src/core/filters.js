// Gemeinsame Filter-/Sichtbarkeits-Prädikate (Lücke L6) — pure Funktionen.
// Format: yearRange inklusiv; categories: null | number[]; countries: null | string[] (iso3).
// Events mit category: null fallen bei aktivem Kategorie-Filter heraus (dokumentiertes Verhalten).

export function matchesFilters(event, filters) {
  const [y0, y1] = filters.yearRange;
  if (event.year < y0 || event.year > y1) return false;
  if (filters.categories && !filters.categories.includes(event.category)) return false;
  if (filters.countries && !filters.countries.includes(event.iso3)) return false;
  return true;
}

// Zentrales Scatter-Prädikat: 78 von 99 Zeilen (21 ohne Wind- oder Impact-Wert
// erscheinen bis Paket 07 nur in der n-Caption, nicht im Plot).
export function isScatterable(event) {
  return event.intensity_kt != null && event.affected != null;
}
