"""Regressionen (in Python, nie im Frontend): absolut + pro Kopf, Residuen, Quantilband-Stützpunkte."""
import math

import numpy as np
import pandas as pd
from scipy import stats


def _xy(events: pd.DataFrame, mode: str):
    if mode == "absolute":
        m = events["intensity_kt"].notna() & events["total_affected"].notna()
        y = np.log10(events.loc[m, "total_affected"] + 1)
    elif mode == "perCapita":
        m = events["intensity_kt"].notna() & events["affected_pc"].notna()
        y = np.log10(events.loc[m, "affected_pc"])  # min 7.7e-5, keine Nullen (verifiziert)
    else:
        raise ValueError(mode)
    return events.loc[m], events.loc[m, "intensity_kt"].astype(float), y


def fit(events: pd.DataFrame, mode: str) -> dict:
    _, x, y = _xy(events, mode)
    lr = stats.linregress(x, y)
    return {
        "mode": mode,
        "slope": round(lr.slope, 6),
        "intercept": round(lr.intercept, 4),
        "r2": round(lr.rvalue ** 2, 4),
        "p": round(lr.pvalue, 5),
        "n": int(len(x)),
        "y_transform": "log10(affected+1)" if mode == "absolute" else "log10(affected_pc)",
    }


def residuals(events: pd.DataFrame, fit_params: dict, mode: str) -> pd.Series:
    """Residuum je Zeile (NaN, wo x oder y fehlt) — Interpretation: Abweichung vom Intensitätstrend."""
    sub, x, y = _xy(events, mode)
    pred = fit_params["slope"] * x + fit_params["intercept"]
    res = pd.Series(np.nan, index=events.index)
    res.loc[sub.index] = (y - pred).round(4)
    return res

def quantile_band(events: pd.DataFrame, mode: str, n_bins: int = 6) -> list:
    """Gleitende Stützpunkte fürs Band: je Intensitäts-Bin (gleich besetzt) q25/q50/q75 von y."""
    _, x, y = _xy(events, mode)
    df = pd.DataFrame({"x": x, "y": y}).sort_values("x").reset_index(drop=True)
    df["bin"] = pd.qcut(df["x"], q=n_bins, duplicates="drop")
    band = []
    for _, grp in df.groupby("bin", observed=True):
        band.append({
            "x": round(float(grp["x"].mean()), 1),
            "q25": round(float(grp["y"].quantile(0.25)), 3),
            "q50": round(float(grp["y"].quantile(0.50)), 3),
            "q75": round(float(grp["y"].quantile(0.75)), 3),
            "n": int(len(grp)),
        })
    return band


if __name__ == "__main__":
    from pipeline.io_load import load_emdat, load_ibtracs, load_wpp
    from pipeline.join import match_events
    from pipeline.intensity import apply_intensity
    from pipeline.population import join_population

    em, ib, wpp = load_emdat(), load_ibtracs(), load_wpp()
    ev = join_population(apply_intensity(match_events(em, ib), ib), wpp)

    for mode in ("absolute", "perCapita"):
        f = fit(ev, mode)
        print(f"{mode:10s}: n={f['n']:2d}  slope={f['slope']:+.5f}/kt  R²={f['r2']:.4f}  p={f['p']:.5f}")
        band = quantile_band(ev, mode)
        print(f"            Band: {len(band)} Stützpunkte, x {band[0]['x']}–{band[-1]['x']} kt")
        res = residuals(ev, f, mode)
        assert res.notna().sum() == f["n"]

    f_pc = fit(ev, "perCapita")
    assert f_pc["p"] < 0.05, f"Pro-Kopf-Fit nicht signifikant (p={f_pc['p']}) — Konzeptannahme verletzt!"
    assert not math.isnan(f_pc["r2"])
    print("fits: alle Smoke-Checks OK")
