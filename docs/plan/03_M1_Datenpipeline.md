# Paket 03 — M1: Datenpipeline (`scripts/build_track_to_toll.py`)

**Priorität:** 🟠 HOCH · **Aufwand:** 6–12 h · **Abhängigkeiten:** 01 (Quellen-Entscheidung), 02 (Einheit/Fenster/Windkonvention)

## Ziel

Ein reproduzierbares Python/pandas-Skript erzeugt aus den Rohquellen die schlanken Frontend-Dateien (`events.json`, `tracks.json`, `meta.json`) — mit eingebauten Validierungs-Assertions, sodass jede Story-Zahl skriptgestützt belegt ist. Der Join ist verifiziert machbar; dieses Paket ist Fleißarbeit, kein Risiko.

## Architektur

```
Data/processed/emdat_pacific_storms_events.csv   ─┐
Data/external/ibtracs.SP.list.v04r01.csv          ├─► build_track_to_toll.py ──► app/public/data/
Data/external/ibtracs.WP.list.v04r01.csv          │      --variant kurs|challenge     events.json
Data/processed/wpp_pacific_population.csv        ─┤                                   tracks.json
Data/<PDH VC_DSR_AFFCT>.csv (Challenge-Variante) ─┘                                   meta.json
```

**`--variant kurs`**: y = EM-DAT `total_affected` (Ereignisebene). **`--variant challenge`**: y = offene Quelle laut Paket-01-Entscheidung. Gemeinsamer Code für Join, Tracks, Regression.

## Schritte

- [ ] **1. Grundgerüst:** `scripts/build_track_to_toll.py` mit argparse (`--variant`, `--out`); IBTrACS mit `pd.read_csv(..., skiprows=[1], low_memory=False)` laden (Zeile 2 ist Einheiten-Zeile).
- [ ] **2. Crosswalk & Referenz:** ISO3↔GEO_PICT-Mapping (22 Zeilen, aus KONZEPT §9), Subregion (Melanesien/Mikronesien/Polynesien), Insel-Zentroide als kleine Referenztabelle im Skript oder `reference/`-CSV.
- [ ] **3. Namens-Normalisierung für den Join** (verifiziert nötig):
  - Großschreibung; Präfixe entfernen (`Tropical cyclone`, `Typhoon`, `Cyclone`, `Storm`, Quotes/Klammern).
  - **Apostrophe komplett entfernen** (nicht durch Leerzeichen ersetzen): EM-DAT „Chata'an" ↔ IBTrACS „CHATAAN".
  - Alias-Map für bekannte Abweichungen: `{"ULLA": "ULA"}` (EM-DAT-Tippfehler).
  - Mehrfachnamen aufsplitten: EM-DAT-Einträge wie „Ami" können mehrere Namen enthalten; IBTrACS-Alternativnamen in Klammern (z. B. „Yutu/Rosita") als Kandidaten extrahieren.
- [ ] **4. Join:** normalisierter Name + `SEASON` ∈ {Jahr−1, Jahr, Jahr+1} → SID. Erwartung: **94/99 Zeilen, mit Fixes 97/99, 0 Mehrdeutigkeiten** (verifiziert). Die 2 Zeilen ohne `event_name` (2004-0153-FJI, 2024-0073-MHL) bleiben prinzipiell unmatchbar → Fallback oder Ausschluss, in `meta.json` dokumentieren.
- [ ] **5. Intensität:** je Sturm Peak über **`USA_WIND`** (kt) + `max(USA_SSHS)` als Kategorie. **WMO nicht mischen** (Bias bis ~15 %, basin-abhängig). Fallback für Unverknüpfte: EM-DAT `magnitude` ÷ 1,852 → kt, Feld `intensity_source: "ibtracs" | "emdat_fallback"`.
- [ ] **6. Tracks:** LON deterministisch nach [−180, 180] normalisieren: `((lon + 180) % 360 + 360) % 360 - 180` (IBTrACS mischt Konventionen, WP bis 264°!). Ausdünnung pragmatisch: jeder 2. Punkt oder nur 6h-Hauptsynoptik (00/06/12/18Z), Koordinaten auf 2 Dezimalstellen. Erwartete Größe: ~59 KB (verifiziert) — Douglas-Peucker ist unnötige Kür.
- [ ] **7. Bevölkerung & pro Kopf:** WPP-Join über ISO3+Jahr; **Forward-Fill des 2023-Werts für 2024–2026** (7 Zeilen betroffen, sonst verliert der Pro-Kopf-Default ausgerechnet Maila); Flag `pop_extrapolated: true`. `affected_pc = affected / population`.
- [ ] **8. Regression in Python (nie im Frontend):** zwei getrennte Fits — absolut `log10(affected+1) ~ intensity_kt` und pro Kopf `log10(affected_pc·10⁵+1) ~ intensity_kt` (o. ä. stabile Skalierung). Je Fit: Steigung, Intercept, R², p, n + Residuum je Zeile (`residual_abs`, `residual_pc`). Zusätzlich Quantilband-Stützpunkte (z. B. gleitende 25/50/75-Perzentile über Intensitäts-Bins) für die Band-Darstellung.
- [ ] **9. Outputs schreiben:**
  - `events.json`: `[{id, sid, name, year, iso3, country, subregion, intensity_kt, intensity_source, category, affected, affected_pc, pop, pop_extrapolated, deaths, damage_kusd, residual_abs, residual_pc}]`
  - `tracks.json`: `{sid: [[lon, lat, wind, sshs], …]}` — nur gematchte Stürme.
  - `meta.json`: Fit-Parameter beider Modi, n je Ansicht, Join-Abdeckung, Zeitfenster, Datenstand, Caveats (Meldeverzug 2026, WPP-Fortschreibung, Fallback-Anteil), Quellen+Lizenzen.
- [ ] **10. Validierungs-Assertions ins Skript** (bricht laut ab, statt still falsche Story-Zahlen zu liefern):
  ```
  assert join-Zeilen >= 94            # erwartete Trefferquote
  assert scatterfähig >= 74           # Intensität + Betroffene
  assert Winston-2016-FJI hat intensity_kt und intensity_source == "ibtracs"
  assert Harold-2020 hat 4 Länderzeilen
  assert (affected == 0).sum() == 0   # log-Skala sicher
  assert Maila-Zeilen haben affected_pc (Forward-Fill greift)
  assert p_pro_kopf < 0.05 und R²_pro_kopf > R²_absolut    # Signifikanz statt starrem Korridor
  # (Pipeline-final auf USA_WIND-Achse, n=78: R²_pc=0,065 / p=0,025; der frühere Korridor
  #  0,10–0,20 stammte von der vorläufigen EM-DAT-magnitude-Achse mit n=45)
  ```
- [ ] **11. Lizenz-Schalter:** Bei `--variant challenge` darf **kein** EM-DAT-Feld in die Outputs gelangen (Assertion auf Spaltenliste); bei `--variant kurs` schreibt das Skript einen Hinweis „EM-DAT — internal use only, not for publication" in `meta.json`.

## Definition of Done

- `python scripts/build_track_to_toll.py --variant kurs` läuft durch, alle Assertions grün, Outputs < 300 KB gesamt.
- Beide Varianten erzeugen valide Outputs; die Challenge-Variante enthält nachweislich keine EM-DAT-Daten.
- `meta.json` enthält beide Fits + alle Caveat-Angaben; eine Stichprobe (Winston, Heta, Harold, Mawar, Maila) stimmt mit den Rohdaten überein.
