// Bedienleiste: Jahr-Slider + Play/Pause, X/Y/Größen-Metrik, Region-Filter.
import { METRICS, AXIS_METRICS, SIZE_METRICS, REGION_COLORS } from "./metrics.js";

export function createControls(container, meta, state, { onChange, onTogglePlay }) {
  container.innerHTML = "";

  // ── Jahr-Slider + Play ────────────────────────────────────────────────
  const timeRow = el(container, "div", "ctrl ctrl--time");
  const playBtn = el(timeRow, "button", "play-btn");
  playBtn.type = "button";
  playBtn.setAttribute("aria-label", "Play/pause animation");

  const slider = el(timeRow, "input", "year-slider");
  Object.assign(slider, { type: "range", min: meta.yearRange[0], max: meta.yearRange[1], step: 1, value: state.year });
  slider.setAttribute("aria-label", "Year");
  const yearOut = el(timeRow, "output", "year-out");

  slider.addEventListener("input", () => onChange({ year: +slider.value }));
  playBtn.addEventListener("click", () => onTogglePlay());

  // ── Metrik-Selektoren ─────────────────────────────────────────────────
  const metricRow = el(container, "div", "ctrl ctrl--metrics");
  buildSelect(metricRow, "X axis", AXIS_METRICS, state.xMetric, (v) => onChange({ xMetric: v }));
  buildSelect(metricRow, "Y axis", AXIS_METRICS, state.yMetric, (v) => onChange({ yMetric: v }));
  buildSelect(metricRow, "Size", SIZE_METRICS, state.sizeMetric, (v) => onChange({ sizeMetric: v }));

  // ── Region-Filter ─────────────────────────────────────────────────────
  const regionRow = el(container, "div", "ctrl ctrl--regions");
  el(regionRow, "span", "ctrl__label").textContent = "Region";
  for (const region of meta.regions) {
    const chip = el(regionRow, "button", "chip");
    chip.type = "button";
    chip.dataset.region = region;
    chip.style.setProperty("--chip", REGION_COLORS[region]);
    chip.textContent = region;
    chip.setAttribute("aria-pressed", "true");
    chip.addEventListener("click", () => {
      const on = state.regions.has(region);
      if (on) state.regions.delete(region);
      else state.regions.add(region);
      chip.classList.toggle("chip--off", on);
      chip.setAttribute("aria-pressed", String(!on));
      onChange({});
    });
  }

  // API für die Animation
  function setYear(yr) {
    slider.value = yr;
    yearOut.textContent = yr;
  }
  function setPlaying(p) {
    playBtn.classList.toggle("is-playing", p);
    playBtn.textContent = p ? "⏸" : "▶";
  }
  setYear(state.year);
  setPlaying(false);
  return { setYear, setPlaying };
}

function buildSelect(parent, label, metrics, value, onPick) {
  const wrap = el(parent, "label", "field");
  el(wrap, "span", "field__label").textContent = label;
  const sel = el(wrap, "select", "field__select");
  for (const m of metrics) {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = METRICS[m].label;
    if (m === value) opt.selected = true;
    sel.appendChild(opt);
  }
  sel.addEventListener("change", () => onPick(sel.value));
  return sel;
}

function el(parent, tag, cls) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  parent.appendChild(node);
  return node;
}
