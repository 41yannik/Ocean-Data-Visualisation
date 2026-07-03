// PICT-Zentroide: Pflicht-Layer — kleine Atolle (Tuvalu, Niue, Tokelau, …) existieren
// im 110m-Land nicht als Fläche. Labels nur für Story-Inseln (Clutter-Regel).
import { LABELED_ISO3 } from '../core/config.js';
import { COUNTRY_LOOKUP } from './countryNames.js';

// Kollisionsvermeidung benachbarter Labels (Samoa liegt direkt westlich von Am. Samoa):
// WSM links vom Punkt verankern, ASM leicht nach unten versetzen.
const LABEL_OFFSETS = {
  WSM: { dx: -5, dy: 3, anchor: 'end' },
  ASM: { dx: 5, dy: 12, anchor: 'start' },
};
const DEFAULT_OFFSET = { dx: 5, dy: 3, anchor: 'start' };

export function createCentroidsLayer(gCentroids, gLabels, layerCtx) {
  const { data, geo } = layerCtx;
  const entries = Object.entries(data.index.centroids)
    .map(([iso3, [lon, lat]]) => ({ iso3, point: geo.projection([lon, lat]) }))
    .filter((d) => d.point);

  const dots = gCentroids.selectAll('circle')
    .data(entries, (d) => d.iso3)
    .join('circle')
    .attr('class', 'centroid')
    .attr('cx', (d) => d.point[0])
    .attr('cy', (d) => d.point[1])
    .attr('r', 2.2);

  function render(state) {
    const hoverIsos = hoverCountries(state);
    const storyIsos = state.storyFx?.emphasisIso3 ?? [];
    dots.classed('emphasis', (d) =>
      (state.filters.countries?.includes(d.iso3) ?? false)
      || hoverIsos.has(d.iso3) || storyIsos.includes(d.iso3));

    // Puls-Ringe an den Story-Zentroiden (Hook: Aufprallorte ASM/NIU)
    gCentroids.selectAll('circle.centroid-pulse')
      .data(entries.filter((d) => storyIsos.includes(d.iso3)), (d) => d.iso3)
      .join('circle')
      .attr('class', 'centroid-pulse')
      .attr('cx', (d) => d.point[0])
      .attr('cy', (d) => d.point[1])
      .attr('r', 9);

    // Labels dynamisch: Story-Inseln (LABELED_ISO3) + aktuell betonte (z. B. ASM im Hook)
    gLabels.selectAll('text')
      .data(entries.filter((d) => LABELED_ISO3.includes(d.iso3) || storyIsos.includes(d.iso3)), (d) => d.iso3)
      .join('text')
      .attr('class', 'centroid-label')
      .classed('emphasis', (d) => storyIsos.includes(d.iso3))
      .attr('x', (d) => d.point[0] + (LABEL_OFFSETS[d.iso3] ?? DEFAULT_OFFSET).dx)
      .attr('y', (d) => d.point[1] + (LABEL_OFFSETS[d.iso3] ?? DEFAULT_OFFSET).dy)
      .attr('text-anchor', (d) => (LABEL_OFFSETS[d.iso3] ?? DEFAULT_OFFSET).anchor)
      .text((d) => COUNTRY_LOOKUP[d.iso3] ?? d.iso3);
  }

  function hoverCountries(state) {
    const set = new Set();
    if (!state.hover) return set;
    if (state.hover.eventId) {
      const e = data.index.byId.get(state.hover.eventId);
      if (e) set.add(e.iso3);
    } else if (state.hover.sid) {
      for (const e of data.index.bySid.get(state.hover.sid) ?? []) set.add(e.iso3);
    }
    return set;
  }

  return {
    update(state, patch) {
      if (!patch || 'hover' in patch || 'filters' in patch || 'storyFx' in patch) render(state);
    },
    destroy() {
      gCentroids.selectAll('*').remove();
      gLabels.selectAll('*').remove();
    },
  };
}
