#!/usr/bin/env python3
"""CLI der Datenpipeline „From Track to Toll" — reine Orchestrierung der pipeline/-Module.

  python3 scripts/build_track_to_toll.py

Offene Datenbasis (Land-Jahr): PDH-SDG-11.5.1-Betroffene × IBTrACS-Track-Nähe.
Ausgaben nach app/public/data/ (alle offen, eingecheckt):
  events.json, meta.json, tracks.json, sst.json/csv, trends.json/csv
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from pipeline import reference as ref
from pipeline.io_load import load_ibtracs, load_wpp, load_sst, load_pdh_affected
from pipeline.challenge import build_challenge_events, storm_exposed_count
from pipeline.tracks import build_tracks
from pipeline.population import join_population
from pipeline.fits import fit, residuals, quantile_band
from pipeline.sst import build_sst_series
from pipeline.trends import build_trends
from pipeline.evidence import build_story_evidence
from pipeline.outputs import (
    assemble_events, attach_artifacts, build_meta, trends_csv_rows, write_csv, write_json,
)
from pipeline.validate import (
    validate_events, validate_provenance, validate_sst, validate_trends,
)


def run(out_dir: Path) -> None:
    print(f"== Pipeline-Lauf → {out_dir}")
    ib, wpp, sst_raw = load_ibtracs(), load_wpp(), load_sst()

    ev = join_population(build_challenge_events(ib, load_pdh_affected()), wpp)
    storm_exposed = storm_exposed_count(ib)

    fits = {m: fit(ev, m) for m in ("absolute", "perCapita")}
    bands = {m: quantile_band(ev, m) for m in ("absolute", "perCapita")}
    ev["residual_abs"] = residuals(ev, fits["absolute"], "absolute")
    ev["residual_pc"] = residuals(ev, fits["perCapita"], "perCapita")

    sst = build_sst_series(sst_raw)
    trends = build_trends(ib)
    story_evidence = build_story_evidence(ib)

    events_out = assemble_events(ev)
    tracks = build_tracks(ib, ev["sid"].dropna().unique())
    tracks = {sid: pts for sid, pts in tracks.items() if sid in {e["sid"] for e in events_out}}
    meta = build_meta(ev, fits, bands, tracks, sst_raw, sst, trends, story_evidence,
                      storm_exposed=storm_exposed)

    sizes = {
        "events.json": write_json(events_out, out_dir / "events.json"),
        "tracks.json": write_json(tracks, out_dir / "tracks.json"),
        "sst.json": write_json(sst, out_dir / "sst.json"),
        "sst.csv": write_csv(sst, out_dir / "sst.csv"),
        "trends.json": write_json(trends, out_dir / "trends.json"),
        "trends.csv": write_csv(trends_csv_rows(trends), out_dir / "trends.csv"),
    }
    attach_artifacts(meta, out_dir, [
        "events.json", "tracks.json", "sst.json", "sst.csv",
        "trends.json", "trends.csv", "land-110m.json",
    ])
    sizes["meta.json"] = write_json(meta, out_dir / "meta.json")

    validate_events(events_out, meta, tracks)
    validate_sst(sst)
    validate_trends(trends)
    validate_provenance(meta)

    total = sum(sizes.values())
    for name, size in sizes.items():
        print(f"  {name:24s} {size/1024:6.1f} KB")
    print(f"  {'GESAMT':24s} {total/1024:6.1f} KB")
    assert total < 300 * 1024, f"Output zu groß: {total/1024:.0f} KB"
    f = meta["fits"]
    print(f"  Fits: absolut R²={f['absolute']['r2']} (p={f['absolute']['p']}, n={f['absolute']['n']}) · "
          f"pro Kopf R²={f['perCapita']['r2']} (p={f['perCapita']['p']}, n={f['perCapita']['n']})")
    print("== OK\n")


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--out", type=Path, default=ref.OUT_DIR)
    args = ap.parse_args()
    run(args.out)


if __name__ == "__main__":
    main()
