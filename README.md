# Ocean Data Visualisation — Pacific Cyclones & Their Impacts

An interactive, multidimensional **D3.js** data visualisation of tropical cyclones in the Pacific and
their impacts, in the context of rising sea-surface temperature, sea level and rainfall anomalies.

- **Course:** Visual Analytics, Hochschule Düsseldorf (HSD), 4th semester
- **External framing:** [Pacific Dataviz Challenge 2026](https://pacificdatavizchallenge.org/) — theme *Climate Change*
- **Concept:** a free-to-explore multi-view dashboard (map · time series · 5D multivariate), linked via brushing

> Full project documentation (idea, visualisation concept, dimensions, implementation plan and the
> rules-compliance check) lives under [`docs/`](docs/) — note: written in German.

## Repository structure

```
.
├─ docs/                     # Project documentation (00–09)
├─ scripts/                  # Data preprocessing (Python)
│  ├─ prepare_pacific_data.py   # EM-DAT / WPP → Pacific subsets
│  └─ build_app_dataset.py      # SDMX + WPP → app/public/data/ocean.json
├─ app/                      # D3 MVP app (Vite) — 5D bubble-plot explorer
│  ├─ src/                   #   main, bubbleChart, controls, dataTable, tooltip, metrics
│  └─ public/data/           #   generated, licence-clean (committed)
├─ Data/        (git-ignored) # Raw + derived datasets — see "Data" below
└─ README.md
```

The `Data/` tree is **not committed** (size and licensing — see below). It is reproduced locally from
the original sources via the scripts in `scripts/`. The app's `public/data/*.json` **is** committed
(small, licence-clean: Pacific Data Hub + UN WPP only).

## Data sources & licences

| Source | Use | Licence | In published dataviz? |
|---|---|---|---|
| **Pacific Data Hub** (SPC `.Stat`) — SST / sea level / rainfall anomalies, affected persons, economic loss | climate context + official impacts | Open | ✅ yes (official challenge data) |
| **IBTrACS** (NOAA NCEI) — cyclone tracks (WP + SP) | storm tracks & per-island counts | Public domain | ✅ yes |
| **UN World Population Prospects 2024** | population (normalisation) | CC BY 3.0 IGO | ✅ yes |
| **EM-DAT** (CRED / UCLouvain) — disaster impacts | internal analysis / paper only | **CC BY-NC-ND 4.0** | ❌ no (non-commercial + no-derivatives; see `docs/09`) |

All sources are cited in the submission form and the accompanying short paper.

## Reproduce the derived data

```bash
python3 scripts/build_app_dataset.py     # SDMX + WPP → app/public/data/ocean.json + meta.json
python3 scripts/prepare_pacific_data.py  # (optional) EM-DAT/WPP Pacific subsets → Data/processed/
```

## Run the MVP app

```bash
cd app
npm install
npm run dev        # dev server with hot reload
# or: npm run build && npm run preview   # production build + local preview
```

The app is a **5-dimensional bubble-plot explorer** (X = SST anomaly · Y = sea-level anomaly ·
size = population · colour = region · time = year slider) with switchable axis/size metrics, a region
filter, a hover tooltip, country search, and a linked sortable data table.

## Status

✅ Data pipeline + **first interactive MVP** (5D bubble-plot explorer, milestones M2–M5).
Next: deploy to GitHub Pages, then add the map (deck.gl) and impact-time views. See
[`docs/06_Arbeitsplan.md`](docs/06_Arbeitsplan.md) and [`docs/09_Projektplan.md`](docs/09_Projektplan.md).
