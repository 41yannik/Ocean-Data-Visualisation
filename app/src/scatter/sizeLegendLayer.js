// Größen-Legende für den Evidenz-Scatter: der Punktradius kodiert die gemeldeten
// Todesfälle (makeRScale, scaleSqrt). Kompakt UNTEN LINKS im Plot (schwache Stürme mit
// geringem Impact - dünnste, für die Aussage unwichtigste Region; verdeckt keine
// „Abweichungs"-Punkte). Leichtes weißes Backing für Lesbarkeit. Statisch (kein mode/filter).
export function createSizeLegendLayer(g, layerCtx) {
  const { r } = layerCtx.scales;
  const gl = g.append('g').attr('class', 'size-legend');

  const w = 148;
  const h = 50;
  const x0 = 6;
  const y0 = layerCtx.inner.height - h - 4;
  const cy = y0 + 36;
  const rFew = Math.max(2.5, r(0));
  const rMany = r(r.domain()[1]); // größter tatsächlich gezeichneter Punkt (= R_MAX)

  gl.append('rect').attr('class', 'sl-bg')
    .attr('x', x0).attr('y', y0).attr('width', w).attr('height', h).attr('rx', 8);
  gl.append('text').attr('class', 'sl-title')
    .attr('x', x0 + 12).attr('y', y0 + 16).text('Reported deaths');
  gl.append('circle').attr('class', 'sl-dot').attr('cx', x0 + 20).attr('cy', cy).attr('r', rFew);
  gl.append('text').attr('class', 'sl-label').attr('x', x0 + 30).attr('y', cy + 4).text('few');
  gl.append('circle').attr('class', 'sl-dot').attr('cx', x0 + 84).attr('cy', cy).attr('r', rMany);
  gl.append('text').attr('class', 'sl-label').attr('x', x0 + 102).attr('y', cy + 4).text('many');

  return { update() {}, destroy() { gl.remove(); } };
}
