"""Regressionen (in Python, nie im Frontend): absolut + pro Kopf, Landesgrößen-Fit,
Quantilband-Stützpunkte.

Alle Fits laufen NUR über Records mit positivem Toll (affected > 0). Die gemeldeten
Nullen bleiben in den Daten (sie sind der Kern des Ehrlichkeits-Beats), können aber
nicht in eine log-Regression eingehen. Die Maske ist damit der Log-Schutz, den früher
ein Datenfilter in challenge.py leistete (Audit 2026-07).
"""
import math

import numpy as np
import pandas as pd
from scipy import stats


def _xy(events: pd.DataFrame, mode: str):
    """(Teiltabelle, x, y) für einen Fit. positive = Log-Definitionsbereich."""
    positive = events["total_affected"].notna() & (events["total_affected"] > 0)
    if mode == "absolute":
        m = events["intensity_kt"].notna() & positive
        x = events.loc[m, "intensity_kt"].astype(float)
        y = np.log10(events.loc[m, "total_affected"] + 1)
    elif mode == "perCapita":
        m = events["intensity_kt"].notna() & events["affected_pc"].notna() & positive
        x = events.loc[m, "intensity_kt"].astype(float)
        y = np.log10(events.loc[m, "affected_pc"])
    elif mode == "popSize":
        # Landesgrößen-Fit: erklärt der Bevölkerungsnenner den gemeldeten Anteil
        # besser als der Wind? Läuft bewusst auf DERSELBEN Stichprobe wie perCapita
        # (inkl. intensity_kt-Bedingung) — sonst wäre der R²-Vergleich der Story
        # ein Vergleich zweier verschiedener Datensätze.
        m = (events["intensity_kt"].notna() & events["pop"].notna() & (events["pop"] > 0)
             & events["affected_pc"].notna() & positive)
        x = np.log10(events.loc[m, "pop"].astype(float))
        y = np.log10(events.loc[m, "affected_pc"])
    else:
        raise ValueError(mode)
    return events.loc[m], x, y


_Y_TRANSFORM = {
    "absolute": "log10(affected+1)",
    "perCapita": "log10(affected_pc)",
    "popSize": "log10(affected_pc)",
}
_X_TRANSFORM = {
    "absolute": "intensity_kt",
    "perCapita": "intensity_kt",
    "popSize": "log10(pop)",
}


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
        "x_transform": _X_TRANSFORM[mode],
        "y_transform": _Y_TRANSFORM[mode],
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
    from pipeline.challenge import build_challenge_events
    from pipeline.io_load import load_ibtracs, load_pdh_affected, load_wpp
    from pipeline.population import join_population

    ev = join_population(build_challenge_events(load_ibtracs(), load_pdh_affected()), load_wpp())

    for mode in ("absolute", "perCapita", "popSize"):
        f = fit(ev, mode)
        print(f"{mode:10s}: n={f['n']:2d}  slope={f['slope']:+.5f}  R²={f['r2']:.4f}  p={f['p']:.5f}"
              f"   ({f['y_transform']} ~ {f['x_transform']})")
        res = residuals(ev, f, mode)
        assert res.notna().sum() == f["n"], f"Residuen-Anzahl weicht von n ab ({mode})"
        assert np.isfinite(res.dropna()).all(), f"nicht-endliches Residuum ({mode})"

    for mode in ("absolute", "perCapita"):
        band = quantile_band(ev, mode)
        print(f"{mode:10s}: Band {len(band)} Stützpunkte, x {band[0]['x']}–{band[-1]['x']} kt")

    # Strukturelle Checks. KEINE Signifikanz-Erwartung mehr: ob der Wind etwas erklärt,
    # ist der Befund der Story und darf kein Build-Gate sein (Audit 2026-07).
    f_pc = fit(ev, "perCapita")
    assert not math.isnan(f_pc["r2"]), "R² ist NaN"
    assert f_pc["n"] == int((ev["intensity_kt"].notna() & (ev["total_affected"] > 0)).sum())
    print(f"\nBefund (nicht erzwungen): Wind erklärt R²={f_pc['r2']:.4f} (p={f_pc['p']:.3f}), "
          f"Landesgröße R²={fit(ev, 'popSize')['r2']:.4f}")
    print("fits: alle Smoke-Checks OK")
