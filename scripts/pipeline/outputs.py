"""Frontend-Ausgaben und strukturierte Provenienz — variantenabhängig (Lizenz!)."""
import csv
import hashlib
import json
from datetime import date
from pathlib import Path

import pandas as pd

from pipeline.reference import COUNTRY_NAMES, SUBREGION, CENTROIDS, YEAR_MIN, YEAR_MAX
from pipeline.normalize import normalize_name
from pipeline.provenance import (
    build_analysis, git_build_info, publication_policy, source_catalog, transformations,
)

# Felder, die in der Challenge-Variante NIE auftauchen dürfen (EM-DAT-Derivate)
EMDAT_FIELDS = {
    "disno", "affected", "affected_pc", "deaths", "damage_kusd", "damage_adj_kusd",
    "magnitude", "residual_abs", "residual_pc", "intensity_source",
}


def _clean(v):
    if v is None or (isinstance(v, float) and pd.isna(v)) or v is pd.NA:
        return None
    if isinstance(v, (pd.Timestamp,)):
        return str(v)
    if hasattr(v, "item"):
        return v.item()
    return v


def _display_name(raw):
    n = normalize_name(raw)
    return n.title() if n else None


def assemble_events(ev: pd.DataFrame, variant: str) -> list:
    records = []
    for r in ev.itertuples(index=False):
        base = {
            "sid": _clean(r.sid),
            "name": _display_name(r.event_name),
            "year": int(r.year),
            "iso3": r.iso3,
            "country": COUNTRY_NAMES.get(r.iso3, r.country),
            "subregion": SUBREGION.get(r.iso3),
            "intensity_kt": _clean(r.intensity_kt),
            "category": _clean(r.category),
            "pop": _clean(r.pop),
            "pop_extrapolated": bool(r.pop_extrapolated),
        }
        if variant == "kurs":
            records.append({
                "id": r.disno,
                **base,
                "intensity_source": _clean(r.intensity_source),
                "affected": _clean(r.total_affected),
                "affected_pc": None if pd.isna(r.affected_pc) else round(float(r.affected_pc), 6),
                "deaths": _clean(r.total_deaths),
                "damage_kusd": _clean(r.total_damage_kusd),
                "residual_abs": _clean(r.residual_abs),
                "residual_pc": _clean(r.residual_pc),
            })
        else:  # challenge: nur offene Quellen; nur Join-Stürme (Fallback-Intensität wäre EM-DAT)
            if r.sid is None or (isinstance(r.sid, float) and pd.isna(r.sid)):
                continue
            if r.intensity_source != "ibtracs":
                continue
            records.append({"id": f"{r.sid}-{r.iso3}", **base})
    return records


def build_meta(ev: pd.DataFrame, fits: dict, bands: dict, tracks: dict, variant: str,
               sst_raw: pd.DataFrame, sst: list, trends: dict, story_evidence: dict) -> dict:
    matched = ev["sid"].notna()
    meta = {
        "variant": variant,
        "generated": date.today().isoformat(),
        "publication": publication_policy(variant),
        "build": git_build_info(),
        "window": [YEAR_MIN, YEAR_MAX],
        "unit": "storm-country pair",
        "coverage": {
            "rows": int(len(ev)),
            "distinct_storms": int(ev["disno"].str.rsplit("-", n=1).str[0].nunique()),
            "matched_rows": int(matched.sum()),
            "matched_sids": int(ev.loc[matched, "sid"].nunique()),
            "tracks": len(tracks),
        },
        "caveats": [],
        "sources": source_catalog(variant),
        "transformations": transformations(variant),
        "analysis": build_analysis(ev, sst_raw, sst, trends, story_evidence, variant),
        "artifacts": [],
        "centroids": {iso3: [lon, lat] for iso3, (lon, lat) in CENTROIDS.items()},
    }
    if variant == "kurs":
        meta["caveats"] = [
            "2025 has no recorded events; 2026 entries are recent and subject to source revision.",
            "Population for 2024+ is forward-filled from WPP 2023 (flag: pop_extrapolated).",
            "Storm-country pairs of one storm share the same peak intensity (clustered points).",
            "Intensity is basin-lifetime peak USA_WIND (1-min, kt), not wind at landfall.",
            "Reported impact depends on what institutions were able to record; missing does not mean zero.",
        ]
        meta["coverage"].update({
            "with_intensity": int(ev["intensity_kt"].notna().sum()),
            "with_affected": int(ev["total_affected"].notna().sum()),
            "with_deaths": int(ev["total_deaths"].notna().sum()),
            "scatterable": int((ev["intensity_kt"].notna() & ev["total_affected"].notna()).sum()),
            "fallback_rows": int((ev["intensity_source"] == "emdat_fallback").sum()),
            "pop_extrapolated_rows": int(ev["pop_extrapolated"].sum()),
        })
        meta["fits"] = fits
        meta["bands"] = bands
        meta["license_note"] = meta["publication"]["note"]
    else:
        meta["caveats"] = [
            "The open-data outcome measure has not been selected, so this placeholder cannot support the impact story.",
            "Population after 2023 would use the last observed value unless a newer verified series is adopted.",
            "Intensity is basin-lifetime peak USA_WIND (1-min, kt), not wind at landfall.",
        ]
        meta["note"] = meta["publication"]["note"]
    return meta


def write_json(obj, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
    return path.stat().st_size


def write_csv(rows: list[dict], path: Path) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    fields = list(rows[0]) if rows else []
    with open(path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)
    return path.stat().st_size


def trends_csv_rows(trends: dict) -> list[dict]:
    s = trends["series"]
    return [
        {
            "season": season,
            "storm_count": s["count"][i],
            "mean_peak_wind_kt": s["meanWind"][i],
        }
        for i, season in enumerate(s["season"])
    ]


def attach_artifacts(meta: dict, out_dir: Path, filenames: list[str]) -> None:
    """Hashwerte nach dem Schreiben ergänzen; meta.json hasht sich bewusst nicht selbst."""
    allowed = set(meta["publication"]["allowedDownloads"])
    labels = {
        "sst.json": "Annual SST anomaly series (JSON)",
        "sst.csv": "Annual SST anomaly series (CSV)",
        "trends.json": "Seasonal storm trends and fits (JSON)",
        "trends.csv": "Seasonal storm trends (CSV)",
        "tracks.json": "Processed cyclone tracks (JSON)",
        "land-110m.json": "Natural Earth 110m land boundary (TopoJSON)",
    }
    artifacts = []
    for filename in filenames:
        path = out_dir / filename
        if not path.exists():
            continue
        artifacts.append({
            "id": filename.replace(".", "-"),
            "name": labels.get(filename, filename),
            "file": filename,
            "format": path.suffix.removeprefix(".").upper(),
            "bytes": path.stat().st_size,
            "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
            "downloadable": filename in allowed,
        })
    meta["artifacts"] = artifacts
