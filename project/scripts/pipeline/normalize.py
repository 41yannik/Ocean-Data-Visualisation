"""Namens- und Koordinaten-Normalisierung für IBTrACS-Sturmnamen und Track-Punkte."""
import re

# Führende/angehängte Gattungswörter, die kein Sturmname sind (werden iterativ entfernt).
_GENERIC_LEAD = {
    "TROPICAL", "TROPIAL", "SEVERE", "SUPER", "CYCLONE", "CYCLONES", "CYLONE",
    "TYPHOON", "HURRICANE", "STORM", "DEPRESSION", "TC", "TY", "STY", "SURGE",
}
_DROP_CHARS = re.compile(r"[\"'`´’‘„“”]")  # Apostrophe/Quotes LÖSCHEN (Chata'an -> CHATAAN)
_NON_ALPHA = re.compile(r"[^A-Z\- ]")


def normalize_name(raw) -> str:
    """Einzelnen Namen normalisieren: upper, Quotes/Apostrophe löschen, Gattungswörter entfernen."""
    if raw is None or (isinstance(raw, float)):
        return ""
    s = _DROP_CHARS.sub("", str(raw)).upper()
    s = _NON_ALPHA.sub(" ", s)
    words = [w for w in s.replace("-", " ").split() if w]
    while words and words[0] in _GENERIC_LEAD:
        words.pop(0)
    while words and words[-1] in _GENERIC_LEAD:
        words.pop()
    return " ".join(words).strip()


def normalize_lon(lon: float) -> float:
    """Längengrad deterministisch nach [-180, 180] (IBTrACS mischt Konventionen, WP bis 264°)."""
    return ((lon + 180.0) % 360.0 + 360.0) % 360.0 - 180.0


if __name__ == "__main__":
    assert normalize_name("Chata'an") == "CHATAAN", normalize_name("Chata'an")
    assert normalize_name("Tropical cyclone 'Heta'") == "HETA"
    assert normalize_name("Typhoon Mawar") == "MAWAR"
    assert normalize_name("HAROLD") == "HAROLD"
    assert normalize_lon(264.5) == -95.5 and normalize_lon(-179.8) == -179.8 and normalize_lon(181) == -179
    print("normalize: alle Smoke-Checks OK")
