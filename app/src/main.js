// Orchestrierung: Daten laden, zentraler State, Render-Dispatch, Linking Chart ↔ Tabelle.
import "./styles.css";
import { loadData } from "./data.js";
import { createBubbleChart } from "./bubbleChart.js";
import { createControls } from "./controls.js";
import { createDataTable } from "./dataTable.js";
import { createTooltip } from "./tooltip.js";
import { REGION_COLORS } from "./metrics.js";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const { records, meta } = await loadData();

const state = {
  year: meta.years.includes(2016) ? 2016 : meta.yearRange[1],
  xMetric: "sst_anom",
  yMetric: "sea_level",
  sizeMetric: "population",
  regions: new Set(meta.regions),
  query: "",
  queryIsos: null,
  highlightIso: null,
  playing: false,
};

const tooltip = createTooltip(document.getElementById("tooltip"));

const chart = createBubbleChart(document.getElementById("chart"), meta, {
  onHover: (d, pos) => {
    tooltip.show(d, pos);
    setHighlight(d.iso3);
  },
  onLeave: () => {
    tooltip.hide();
    setHighlight(null);
  },
  onClick: (iso) => setHighlight(iso),
});

const table = createDataTable(document.getElementById("table"), {
  onHighlight: (iso) => setHighlight(iso),
});

const controls = createControls(document.getElementById("controls"), meta, state, {
  onChange: (patch) => {
    Object.assign(state, patch);
    if (patch.year !== undefined) controls.setYear(state.year);
    render();
  },
  onTogglePlay: togglePlay,
});

buildLegend(document.getElementById("legend"));

document.getElementById("search").addEventListener("input", (e) => {
  state.query = e.target.value;
  render();
});

// ── Render ────────────────────────────────────────────────────────────────
function render() {
  const chartRows = records.filter((d) => d.year === state.year && state.regions.has(d.region));
  const q = state.query.trim().toLowerCase();
  state.queryIsos = q
    ? new Set(
        chartRows
          .filter((d) => d.country.toLowerCase().includes(q) || d.iso3.toLowerCase().includes(q))
          .map((d) => d.iso3)
      )
    : null;
  const tableRows = q ? chartRows.filter((d) => state.queryIsos.has(d.iso3)) : chartRows;

  chart.update(chartRows, state);
  table.update(tableRows);
}

function setHighlight(iso) {
  state.highlightIso = iso;
  chart.setHighlight(iso);
  table.setHighlight(iso);
}

// ── Animation ───────────────────────────────────────────────────────────────
let timer = null;
function togglePlay() {
  state.playing = !state.playing;
  controls.setPlaying(state.playing);
  if (state.playing) startPlay();
  else stopPlay();
}
function startPlay() {
  stopPlay();
  if (state.year >= meta.yearRange[1]) {
    state.year = meta.yearRange[0];
    controls.setYear(state.year);
    render();
  }
  timer = setInterval(() => {
    if (state.year >= meta.yearRange[1]) {
      togglePlay();
      return;
    }
    state.year += 1;
    controls.setYear(state.year);
    render();
  }, reduceMotion ? 1200 : 900);
}
function stopPlay() {
  if (timer) clearInterval(timer);
  timer = null;
}

function buildLegend(container) {
  container.innerHTML = "";
  for (const region of meta.regions) {
    const item = document.createElement("span");
    item.className = "legend__item";
    const sw = document.createElement("span");
    sw.className = "legend__swatch";
    sw.style.background = REGION_COLORS[region];
    item.append(sw, document.createTextNode(region));
    container.appendChild(item);
  }
}

render();
