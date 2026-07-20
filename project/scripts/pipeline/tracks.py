"""Zugbahnen der gematchten Stürme: Haupttrack, 6h-Synoptik, Lon normalisiert, kompakt gerundet."""
import math

import pandas as pd

from pipeline.normalize import normalize_lon

SYNOPTIC_HOURS = {0, 6, 12, 18}


def build_tracks(ib: pd.DataFrame, sids) -> dict:
    """{sid: [[lon, lat, wind|None, sshs|None], …]} — nur Haupttrack, 6h-Punkte, 2 Dezimalstellen."""
    sub = ib[ib["SID"].isin(set(sids))].copy()
    if "TRACK_TYPE" in sub.columns:
        tt = sub["TRACK_TYPE"].astype(str).str.strip().str.lower()
        sub = sub[~tt.str.startswith("spur")]  # Abzweig-Tracks raus
        # je Sturm 'main' bevorzugen; junge Stürme (z. B. 2026/Maila) haben nur PROVISIONAL
        is_main = sub["TRACK_TYPE"].astype(str).str.strip().str.lower().eq("main")
        sids_with_main = set(sub.loc[is_main, "SID"])
        sub = sub[is_main | ~sub["SID"].isin(sids_with_main)]
    hours = pd.to_datetime(sub["ISO_TIME"], errors="coerce").dt.hour
    sub = sub[hours.isin(SYNOPTIC_HOURS)]
    sub = sub.sort_values(["SID", "ISO_TIME"])

    tracks = {}
    for sid, grp in sub.groupby("SID"):
        pts = []
        for lat, lon, wind, sshs in zip(grp["LAT"], grp["LON"], grp["USA_WIND"], grp["USA_SSHS"]):
            if pd.isna(lat) or pd.isna(lon):
                continue
            pts.append([
                round(normalize_lon(float(lon)), 2),
                round(float(lat), 2),
                None if pd.isna(wind) else int(wind),
                None if pd.isna(sshs) else int(sshs),
            ])
        if pts:
            tracks[sid] = pts
    return tracks


if __name__ == "__main__":
    import json

    from pipeline.challenge import build_challenge_events
    from pipeline.io_load import load_ibtracs, load_pdh_affected

    ib = load_ibtracs()
    ev = build_challenge_events(ib, load_pdh_affected())
    sids = ev["sid"].dropna().unique()
    tracks = build_tracks(ib, sids)

    n_pts = sum(len(v) for v in tracks.values())
    lons = [p[0] for v in tracks.values() for p in v]
    size_kb = len(json.dumps(tracks, separators=(",", ":"))) / 1024
    per_storm = sorted(len(v) for v in tracks.values())
    print(f"Tracks: {len(tracks)} Stürme · {n_pts} Punkte "
          f"(Median {per_storm[len(per_storm)//2]}, max {per_storm[-1]}) · {size_kb:.0f} KB kompakt")
    print(f"Lon-Bereich: {min(lons):.2f} … {max(lons):.2f}")
    crossing = sum(1 for v in tracks.values()
                   if any(abs(v[i][0] - v[i+1][0]) > 180 for i in range(len(v) - 1)))
    print(f"Dateline-kreuzende Stürme (|Δlon|>180 zwischen Nachbarpunkten): {crossing}")

    assert len(tracks) == len(sids), "nicht jeder gematchte Sturm hat einen Track!"
    assert all(-180 <= x <= 180 for x in lons), "Lon außerhalb [-180, 180]!"
    assert not any(math.isnan(x) for x in lons)
    assert size_kb < 150, f"tracks.json zu groß: {size_kb:.0f} KB"
    print("tracks: alle Smoke-Checks OK")
