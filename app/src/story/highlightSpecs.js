// Highlight-Sets aus deklarativen Specs (aus main.js extrahiert, Plan „delightful-harbor"):
// 'outliers' → alle Punkte mit hohem Pro-Kopf-Residuum, 'category:N' → alle Kat-N-Stürme.
// Genutzt von wireTextLinks (main.js) und den Chart-Controls des Evidence-Panels.
import { isScatterable } from '../core/filters.js';
import { REVEAL_RESIDUAL_MIN } from '../core/config.js';

export function resolveHighlightSpec(spec, data) {
  const events = data.events.filter(isScatterable);
  if (spec === 'outliers') {
    return { ids: new Set(events.filter((e) => (e.residual_pc ?? -Infinity) > REVEAL_RESIDUAL_MIN).map((e) => e.id)), pulse: true };
  }
  if (spec.startsWith('category:')) {
    const cat = Number(spec.split(':')[1]);
    return { ids: new Set(events.filter((e) => e.category === cat).map((e) => e.id)), pulse: false };
  }
  return { ids: new Set(), pulse: false };
}
