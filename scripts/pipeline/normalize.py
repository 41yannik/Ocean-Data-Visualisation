"""Namens- und Koordinaten-Normalisierung für den EM-DAT↔IBTrACS-Join."""
import re

from pipeline.reference import NAME_ALIASES

# Führende Gattungswörter, die kein Sturmname sind (werden iterativ entfernt)
_GENERIC_LEAD = {
    "TROPICAL", "SEVERE", "SUPER", "CYCLONE", "CYCLONES", "TYPHOON", "HURRICANE",
    "STORM", "DEPRESSION", "TC", "TY", "STY", "SURGE",
}
_SEPARATORS = re.compile(r"[()\[\]/,;&]|\band\b|\bAND\b")
_DROP_CHARS = re.compile(r"[\"'`´’‘„“”]")  # Apostrophe/Quotes LÖSCHEN (Chata'an -> CHATAAN)
_NON_ALPHA = re.compile(r"[^A-Z\- ]")


def normalize_name(raw) -> str:
    """Einzelnen Namen normalisieren: upper, Quotes/Apostrophe löschen, Gattungswörter vorn entfernen."""
    if raw is None or (isinstance(raw, float)):
        return ""
    s = _DROP_CHARS.sub("", str(raw)).upper()
    s = _NON_ALPHA.sub(" ", s)
    words = [w for w in s.replace("-", " ").split() if w]
    while words and words[0] in _GENERIC_LEAD:
        words.pop(0)
    # auch angehängte Gattungswörter entfernen ("AMI CYCLONE")
    while words and words[-1] in _GENERIC_LEAD:
        words.pop()
    name = " ".join(words).strip()
    return NAME_ALIASES.get(name, name)


def name_candidates(raw) -> list:
    """Alle plausiblen Namens-Kandidaten eines EM-DAT-Eintrags (Mehrfachnamen, Klammer-Alternativen)."""
    if raw is None or (isinstance(raw, float)):
        return []
    parts = [p for p in _SEPARATORS.split(str(raw)) if p and p.strip()]
    cands = []
    for p in [str(raw), *parts]:
        n = normalize_name(p)
        if n and n not in cands:
            cands.append(n)
    return cands


def normalize_lon(lon: float) -> float:
    """Längengrad deterministisch nach [-180, 180] (IBTrACS mischt Konventionen, WP bis 264°)."""
    return ((lon + 180.0) % 360.0 + 360.0) % 360.0 - 180.0


if __name__ == "__main__":
    assert normalize_name("Chata'an") == "CHATAAN", normalize_name("Chata'an")
    assert normalize_name("Ulla") == "ULA"  # Alias EM-DAT-Tippfehler
    assert normalize_name("Tropical cyclone 'Heta'") == "HETA"
    assert normalize_name("Typhoon Mawar") == "MAWAR"
    assert "YOLANDA" in name_candidates("Haiyan (Yolanda)") and "HAIYAN" in name_candidates("Haiyan (Yolanda)")
    assert "ROSITA" in name_candidates("Yutu/Rosita")
    assert normalize_lon(264.5) == -95.5 and normalize_lon(-179.8) == -179.8 and normalize_lon(181) == -179
    print("Kandidaten 'Haiyan (Yolanda)':", name_candidates("Haiyan (Yolanda)"))
    print("normalize: alle Smoke-Checks OK")
