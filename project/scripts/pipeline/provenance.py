"""Strukturierte Provenienz für UI, Downloads und das Public-Build-Gate."""
from __future__ import annotations

from copy import deepcopy
from datetime import date
from pathlib import Path
import subprocess

import pandas as pd

from pipeline import reference as ref
from pipeline.trends import TS_MIN_KT

REPO_URL = "https://github.com/41yannik/Ocean-Data-Visualisation"


def _accessed(path: Path) -> str:
    return date.fromtimestamp(path.stat().st_mtime).isoformat()


def git_build_info() -> dict:
    def run(*args):
        try:
            return subprocess.check_output(
                ["git", *args], cwd=ref.PROJECT_ROOT, text=True, stderr=subprocess.DEVNULL,
            ).strip()
        except (OSError, subprocess.CalledProcessError):
            return None

    commit = run("rev-parse", "HEAD")
    dirty = bool(run("status", "--porcelain"))
    return {
        "generated": date.today().isoformat(),
        "pipelineVersion": "2.0",
        "gitCommit": commit,
        "gitDirty": dirty,
        "codeUrl": f"{REPO_URL}/tree/{commit}" if commit else REPO_URL,
        "command": "python3 scripts/build_track_to_toll.py",
    }


def publication_policy() -> dict:
    return {
        "status": "open",
        "checked": date.today().isoformat(),
        "evidenceRef": "README.md#datenbasis-und-veroeffentlichung",
        "publicBuild": True,
        "note": (
            "This open build measures impact with the PDH SDG 11.5.1 affected-persons series "
            "(country-year) linked to IBTrACS storms by track proximity. The PDH SDG dataset "
            "licence is confirmed as open; every source is open data. The DesInventar cross-check "
            "export is archived locally only and is not redistributed."
        ),
        "allowedDownloads": [
            "events.json", "meta.json", "tracks.json",
            "sst.json", "sst.csv", "trends.json", "trends.csv", "land-110m.json",
        ],
    }


def source_catalog() -> list[dict]:
    sources = [
        {
            "id": "ibtracs",
            "name": "International Best Track Archive for Climate Stewardship",
            "shortName": "IBTrACS v04r01",
            "provider": "NOAA/NCEI",
            "version": "v04r01",
            "subset": "South Pacific and Western Pacific basin files",
            "period": "2001–2026 impact subset; 2001–2025 full-basin trend",
            "usedFor": "storm tracks, peak wind, category, gale-force wind radii and annual storm trends",
            "fields": [
                "SID", "SEASON", "ISO_TIME", "LAT", "LON", "USA_WIND", "WMO_WIND",
                "USA_SSHS", "USA_R34_NE", "USA_R34_SE", "USA_R34_SW", "USA_R34_NW",
            ],
            "accessed": _accessed(ref.IBTRACS[0]),
            "url": "https://www.ncei.noaa.gov/products/international-best-track-archive",
            "citationUrl": "https://doi.org/10.25921/82ty-9e16",
            "license": {"name": "Full and open access", "url": "https://www.ncei.noaa.gov/products/international-best-track-archive#terms-of-use"},
            "verification": "verified",
        },
        {
            "id": "wpp",
            "name": "World Population Prospects",
            "shortName": "UN WPP",
            "provider": "UN DESA Population Division",
            "version": "World Population Prospects 2024",
            "subset": "21 Pacific countries and territories, annual population 1950–2023",
            "period": "1950–2023; 2023 forward-filled for 2024–2026",
            "usedFor": "turning reported affected people into a share of national population",
            "fields": ["iso3", "year", "population"],
            "accessed": _accessed(ref.WPP),
            "url": "https://population.un.org/wpp/",
            "citationUrl": "https://population.un.org/wpp/Publications/",
            "license": {"name": "CC BY 3.0 IGO", "url": "https://creativecommons.org/licenses/by/3.0/igo/"},
            "verification": "verified",
        },
        {
            "id": "pdh-sst",
            "name": "Climate Change indicators: mean sea-surface temperature anomalies",
            "shortName": "SPC/PDH SST anomalies",
            "provider": "Pacific Community (SPC) / Pacific Data Hub",
            "version": "SPC:DF_CLIMATE_CHANGE(1.0)",
            "subset": "SST_ANOM for 21 Pacific island countries and territories",
            "period": "1850–2025",
            "usedFor": "the opening warming-stripes and annual anomaly line",
            "fields": ["GEO_PICT", "TIME_PERIOD", "OBS_VALUE", "UNIT_MEASURE"],
            "accessed": _accessed(ref.SST),
            "url": "https://pacificdata.org/data/dataset/climate-change-indicators-df-climate-change",
            "citationUrl": "https://stats.pacificdata.org/vis?locale=en&dataflow[datasourceId]=SPC2&dataflow[agencyId]=SPC&dataflow[dataflowId]=DF_CLIMATE_CHANGE&dataflow[version]=1.0",
            "license": {"name": "Other (Open)", "url": "https://pacificdata.org/data/dataset/climate-change-indicators-df-climate-change"},
            "verification": "verified",
        },
        {
            "id": "natural-earth",
            "name": "Natural Earth land boundaries via world-atlas",
            "shortName": "Natural Earth / world-atlas",
            "provider": "Natural Earth contributors / topojson",
            "version": "world-atlas 2.0.2; Natural Earth 4.1.0",
            "subset": "1:110m land boundary",
            "period": "static basemap",
            "usedFor": "geographic context behind every map",
            "fields": ["land geometry"],
            "accessed": "2026-07-02",
            "url": "https://github.com/topojson/world-atlas",
            "citationUrl": "https://www.naturalearthdata.com/about/terms-of-use/",
            "license": {"name": "Public Domain", "url": "https://www.naturalearthdata.com/about/terms-of-use/"},
            "verification": "verified",
        },
    ]
    sources.append({
            "id": "pdh-affected",
            "name": "SDG 11.5.1: number of directly affected persons attributed to disasters",
            "shortName": "PDH SDG 11.5.1 affected",
            "provider": "Pacific Community (SPC) / Pacific Data Hub; compiled from UNDRR Sendai Framework Monitor",
            "version": "SPC:DF_SDG_11(3.0), indicator VC_DSR_AFFCT",
            "subset": "VC_DSR_AFFCT for the reporting Pacific island countries and territories",
            "period": f"{ref.CHALLENGE_YEAR_MIN}–{ref.CHALLENGE_YEAR_MAX}",
            "usedFor": "the open annual affected-persons outcome (share of population affected)",
            "fields": ["INDICATOR", "GEO_PICT", "TIME_PERIOD", "OBS_VALUE"],
            "accessed": _accessed(ref.PDH_AFFECTED),
            "url": "https://pacificdata.org/data/dataset/sustainable-development-goals-sdg",
            "citationUrl": "https://stats.pacificdata.org/vis?dataflow[datasourceId]=SPC2&dataflow[agencyId]=SPC&dataflow[dataflowId]=DF_SDG_11&dataflow[version]=3.0",
            "license": {"name": "Other (Open)", "url": "https://pacificdata.org/data/dataset/sustainable-development-goals-sdg"},
            "verification": "verified",
        })
    return sources


def build_analysis(ev: pd.DataFrame, sst_raw: pd.DataFrame, sst: list, trends: dict,
                   story_evidence: dict, storm_exposed: int | None = None) -> dict:
    analysis = {
        "sst": {
            "placeCount": int(sst_raw["GEO_PICT"].nunique()),
            "yearMin": int(sst[0]["year"]),
            "yearMax": int(sst[-1]["year"]),
            "aggregation": "unweighted arithmetic mean of every available PICT anomaly in each year",
        },
        "stormTrend": {
            "yearMin": int(trends["window"][0]),
            "yearMax": int(trends["window"][1]),
            "thresholdKt": TS_MIN_KT,
            "aggregation": "one row per storm and season; count storms and average each storm's basin-lifetime peak wind",
            "windRule": "USA_WIND, with WMO_WIND only where USA_WIND is missing in the full-basin trend",
        },
        "map": {
            "projection": "Pacific-centred equirectangular projection rotated to 192°E",
            "trackSampling": "main or provisional track at 6-hour synoptic times; coordinates rounded to 0.01°",
            "hotZoneGridDegrees": 4,
        },
        "storyEvidence": deepcopy(story_evidence),
        "outcome": {"available": True},
    }
    analysis.update({
            "join": {
                "rule": f"IBTrACS track point within {ref.CHALLENGE_PROXIMITY_KM} km of the country "
                        "centroid in the same calendar year; strongest such storm kept",
                "matchedRows": int(ev["sid"].notna().sum()),
                "totalRows": int(len(ev)),
                "stormExposedCountryYears": int(storm_exposed) if storm_exposed is not None else None,
            },
            "impact": {
                "unit": "country-year",
                "outcomeSource": "PDH VC_DSR_AFFCT (SDG 11.5.1): people affected by all disasters per year",
                "populationFormula": "affected_pc = annual_affected / population",
                "populationLastYear": ref.WPP_LAST_YEAR,
                "windRule": f"basin-lifetime maximum USA_WIND (kt) of the strongest storm within "
                            f"{ref.CHALLENGE_PROXIMITY_KM} km of the centroid that year",
            },
            "model": {
                "absoluteFormula": "log10(total_affected + 1) ~ intensity_kt",
                "perCapitaFormula": "log10(affected_pc) ~ intensity_kt",
                "residual": "observed log10 impact minus the value predicted by the wind-only OLS line",
                "band": "25th, 50th and 75th percentiles within six equally populated intensity bins",
            },
        })
    return analysis


def transformations() -> list[dict]:
    common = [
        {"id": "sst-annual", "title": "Average the ocean context", "summary": "Group SST_ANOM by year and take an unweighted mean across the 21 available Pacific places.", "sourceIds": ["pdh-sst"]},
        {"id": "storm-trends", "title": "Summarise each cyclone season", "summary": "Keep tropical storms at or above 34 kt, then count storms and average their lifetime peak wind by season.", "sourceIds": ["ibtracs"]},
        {"id": "map-tracks", "title": "Prepare the map", "summary": "Keep six-hour main-track positions, normalise longitudes around the dateline and draw them over the 110m land boundary.", "sourceIds": ["ibtracs", "natural-earth"]},
    ]
    return common + [
        {"id": "link-storms", "title": "Link storms to countries from open tracks", "summary": f"For each country and year, keep the strongest IBTrACS storm whose track passed within {ref.CHALLENGE_PROXIMITY_KM} km of the country centroid.", "sourceIds": ["ibtracs"]},
        {"id": "normalise-impact", "title": "Put countries on a comparable scale", "summary": "Divide the year's reported affected people by that country's population; use the 2023 population for later years.", "sourceIds": ["pdh-affected", "wpp"]},
        {"id": "fit-baseline", "title": "Build a wind-only baseline", "summary": "Fit a simple straight line in log space, then measure how far every complete country-year sits above or below it.", "sourceIds": ["pdh-affected", "ibtracs", "wpp"]},
    ]
