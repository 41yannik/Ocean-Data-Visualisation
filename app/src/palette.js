// Zentrales Farb-/Designsystem — D3-Sequential-Skalen aus ColorBrewer (d3-scale-chromatic).
// Single Source of Truth für Globus UND Legende. Farbsehschwäche in Viz Palette geprüft (docs/04 §5).
import {
  scaleSequential, scaleSequentialSqrt, scaleSqrt,
  interpolateGreys, interpolateYlOrRd, interpolateRdPu,
} from "d3";

export const THEME = {
  bgTop: "#e8f3fb",
  bgBottom: "#f6fafd",
  ocean: "#2b7bbf",
  land: "#5aa86a",
  landStroke: "#3f8350",
  graticule: "rgba(20,50,70,0.10)",
  ink: "#16323f",
  muted: "#5a7184",
  impact: "#c51b8a", // RdPu (kräftig) – für Halo-Ring & Legende
};

// Sturm-Stärke (einzelne Spuren): TS=0 … Cat 5 — mittel- bis dunkelgrau (ColorBrewer *Greys*).
// Unterer Bereich angehoben, damit schwache Stürme auf hellem Globus sichtbar bleiben.
export const strengthColor = scaleSequential((t) => interpolateGreys(0.42 + 0.55 * t)).domain([0, 5]);

// Dichte (verdichtete Regionen): warm (ColorBrewer *YlOrRd*), Domain via max.
export const makeDensityColor = (max) => scaleSequentialSqrt(interpolateYlOrRd).domain([0, max || 1]);

// Impact-Halo: Radius ~ √Betroffene; Verlaufsfarbe aus *RdPu*.
export const impactRadius = scaleSqrt().domain([0, 650000]).range([0, 60]).clamp(true);
export const impactColor = (t) => interpolateRdPu(t);

// Helfer für Legenden-Verläufe (CSS linear-gradient aus einer d3-Skala).
export function rampCss(interp, stops = 8) {
  return Array.from({ length: stops }, (_, i) => interp(i / (stops - 1))).join(",");
}
export { interpolateGreys, interpolateYlOrRd };
