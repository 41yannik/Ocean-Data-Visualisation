#!/usr/bin/env python3
"""CLI der Datenpipeline „From Track to Toll" — reine Orchestrierung der pipeline/-Module.

  python3 scripts/build_track_to_toll.py --variant kurs        (EM-DAT-basiert, NUR intern)
  python3 scripts/build_track_to_toll.py --variant challenge   (nur offene Daten)

Ausgaben nach app/public/data/:
  kurs:      events.json, meta.json          (gitignored — EM-DAT-Lizenz)
  challenge: events.challenge.json, meta.challenge.json
  beide:     tracks.json, sst.json           (offen: IBTrACS/SPC)
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from pipeline import reference as ref
from pipeline.io_load import load_emdat, load_ibtracs, load_wpp
from pipeline.join import match_events
from pipeline.intensity import apply_intensity
from pipeline.tracks import build_tracks
from pipeline.population import join_population
from pipeline.fits import fit, residuals, quantile_band
from pipeline.sst import build_sst_series
from pipeline.trends import build_trends
from pipeline.outputs import assemble_events, build_meta, write_json
from pipeline.validate import validate_kurs, validate_challenge, validate_sst, validate_trends


def run(variant: str, out_dir: Path) -> None:
    print(f"== Pipeline-Lauf: variant={variant} → {out_dir}")
    em, ib, wpp = load_emdat(), load_ibtracs(), load_wpp()

    ev = join_population(apply_intensity(match_events(em, ib), ib), wpp)
    fits = {m: fit(ev, m) for m in ("absolute", "perCapita")}
    bands = {m: quantile_band(ev, m) for m in ("absolute", "perCapita")}
    ev["residual_abs"] = residuals(ev, fits["absolute"], "absolute")
    ev["residual_pc"] = residuals(ev, fits["perCapita"], "perCapita")

    tracks = build_tracks(ib, ev["sid"].dropna().unique())
    sst = build_sst_series()
    trends = build_trends(ib)   # voller IBTrACS-Record (offen) → beide Varianten

    events_out = assemble_events(ev, variant)
    if variant == "challenge":
        tracks = {sid: pts for sid, pts in tracks.items() if sid in {e["sid"] for e in events_out}}
    meta = build_meta(ev, fits, bands, tracks, variant)

    suffix = "" if variant == "kurs" else ".challenge"
    sizes = {
        f"events{suffix}.json": write_json(events_out, out_dir / f"events{suffix}.json"),
        f"meta{suffix}.json": write_json(meta, out_dir / f"meta{suffix}.json"),
        "tracks.json": write_json(tracks, out_dir / "tracks.json"),
        "sst.json": write_json(sst, out_dir / "sst.json"),
        "trends.json": write_json(trends, out_dir / "trends.json"),
    }

    if variant == "kurs":
        validate_kurs(events_out, meta, tracks)
    else:
        validate_challenge(events_out, meta, tracks)
    validate_sst(sst)
    validate_trends(trends)

    total = sum(sizes.values())
    for name, size in sizes.items():
        print(f"  {name:24s} {size/1024:6.1f} KB")
    print(f"  {'GESAMT':24s} {total/1024:6.1f} KB")
    assert total < 300 * 1024, f"Output zu groß: {total/1024:.0f} KB"
    f = meta.get("fits", {})
    if f:
        print(f"  Fits: absolut R²={f['absolute']['r2']} (p={f['absolute']['p']}, n={f['absolute']['n']}) · "
              f"pro Kopf R²={f['perCapita']['r2']} (p={f['perCapita']['p']}, n={f['perCapita']['n']})")
    print(f"== {variant}: OK\n")


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--variant", choices=["kurs", "challenge", "beide"], default="kurs")
    ap.add_argument("--out", type=Path, default=ref.OUT_DIR)
    args = ap.parse_args()
    variants = ["kurs", "challenge"] if args.variant == "beide" else [args.variant]
    for v in variants:
        run(v, args.out)


if __name__ == "__main__":
    main()
