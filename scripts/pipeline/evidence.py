"""Reproduzierbare Story-Evidenz aus IBTrACS statt hart codierter Frontendwerte."""
from __future__ import annotations

import pandas as pd

from pipeline.normalize import normalize_lon

NM_TO_KM = 1.852
SID_HETA = "2003359S15177"
SID_PAM = "2015066S08170"
R34_COLS = ["USA_R34_NE", "USA_R34_SE", "USA_R34_SW", "USA_R34_NW"]
PAM_FIELD_TIMES = ("2015-03-11 06:00:00", "2015-03-13 06:00:00")


def _radii_km(row) -> dict:
    return {
        quadrant: round(float(getattr(row, field)) * NM_TO_KM)
        for quadrant, field in zip(("NE", "SE", "SW", "NW"), R34_COLS)
    }


def build_story_evidence(ib: pd.DataFrame) -> dict:
    """Heta-Korridor und Pam-Windfelder direkt aus den USA-R34-Quadranten ableiten."""
    heta = ib[ib["SID"] == SID_HETA].copy()
    heta["r34_max_nm"] = heta[R34_COLS].max(axis=1, skipna=True)
    valid_heta = heta["r34_max_nm"].dropna()
    if valid_heta.empty:
        raise ValueError("Heta hat keine USA-R34-Radien in IBTrACS")
    heta_radius_km = round(float(valid_heta.median()) * NM_TO_KM)

    pam = ib[ib["SID"] == SID_PAM].copy()
    pam_rows = pam[pam["ISO_TIME"].isin(PAM_FIELD_TIMES)].sort_values("ISO_TIME")
    if len(pam_rows) != len(PAM_FIELD_TIMES):
        missing = sorted(set(PAM_FIELD_TIMES) - set(pam_rows["ISO_TIME"]))
        raise ValueError(f"Pam-R34-Zeitpunkte fehlen: {missing}")
    if pam_rows[R34_COLS].isna().any(axis=None):
        raise ValueError("Pam-R34-Quadranten unvollständig")

    wind_fields = []
    for row in pam_rows.itertuples(index=False):
        wind_fields.append({
            "time": row.ISO_TIME,
            "coordinates": [round(normalize_lon(float(row.LON)), 2), round(float(row.LAT), 2)],
            "radiiKm": _radii_km(row),
            "windKt": int(row.USA_WIND),
            "label": (
                "34 kt wind field at 150 kt peak"
                if int(row.USA_WIND) == int(pam["USA_WIND"].max())
                else "34 kt wind field · 11 Mar"
            ),
        })

    peak = pam.loc[pam["USA_WIND"].idxmax()]
    evidence = {
        "heta": {
            "sid": SID_HETA,
            "radiusKm": heta_radius_km,
            "method": "median of the largest reported USA_R34 quadrant at each valid track time",
            "validRadiusTimes": int(valid_heta.count()),
        },
        "pam": {
            "sid": SID_PAM,
            "peakWindKt": int(pam["USA_WIND"].max()),
            "peakTime": str(peak["ISO_TIME"]),
            "windFields": wind_fields,
            "manualAnnotations": {
                "countryMarkers": True,
                "sourceIds": ["ifrc-pam", "wmo-pam"],
                "note": "Representative country markers and impact-mechanism notes are editorial annotations, not local wind estimates.",
            },
        },
    }
    return evidence


if __name__ == "__main__":
    from pipeline.io_load import load_ibtracs

    out = build_story_evidence(load_ibtracs())
    print(out)
    assert out["heta"]["radiusKm"] == 370
    assert out["heta"]["validRadiusTimes"] == 50
    assert out["pam"]["peakWindKt"] == 150
    assert out["pam"]["windFields"][0]["radiiKm"] == {"NE": 241, "SE": 250, "SW": 259, "NW": 296}
    assert out["pam"]["windFields"][1]["radiiKm"] == {"NE": 315, "SE": 333, "SW": 315, "NW": 296}
    print("evidence: alle Smoke-Checks OK")
