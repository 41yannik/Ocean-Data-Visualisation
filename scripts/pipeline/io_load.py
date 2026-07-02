"""Loader für alle Rohquellen — jede Funktion gibt einen sauber typisierten DataFrame zurück."""
import pandas as pd

from pipeline import reference as ref

IBTRACS_USECOLS = [
    "SID", "SEASON", "BASIN", "NAME", "ISO_TIME", "NATURE",
    "LAT", "LON", "TRACK_TYPE", "WMO_WIND", "USA_WIND", "USA_SSHS",
]


def load_emdat(path=ref.EMDAT_EVENTS) -> pd.DataFrame:
    df = pd.read_csv(path)
    df["year"] = df["year"].astype(int)
    for col in ("magnitude", "total_deaths", "total_affected",
                "total_damage_kusd", "total_damage_adj_kusd", "lat", "lon"):
        df[col] = pd.to_numeric(df[col], errors="coerce")
    return df


def load_ibtracs(paths=ref.IBTRACS) -> pd.DataFrame:
    frames = []
    for p in paths:
        df = pd.read_csv(p, skiprows=[1], usecols=IBTRACS_USECOLS, low_memory=False)
        frames.append(df)
    ib = pd.concat(frames, ignore_index=True)
    # Beckenübergreifende Stürme können in beiden Dateien stehen -> Trackpunkte deduplizieren
    ib = ib.drop_duplicates(subset=["SID", "ISO_TIME"], keep="first")
    ib["SEASON"] = pd.to_numeric(ib["SEASON"], errors="coerce").astype("Int64")
    for col in ("LAT", "LON", "WMO_WIND", "USA_WIND", "USA_SSHS"):
        ib[col] = pd.to_numeric(ib[col], errors="coerce")
    return ib


def load_wpp(path=ref.WPP) -> pd.DataFrame:
    df = pd.read_csv(path)
    df["year"] = df["year"].astype(int)
    df["population"] = pd.to_numeric(df["population"], errors="coerce")
    return df


def load_sst(path=ref.SST) -> pd.DataFrame:
    """SPC-SDMX-Export -> Zeilen (GEO_PICT, TIME_PERIOD, OBS_VALUE) für SST_ANOM."""
    df = pd.read_csv(path)
    df = df[df["CLIMATE_CHANGE_INDICATORS"] == "SST_ANOM"]
    out = df[["GEO_PICT", "TIME_PERIOD", "OBS_VALUE"]].copy()
    out["TIME_PERIOD"] = pd.to_numeric(out["TIME_PERIOD"], errors="coerce").astype("Int64")
    out["OBS_VALUE"] = pd.to_numeric(out["OBS_VALUE"], errors="coerce")
    return out.dropna(subset=["TIME_PERIOD", "OBS_VALUE"])


if __name__ == "__main__":
    em = load_emdat()
    print(f"EM-DAT: {len(em)} Zeilen, {em['disno'].nunique()} disno, "
          f"{em['year'].min()}-{em['year'].max()}, ISO3: {em['iso3'].nunique()}")
    assert len(em) == 99, f"erwartet 99 EM-DAT-Zeilen, gefunden {len(em)}"

    ib = load_ibtracs()
    per_basin = ib.groupby("BASIN")["SID"].nunique()
    print(f"IBTrACS: {len(ib)} Trackpunkte, {ib['SID'].nunique()} Stürme "
          f"(Saisons {ib['SEASON'].min()}-{ib['SEASON'].max()})")
    print(per_basin.to_string())

    wpp = load_wpp()
    print(f"WPP: {len(wpp)} Zeilen, {wpp['iso3'].nunique()} Länder, "
          f"{wpp['year'].min()}-{wpp['year'].max()}")
    assert wpp["iso3"].nunique() == 21 and wpp["year"].max() == ref.WPP_LAST_YEAR

    sst = load_sst()
    print(f"SST: {len(sst)} Zeilen, {sst['GEO_PICT'].nunique()} PICTs, "
          f"{sst['TIME_PERIOD'].min()}-{sst['TIME_PERIOD'].max()}")
    print("io_load: alle Smoke-Checks OK")
