"""Frontend-Ausgaben: events/tracks/meta/sst als kompakte JSONs — variantenabhängig (Lizenz!).

Kurs-Variante:      EM-DAT-basiert, NUR intern (events.json/meta.json sind gitignored).
Challenge-Variante: ausschließlich offene Felder (IBTrACS/WPP); y-Quelle folgt in Teil B.
"""
import json
from datetime import date

import pandas as pd

from pipeline.reference import COUNTRY_NAMES, SUBREGION, CENTROIDS, YEAR_MIN, YEAR_MAX
from pipeline.normalize import normalize_name

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


def build_meta(ev: pd.DataFrame, fits: dict, bands: dict, tracks: dict, variant: str) -> dict:
    matched = ev["sid"].notna()
    meta = {
        "variant": variant,
        "generated": date.today().isoformat(),
        "window": [YEAR_MIN, YEAR_MAX],
        "unit": "storm-country pair",
        "coverage": {
            "rows": int(len(ev)),
            "distinct_storms": int(ev["disno"].str.rsplit("-", n=1).str[0].nunique()),
            "matched_rows": int(matched.sum()),
            "matched_sids": int(ev.loc[matched, "sid"].nunique()),
            "tracks": len(tracks),
        },
        "caveats": [
            "2025 has no recorded events; 2026 entries are recent and subject to EM-DAT revision.",
            "Population for 2024+ is forward-filled from WPP 2023 (flag: pop_extrapolated).",
            "Storm-country pairs of one storm share the same peak intensity (clustered points).",
            "Intensity is basin-lifetime peak USA_WIND (1-min, kt), not wind at landfall.",
        ],
        "sources": [
            {"name": "IBTrACS v04r01 (SP+WP)", "provider": "NOAA/NCEI", "license": "Public Domain"},
            {"name": "UN World Population Prospects", "provider": "UN DESA", "license": "CC BY 3.0 IGO"},
            {"name": "Mean sea surface temperature anomalies", "provider": "SPC / Pacific Data Hub", "license": "official challenge dataset"},
        ],
        "centroids": {iso3: [lon, lat] for iso3, (lon, lat) in CENTROIDS.items()},
    }
    if variant == "kurs":
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
        meta["sources"].append({
            "name": "EM-DAT (CRED / UCLouvain)", "provider": "CRED",
            "license": "INTERNAL USE ONLY — educational; do not redistribute or publish derivatives",
        })
        meta["license_note"] = "Kurs-Variante: enthält EM-DAT-Derivate — nicht veröffentlichen (siehe docs/decisions/2026-07-02_datenquellen.md)."
    else:
        meta["note"] = "Challenge-Variante: y-Quelle (Schadensmaß) folgt in Teil B nach der Kursabgabe; enthält ausschließlich offene Daten."
    return meta


def write_json(obj, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
    return path.stat().st_size
