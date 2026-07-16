"""SST-Klimakontext fürs Story-Intro: mittlere SST-Anomalie je Jahr über alle PICTs (PDH-Pflichtdatensatz)."""
import pandas as pd

from pipeline.io_load import load_sst


def build_sst_series(sst: pd.DataFrame | None = None) -> list:
    """[{year, anom}] — Mittel der SST-Anomalien über die PICTs, 1850–heute, 3 Dezimalstellen."""
    if sst is None:
        sst = load_sst()
    yearly = (
        sst.groupby("TIME_PERIOD")["OBS_VALUE"].mean().reset_index()
           .rename(columns={"TIME_PERIOD": "year", "OBS_VALUE": "anom"})
           .sort_values("year")
    )
    return [{"year": int(r.year), "anom": round(float(r.anom), 3)} for r in yearly.itertuples(index=False)]


if __name__ == "__main__":
    series = build_sst_series()
    years = [d["year"] for d in series]
    anoms = pd.Series([d["anom"] for d in series], index=years)
    print(f"SST-Serie: {len(series)} Jahre ({years[0]}–{years[-1]}), "
          f"Anomalie {anoms.min():+.2f} … {anoms.max():+.2f} °C")
    early, late = anoms.loc[:1900].mean(), anoms.loc[2000:].mean()
    print(f"Mittel bis 1900: {early:+.3f} °C · Mittel ab 2000: {late:+.3f} °C")
    assert years[0] == 1850 and years[-1] >= 2024
    assert late > early, "Erwärmungssignal fehlt?!"
    print("sst: alle Smoke-Checks OK")
