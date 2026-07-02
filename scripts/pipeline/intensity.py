"""Intensität je Sturm: durchgängig USA_WIND (1-min, kt) + max(USA_SSHS); EM-DAT-magnitude nur als Fallback.

Kein Mischen mit WMO_WIND (10-min): basin-abhängiger Bias bis ~15 % (siehe Review 2026-07-02 / C4).
"""
import pandas as pd

KMH_PER_KT = 1.852


def peak_intensity(ib: pd.DataFrame, sids) -> pd.DataFrame:
    """Je SID: Peak-USA_WIND (kt) und max. USA_SSHS-Kategorie."""
    sub = ib[ib["SID"].isin(set(sids))]
    peaks = (
        sub.groupby("SID")
           .agg(usa_wind_peak=("USA_WIND", "max"), sshs_max=("USA_SSHS", "max"))
           .reset_index()
           .rename(columns={"SID": "sid"})
    )
    return peaks


def apply_intensity(matched: pd.DataFrame, ib: pd.DataFrame) -> pd.DataFrame:
    """Hängt intensity_kt, intensity_source, category an die gematchten EM-DAT-Zeilen."""
    peaks = peak_intensity(ib, matched["sid"].dropna().unique())
    out = matched.merge(peaks, on="sid", how="left")

    ib_ok = out["usa_wind_peak"].notna()
    fb_ok = ~ib_ok & out["magnitude"].notna()  # magnitude_scale ist durchgängig 'Kph'

    out["intensity_kt"] = pd.NA
    out.loc[ib_ok, "intensity_kt"] = out.loc[ib_ok, "usa_wind_peak"]
    out.loc[fb_ok, "intensity_kt"] = (out.loc[fb_ok, "magnitude"] / KMH_PER_KT).round(0)
    out["intensity_kt"] = pd.to_numeric(out["intensity_kt"], errors="coerce")

    out["intensity_source"] = None
    out.loc[ib_ok, "intensity_source"] = "ibtracs"
    out.loc[fb_ok, "intensity_source"] = "emdat_fallback"

    out["category"] = out["sshs_max"].astype("Int64")  # -5..5; nur für Join-Stürme
    return out.drop(columns=["usa_wind_peak", "sshs_max"])


if __name__ == "__main__":
    from pipeline.io_load import load_emdat, load_ibtracs
    from pipeline.join import match_events

    em, ib = load_emdat(), load_ibtracs()
    ev = apply_intensity(match_events(em, ib), ib)

    src = ev["intensity_source"].value_counts(dropna=False)
    print("Intensitätsquelle:\n" + src.to_string())
    n_int = ev["intensity_kt"].notna().sum()
    n_scatter = (ev["intensity_kt"].notna() & ev["total_affected"].notna()).sum()
    print(f"Intensität gesamt: {n_int}/99 · scatterfähig (Intensität+Betroffene): {n_scatter}/99")

    from pipeline.normalize import normalize_name
    names = ev["event_name"].map(normalize_name)
    winston = ev[(names == "WINSTON") & (ev["iso3"] == "FJI")].iloc[0]
    print(f"Winston/FJI: {winston['intensity_kt']} kt, Quelle {winston['intensity_source']}, "
          f"Kat {winston['category']}, Betroffene {winston['total_affected']:.0f}")
    assert winston["intensity_source"] == "ibtracs" and winston["total_affected"] == 540558

    joined = ev["sid"].notna()
    assert (ev.loc[joined, "intensity_source"] == "ibtracs").all(), "gematchte Stürme ohne USA_WIND!"
    assert n_scatter >= 74, f"scatterfähig nur {n_scatter} (< 74)"
    print("intensity: alle Smoke-Checks OK")
