"""Validierung der Pipeline-Ausgaben — bricht laut ab, statt still falsche Story-Zahlen zu liefern."""
from pipeline.outputs import EMDAT_FIELDS


def _fail(msg):
    raise AssertionError(f"VALIDIERUNG FEHLGESCHLAGEN: {msg}")


def validate_kurs(events: list, meta: dict, tracks: dict):
    if len(events) != 99:
        _fail(f"{len(events)} Zeilen statt 99")
    matched = [e for e in events if e["sid"]]
    if len(matched) < 94:
        _fail(f"nur {len(matched)}/99 gematcht (erwartet >= 94, Ziel 97)")
    scatter = [e for e in events if e["intensity_kt"] is not None and e["affected"]]
    if len(scatter) < 74:
        _fail(f"nur {len(scatter)} scatterfähige Zeilen (erwartet >= 74)")

    winston = [e for e in events if e["name"] == "Winston" and e["iso3"] == "FJI"]
    if not winston or winston[0]["intensity_source"] != "ibtracs" or winston[0]["affected"] != 540558:
        _fail(f"Winston/FJI falsch: {winston}")
    harold = [e for e in events if e["name"] == "Harold" and e["year"] == 2020]
    if len(harold) != 4:
        _fail(f"Harold 2020 hat {len(harold)} Länderzeilen statt 4")
    heta_niu = [e for e in events if e["name"] == "Heta" and e["iso3"] == "NIU"]
    if not heta_niu or heta_niu[0]["affected"] != 702:
        _fail(f"Heta/NIU (Hook!) falsch: {heta_niu}")

    if any(e["affected"] == 0 for e in events):
        _fail("affected == 0 vorhanden (log-Skala!)")
    maila = [e for e in events if e["name"] == "Maila"]
    if not maila or any(e["affected_pc"] is None or not e["pop_extrapolated"] for e in maila):
        _fail(f"Maila ohne affected_pc/pop_extrapolated: {maila}")

    fits = meta["fits"]
    if fits["perCapita"]["p"] >= 0.05:
        _fail(f"Pro-Kopf-Fit nicht signifikant: p={fits['perCapita']['p']}")
    if fits["perCapita"]["r2"] <= fits["absolute"]["r2"]:
        _fail("R²(pro Kopf) nicht größer als R²(absolut)")

    _validate_tracks(tracks, {e["sid"] for e in matched})
    print(f"validate(kurs): OK — 99 Zeilen, {len(matched)} gematcht, {len(scatter)} scatterfähig, "
          f"R²_pc={fits['perCapita']['r2']} (p={fits['perCapita']['p']}), {len(tracks)} Tracks")


def validate_challenge(events: list, meta: dict, tracks: dict):
    for e in events:
        leaked = EMDAT_FIELDS & set(e.keys())
        if leaked:
            _fail(f"EM-DAT-Felder in Challenge-Output: {leaked} (id={e['id']})")
        if not e["sid"]:
            _fail(f"Challenge-Zeile ohne SID: {e['id']}")
    if "fits" in meta or "bands" in meta:
        _fail("Fits/Bands (EM-DAT-basiert) in Challenge-Meta")
    if any("EM-DAT" in s["name"] for s in meta["sources"]):
        _fail("EM-DAT als Quelle in Challenge-Meta gelistet")
    _validate_tracks(tracks, {e["sid"] for e in events})
    print(f"validate(challenge): OK — {len(events)} offene Zeilen, {len(tracks)} Tracks, keine EM-DAT-Felder")


def _validate_tracks(tracks: dict, needed_sids: set):
    missing = needed_sids - set(tracks)
    if missing:
        _fail(f"Tracks fehlen für SIDs: {sorted(missing)}")
    for sid, pts in tracks.items():
        for p in pts:
            if not (-180.0 <= p[0] <= 180.0):
                _fail(f"Lon außerhalb [-180,180] bei {sid}: {p[0]}")


def validate_sst(series: list):
    years = [d["year"] for d in series]
    if years[0] != 1850 or years[-1] < 2024 or len(series) < 170:
        _fail(f"SST-Serie unvollständig: {years[0]}–{years[-1]}, n={len(series)}")
    print(f"validate(sst): OK — {len(series)} Jahre")


def validate_trends(trends: dict):
    """Sichert die Kernaussage der no-trend-Sektion ab: Zahl + Mittelwind flach
    (nicht signifikant), NW-Entstehungsbreite signifikant polwärts."""
    if trends.get("window") != [2001, 2025]:
        _fail(f"trends.window {trends.get('window')} statt [2001, 2025]")
    s = trends["series"]
    n = len(s["season"])
    if n != 25:
        _fail(f"trends: {n} Saisons statt 25")
    for key in ("count", "meanWind", "genesisWP", "genesisSP"):
        arr = s[key]
        if len(arr) != n:
            _fail(f"trends.series.{key}: {len(arr)} Werte statt {n}")
        # Lücken nur an den Rändern tolerieren, nie mitten in der Serie
        idx = [i for i, v in enumerate(arr) if v is not None]
        if idx and (idx != list(range(idx[0], idx[-1] + 1))):
            _fail(f"trends.series.{key}: None mitten in der Serie")
    f = trends["fits"]
    if f["count"]["p"] < 0.05:
        _fail(f"Sturmzahl-Trend unerwartet signifikant (p={f['count']['p']}) — Aussage 'flach' verletzt")
    if f["windMean"]["p"] < 0.05:
        _fail(f"Mittelwind-Trend unerwartet signifikant (p={f['windMean']['p']}) — Aussage 'flach' verletzt")
    if not (f["genesisWP"]["p"] < 0.05 and f["genesisWP"]["perDecade"] > 0):
        _fail(f"NW-Polwärts-Signal fehlt (p={f['genesisWP']['p']}, perDecade={f['genesisWP']['perDecade']})")
    print(f"validate(trends): OK — 25 Saisons, Zahl/Wind flach, "
          f"NW +{f['genesisWP']['perDecade']}°/Dekade (p={f['genesisWP']['p']})")
