"""Record-Spine der Pipeline: offene Land-Jahr-Records aus zwei Quellen.

  * IBTrACS liefert die Sturm↔Land-Verknüpfung über Track-Nähe (ein Trackpunkt
    innerhalb CHALLENGE_PROXIMITY_KM um das Länderzentroid) und die Windstärke.
  * PDH VC_DSR_AFFCT (SDG 11.5.1) liefert die Jahresbetroffenen je Land.

Auflösung ist Land-JAHR: x = stärkster Sturm, der das Land in dem Jahr erreichte;
y = im Jahr gemeldete Betroffene / Bevölkerung. total_deaths/total_damage_kusd
bleiben leer, die offene Quelle führt sie nicht.
"""
import numpy as np
import pandas as pd

from pipeline import reference as ref
from pipeline.normalize import normalize_name, normalize_lon

EARTH_KM = 6371.0


def _haversine_km(lat1, lon1, lat2, lon2):
    """Vektorisiert: Distanz (km) von jedem (lat1, lon1)-Punkt zu EINEM (lat2, lon2)."""
    p1, p2 = np.radians(lat1), np.radians(lat2)
    dphi = np.radians(lat2 - lat1)
    dlmb = np.radians(lon2 - lon1)
    a = np.sin(dphi / 2.0) ** 2 + np.cos(p1) * np.cos(p2) * np.sin(dlmb / 2.0) ** 2
    return 2.0 * EARTH_KM * np.arcsin(np.sqrt(a))


def _storm_peaks(ib: pd.DataFrame) -> pd.DataFrame:
    """Je SID: Name, Peak-USA_WIND (kt, Fallback WMO_WIND) und max. USA_SSHS."""
    w = ib.copy()
    w["wind"] = w["USA_WIND"].fillna(w["WMO_WIND"])
    peaks = (
        w.groupby("SID")
         .agg(name=("NAME", "first"), peak=("wind", "max"), sshs=("USA_SSHS", "max"))
         .reset_index()
    )
    return peaks


def link_country_years(ib: pd.DataFrame) -> pd.DataFrame:
    """Offene Sturm↔Land-Jahr-Verknüpfung: je (iso3, Kalenderjahr) der stärkste Sturm,
    dessen Track innerhalb CHALLENGE_PROXIMITY_KM ums Länderzentroid verlief."""
    peaks = _storm_peaks(ib)
    peak_by_sid = dict(zip(peaks["SID"], peaks["peak"]))
    name_by_sid = dict(zip(peaks["SID"], peaks["name"]))
    sshs_by_sid = dict(zip(peaks["SID"], peaks["sshs"]))

    pts = ib.dropna(subset=["LAT", "LON"]).copy()
    pts["LON2"] = pts["LON"].map(normalize_lon)
    pts["cyear"] = pd.to_datetime(pts["ISO_TIME"], errors="coerce").dt.year
    lo, hi = ref.CHALLENGE_YEAR_MIN - 1, ref.CHALLENGE_YEAR_MAX + 1
    pts = pts[(pts["cyear"] >= lo) & (pts["cyear"] <= hi)]
    lat = pts["LAT"].to_numpy()
    lon = pts["LON2"].to_numpy()

    best = {}  # (iso3, year) -> (peak_kt, sid)
    for iso3, (clon, clat) in ref.CENTROIDS.items():
        d = _haversine_km(lat, lon, clat, clon)
        near = pts[d <= ref.CHALLENGE_PROXIMITY_KM]
        if near.empty:
            continue
        for cyear, sid in zip(near["cyear"].to_numpy(), near["SID"].to_numpy()):
            year = int(cyear)
            kt = peak_by_sid.get(sid)
            if kt is None or pd.isna(kt):
                continue
            prev = best.get((iso3, year))
            if prev is None or kt > prev[0]:
                best[(iso3, year)] = (kt, sid)

    rows = []
    for (iso3, year), (kt, sid) in best.items():
        rows.append({
            "iso3": iso3, "year": year, "sid": sid,
            "event_name": name_by_sid.get(sid),
            "intensity_kt": float(kt),
            "category": sshs_by_sid.get(sid),
        })
    return pd.DataFrame(rows)


def storm_exposed_count(ib: pd.DataFrame) -> int:
    """Anzahl (iso3, Jahr) im Fenster, die ein Sturm innerhalb der Nähe erreichte —
    Nenner für die Ehrlichkeits-Aussage „exponiert, aber kein Toll gemeldet"."""
    links = link_country_years(ib)
    m = (links["year"] >= ref.CHALLENGE_YEAR_MIN) & (links["year"] <= ref.CHALLENGE_YEAR_MAX)
    return int(m.sum())


def build_challenge_events(ib: pd.DataFrame, pdh: pd.DataFrame) -> pd.DataFrame:
    """Baut die Land-Jahr-Tabelle impact-led: ein Record je Land-Jahr mit gemeldeten
    Betroffenen (PDH>0), verknüpft mit dem stärksten nahen Sturm des Jahres (IBTrACS).

    Spaltensatz (je Land-Jahr mit gemeldeten Betroffenen):
    total_affected aus PDH, total_deaths/total_damage_kusd = NA (PDH führt sie nicht),
    intensity_kt/category aus dem stärksten nahen Sturm, intensity_source 'ibtracs'
    (oder None, wenn kein Sturm im Nähe-Radius lag: affected-only-Zeile)."""
    links = link_country_years(ib)
    links = links[(links["year"] >= ref.CHALLENGE_YEAR_MIN) & (links["year"] <= ref.CHALLENGE_YEAR_MAX)]

    aff = pdh.copy()
    aff["year"] = aff["year"].astype(int)
    aff = aff[(aff["year"] >= ref.CHALLENGE_YEAR_MIN) & (aff["year"] <= ref.CHALLENGE_YEAR_MAX)]
    # positive Jahresmeldung = Record; 0 zählt wie fehlend (log-Skala)
    aff_pos = aff[aff["affected"] > 0][["iso3", "year", "affected"]]

    ev = aff_pos.merge(links, on=["iso3", "year"], how="left")
    ev["total_affected"] = pd.to_numeric(ev["affected"], errors="coerce")
    ev = ev.drop(columns=["affected"])
    ev["total_deaths"] = pd.NA          # PDH führt keine sturm-spezifischen Toten
    ev["total_damage_kusd"] = pd.NA     # PDH führt keinen Schaden
    ev["intensity_source"] = ev["sid"].map(lambda s: "ibtracs" if isinstance(s, str) else None)
    ev["category"] = ev["category"].astype("Int64")
    ev["country"] = ev["iso3"].map(ref.COUNTRY_NAMES)
    ev["match_method"] = ev["sid"].map(lambda s: "track_proximity" if isinstance(s, str) else "none")
    ev["event_name"] = ev["event_name"].where(ev["event_name"].notna(), None)
    ev = ev.sort_values(["year", "iso3"]).reset_index(drop=True)
    return ev


if __name__ == "__main__":
    from pipeline.io_load import load_ibtracs, load_pdh_affected
    from pipeline.population import join_population
    from pipeline.io_load import load_wpp
    from pipeline.fits import fit
    import numpy as np

    ib = load_ibtracs()
    pdh = load_pdh_affected()
    ev = build_challenge_events(ib, pdh)
    ev = join_population(ev, load_wpp())

    scat = ev["intensity_kt"].notna() & ev["total_affected"].notna()
    print(f"Challenge-Records: {len(ev)}  |  scatterfähig (Wind+Betroffene): {int(scat.sum())}")
    print(f"  affected>0: {int(ev['total_affected'].notna().sum())}  ·  "
          f"mit Sturm: {int(ev['intensity_kt'].notna().sum())}  ·  "
          f"Länder: {ev['iso3'].nunique()}  ·  Jahre {int(ev['year'].min())}-{int(ev['year'].max())}")
    f_pc = fit(ev, "perCapita")
    f_abs = fit(ev, "absolute")
    print(f"  Fit perCapita: n={f_pc['n']} R2={f_pc['r2']} p={f_pc['p']}  |  "
          f"absolute: n={f_abs['n']} R2={f_abs['r2']} p={f_abs['p']}")
    assert f_pc["p"] < 0.05, f"Pro-Kopf-Fit nicht signifikant (p={f_pc['p']})!"
    assert f_pc["r2"] > f_abs["r2"], "R²(pro Kopf) nicht größer als R²(absolut)!"
    # Harold-2020-Hook: derselbe Sturm, VUT und FJI, stark verschiedene Anteile
    har = ev[(ev["year"] == 2020) & (ev["iso3"].isin(["VUT", "FJI"]))]
    print("\nHarold-2020-Hook:")
    print(har[["iso3", "event_name", "intensity_kt", "total_affected", "affected_pc"]].to_string(index=False))
    print("challenge: alle Smoke-Checks OK")
