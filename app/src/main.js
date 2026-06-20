// Orchestrierung: Daten laden, Globus init, Zeit-Steuerung + Scroll-Steps verdrahten, Legende bauen.
import "./styles.css";
import { feature } from "topojson-client";
import landTopo from "world-atlas/land-110m.json";
import { createGlobe } from "./globe.js";
import { createScroller } from "./scroller.js";
import { createControls } from "./controls.js";
import { STEPS } from "./steps.js";
import { strengthColor, interpolateYlOrRd, rampCss, THEME } from "./palette.js";

const BASE = import.meta.env.BASE_URL;

const [cyc, islands, density] = await Promise.all([
  fetch(`${BASE}data/cyclones.json`).then((r) => r.json()),
  fetch(`${BASE}data/islands.json`).then((r) => r.json()),
  fetch(`${BASE}data/density.json`).then((r) => r.json()),
]);

const land = feature(landTopo, landTopo.objects.land);
const islandByIso = new Map(islands.map((i) => [i.iso3, i]));
const seasons = cyc.storms.map((s) => s.season);
const minYear = Math.min(...seasons);
const maxYear = Math.max(...seasons);

const globe = createGlobe(document.getElementById("globe"), {
  land, storms: cyc.storms, islands, density,
});

// Step-Karten mit dynamischer Betroffenen-Zahl
const stepsEl = document.getElementById("steps");
STEPS.forEach((s, i) => {
  const aff = s.island && s.year != null ? islandByIso.get(s.island)?.affected[String(s.year)] : null;
  const figure = aff
    ? `<p class="figure"><strong>${aff.toLocaleString("en-US")}</strong> people affected</p>`
    : "";
  const sec = document.createElement("section");
  sec.className = "step";
  sec.dataset.step = String(i);
  sec.innerHTML = `<div class="card"><h2>${s.headline}</h2><p>${s.body}</p>${figure}</div>`;
  stepsEl.appendChild(sec);
});

const legendYear = buildLegend(document.getElementById("legend"), density);

// ── Zeit-State + Steuerung ──────────────────────────────────────────────
let currentYear = null;
let playTimer = null;

const controls = createControls(
  document.getElementById("controls"),
  { minYear, maxYear },
  { onYear: (y) => { stopPlay(); applyYear(y); }, onTogglePlay: togglePlay }
);

function applyYear(y) {
  currentYear = y;
  globe.setYear(y);
  controls.setYear(y);
  legendYear.textContent = y == null ? "All years" : String(y);
}
function togglePlay() {
  if (playTimer) { stopPlay(); return; }
  let y = Number.isFinite(currentYear) ? currentYear : minYear;
  controls.setPlaying(true);
  playTimer = setInterval(() => { y = y >= maxYear ? minYear : y + 1; applyYear(y); }, 750);
}
function stopPlay() {
  if (playTimer) clearInterval(playTimer);
  playTimer = null;
  controls.setPlaying(false);
}

// ── Scroll-Steps (Globus fliegt + setzt Jahr) ───────────────────────────
createScroller((index) => {
  const s = STEPS[index];
  stopPlay();
  globe.go(s);             // setzt Fokus + heroYear
  applyYear(s.year ?? null); // synchronisiert Slider/Legende (kein Hero-Reset, da y===heroYear)
});

globe.go(STEPS[0]);
applyYear(null);

// ── Legende (aus der Palette gerendert) ─────────────────────────────────
function buildLegend(el) {
  const greys = rampCss(strengthColor.interpolator());
  const warm = rampCss(interpolateYlOrRd);
  el.innerHTML = `
    <h3>How to read this</h3>
    <div class="lg-item">
      <span class="lg-name">Storm strength</span>
      <span class="lg-ramp" style="background:linear-gradient(90deg,${greys})"></span>
      <span class="lg-ends"><i>Trop. storm</i><i>Cat 5</i></span>
    </div>
    <div class="lg-item">
      <span class="lg-name">Storm density</span>
      <span class="lg-ramp" style="background:linear-gradient(90deg,${warm})"></span>
      <span class="lg-ends"><i>few</i><i>many / stronger</i></span>
    </div>
    <div class="lg-item">
      <span class="lg-name">People affected</span>
      <span class="lg-halos">
        <i style="width:10px;height:10px"></i><i style="width:20px;height:20px"></i><i style="width:30px;height:30px"></i>
      </span>
    </div>
    <div class="lg-item lg-time"><span class="lg-name">Year</span> <strong id="lg-year">All years</strong></div>
  `;
  el.querySelectorAll(".lg-halos i").forEach((n) => (n.style.borderColor = THEME.impact));
  return el.querySelector("#lg-year");
}
