// Minimaler Hover-Tooltip.
import { select } from "d3";
import { METRICS, fmt } from "./metrics.js";

export function createTooltip(node) {
  const el = select(node);

  function show(d, [x, y]) {
    const rows = ["sst_anom", "sea_level", "rain_anom", "population", "affected", "econ_loss_usd"]
      .map((k) => `<dt>${METRICS[k].short}</dt><dd>${fmt(k, d[k])}</dd>`)
      .join("");
    el.html(
      `<div class="tt-title">${d.country} · ${d.year}</div>` +
        `<div class="tt-region">${d.region}</div>` +
        `<dl class="tt-grid">${rows}</dl>`
    )
      .style("left", `${x}px`)
      .style("top", `${y}px`)
      .classed("is-visible", true);
  }

  function hide() {
    el.classed("is-visible", false);
  }

  return { show, hide };
}
