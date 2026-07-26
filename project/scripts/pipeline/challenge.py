"""Record-Spine der Pipeline: offene Land-Jahr-Records aus zwei Quellen.

  * IBTrACS liefert die Sturm↔Land-Verknüpfung über Track-Nähe (ein Trackpunkt
    innerhalb CHALLENGE_PROXIMITY_KM um das Länderzentroid) und die Windstärke.
  * PDH VC_DSR_AFFCT (SDG 11.5.1) liefert die Jahresbetroffenen je Land.

Auflösung ist Land-JAHR: x = Wind, den der Sturm AM LAND erreichte (Maximum der
Trackpunkte im Nähe-Radius, nicht der globale Lifetime-Peak — Audit 2026-07:
nur 36 % der Records erreichten ihren Peak überhaupt im Radius, FSM-2019 stand
mit 165 kt im Plot bei 20 kt lokal). Der Lifetime-Peak bleibt als peak_kt für
Sturm-Steckbriefe erhalten. y = im Jahr gemeldete Betroffene / Bevölkerung.

Gemeldete NULLEN sind Records, keine Lücken (Audit 2026-07): die Quelle führt im
Fenster 174 Meldungen, davon 75 exakte Nullen und keine einzige fehlende. 52 der
Nullen hatten einen Sturm im Radius (u. a. Pam über Vanuatu 2015, 150 kt lokal).
Sie zu filtern hieße, auf der abhängigen Variablen zu selektieren.
total_deaths/total_damage_kusd bleiben leer, die offene Quelle führt sie nicht.
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
    """Offene Sturm↔Land-Jahr-Verknüpfung: je (iso3, Kalenderjahr) der Sturm, der AM
    LAND den stärksten Wind erreichte (Maximum über die Trackpunkte innerhalb
    CHALLENGE_PROXIMITY_KM ums Länderzentroid).

    intensity_kt ist damit der lokal erreichte Wind — die Größe, die die Story auf
    der x-Achse behauptet. peak_kt führt den globalen Lifetime-Peak desselben Sturms
    weiter (Sturm-Steckbrief, Karten-Strichstärke). Ein Land-Jahr fällt heraus, wenn
    im Radius kein einziger Trackpunkt eine Windmessung trägt (KIR-2015/Bavi)."""
    peaks = _storm_peaks(ib)
    peak_by_sid = dict(zip(peaks["SID"], peaks["peak"]))
    name_by_sid = dict(zip(peaks["SID"], peaks["name"]))
    sshs_by_sid = dict(zip(peaks["SID"], peaks["sshs"]))

    pts = ib.dropna(subset=["LAT", "LON"]).copy()
    pts["LON2"] = pts["LON"].map(normalize_lon)
    pts["wind"] = pts["USA_WIND"].fillna(pts["WMO_WIND"])
    pts["cyear"] = pd.to_datetime(pts["ISO_TIME"], errors="coerce").dt.year
    lo, hi = ref.CHALLENGE_YEAR_MIN - 1, ref.CHALLENGE_YEAR_MAX + 1
    pts = pts[(pts["cyear"] >= lo) & (pts["cyear"] <= hi)]
    lat = pts["LAT"].to_numpy()
    lon = pts["LON2"].to_numpy()

    best = {}  # (iso3, year) -> (local_kt, sid)
    for iso3, (clon, clat) in ref.CENTROIDS.items():
        d = _haversine_km(lat, lon, clat, clon)
        near = pts[d <= ref.CHALLENGE_PROXIMITY_KM]
        if near.empty:
            continue
        # Lokaler Maximalwind je (Jahr, Sturm): nur Punkte IM Radius zählen.
        local = (
            near.dropna(subset=["wind"])
                .groupby(["cyear", "SID"])["wind"].max()
                .reset_index()
        )
        for cyear, sid, kt in zip(local["cyear"], local["SID"], local["wind"]):
            year = int(cyear)
            prev = best.get((iso3, year))
            if prev is None or kt > prev[0]:
                best[(iso3, year)] = (float(kt), sid)

    rows = []
    for (iso3, year), (kt, sid) in best.items():
        peak = peak_by_sid.get(sid)
        rows.append({
            "iso3": iso3, "year": year, "sid": sid,
            "event_name": name_by_sid.get(sid),
            "intensity_kt": float(kt),
            "peak_kt": None if peak is None or pd.isna(peak) else float(peak),
            "category": sshs_by_sid.get(sid),
        })
    return pd.DataFrame(rows)


def storm_exposed_count(ib: pd.DataFrame) -> int:
    """Anzahl (iso3, Jahr) im Fenster, die ein Sturm innerhalb der Nähe erreichte —
    Nenner für die Ehrlichkeits-Aussage „exponiert, aber kein Toll gemeldet"."""
    links = link_country_years(ib)
    m = (links["year"] >= ref.CHALLENGE_YEAR_MIN) & (links["year"] <= ref.CHALLENGE_YEAR_MAX)
    return int(m.sum())


def exposure_rows(ib: pd.DataFrame, pdh: pd.DataFrame) -> pd.DataFrame:
    """Vollständiger Ehrlichkeits-Rahmen: JEDES sturm-exponierte Land-Jahr im Fenster
    mit seinem Meldestatus. Grundlage des Honesty-Beats, der bisher nur die Records
    mit positivem Toll zeigte und die gemeldeten Nullen als „fehlend" verbuchte.

    status:
      'toll' — Sturm im Radius UND positiv gemeldeter Toll
      'zero' — Sturm im Radius UND ausdrücklich 0 gemeldet
      'none' — Sturm im Radius, aber keine Meldung in der Serie
    """
    links = link_country_years(ib)
    links = links[(links["year"] >= ref.CHALLENGE_YEAR_MIN) & (links["year"] <= ref.CHALLENGE_YEAR_MAX)]

    aff = pdh.copy()
    aff["year"] = aff["year"].astype(int)
    aff = aff[(aff["year"] >= ref.CHALLENGE_YEAR_MIN) & (aff["year"] <= ref.CHALLENGE_YEAR_MAX)]
    rep = dict(zip(zip(aff["iso3"], aff["year"]), aff["affected"]))

    rows = []
    for r in links.itertuples(index=False):
        v = rep.get((r.iso3, int(r.year)))
        status = "none" if v is None or pd.isna(v) else ("toll" if v > 0 else "zero")
        rows.append({
            "iso3": r.iso3, "year": int(r.year), "country": ref.COUNTRY_NAMES.get(r.iso3),
            "subregion": ref.SUBREGION.get(r.iso3),
            "intensity_kt": float(r.intensity_kt), "status": status,
            "affected": None if v is None or pd.isna(v) else int(v),
        })
    return pd.DataFrame(rows).sort_values(["year", "iso3"]).reset_index(drop=True)


def build_challenge_events(ib: pd.DataFrame, pdh: pd.DataFrame) -> pd.DataFrame:
    """Baut die Land-Jahr-Tabelle impact-led: ein Record je GEMELDETEM Land-Jahr
    (positiv oder ausdrücklich 0), verknüpft mit dem Sturm, der das Land in dem Jahr
    am stärksten erreichte (IBTrACS, lokaler Wind).

    Spaltensatz (je gemeldetem Land-Jahr):
    total_affected aus PDH (0 ist ein Wert, keine Lücke), total_deaths/
    total_damage_kusd = NA (PDH führt sie nicht), intensity_kt = lokal erreichter
    Wind, peak_kt = Lifetime-Peak desselben Sturms, category, intensity_source
    'ibtracs' (oder None, wenn kein Sturm im Nähe-Radius lag: affected-only-Zeile)."""
    links = link_country_years(ib)
    links = links[(links["year"] >= ref.CHALLENGE_YEAR_MIN) & (links["year"] <= ref.CHALLENGE_YEAR_MAX)]

    aff = pdh.copy()
    aff["year"] = aff["year"].astype(int)
    aff = aff[(aff["year"] >= ref.CHALLENGE_YEAR_MIN) & (aff["year"] <= ref.CHALLENGE_YEAR_MAX)]
    # JEDE Meldung ist ein Record — auch die ausdrückliche 0. Sie zu verwerfen hieße,
    # auf der abhängigen Variablen zu selektieren (Audit 2026-07). Der Log-Schutz
    # sitzt jetzt in fits.py (Maske affected > 0), nicht in einem Datenfilter.
    aff_rep = aff[aff["affected"].notna()][["iso3", "year", "affected"]]

    ev = aff_rep.merge(links, on=["iso3", "year"], how="left")
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

    pos = ev["total_affected"] > 0
    zero = ev["total_affected"] == 0
    scat = ev["intensity_kt"].notna() & pos
    print(f"Challenge-Records: {len(ev)}  |  positiv: {int(pos.sum())}  ·  gemeldete Nullen: {int(zero.sum())}")
    print(f"  scatterfähig (Wind + positiver Toll): {int(scat.sum())}  ·  "
          f"Zero-Lane (Wind + gemeldete 0): {int((ev['intensity_kt'].notna() & zero).sum())}")
    print(f"  mit Sturm: {int(ev['intensity_kt'].notna().sum())}  ·  "
          f"Länder: {ev['iso3'].nunique()}  ·  Jahre {int(ev['year'].min())}-{int(ev['year'].max())}")
    # Strukturelle Checks (keine inhaltlichen Erwartungen — Befunde gehören in die
    # Story, nicht in ein Build-Gate; Audit 2026-07).
    assert not ev["total_affected"].isna().any(), "Record ohne Meldewert!"
    assert (ev["total_affected"] >= 0).all(), "negative Betroffenenzahl!"
    assert ev.duplicated(["iso3", "year"]).sum() == 0, "doppeltes Land-Jahr!"
    f_pc = fit(ev, "perCapita")
    f_abs = fit(ev, "absolute")
    print(f"  Fit perCapita: n={f_pc['n']} R2={f_pc['r2']} p={f_pc['p']}  |  "
          f"absolute: n={f_abs['n']} R2={f_abs['r2']} p={f_abs['p']}")
    assert f_pc["n"] == int(scat.sum()), "Fit-n weicht von den scatterfähigen Records ab!"
    # Harold-2020-Hook: derselbe Sturm, VUT und FJI — jetzt mit UNTERSCHIEDLICHEM
    # lokalem Wind (145 vs. 125 kt), weil die Achse nicht mehr den Lifetime-Peak zeigt.
    har = ev[(ev["year"] == 2020) & (ev["iso3"].isin(["VUT", "FJI"]))]
    print("\nHarold-2020-Hook:")
    print(har[["iso3", "event_name", "intensity_kt", "peak_kt", "total_affected", "affected_pc"]].to_string(index=False))
    exp = exposure_rows(ib, pdh)
    print("\nExposure-Rahmen:", dict(exp["status"].value_counts()))
    print("challenge: alle Smoke-Checks OK")
