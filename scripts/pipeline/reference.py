"""Statische Referenzdaten: Crosswalk, Subregionen, Insel-Zentroide, Namens-Aliasse, Pfade."""
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
DATA_ROOT = REPO_ROOT / "Data"
OUT_DIR = REPO_ROOT / "app" / "public" / "data"

EMDAT_EVENTS = DATA_ROOT / "processed" / "emdat_pacific_storms_events.csv"
WPP = DATA_ROOT / "processed" / "wpp_pacific_population.csv"
IBTRACS = [
    DATA_ROOT / "external" / "ibtracs.SP.list.v04r01.csv",
    DATA_ROOT / "external" / "ibtracs.WP.list.v04r01.csv",
]
SST = DATA_ROOT / "Mean sea surface temperature anomalies.csv"

# GEO_PICT (SPC, ISO-2) -> ISO3 — 22 PICTs, aus KONZEPT.md §9
CROSSWALK = {
    "FJ": "FJI", "PG": "PNG", "SB": "SLB", "VU": "VUT", "NC": "NCL",
    "KI": "KIR", "TV": "TUV", "NR": "NRU", "MH": "MHL", "FM": "FSM",
    "PW": "PLW", "GU": "GUM", "MP": "MNP", "WS": "WSM", "AS": "ASM",
    "TO": "TON", "NU": "NIU", "CK": "COK", "PF": "PYF", "WF": "WLF",
    "TK": "TKL", "PN": "PCN",
}

SUBREGION = {
    # Melanesien
    "FJI": "Melanesia", "PNG": "Melanesia", "SLB": "Melanesia",
    "VUT": "Melanesia", "NCL": "Melanesia",
    # Mikronesien
    "KIR": "Micronesia", "MHL": "Micronesia", "FSM": "Micronesia",
    "NRU": "Micronesia", "PLW": "Micronesia", "GUM": "Micronesia", "MNP": "Micronesia",
    # Polynesien
    "WSM": "Polynesia", "ASM": "Polynesia", "TON": "Polynesia", "TUV": "Polynesia",
    "NIU": "Polynesia", "COK": "Polynesia", "PYF": "Polynesia", "WLF": "Polynesia",
    "TKL": "Polynesia", "PCN": "Polynesia",
}

# ISO3 -> (lon, lat) — Hauptinsel-/Hauptstadt-Zentroide (Karten-Layer; Atolle fehlen im 110m-Land)
CENTROIDS = {
    "FJI": (178.05, -17.80), "PNG": (145.00, -6.00), "SLB": (160.00, -9.50),
    "VUT": (167.00, -16.00), "NCL": (165.50, -21.30), "KIR": (173.00, 1.40),
    "TUV": (179.20, -8.52), "NRU": (166.93, -0.53), "MHL": (171.19, 7.10),
    "FSM": (158.22, 6.92), "PLW": (134.55, 7.50), "GUM": (144.79, 13.45),
    "MNP": (145.75, 15.19), "WSM": (-171.75, -13.85), "ASM": (-170.70, -14.28),
    "TON": (-175.20, -21.17), "NIU": (-169.87, -19.05), "COK": (-159.78, -21.23),
    "PYF": (-149.57, -17.53), "WLF": (-176.17, -13.28), "TKL": (-171.85, -9.20),
    "PCN": (-130.10, -25.07),
}

# Bekannte Namensabweichungen EM-DAT -> IBTrACS (nach Normalisierung angewandt)
NAME_ALIASES = {"ULLA": "ULA"}

COUNTRY_NAMES = {
    "FJI": "Fiji", "PNG": "Papua New Guinea", "SLB": "Solomon Islands",
    "VUT": "Vanuatu", "NCL": "New Caledonia", "KIR": "Kiribati", "TUV": "Tuvalu",
    "NRU": "Nauru", "MHL": "Marshall Islands", "FSM": "Micronesia (FSM)",
    "PLW": "Palau", "GUM": "Guam", "MNP": "Northern Mariana Islands",
    "WSM": "Samoa", "ASM": "American Samoa", "TON": "Tonga", "NIU": "Niue",
    "COK": "Cook Islands", "PYF": "French Polynesia", "WLF": "Wallis and Futuna",
    "TKL": "Tokelau", "PCN": "Pitcairn",
}

YEAR_MIN, YEAR_MAX = 2001, 2026  # C6 (revidiert 2026-07-02)
WPP_LAST_YEAR = 2023             # danach Forward-Fill (pop_extrapolated)

if __name__ == "__main__":
    assert len(CROSSWALK) == 22 and len(CENTROIDS) == 22 and len(SUBREGION) == 22
    assert set(CROSSWALK.values()) == set(CENTROIDS) == set(SUBREGION)
    for p in [EMDAT_EVENTS, WPP, SST, *IBTRACS]:
        print(f"{'OK ' if p.exists() else 'FEHLT'} {p}")
    print(f"Crosswalk: {len(CROSSWALK)} PICTs · Fenster {YEAR_MIN}-{YEAR_MAX}")
