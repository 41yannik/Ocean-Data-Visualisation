"""Validierung der Pipeline-Ausgaben — bricht laut ab, statt still falsche Story-Zahlen zu liefern."""
import json
import re

from pipeline.outputs import EMDAT_FIELDS


def _fail(msg):
    raise AssertionError(f"VALIDIERUNG FEHLGESCHLAGEN: {msg}")


def validate_events(events: list, meta: dict, tracks: dict):
    for e in events:
        leaked = EMDAT_FIELDS & set(e.keys())
        if leaked:
            _fail(f"gesperrte Felder im offenen Output: {leaked} (id={e['id']})")
    if meta.get("unit") != "country-year":
        _fail(f"unit '{meta.get('unit')}' statt 'country-year'")
    if any("EM-DAT" in s["name"] for s in meta["sources"]):
        _fail("gesperrte Quelle in der Meta gelistet")
    if not any(s["id"] == "pdh-affected" for s in meta["sources"]):
        _fail("offene Wirkungsquelle pdh-affected fehlt in der Meta")
    if any(e.get("affected") == 0 for e in events):
        _fail("affected == 0 im Output (log-Skala!)")
    if any(e.get("affected_pc") == 0 for e in events):
        _fail("affected_pc == 0 im Output (log10(0)=NaN im Frontend!)")

    # Der offene Kernbefund muss halten: Wind erklärt den Betroffenenanteil kaum,
    # der Zusammenhang ist pro Kopf signifikant und stärker als absolut.
    fits = meta.get("fits", {})
    if not fits or fits["perCapita"]["p"] >= 0.05:
        _fail(f"Challenge-Pro-Kopf-Fit nicht signifikant: {fits.get('perCapita')}")
    if fits["perCapita"]["r2"] <= fits["absolute"]["r2"]:
        _fail("R²(pro Kopf) nicht größer als R²(absolut) in Challenge")

    # Harold-2020-Hook: derselbe Sturm über Vanuatu und Fiji, verschiedene Anteile.
    har = {e["iso3"]: e for e in events if e["year"] == 2020 and e["iso3"] in ("VUT", "FJI")
           and (e.get("name") or "").lower() == "harold"}
    if set(har) != {"VUT", "FJI"}:
        _fail(f"Harold-2020-Hook unvollständig: {sorted(har)}")
    if not (har["VUT"]["affected_pc"] and har["FJI"]["affected_pc"]
            and har["VUT"]["affected_pc"] > har["FJI"]["affected_pc"]):
        _fail("Harold-Hook: Vanuatu-Anteil nicht größer als Fiji-Anteil")

    _validate_tracks(tracks, {e["sid"] for e in events if e["sid"]})
    scatter = [e for e in events if e["intensity_kt"] is not None and e["affected"]]
    print(f"validate(events): OK — {len(events)} offene Land-Jahre, {len(scatter)} scatterfähig, "
          f"R²_pc={fits['perCapita']['r2']} (p={fits['perCapita']['p']}), {len(tracks)} Tracks")


def validate_provenance(meta: dict):
    publication = meta.get("publication", {})
    if publication.get("status") not in {"open", "permissioned", "restricted", "blocked"}:
        _fail(f"unbekannter publication.status: {publication.get('status')}")
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", publication.get("checked", "")):
        _fail("publication.checked ist kein ISO-Datum")

    sources = meta.get("sources", [])
    source_ids = [source.get("id") for source in sources]
    if not sources or len(source_ids) != len(set(source_ids)) or None in source_ids:
        _fail(f"Quellen-IDs fehlen oder sind doppelt: {source_ids}")
    for source in sources:
        for field in ("name", "provider", "version", "subset", "usedFor", "accessed"):
            if not source.get(field):
                _fail(f"Quelle {source['id']} ohne {field}")
        for field in ("url", "citationUrl"):
            if not source.get(field, "").startswith("https://"):
                _fail(f"Quelle {source['id']} mit ungültiger {field}: {source.get(field)}")
        if not source.get("license", {}).get("url", "").startswith("https://"):
            _fail(f"Quelle {source['id']} ohne HTTPS-Lizenzlink")

    for step in meta.get("transformations", []):
        unknown = set(step.get("sourceIds", [])) - set(source_ids)
        if unknown:
            _fail(f"Transformation {step.get('id')} mit unbekannten Quellen: {unknown}")

    evidence = meta.get("analysis", {}).get("storyEvidence", {})
    if evidence.get("heta", {}).get("radiusKm") != 370:
        _fail(f"Heta-R34 unerwartet: {evidence.get('heta')}")
    pam = evidence.get("pam", {})
    if pam.get("peakWindKt") != 150 or len(pam.get("windFields", [])) != 2:
        _fail(f"Pam-Evidenz unerwartet: {pam}")

    for artifact in meta.get("artifacts", []):
        if not re.fullmatch(r"[0-9a-f]{64}", artifact.get("sha256", "")):
            _fail(f"Artefakt ohne SHA-256: {artifact}")
        if artifact.get("downloadable") and artifact["file"] not in publication.get("allowedDownloads", []):
            _fail(f"Nicht freigegebener Download: {artifact['file']}")

    if "EM-DAT" in json.dumps(meta, ensure_ascii=False):
        _fail("Meta enthält EM-DAT-spezifischen Text")
    print(f"validate(provenance): OK — {len(sources)} Quellen, "
          f"Status {publication['status']}, {len(meta.get('artifacts', []))} Artefakte")


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
