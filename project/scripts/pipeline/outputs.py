"""Frontend-Ausgaben und strukturierte Provenienz — variantenabhängig (Lizenz!)."""
import csv
import hashlib
import json
from datetime import date
from pathlib import Path

import pandas as pd

from pipeline.reference import (
    COUNTRY_NAMES, SUBREGION, CENTROIDS,
    CHALLENGE_YEAR_MIN, CHALLENGE_YEAR_MAX, CHALLENGE_PROXIMITY_KM,
)
from pipeline.normalize import normalize_name
from pipeline.provenance import (
    build_analysis, git_build_info, publication_policy, source_catalog, transformations,
)

# Leck-Guard: Felder, die nur aus EM-DAT stammen könnten und im offenen Output NIE
# auftauchen dürfen. affected/affected_pc/residual_* stammen offen aus PDH+IBTrACS.
EMDAT_FIELDS = {"disno", "magnitude", "damage_kusd", "damage_adj_kusd", "deaths"}


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


def assemble_events(ev: pd.DataFrame) -> list:
    """Offene Land-Jahr-Records (PDH-Betroffene × IBTrACS-Nähe), ein Record je (iso3, Jahr)."""
    records = []
    for r in ev.itertuples(index=False):
        records.append({
            "id": f"{r.iso3}-{r.year}",
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
            "affected": _clean(r.total_affected),
            # 9 statt 6 Nachkommastellen: bei winzigen Tolls (z. B. 2 Betroffene in PNG)
            # darf ein positiver Anteil nicht auf 0 runden, sonst log10(0)=NaN im Frontend.
            "affected_pc": None if pd.isna(r.affected_pc) else round(float(r.affected_pc), 9),
            "residual_abs": _clean(r.residual_abs),
            "residual_pc": _clean(r.residual_pc),
        })
    return records


def build_meta(ev: pd.DataFrame, fits: dict, bands: dict, tracks: dict,
               sst_raw: pd.DataFrame, sst: list, trends: dict, story_evidence: dict,
               storm_exposed: int | None = None) -> dict:
    matched = ev["sid"].notna()
    scatterable = int((ev["intensity_kt"].notna() & ev["total_affected"].notna()).sum())
    with_affected = int(ev["total_affected"].notna().sum())
    meta = {
        "variant": "open",
        "generated": date.today().isoformat(),
        "publication": publication_policy(),
        "build": git_build_info(),
        "window": [CHALLENGE_YEAR_MIN, CHALLENGE_YEAR_MAX],
        "unit": "country-year",
        "coverage": {
            "rows": int(len(ev)),
            "distinct_storms": int(ev.loc[matched, "sid"].nunique()),
            "matched_rows": int(matched.sum()),
            "matched_sids": int(ev.loc[matched, "sid"].nunique()),
            "tracks": len(tracks),
            "with_intensity": int(ev["intensity_kt"].notna().sum()),
            "with_affected": with_affected,
            "scatterable": scatterable,
            "missing_wind": int(with_affected - scatterable),   # Toll gemeldet, kein naher Sturm
            "storm_exposed": int(storm_exposed) if storm_exposed is not None else None,
            "missing_toll": (int(storm_exposed) - scatterable) if storm_exposed is not None else None,
            "pop_extrapolated_rows": int(ev["pop_extrapolated"].sum()),
        },
        "caveats": [
            "Affected counts are annual and cover every disaster in that year, not the named cyclone alone.",
            f"A country-year is linked to a storm only if a track passed within {CHALLENGE_PROXIMITY_KM} km "
            "of its centroid; some reported tolls (floods, droughts) have no nearby cyclone.",
            "Resolution is country-year, so one point is the strongest storm of the year, not a single landfall.",
            "Only 15 of 21 territories report to this series; Guam, CNMI, Niue and others are absent.",
            "Reported impact depends on what institutions were able to record; missing does not mean zero.",
        ],
        "sources": source_catalog(),
        "transformations": transformations(),
        "analysis": build_analysis(ev, sst_raw, sst, trends, story_evidence, storm_exposed),
        "artifacts": [],
        "centroids": {iso3: [lon, lat] for iso3, (lon, lat) in CENTROIDS.items()},
        "fits": fits,
        "bands": bands,
    }
    meta["license_note"] = meta["publication"]["note"]
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
        "events.json": "Country-year impact records (JSON)",
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
