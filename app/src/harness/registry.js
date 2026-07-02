// Mount-Registry der Dev-Harness: Key → { title, mount(container, ctx) → Komponente }.
// Einzel-Layer laufen über den jeweiligen Kompositor mit opts.layers — Ownership von
// geo/scales bleibt beim Kompositor (docs/plan/09 §1 Regel 4).
import { select } from 'd3';
import { makePacificProjection, makeGeoPath } from '../core/scales.js';
import { MAP } from '../core/config.js';
import { isScatterable } from '../core/filters.js';
import { createMap } from '../map/index.js';

export const REGISTRY = {
  'map.basemap': { title: 'Basemap solo', mount: (c, ctx) => createMap(c, ctx, { layers: ['basemap'] }) },
  'map.tracks': { title: 'Tracks solo (auf Basemap)', mount: (c, ctx) => createMap(c, ctx, { layers: ['basemap', 'tracks'] }) },
  'map.centroids': { title: 'Zentroide solo (auf Basemap)', mount: (c, ctx) => createMap(c, ctx, { layers: ['basemap', 'centroids'] }) },
  map: { title: 'Karte komplett', mount: (c, ctx) => createMap(c, ctx) },

  data: {
    title: 'dataLoader-Summary',
    mount(container, ctx) {
      const { events, tracks, index } = ctx.data;
      const scatterable = events.filter(isScatterable).length;
      container.innerHTML = `<pre class="harness-summary">
events:      ${events.length}   (erwartet 99)
tracks:      ${Object.keys(tracks).length}   (erwartet 69)
scatterable: ${scatterable}   (erwartet 78)
centroids:   ${Object.keys(index.centroids).length}   (erwartet 22)
bySid:       ${index.bySid.size} Stürme · byId: ${index.byId.size}
fits:        abs R²=${ctx.meta.fits.absolute.r2} (p=${ctx.meta.fits.absolute.p}) · pc R²=${ctx.meta.fits.perCapita.r2} (p=${ctx.meta.fits.perCapita.p})
Harold-Zeilen: ${index.bySid.get('2020092S09155')?.length} (erwartet 4) · Pam: ${index.bySid.get('2015066S08170')?.length} (erwartet 5)</pre>`;
      return { update() {}, destroy() { container.innerHTML = ''; } };
    },
  },

  'map.smoke': {
    title: 'Dateline-GATE: handkodierte kreuzende LineString',
    mount(container, ctx) {
      const svg = select(container).append('svg')
        .attr('viewBox', `0 0 ${MAP.width} ${MAP.height}`);
      const projection = makePacificProjection();
      const path = makeGeoPath(projection);

      svg.append('path').datum(ctx.data.land).attr('class', 'land').attr('d', path);

      const crossing = {
        type: 'LineString',
        coordinates: [[168, -12], [176, -16], [-178, -18], [-170, -20], [-165, -21]],
      };
      svg.append('path').datum(crossing)
        .attr('d', path)
        .attr('fill', 'none')
        .attr('stroke', 'var(--accent)')
        .attr('stroke-width', 2.5);

      svg.append('text').attr('x', 12).attr('y', 20).attr('class', 'axis-label')
        .text('GATE: Linie muss als durchgehende Kurve erscheinen — KEIN horizontaler Streifen quer über die Karte');
      return { update() {}, destroy() { svg.remove(); } };
    },
  },
};
