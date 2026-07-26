// Gemeinsame Filter-/Sichtbarkeits-Prädikate (Lücke L6) - pure Funktionen.
// Format: yearRange inklusiv; categories: null | number[]; countries: null | string[] (iso3).
// Events mit category: null fallen bei aktivem Kategorie-Filter heraus (dokumentiertes Verhalten).

export function matchesFilters(event, filters) {
  const [y0, y1] = filters.yearRange;
  if (event.year < y0 || event.year > y1) return false;
  if (filters.categories && !filters.categories.includes(event.category)) return false;
  if (filters.countries && !filters.countries.includes(event.iso3)) return false;
  return true;
}

// Zentrales Scatter-Prädikat: Record mit lokal gemessenem Wind UND positivem Toll.
// Nur diese Zeilen können in eine log-Skala (70 von 174). Die ausdrücklich als 0
// gemeldeten Land-Jahre sind KEINE Lücke, sondern eine eigene Klasse - sie erscheinen
// in der Zero-Lane unter der Log-Achse (isZeroLane, 51 Zeilen). Vor dem Audit 2026-07
// waren sie aus den Daten gefiltert, was auf der abhängigen Variablen selektierte.
export function isScatterable(event) {
  return event.intensity_kt != null && event.affected != null && event.affected > 0;
}

// Gemeldete Null mit Sturm im Radius: gehört in den Plot, aber nicht in den Logarithmus.
export function isZeroLane(event) {
  return event.intensity_kt != null && event.affected === 0;
}

// Jede Zeile, die im Scatter erscheint (Log-Bereich oder Zero-Lane).
export function isPlottable(event) {
  return isScatterable(event) || isZeroLane(event);
}
