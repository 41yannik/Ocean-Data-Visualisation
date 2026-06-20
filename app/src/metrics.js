// Geteilte Metrik-Metadaten + Formatierung (von Chart, Controls, Tabelle, Tooltip genutzt).
import { format } from "d3";

export const METRICS = {
  sst_anom: { label: "SST anomaly", short: "SST", unit: "°C", kind: "climate" },
  sea_level: { label: "Sea-level anomaly", short: "Sea level", unit: "m", kind: "climate" },
  rain_anom: { label: "Rainfall anomaly", short: "Rainfall", unit: "mm", kind: "climate" },
  population: { label: "Population", short: "Population", unit: "people", kind: "size" },
  affected: { label: "Affected persons", short: "Affected", unit: "people", kind: "size" },
  econ_loss_usd: { label: "Economic loss", short: "Loss", unit: "US$", kind: "size" },
};

export const AXIS_METRICS = ["sst_anom", "sea_level", "rain_anom"];
export const SIZE_METRICS = ["population", "affected", "econ_loss_usd"];

// Region → colour (ColorBrewer Set2, farbsehschwäche-freundlich).
export const REGION_COLORS = {
  Melanesia: "#1b9e77",
  Micronesia: "#d95f02",
  Polynesia: "#7570b3",
};

const fInt = format(",d");
const fSig = format(".3~f");

export function fmt(metric, value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const m = METRICS[metric];
  if (metric === "econ_loss_usd") return "$" + fInt(Math.round(value));
  if (m.kind === "size") return fInt(Math.round(value));
  return fSig(value) + (m.unit === "°C" || m.unit === "m" || m.unit === "mm" ? " " + m.unit : "");
}

export function axisLabel(metric) {
  const m = METRICS[metric];
  return `${m.label} (${m.unit})`;
}
