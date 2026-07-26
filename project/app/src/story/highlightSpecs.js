// Highlight-Sets aus deklarativen Specs.
//   'zero'        → Land-Jahre, die trotz Sturm im Radius 0 Betroffene meldeten
//   'strongwind'  → die stärksten Winde, die ein Land tatsächlich erreichten
//   'category:N'  → alle Kat-N-Stürme
// Genutzt von wireTextLinks (main.js) und den Chart-Controls des Evidence-Panels.
//
// Entfallen (Audit 2026-07): 'outliers' wählte Punkte nach dem Abstand zur wind-only
// line. Diese Linie erklärt nichts (R² 0.015, p 0.31), ein großer Abstand war also
// kein Befund, sondern Streuung.
import { isScatterable, isZeroLane, isPlottable } from '../core/filters.js';

// Anteil der stärksten Winde, den 'strongwind' hervorhebt.
const STRONG_WIND_KT = 120;

export function resolveHighlightSpec(spec, data) {
  const events = data.events.filter(isPlottable);
  if (spec === 'zero') {
    return { ids: new Set(events.filter(isZeroLane).map((e) => e.id)), pulse: true };
  }
  if (spec === 'strongwind') {
    return {
      ids: new Set(events.filter((e) => e.intensity_kt >= STRONG_WIND_KT).map((e) => e.id)),
      pulse: true,
    };
  }
  if (spec.startsWith('category:')) {
    const cat = Number(spec.split(':')[1]);
    return { ids: new Set(events.filter((e) => e.category === cat).map((e) => e.id)), pulse: false };
  }
  return { ids: new Set(), pulse: false };
}
