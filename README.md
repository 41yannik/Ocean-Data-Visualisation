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
│  └─ prepare_pacific_data.py
├─ Data/        (git-ignored) # Raw + derived datasets — see "Data" below
└─ README.md
```

The `Data/` tree is **not committed** (size and licensing — see below). It is reproduced locally from
the original sources via the scripts in `scripts/`.

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
python3 scripts/prepare_pacific_data.py
# → writes filtered, tidy CSVs to Data/processed/
```

## Status

Setup & data pipeline in progress (milestone M2). See [`docs/06_Arbeitsplan.md`](docs/06_Arbeitsplan.md)
for milestones and [`docs/09_Projektplan.md`](docs/09_Projektplan.md) for the full plan.
