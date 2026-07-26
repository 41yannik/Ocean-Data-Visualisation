"""Validierung der Pipeline-Ausgaben — bricht laut ab, statt still falsche Story-Zahlen zu liefern.

Grenze zwischen hart und weich (Audit 2026-07): STRUKTURELLE Invarianten (Felder,
Wertebereiche, Konsistenz von Zählern, keine gesperrten Quellen) brechen den Build.
INHALTLICHE Befunde (erklärt der Wind etwas? gibt es einen Trend?) werden nur noch
gemeldet. Ein Datenupdate, das der Story widerspricht, muss zu einem korrigierten
Text führen, nicht zu einem roten Build.
"""
import json
import math
import re

from pipeline.outputs import EMDAT_FIELDS


def _fail(msg):
    raise AssertionError(f"VALIDIERUNG FEHLGESCHLAGEN: {msg}")


def _warn(msg):
    print(f"  WARN  {msg}")


def validate_events(events: list, meta: dict, tracks: dict, exposure: list | None = None):
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

    # Gemeldete Nullen sind erlaubt und erwünscht (sie tragen den Ehrlichkeits-Beat),
    # müssen aber sauber als 0.0 vorliegen und dürfen nie in einen Logarithmus laufen.
    for e in events:
        if e.get("affected") is None:
            _fail(f"Record ohne Meldewert: {e['id']}")
        if e["affected"] < 0:
            _fail(f"negative Betroffenenzahl: {e['id']}")
        if e["affected"] == 0 and e.get("affected_pc") not in (0, 0.0):
            _fail(f"gemeldete 0 ohne affected_pc == 0: {e['id']}")
        for key in ("affected_pc", "intensity_kt", "peak_kt"):
            v = e.get(key)
            if isinstance(v, float) and not math.isfinite(v):
                _fail(f"nicht-endlicher Wert {key} in {e['id']}")
    if any("residual" in k for e in events for k in e):
        _fail("Residual-Feld im Output — bezieht sich auf einen Fit ohne Erklärungswert")

    # Zähler-Konsistenz (strukturell, nicht inhaltlich).
    c = meta.get("coverage", {})
    positive = [e for e in events if e["affected"] > 0]
    zeros = [e for e in events if e["affected"] == 0]
    scatter = [e for e in positive if e["intensity_kt"] is not None]
    zero_lane = [e for e in zeros if e["intensity_kt"] is not None]
    for key, want in (("rows", len(events)), ("positive_toll", len(positive)),
                      ("zero_toll", len(zeros)), ("scatterable", len(scatter)),
                      ("zero_lane", len(zero_lane))):
        if c.get(key) != want:
            _fail(f"coverage.{key}={c.get(key)} weicht von den Daten ab ({want})")
    if c.get("storm_exposed") is not None and c.get("no_report") is not None:
        if c["scatterable"] + c["zero_with_storm"] + c["no_report"] != c["storm_exposed"]:
            _fail("Ehrlichkeits-Zerlegung geht nicht auf (Toll + Nullen + ohne Meldung != exponiert)")

    fits = meta.get("fits", {})
    if not fits or "perCapita" not in fits:
        _fail("perCapita-Fit fehlt")
    for name, f in fits.items():
        if not math.isfinite(f["r2"]) or not math.isfinite(f["p"]):
            _fail(f"Fit {name} mit nicht-endlichem R²/p")
        if f["n"] != len(scatter):
            _fail(f"Fit {name}: n={f['n']} weicht von der Fit-Basis ab ({len(scatter)})")

    # 2020-Hook (Vanuatu vs. Fiji): strukturell hart — beide Records müssen existieren
    # und einen Anteil tragen. Welcher Sturm das Land-Jahr repräsentiert, ist Datenbefund:
    # seit der Umstellung auf lokalen Wind ist das für Fiji Yasa (140 kt) statt Harold
    # (125 kt), weil die Betroffenenzahl ohnehin ein JAHRESwert ist. Der Story-Text muss
    # das benennen, das Gate darf es nicht erzwingen.
    hook = {e["iso3"]: e for e in events if e["year"] == 2020 and e["iso3"] in ("VUT", "FJI")}
    if set(hook) != {"VUT", "FJI"}:
        _fail(f"2020-Hook unvollständig: {sorted(hook)}")
    for iso, e in hook.items():
        if not e.get("affected_pc"):
            _fail(f"2020-Hook: {iso} ohne affected_pc")
    if not (hook["VUT"]["affected_pc"] > hook["FJI"]["affected_pc"]):
        _warn("2020-Hook: Vanuatu-Anteil NICHT mehr größer als Fiji — Story-Text prüfen!")
    names = {iso: (e.get("name") or "?") for iso, e in hook.items()}
    if names.get("FJI", "").lower() != "harold" or names.get("VUT", "").lower() != "harold":
        _warn(f"2020-Hook wird nicht mehr von einem einzigen Sturm getragen: {names} "
              "— der Hook-Text muss die Jahres-Semantik benennen.")

    if exposure is not None:
        seen = {(e["iso3"], e["year"]) for e in events}
        for r in exposure:
            if r["status"] == "none" and (r["iso3"], r["year"]) in seen:
                _fail(f"Exposure-Status 'none', obwohl Meldung existiert: {r['id']}")
            if r["status"] not in {"toll", "zero", "none"}:
                _fail(f"unbekannter Exposure-Status: {r['status']}")

    _validate_tracks(tracks, {e["sid"] for e in events if e["sid"]})

    # Inhaltliche Befunde: nur berichten, nie erzwingen.
    pc, pop = fits["perCapita"], fits.get("popSize")
    print(f"validate(events): OK — {len(events)} gemeldete Land-Jahre "
          f"({len(positive)} positiv, {len(zeros)} Nullen), Fit-Basis {len(scatter)}, "
          f"Zero-Lane {len(zero_lane)}, {len(tracks)} Tracks")
    print(f"  Befund: Wind R²={pc['r2']} (p={pc['p']})"
          + (f" · Landesgröße R²={pop['r2']} (p={pop['p']})" if pop else ""))
    if pc["p"] >= 0.05:
        _warn(f"Wind-Fit nicht signifikant (p={pc['p']}) — die Story muss das so erzählen.")
    if pop and pop["r2"] <= pc["r2"]:
        _warn("Landesgröße erklärt NICHT mehr als der Wind — Story-Text prüfen!")


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
    """Struktur der Trend-Serien hart, die Trend-BEFUNDE weich (Audit 2026-07):
    ob Zahl und Mittelwind flach sind, ist Ergebnis und darf kein Build-Gate sein."""
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
    for key, fit in f.items():
        if not math.isfinite(fit["p"]) or not math.isfinite(fit["r2"]):
            _fail(f"trends.fits.{key} mit nicht-endlichem p/R²")
    if f["count"]["p"] < 0.05:
        _warn(f"Sturmzahl-Trend jetzt signifikant (p={f['count']['p']}) — Story-Text prüfen!")
    if f["windMean"]["p"] < 0.05:
        _warn(f"Mittelwind-Trend jetzt signifikant (p={f['windMean']['p']}) — Story-Text prüfen!")
    if not (f["genesisWP"]["p"] < 0.05 and f["genesisWP"]["perDecade"] > 0):
        _warn(f"NW-Polwärts-Signal nicht mehr signifikant (p={f['genesisWP']['p']}) — Story-Text prüfen!")
    print(f"validate(trends): OK — 25 Saisons · Zahl p={f['count']['p']}, "
          f"Wind p={f['windMean']['p']}, NW {f['genesisWP']['perDecade']:+}°/Dekade (p={f['genesisWP']['p']})")
