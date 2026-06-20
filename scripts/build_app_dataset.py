#!/usr/bin/env python3
"""
Build-Zeit-ETL für das D3-MVP (5D-Bubble-Plot).

Erzeugt aus den lizenz-sauberen Quellen eine schlanke, getidyte App-Datenbasis:
  - Pacific Data Hub SDMX-CSV  (Data/): SST-, Meeresspiegel-, Niederschlags-Anomalien
                                        + offizielle Impacts (Betroffene, Wirtschaftsschaden)
  - UN WPP 2024 Subset         (Data/processed/wpp_pacific_population.csv): Bevölkerung

Join über (iso3, year), Code-Harmonisierung GEO_PICT(2) -> ISO3 -> Region, Zeitfenster 1993-2023.
EM-DAT wird BEWUSST NICHT eingebunden (CC BY-NC-ND, siehe docs/09 §6).

Outputs (-> app/public/data/):
  - ocean.json   Array von Records: {iso3, country, region, year, sst_anom, sea_level,
                 rain_anom, population, affected, econ_loss_usd}
  - meta.json    {years, yearRange, regions, countries[], domains{...}}

Aufruf:  python3 scripts/build_app_dataset.py
"""

from __future__ import annotations

import csv
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "Data"
WPP_CSV = DATA / "processed" / "wpp_pacific_population.csv"
OUT = ROOT / "app" / "public" / "data"
OUT.mkdir(parents=True, exist_ok=True)

YEAR_MIN, YEAR_MAX = 1993, 2023  # gemeinsames dichtes Fenster (Meeresspiegel ab 1993)

# GEO_PICT(2-Buchstaben) -> (ISO3, Anzeigename, Region)  — Quelle: docs/02 §4
PICT = {
    "AS": ("ASM", "American Samoa", "Polynesia"),
    "CK": ("COK", "Cook Islands", "Polynesia"),
    "FJ": ("FJI", "Fiji", "Melanesia"),
    "FM": ("FSM", "Micronesia (Fed. States of)", "Micronesia"),
    "GU": ("GUM", "Guam", "Micronesia"),
    "KI": ("KIR", "Kiribati", "Micronesia"),
    "MH": ("MHL", "Marshall Islands", "Micronesia"),
    "MP": ("MNP", "Northern Mariana Islands", "Micronesia"),
    "NC": ("NCL", "New Caledonia", "Melanesia"),
    "NR": ("NRU", "Nauru", "Micronesia"),
    "NU": ("NIU", "Niue", "Polynesia"),
    "PF": ("PYF", "French Polynesia", "Polynesia"),
    "PG": ("PNG", "Papua New Guinea", "Melanesia"),
    "PN": ("PCN", "Pitcairn", "Polynesia"),
    "PW": ("PLW", "Palau", "Micronesia"),
    "SB": ("SLB", "Solomon Islands", "Melanesia"),
    "TK": ("TKL", "Tokelau", "Polynesia"),
    "TO": ("TON", "Tonga", "Polynesia"),
    "TV": ("TUV", "Tuvalu", "Polynesia"),
    "VU": ("VUT", "Vanuatu", "Melanesia"),
    "WF": ("WLF", "Wallis and Futuna", "Polynesia"),
    "WS": ("WSM", "Samoa", "Polynesia"),
}
ISO3_INFO = {iso3: (name, region) for iso3, name, region in PICT.values()}
REGIONS = ["Melanesia", "Micronesia", "Polynesia"]


def _num(v):
    if v is None:
        return None
    s = str(v).strip()
    if s in ("", "...", "-", "NA", "N/A"):
        return None
    try:
        return float(s.replace(",", ""))
    except ValueError:
        return None


def read_sdmx(path: Path):
    """SDMX-`.Stat`-CSV: leere Zwischenspalten ignorieren, nach Spaltennamen indizieren."""
    with path.open(newline="", encoding="utf-8") as f:
        r = csv.reader(f)
        header = next(r)
        idx = {name: i for i, name in enumerate(header) if name and name.strip()}
        for row in r:
            yield {name: (row[i] if i < len(row) else "") for name, i in idx.items()}


# ── Aggregat: (iso3, year) -> Record ──────────────────────────────────────
records: dict[tuple[str, int], dict] = {}


def ensure(iso3: str, year: int) -> dict:
    key = (iso3, year)
    rec = records.get(key)
    if rec is None:
        name, region = ISO3_INFO[iso3]
        rec = {
            "iso3": iso3, "country": name, "region": region, "year": year,
            "sst_anom": None, "sea_level": None, "rain_anom": None,
            "population": None, "affected": None, "econ_loss_usd": None,
        }
        records[key] = rec
    return rec


def load_climate(filename: str, field: str) -> None:
    for row in read_sdmx(DATA / filename):
        geo = row.get("GEO_PICT")
        if geo not in PICT:
            continue
        year = _num(row.get("TIME_PERIOD"))
        val = _num(row.get("OBS_VALUE"))
        if year is None or val is None:
            continue
        year = int(year)
        if not (YEAR_MIN <= year <= YEAR_MAX):
            continue
        ensure(PICT[geo][0], year)[field] = val


def load_impact(filename: str, field: str) -> None:
    for row in read_sdmx(DATA / filename):
        geo = row.get("GEO_PICT")
        if geo not in PICT:
            continue
        year = _num(row.get("TIME_PERIOD"))
        val = _num(row.get("OBS_VALUE"))
        if year is None or val is None:
            continue
        year = int(year)
        if not (YEAR_MIN <= year <= YEAR_MAX):
            continue
        ensure(PICT[geo][0], year)[field] = val


def load_population() -> None:
    with WPP_CSV.open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            iso3 = row["iso3"]
            year = _num(row["year"])
            pop = _num(row["population"])
            if iso3 not in ISO3_INFO or year is None:
                continue
            year = int(year)
            if not (YEAR_MIN <= year <= YEAR_MAX):
                continue
            ensure(iso3, year)["population"] = int(pop) if pop is not None else None


def domain(field: str):
    vals = [r[field] for r in records.values() if r[field] is not None]
    return [min(vals), max(vals)] if vals else [None, None]


def main() -> None:
    load_climate("Mean sea surface temperature anomalies.csv", "sst_anom")
    load_climate("Sea level anomalies.csv", "sea_level")
    load_climate("Rainfall anomalies.csv", "rain_anom")
    load_impact("Number of directly affected persons attributed to disasters.csv", "affected")
    load_impact("Direct disaster economic loss.csv", "econ_loss_usd")
    load_population()

    recs = sorted(records.values(), key=lambda r: (r["country"], r["year"]))

    # ── Validierung ──────────────────────────────────────────────────────
    plottable = [r for r in recs if r["sst_anom"] is not None and r["sea_level"] is not None]
    countries = sorted({r["iso3"] for r in recs})
    assert recs, "Keine Records erzeugt — Quellpfade prüfen."
    assert len(plottable) > 100, f"Zu wenige plottbare Records ({len(plottable)})."
    for r in recs:  # keine NaN
        for k in ("sst_anom", "sea_level", "population"):
            assert r[k] is None or not (isinstance(r[k], float) and math.isnan(r[k])), f"NaN in {k}"

    years = sorted({r["year"] for r in recs})
    country_list = [
        {"iso3": iso, "country": ISO3_INFO[iso][0], "region": ISO3_INFO[iso][1]}
        for iso in countries
    ]
    meta = {
        "yearRange": [years[0], years[-1]],
        "years": years,
        "regions": REGIONS,
        "countries": country_list,
        "domains": {
            "sst_anom": domain("sst_anom"),
            "sea_level": domain("sea_level"),
            "rain_anom": domain("rain_anom"),
            "population": domain("population"),
            "affected": domain("affected"),
            "econ_loss_usd": domain("econ_loss_usd"),
        },
    }

    (OUT / "ocean.json").write_text(json.dumps(recs, ensure_ascii=False), encoding="utf-8")
    (OUT / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"ocean.json: {len(recs)} Records ({len(countries)} Länder, {years[0]}–{years[-1]})")
    print(f"  davon plottbar (SST & Meeresspiegel vorhanden): {len(plottable)}")
    print(f"  mit Betroffenen-Wert: {sum(1 for r in recs if r['affected'] is not None)}")
    print(f"meta.json: domains SST={meta['domains']['sst_anom']} SeaLvl={meta['domains']['sea_level']}")
    print("Fertig. -> app/public/data/")


if __name__ == "__main__":
    main()
