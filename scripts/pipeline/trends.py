"""Physischer Sturmtrend fürs Story-Intro (Paket „no-trend"): aus dem VOLLEN IBTrACS-Record
(SP+WP, alle Stürme — nicht nur die Katastrophen-Teilmenge) je Saison Häufigkeit, mittlerer
Spitzenwind und Entstehungsbreite. Fenster 2001–2025 (Story-Fenster; 2026 unvollständig).

Kernaussage, die validate_trends absichert: Zahl flach, Mittelwind flach (beide nicht
signifikant) — nur die Nordwestpazifik-Entstehungsbreite wandert signifikant polwärts.
Regressionen hier in Python (nie im Frontend), gleiche Konvention wie fits.py."""
import numpy as np
import pandas as pd
from scipy import stats

WINDOW = (2001, 2025)   # Story-Fenster; deckt sich mit der Impact-Analyse (meta.window)
TS_MIN_KT = 34          # Tropensturm-Stärke: schwache/rausch-Systeme raus


def _fit(years, values) -> dict:
    """OLS über (Saison, Wert); vor-formatierte Kennzahlen inkl. Trend pro Dekade.
    NaN-Paare werden verworfen (write_json erlaubt kein NaN)."""
    x = np.asarray(years, dtype=float)
    y = np.asarray(values, dtype=float)
    m = np.isfinite(x) & np.isfinite(y)
    x, y = x[m], y[m]
    lr = stats.linregress(x, y)
    return {
        "slope": round(float(lr.slope), 6),
        "intercept": round(float(lr.intercept), 4),
        "r2": round(float(lr.rvalue ** 2), 4),
        "p": round(float(lr.pvalue), 5),
        "n": int(len(x)),
        "perDecade": round(float(lr.slope) * 10, 2),
    }


def _clean(seq):
    """NaN → None für die JSON-Serialisierung (write_json: allow_nan=False)."""
    return [None if (v is None or (isinstance(v, float) and np.isnan(v))) else v for v in seq]


def build_trends(ib: pd.DataFrame) -> dict:
    """Aggregiert das volle ib-DataFrame (kein Reload) zu per-Saison-Serien + Fits.
    Rückgabe-Shape siehe unten; alle Zahlen vor-gerundet, keine NaN."""
    lo, hi = WINDOW
    df = ib.copy()
    df["wind"] = df["USA_WIND"].fillna(df["WMO_WIND"])
    # ISO_TIME (String "YYYY-MM-DD …") sortiert lexikografisch = chronologisch → erster Fix zuerst
    df = df.sort_values(["SID", "ISO_TIME"])

    grp = df.groupby("SID", sort=False)
    storms = pd.DataFrame({
        "season": grp["SEASON"].first().astype("Int64"),
        "peak": grp["wind"].max(),
    })
    # Genesis = erster Fix, der Sturmstärke erreicht (bei TS+ existiert er garantiert)
    ts = df[df["wind"] >= TS_MIN_KT]
    gen = ts.groupby("SID", sort=False).agg(glat=("LAT", "first"), gbasin=("BASIN", "first"))
    storms = storms.join(gen)

    # Nur TS+ im Story-Fenster; Saison als int
    keep = storms[(storms["peak"] >= TS_MIN_KT)
                  & (storms["season"] >= lo) & (storms["season"] <= hi)].copy()
    keep["season"] = keep["season"].astype(int)

    years = list(range(lo, hi + 1))

    # --- Panels A/B: Pacific-wide ALL je Saison ---
    by = keep.groupby("season")
    count = by.size().reindex(years, fill_value=0)
    mean_wind = by["peak"].mean().reindex(years).round(1)

    # --- Panel C: Entstehungsbreite (|lat|, Abstand vom Äquator) je Becken ---
    keep["abslat"] = keep["glat"].abs()
    def _abslat_by_basin(basin):
        sub = keep[keep["gbasin"] == basin]
        return sub.groupby("season")["abslat"].mean().reindex(years).round(2)
    gen_wp = _abslat_by_basin("WP")
    gen_sp = _abslat_by_basin("SP")

    fits = {
        "count":     _fit(years, count.values),
        "windMean":  _fit(years, mean_wind.values),
        "genesisWP": _fit(years, gen_wp.values),
        "genesisSP": _fit(years, gen_sp.values),
    }

    # --- Zusammenfassung (robuste 3-/5-Jahres-Ränder statt verrauschter Einzeljahre) ---
    cnt = count.values.astype(float)
    wp = gen_wp.values.astype(float)
    wp_first = round(float(np.nanmean(wp[:3])), 1)
    wp_last = round(float(np.nanmean(wp[-3:])), 1)
    summary = {
        "yearMin": lo, "yearMax": hi,
        "count": {
            "first5": round(float(np.nanmean(cnt[:5])), 1),
            "last5": round(float(np.nanmean(cnt[-5:])), 1),
            "perDecade": fits["count"]["perDecade"],
        },
        "windMean": {"perDecade": fits["windMean"]["perDecade"]},
        "genesis": {
            "wpLatFirst": wp_first,
            "wpLatLast": wp_last,
            "wpNorthKm": round((wp_last - wp_first) * 111),   # 1° Breite ≈ 111 km
        },
    }

    return {
        "window": [lo, hi],
        "series": {
            "season": years,
            "count": _clean([int(v) for v in count.values]),
            "meanWind": _clean([None if pd.isna(v) else float(v) for v in mean_wind.values]),
            "genesisWP": _clean([None if pd.isna(v) else float(v) for v in gen_wp.values]),
            "genesisSP": _clean([None if pd.isna(v) else float(v) for v in gen_sp.values]),
        },
        "fits": fits,
        "summary": summary,
    }


if __name__ == "__main__":
    from pipeline.io_load import load_ibtracs
    trends = build_trends(load_ibtracs())
    s = trends["series"]
    print(f"trends: {len(s['season'])} Saisons {trends['window']}")
    print(f"  count[0..2]    = {s['count'][:3]} … last = {s['count'][-1]}")
    print(f"  meanWind[0..2] = {s['meanWind'][:3]}")
    print(f"  genesisWP[0..2]= {s['genesisWP'][:3]} … last = {s['genesisWP'][-1]}")
    for k, f in trends["fits"].items():
        sig = "" if f["p"] < 0.05 else "  (nicht signifikant)"
        print(f"  fit {k:10s}: {f['perDecade']:+6.2f}/Dekade  R²={f['r2']:.3f}  p={f['p']:.3f}  n={f['n']}{sig}")
    print(f"  summary genesis: WP {summary_wp}" if (summary_wp := trends['summary']['genesis']) else "")
    # Kernaussage-Invarianten (spiegeln validate_trends):
    assert trends["fits"]["count"]["p"] >= 0.05, "Sturmzahl-Trend unerwartet signifikant"
    assert trends["fits"]["windMean"]["p"] >= 0.05, "Mittelwind-Trend unerwartet signifikant"
    assert trends["fits"]["genesisWP"]["p"] < 0.05 and trends["fits"]["genesisWP"]["perDecade"] > 0, \
        "NW-Polwärts-Signal fehlt"
    print("trends: alle Smoke-Checks OK")
