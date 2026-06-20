// 5D-Bubble-Plot: X·Y = umschaltbare Klimametriken, r = Größenmetrik, Farbe = Region, Zeit = update().
import { select, scaleLinear, scaleSqrt, axisBottom, axisLeft, max } from "d3";
import { METRICS, REGION_COLORS, axisLabel } from "./metrics.js";

const W = 780;
const H = 540;
const M = { top: 18, right: 22, bottom: 52, left: 64 };
const IW = W - M.left - M.right;
const IH = H - M.top - M.bottom;

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const dur = reduceMotion ? 0 : 720;

export function createBubbleChart(container, meta, handlers = {}) {
  const svg = select(container)
    .append("svg")
    .attr("viewBox", `0 0 ${W} ${H}`)
    .attr("class", "bubble-svg");

  const g = svg.append("g").attr("transform", `translate(${M.left},${M.top})`);
  const gGrid = g.append("g").attr("class", "grid");
  const gx = g.append("g").attr("class", "axis axis--x").attr("transform", `translate(0,${IH})`);
  const gy = g.append("g").attr("class", "axis axis--y");
  const gDots = g.append("g").attr("class", "dots");

  const xLabel = g.append("text").attr("class", "axis-title")
    .attr("x", IW / 2).attr("y", IH + 42).attr("text-anchor", "middle");
  const yLabel = g.append("text").attr("class", "axis-title")
    .attr("transform", "rotate(-90)").attr("x", -IH / 2).attr("y", -48).attr("text-anchor", "middle");

  const yearTag = g.append("text").attr("class", "year-tag")
    .attr("x", IW).attr("y", 6).attr("text-anchor", "end");

  const x = scaleLinear().range([0, IW]);
  const y = scaleLinear().range([IH, 0]);
  const r = scaleSqrt().range([3, 34]);

  function pad([lo, hi]) {
    if (lo === hi) return [lo - 1, hi + 1];
    const p = (hi - lo) * 0.08;
    return [lo - p, hi + p];
  }

  let last = {};

  function update(rows, state) {
    last = state;
    const { xMetric, yMetric, sizeMetric } = state;

    x.domain(pad(meta.domains[xMetric]));
    y.domain(pad(meta.domains[yMetric]));
    r.domain([0, max([1, meta.domains[sizeMetric][1]])]);

    const t = svg.transition().duration(dur);

    gx.transition(t).call(axisBottom(x).ticks(7));
    gy.transition(t).call(axisLeft(y).ticks(7));
    gGrid.transition(t).call(axisLeft(y).ticks(7).tickSize(-IW).tickFormat(""));
    xLabel.text(axisLabel(xMetric));
    yLabel.text(axisLabel(yMetric));
    yearTag.text(state.year);

    const plot = rows.filter((d) => d[xMetric] != null && d[yMetric] != null);

    const dots = gDots.selectAll("circle").data(plot, (d) => d.iso3);

    dots.join(
      (enter) =>
        enter.append("circle")
          .attr("cx", (d) => x(d[xMetric]))
          .attr("cy", (d) => y(d[yMetric]))
          .attr("fill", (d) => REGION_COLORS[d.region])
          .attr("r", 0)
          .call((e) => bindEvents(e))
          .call((e) => e.transition(t).attr("r", (d) => radius(d, sizeMetric))),
      (upd) =>
        upd.call((u) =>
          u.transition(t)
            .attr("cx", (d) => x(d[xMetric]))
            .attr("cy", (d) => y(d[yMetric]))
            .attr("fill", (d) => REGION_COLORS[d.region])
            .attr("r", (d) => radius(d, sizeMetric))
        ),
      (exit) => exit.call((x2) => x2.transition(t).attr("r", 0).remove())
    );

    emphasis();
  }

  function radius(d, sizeMetric) {
    return d[sizeMetric] == null ? 4 : r(d[sizeMetric]);
  }

  function bindEvents(sel) {
    sel
      .on("pointerenter", (event, d) => handlers.onHover?.(d, [event.clientX, event.clientY]))
      .on("pointermove", (event, d) => handlers.onHover?.(d, [event.clientX, event.clientY]))
      .on("pointerleave", () => handlers.onLeave?.())
      .on("click", (event, d) => handlers.onClick?.(d.iso3));
  }

  // Hervorhebung/Dimmen: aktiver Hover (is-hot) bzw. Such-Treffer; Rest gedimmt.
  function emphasis() {
    const { query, queryIsos, highlightIso } = last;
    gDots.selectAll("circle")
      .classed("is-hot", (d) => highlightIso === d.iso3)
      .classed(
        "is-dim",
        (d) =>
          (highlightIso != null && d.iso3 !== highlightIso) ||
          (query && queryIsos && !queryIsos.has(d.iso3))
      );
  }

  function setHighlight(iso) {
    last.highlightIso = iso;
    emphasis();
  }

  return { update, setHighlight };
}
