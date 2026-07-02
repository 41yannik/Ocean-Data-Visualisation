"""EM-DAT↔IBTrACS-Join: normalisierter Name + Saison ±1 -> SID (erwartet 97/99, 0 Mehrdeutigkeiten)."""
import pandas as pd

from pipeline.io_load import load_emdat, load_ibtracs
from pipeline.normalize import name_candidates, normalize_name


def build_storm_index(ib: pd.DataFrame) -> dict:
    """(normalisierter Name, Saison) -> Menge von SIDs."""
    storms = (
        ib.dropna(subset=["NAME"])
          .groupby("SID")
          .agg(name=("NAME", "first"), season=("SEASON", "min"))
          .reset_index()
    )
    index = {}
    for sid, name, season in storms.itertuples(index=False):
        n = normalize_name(name)
        if not n or n in ("NOT NAMED", "UNNAMED"):
            continue
        index.setdefault((n, int(season)), set()).add(sid)
    return index


def match_events(emdat: pd.DataFrame, ib: pd.DataFrame) -> pd.DataFrame:
    """Hängt an jede EM-DAT-Zeile: sid (oder None), match_method ('name_season'|'none'|'ambiguous')."""
    index = build_storm_index(ib)
    sids, methods = [], []
    for row in emdat.itertuples(index=False):
        cands = name_candidates(row.event_name)
        hit_sids = set()
        for cand in cands:
            for season in (row.year, row.year - 1, row.year + 1):
                hit_sids |= index.get((cand, season), set())
        if len(hit_sids) == 1:
            sids.append(next(iter(hit_sids)))
            methods.append("name_season")
        elif len(hit_sids) == 0:
            sids.append(None)
            methods.append("none")
        else:
            sids.append(None)
            methods.append("ambiguous")
    out = emdat.copy()
    out["sid"] = sids
    out["match_method"] = methods
    return out


if __name__ == "__main__":
    em, ib = load_emdat(), load_ibtracs()
    matched = match_events(em, ib)
    n_match = matched["sid"].notna().sum()
    n_amb = (matched["match_method"] == "ambiguous").sum()
    named = matched[matched["event_name"].notna()]
    storms_total = named.assign(k=named["event_name"].map(normalize_name) + "|" + named["year"].astype(str))["k"].nunique()
    storms_hit = matched.loc[matched["sid"].notna()]
    storms_hit_n = storms_hit.assign(k=storms_hit["event_name"].map(normalize_name) + "|" + storms_hit["year"].astype(str))["k"].nunique()

    print(f"Join: {n_match}/99 Zeilen gematcht · {matched['sid'].nunique()} distinkte SIDs · "
          f"{storms_hit_n}/{storms_total} benannte Stürme · Mehrdeutigkeiten: {n_amb}")
    misses = matched[matched["sid"].isna()][["disno", "iso3", "year", "event_name", "match_method"]]
    print("\nNicht gematcht:")
    print(misses.to_string(index=False))

    assert n_amb == 0, f"{n_amb} mehrdeutige Joins — Kandidatenlogik prüfen!"
    assert n_match >= 94, f"nur {n_match}/99 gematcht (erwartet >= 94, Ziel 97)"
    print(f"\njoin: Smoke-Checks OK ({n_match}/99, Ziel 97 mit Namens-Fixes erreicht: {n_match >= 97})")
