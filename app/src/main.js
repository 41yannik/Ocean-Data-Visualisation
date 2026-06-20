// Orchestrierung: Daten laden, Globus init, Scroll-Steps verdrahten, Step-Karten (mit Betroffenen) bauen.
import "./styles.css";
import { feature } from "topojson-client";
import landTopo from "world-atlas/land-110m.json";
import { createGlobe } from "./globe.js";
import { createScroller } from "./scroller.js";
import { STEPS } from "./steps.js";

const BASE = import.meta.env.BASE_URL;

const [cyc, islands] = await Promise.all([
  fetch(`${BASE}data/cyclones.json`).then((r) => r.json()),
  fetch(`${BASE}data/islands.json`).then((r) => r.json()),
]);

const land = feature(landTopo, landTopo.objects.land);
const islandByIso = new Map(islands.map((i) => [i.iso3, i]));

const globe = createGlobe(document.getElementById("globe"), {
  land,
  storms: cyc.storms,
  islands,
});

// Step-Karten erzeugen; Betroffene dynamisch aus den Daten injizieren.
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

createScroller((index) => globe.go(STEPS[index]));
globe.go(STEPS[0]);
