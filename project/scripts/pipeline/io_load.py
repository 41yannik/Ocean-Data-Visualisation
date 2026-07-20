"""Loader für alle Rohquellen — jede Funktion gibt einen sauber typisierten DataFrame zurück."""
import pandas as pd

from pipeline import reference as ref

IBTRACS_USECOLS = [
    "SID", "SEASON", "BASIN", "NAME", "ISO_TIME", "NATURE",
    "LAT", "LON", "TRACK_TYPE", "WMO_WIND", "USA_WIND", "USA_SSHS",
    "USA_R34_NE", "USA_R34_SE", "USA_R34_SW", "USA_R34_NW",
]


def load_ibtracs(paths=ref.IBTRACS) -> pd.DataFrame:
    frames = []
    for p in paths:
        df = pd.read_csv(p, skiprows=[1], usecols=IBTRACS_USECOLS, low_memory=False)
        frames.append(df)
    ib = pd.concat(frames, ignore_index=True)
    # Beckenübergreifende Stürme können in beiden Dateien stehen -> Trackpunkte deduplizieren
    ib = ib.drop_duplicates(subset=["SID", "ISO_TIME"], keep="first")
    ib["SEASON"] = pd.to_numeric(ib["SEASON"], errors="coerce").astype("Int64")
    for col in (
        "LAT", "LON", "WMO_WIND", "USA_WIND", "USA_SSHS",
        "USA_R34_NE", "USA_R34_SE", "USA_R34_SW", "USA_R34_NW",
    ):
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


def load_pdh_affected(path=ref.PDH_AFFECTED) -> pd.DataFrame:
    """PDH-SDMX-Export (SDG 11.5.1, VC_DSR_AFFCT) -> (iso3, year, affected) auf Land-Jahr-Ebene.

    Offenes Wirkungsmaß der Challenge-Variante. Achtung: zählt Betroffene ALLER
    Katastrophen eines Jahres, nicht sturm-spezifisch (Caveat in der Story)."""
    df = pd.read_csv(path)
    df = df[df["INDICATOR"] == "VC_DSR_AFFCT"].copy()
    df["iso3"] = df["GEO_PICT"].map(ref.CROSSWALK)
    df["year"] = pd.to_numeric(df["TIME_PERIOD"], errors="coerce").astype("Int64")
    df["affected"] = pd.to_numeric(df["OBS_VALUE"], errors="coerce")
    out = df.loc[df["iso3"].notna(), ["iso3", "year", "affected"]].dropna(subset=["year"])
    return out.reset_index(drop=True)


if __name__ == "__main__":
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

    aff = load_pdh_affected()
    print(f"PDH affected: {len(aff)} Land-Jahre, {aff['iso3'].nunique()} Länder, "
          f"{aff['year'].min()}-{aff['year'].max()}")
    assert aff["iso3"].nunique() >= 15 and (aff["affected"] > 0).sum() >= 90
    print("io_load: alle Smoke-Checks OK")
