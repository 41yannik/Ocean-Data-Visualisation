#!/usr/bin/env python3
"""
ETL für die 3D-Globus-Scrollytelling-Visualisierung.

Erzeugt aus IBTrACS (Sturm-Spuren) + offiziellen Impact-Daten schlanke App-Daten:
  - cyclones.json : tropische Zyklone (SP + WP), je Sturm eine ausgedünnte Spur mit Kategorie
  - islands.json  : 21 PICT-Koordinaten + Betroffene je Jahr (aus app/public/data/ocean.json)

Quellen: IBTrACS v04r01 (NOAA, public domain), Pacific Data Hub (VC_DSR_AFFCT, via ocean.json).
EM-DAT bewusst NICHT verwendet (CC BY-NC-ND).

Aufruf:  python3 scripts/build_globe_dataset.py
"""

from __future__ import annotations

import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EXT = ROOT / "Data" / "external"
APP = ROOT / "app" / "public" / "data"
APP.mkdir(parents=True, exist_ok=True)

SEASON_MIN = 1980
# Mikronesien-Band (für WP-Taifune nahe Guam/FSM/Marshall)
WP_BBOX = (128, 175, 0, 25)  # lon_min, lon_max, lat_min, lat_max

# Hero-Stürme (SID) → feinere Auflösung + im Frontend referenziert
HERO_SIDS = {
    "2016041S14170",  # Winston 2016 (Fiji)
    "2015066S08170",  # Pam 2015 (Vanuatu)
    "2020092S09155",  # Harold 2020 (Vanuatu/Tonga)
    "2020346S13168",  # Yasa 2020/21 (Fiji)
    "2018038S15172",  # Gita 2018 (Tonga)
}

# 21 PICT — Haupt-/Hauptstadt-Koordinaten [lon, lat]
ISLAND_COORDS = {
    "ASM": (-170.13, -14.27), "COK": (-159.78, -21.21), "FJI": (178.0, -17.8),
    "FSM": (158.16, 6.92), "GUM": (144.79, 13.44), "KIR": (173.0, 1.42),
    "MHL": (171.38, 7.09), "MNP": (145.75, 15.18), "NCL": (166.46, -22.27),
    "NIU": (-169.92, -19.05), "NRU": (166.93, -0.52), "PLW": (134.48, 7.34),
    "PNG": (147.18, -9.44), "PYF": (-149.57, -17.53), "PCN": (-130.10, -25.07),
    "SLB": (159.95, -9.43), "TKL": (-171.85, -9.2), "TON": (-175.20, -21.13),
    "TUV": (179.2, -8.52), "VUT": (168.31, -17.74), "WLF": (-176.2, -13.3),
    "WSM": (-171.78, -13.76),
}


def norm_lon(lon: float) -> float:
    while lon > 180:
        lon -= 360
    while lon < -180:
        lon += 360
    return lon


def to_int(s):
    try:
        return int(float(s))
    except (TypeError, ValueError):
        return None


def to_float(s):
    try:
        return float(s)
    except (TypeError, ValueError):
        return None


def read_storms(path: Path):
    """Gruppiert IBTrACS-Zeilen zu Stürmen. Überspringt die Einheiten-Zeile (Season nicht numerisch)."""
    storms: dict[str, dict] = {}
    with path.open(newline="", encoding="utf-8") as f:
        r = csv.DictReader(f)
        for row in r:
            season = to_int(row.get("SEASON"))
            if season is None:  # Einheiten-Zeile / kaputt
                continue
            lat = to_float(row.get("LAT"))
            lon = to_float(row.get("LON"))
            if lat is None or lon is None:
                continue
            sid = row["SID"]
            cat = to_int(row.get("USA_SSHS"))
            if cat is None:
                cat = -1
            s = storms.get(sid)
            if s is None:
                s = storms[sid] = {
                    "sid": sid, "name": (row.get("NAME") or "").title() or "Unnamed",
                    "season": season, "basin": row.get("BASIN", ""), "maxcat": -1, "raw": [],
                }
            s["raw"].append((norm_lon(lon), lat, cat))
            s["maxcat"] = max(s["maxcat"], cat)
    return storms


def in_bbox(pts, bbox):
    lo1, lo2, la1, la2 = bbox
    return any(lo1 <= p[0] <= lo2 and la1 <= p[1] <= la2 for p in pts)


def thin(pts, step):
    if len(pts) <= 2:
        return pts
    out = pts[::step]
    if out[-1] != pts[-1]:
        out.append(pts[-1])
    return out


def build_storm(s):
    is_hero = s["sid"] in HERO_SIDS
    step = 1 if is_hero else 3
    pts = [[round(lo, 2), round(la, 2), cat] for lo, la, cat in thin(s["raw"], step)]
    return {
        "sid": s["sid"], "name": s["name"], "season": s["season"],
        "basin": s["basin"], "maxcat": s["maxcat"], "hero": is_hero, "pts": pts,
    }


def main():
    raw = {}
    for fname in ("ibtracs.SP.list.v04r01.csv", "ibtracs.WP.list.v04r01.csv"):
        raw.update(read_storms(EXT / fname))

    storms = []
    for s in raw.values():
        if s["season"] < SEASON_MIN:
            continue
        if len(s["raw"]) < 4:
            continue
        if s["basin"] == "WP" and not (s["sid"] in HERO_SIDS or in_bbox(s["raw"], WP_BBOX)):
            continue  # WP nur nahe Mikronesien
        if s["maxcat"] < 1 and s["sid"] not in HERO_SIDS:
            continue  # Backdrop nur Hurrikan-/Zyklonstärke (Cat 1+)
        storms.append(build_storm(s))

    storms.sort(key=lambda s: (not s["hero"], -s["maxcat"], s["season"]))

    # ── Inseln + Betroffene je Jahr aus ocean.json ──────────────────────
    ocean = json.loads((APP / "ocean.json").read_text(encoding="utf-8"))
    affected: dict[str, dict[str, int]] = {}
    info: dict[str, tuple[str, str]] = {}
    for rec in ocean:
        info[rec["iso3"]] = (rec["country"], rec["region"])
        if rec.get("affected") is not None:
            affected.setdefault(rec["iso3"], {})[str(rec["year"])] = int(rec["affected"])

    islands = []
    for iso3, (lon, lat) in ISLAND_COORDS.items():
        name, region = info.get(iso3, (iso3, ""))
        islands.append({
            "iso3": iso3, "name": name, "region": region,
            "lon": lon, "lat": lat, "affected": affected.get(iso3, {}),
        })

    (APP / "cyclones.json").write_text(json.dumps({"storms": storms}, ensure_ascii=False), encoding="utf-8")
    (APP / "islands.json").write_text(json.dumps(islands, ensure_ascii=False), encoding="utf-8")

    pts_total = sum(len(s["pts"]) for s in storms)
    heroes = [s["name"] for s in storms if s["hero"]]
    sz = (APP / "cyclones.json").stat().st_size // 1024
    print(f"cyclones.json: {len(storms)} Stürme, {pts_total} Punkte, {sz} KB")
    print(f"  Heroes: {heroes}")
    print(f"islands.json: {len(islands)} Inseln, mit Betroffenen-Daten: {len(affected)}")


if __name__ == "__main__":
    main()
