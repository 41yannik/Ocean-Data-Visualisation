// Sortier-/durchsuchbare Tabelle der aktuell sichtbaren Daten; Zeile ↔ Bubble verlinkt.
import { METRICS, fmt } from "./metrics.js";

const COLS = [
  { key: "country", label: "Country", num: false },
  { key: "region", label: "Region", num: false },
  { key: "sst_anom", label: METRICS.sst_anom.short, num: true },
  { key: "sea_level", label: METRICS.sea_level.short, num: true },
  { key: "rain_anom", label: METRICS.rain_anom.short, num: true },
  { key: "population", label: METRICS.population.short, num: true },
  { key: "affected", label: METRICS.affected.short, num: true },
  { key: "econ_loss_usd", label: METRICS.econ_loss_usd.short, num: true },
];

export function createDataTable(container, { onHighlight }) {
  let sortKey = "country";
  let sortDir = 1;
  let rows = [];

  const table = document.createElement("table");
  table.className = "data-table";
  const thead = table.createTHead();
  const tbody = table.createTBody();
  container.appendChild(table);

  const headRow = thead.insertRow();
  for (const c of COLS) {
    const th = document.createElement("th");
    th.textContent = c.label;
    th.classList.toggle("num", c.num);
    th.tabIndex = 0;
    const sort = () => {
      sortDir = sortKey === c.key ? -sortDir : 1;
      sortKey = c.key;
      draw();
    };
    th.addEventListener("click", sort);
    th.addEventListener("keydown", (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), sort()));
    headRow.appendChild(th);
  }

  function update(currentRows) {
    rows = currentRows;
    draw();
  }

  function draw() {
    const sorted = [...rows].sort((a, b) => {
      const va = a[sortKey], vb = b[sortKey];
      if (va == null) return 1;
      if (vb == null) return -1;
      return (va < vb ? -1 : va > vb ? 1 : 0) * sortDir;
    });

    for (const th of headRow.children) th.removeAttribute("data-sort");
    headRow.children[COLS.findIndex((c) => c.key === sortKey)]
      ?.setAttribute("data-sort", sortDir > 0 ? "asc" : "desc");

    tbody.replaceChildren(
      ...sorted.map((d) => {
        const tr = document.createElement("tr");
        tr.dataset.iso = d.iso3;
        for (const c of COLS) {
          const td = document.createElement("td");
          td.classList.toggle("num", c.num);
          td.textContent = c.num ? fmt(c.key, d[c.key]) : d[c.key];
          tr.appendChild(td);
        }
        tr.addEventListener("pointerenter", () => onHighlight(d.iso3));
        tr.addEventListener("pointerleave", () => onHighlight(null));
        tr.addEventListener("click", () => onHighlight(d.iso3));
        return tr;
      })
    );
    if (!sorted.length) {
      const tr = tbody.insertRow();
      const td = tr.insertCell();
      td.colSpan = COLS.length;
      td.className = "empty";
      td.textContent = "No countries match the current filters.";
    }
  }

  function setHighlight(iso) {
    for (const tr of tbody.querySelectorAll("tr")) {
      tr.classList.toggle("is-hot", iso != null && tr.dataset.iso === iso);
    }
  }

  return { update, setHighlight };
}
