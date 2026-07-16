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
DECISION_REF = "docs/decisions/2026-07-02_datenquellen.md#status-2026-07-16"


def _accessed(path: Path) -> str:
    return date.fromtimestamp(path.stat().st_mtime).isoformat()


def git_build_info() -> dict:
    def run(*args):
        try:
            return subprocess.check_output(
                ["git", *args], cwd=ref.REPO_ROOT, text=True, stderr=subprocess.DEVNULL,
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
        "command": "python3 scripts/build_track_to_toll.py --variant kurs",
    }


def publication_policy(variant: str) -> dict:
    if variant == "kurs":
        return {
            "status": "restricted",
            "checked": date.today().isoformat(),
            "evidenceRef": DECISION_REF,
            "publicBuild": False,
            "note": (
                "This course build contains EM-DAT-derived event records. Public release stays "
                "blocked until the scope of the reported provider permission is archived and verified."
            ),
            "allowedDownloads": ["sst.json", "sst.csv", "trends.json", "trends.csv", "land-110m.json"],
        }
    return {
        "status": "blocked",
        "checked": date.today().isoformat(),
        "evidenceRef": DECISION_REF,
        "publicBuild": False,
        "note": (
            "The open-data build has no selected public outcome measure yet and cannot render "
            "the wind-versus-impact analysis."
        ),
        "allowedDownloads": ["sst.json", "sst.csv", "trends.json", "trends.csv", "land-110m.json"],
    }


def source_catalog(variant: str) -> list[dict]:
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
    if variant == "kurs":
        sources.extend([
            {
                "id": "emdat",
                "name": "Emergency Events Database",
                "shortName": "EM-DAT",
                "provider": "CRED / UCLouvain",
                "version": "public export dated 2026-06-15",
                "subset": "Pacific tropical-cyclone country records",
                "period": "2001–2026",
                "usedFor": "reported affected people, deaths, damage and storm-country event identity",
                "fields": ["disno", "iso3", "year", "event_name", "total_affected", "total_deaths", "total_damage_kusd"],
                "accessed": _accessed(ref.EMDAT_EVENTS),
                "url": "https://www.emdat.be/",
                "citationUrl": "https://doc.emdat.be/docs/data-accessibility/",
                "license": {"name": "Custom terms; redistribution restricted", "url": "https://doc.emdat.be/legal/terms-of-use-2023/"},
                "verification": "permission-evidence-required",
            },
            {
                "id": "ifrc-pam",
                "name": "Pacific region: Tropical Cyclone Pam International Appeal",
                "shortName": "IFRC Pam appeal",
                "provider": "International Federation of Red Cross and Red Crescent Societies",
                "version": "MDR55001, 23 March 2015",
                "subset": "Vanuatu, Kiribati, Solomon Islands, Tuvalu and Papua New Guinea",
                "period": "March 2015",
                "usedFor": "qualitative Pam impact mechanisms and mixed-attribution warning",
                "fields": ["affected locations", "event chronology", "impact descriptions"],
                "accessed": "2026-07-16",
                "url": "https://adore.ifrc.org/Download.aspx?FileId=74462",
                "citationUrl": "https://www.ifrc.org/",
                "license": {"name": "Source citation", "url": "https://www.ifrc.org/terms-use"},
                "verification": "verified",
            },
            {
                "id": "wmo-pam",
                "name": "RA V Tropical Cyclone Committee report",
                "shortName": "WMO RA V report",
                "provider": "World Meteorological Organization",
                "version": "2015/16 season report",
                "subset": "South-West Pacific cyclone review",
                "period": "2015–2016",
                "usedFor": "Pam intensity and regional context",
                "fields": ["season review", "Pam intensity", "reported impacts"],
                "accessed": "2026-07-16",
                "url": "https://community.wmo.int/site/knowledge-hub/programmes-and-initiatives/tropical-cyclone-programme-tcp/tropical-cyclone-programme-final-reports-of-meetings",
                "citationUrl": "https://wmo.int/activities/tropical-cyclone-programme-tcp/tropical-cyclone-programme",
                "license": {"name": "Source citation", "url": "https://wmo.int/terms-use"},
                "verification": "verified",
            },
        ])
    return sources


def build_analysis(ev: pd.DataFrame, sst_raw: pd.DataFrame, sst: list, trends: dict,
                   story_evidence: dict, variant: str) -> dict:
    visible_evidence = deepcopy(story_evidence)
    if variant != "kurs":
        visible_evidence["pam"].pop("manualAnnotations", None)
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
        "storyEvidence": visible_evidence,
        "outcome": {"available": variant == "kurs"},
    }
    if variant == "kurs":
        analysis.update({
            "join": {
                "rule": "normalized storm name plus IBTrACS season within event year ±1",
                "matchedRows": int(ev["sid"].notna().sum()),
                "totalRows": int(len(ev)),
                "ambiguousRows": int((ev["match_method"] == "ambiguous").sum()),
            },
            "impact": {
                "unit": "storm-country pair",
                "populationFormula": "affected_pc = total_affected / population",
                "populationLastYear": ref.WPP_LAST_YEAR,
                "windRule": "basin-lifetime maximum USA_WIND in knots; EM-DAT magnitude ÷ 1.852 only for unmatched fallback rows",
            },
            "model": {
                "absoluteFormula": "log10(total_affected + 1) ~ intensity_kt",
                "perCapitaFormula": "log10(affected_pc) ~ intensity_kt",
                "residual": "observed log10 impact minus the value predicted by the wind-only OLS line",
                "band": "25th, 50th and 75th percentiles within six equally populated intensity bins",
            },
        })
    return analysis


def transformations(variant: str) -> list[dict]:
    common = [
        {"id": "sst-annual", "title": "Average the ocean context", "summary": "Group SST_ANOM by year and take an unweighted mean across the 21 available Pacific places.", "sourceIds": ["pdh-sst"]},
        {"id": "storm-trends", "title": "Summarise each cyclone season", "summary": "Keep tropical storms at or above 34 kt, then count storms and average their lifetime peak wind by season.", "sourceIds": ["ibtracs"]},
        {"id": "map-tracks", "title": "Prepare the map", "summary": "Keep six-hour main-track positions, normalise longitudes around the dateline and draw them over the 110m land boundary.", "sourceIds": ["ibtracs", "natural-earth"]},
    ]
    if variant != "kurs":
        return common
    return common + [
        {"id": "match-events", "title": "Match storms to reported impacts", "summary": "Normalise storm names and match each country record to one IBTrACS storm in the event year or an adjacent season.", "sourceIds": ["emdat", "ibtracs"]},
        {"id": "normalise-impact", "title": "Put countries on a comparable scale", "summary": "Divide reported affected people by that country's population in the event year; use the 2023 population for later years.", "sourceIds": ["emdat", "wpp"]},
        {"id": "fit-baseline", "title": "Build a wind-only baseline", "summary": "Fit a simple straight line in log space, then measure how far every complete record sits above or below it.", "sourceIds": ["emdat", "ibtracs", "wpp"]},
    ]
