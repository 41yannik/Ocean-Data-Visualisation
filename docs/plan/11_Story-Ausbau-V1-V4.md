# 11 · Story-Ausbau V1-V4 (2026-07-16)

Vier fokussierte neue Visualisierungen, abgeleitet aus ungenutztem Datenpotenzial;
eine Renummerierung der Steps von 10 auf 13. Branch `story-ausbau-v1-v4`.

## Neue Step-Map

| # | id | Neu? | Inhalt |
|---|---|---|---|
| 0 | sst-intro | | unverändert |
| 1 | storm-trend | | unverändert (Panel-Maschinerie extrahiert) |
| **2** | **genesis-shift** | **V1** | Genesis-Breitengrad-Drift, beide Becken auf EINER Skala |
| 3 | hook-heta | | war 2 |
| 4 | evidence | | war 3 |
| 5 | pam | | war 4 (vestigiale Scatter-storyFx entfernt) |
| 6 | patterns | | war 5, Stage dots2 |
| 7 | residual-rows | | war 6, Übergabe neu („Do whole regions tell another?") |
| **8** | **subregion-rows** | **V2** | Formation 'subregion': 3 Subregion-Zeilen + Median-Ticks |
| 9 | honesty | | war 7 (No-op showRug entfernt) |
| **10** | **two-currencies** | **V3** | Damage-Strip: erste Nutzung von damage_kusd |
| 11 | conclusion | | war 8 |
| 12 | explore | | war 9; **V4**: Gruppierungs-Toggle + Hero-Kennzahl |

## Die vier Pakete

- **V1 Genesis-Drift** (`story/stormTrend.js`): `renderTrendPanels` als geteilte
  Maschinerie extrahiert; `buildGenesisModel` (pur) + `createGenesisTrend`.
  NW-Pazifik +1,13°/Dekade (p 0,0147, R² 0,23), ≈322 km polwärts (14,9° → 17,8°);
  Südpazifik p 0,710 (kein Trend). Gemeinsame y-Domain = Ehrlichkeitsmechanik.
  Neue Refs: `trend:genesisSP.<p|perDecade>`.
- **V2 Subregion-Formation** (`story/residualRows.js`, `story/formationLayer.js`):
  `computeResidualRows` um `groupBy`/`minRowN` generalisiert (Defaults bit-identisch),
  `computeSubregionRows` + `median` je Zeile; Formation `'subregion'` mit eigener
  Chrome-Gruppe (`rr-chrome--sub`, Median-Ticks). Pointe: Vermeidung des ökologischen
  Fehlschlusses - Polynesien 12/17 über der Linie, aber Vanuatus Signal verschwindet
  in Melanesiens 22/44. Ref: `stat:subregionAboveCount.<name>`.
- **V3 Damage-Strip** (`story/damageStrip.js` NEU): eine Zeile je Land mit
  Dollarwert (11), log-US$-Achse, Zähler „x of y with a figure", Ledger-Zeile
  (9 Länder / 23 Records ohne jeden Wert). 32/99 Records, Summe US$6,30 Mrd.,
  Mawar/Guam 2023 = 68,2 % (einziger Akzent-Einsatz). `fmtUsdCompact` in format.js;
  Refs `stat:damage*`. Challenge-Guard: leeres Modell statt Throw.
- **V4 Evidence Lab** (`ui/residualLab.js`, `ui/exploreLab.js`):
  `buildResidualLab` groupBy `country|subregion|sizeClass` (<100k/100k-1M/>1M,
  feste klein→groß-Ordnung); `buildLabHeroStat` + `#evidence-hero` in der
  Controls-Zeile („42 of 78 complete records outran the wind-only expectation",
  reaktiv auf View/Filter/Modus).

## Invarianten & Stolperfallen (Stand nach Umbau)

- `STEP_COUNT` = 13; Step-Tests greifen Indizes über die Step-id ab
  (`at('pam')` statt `steps[4]`), weitere Einfügungen verschieben nichts mehr.
- `browser_audit.py` auf neue Nummern gehoben (conclusion #step-11, explore
  #step-12, Stage 6/7/8) + neue Subregion-Assertions; cn-dot = 13.
- Beide Zeilen-Chromes liegen im DOM; Selektoren müssen `--sub` unterscheiden.
- Toll-/Damage-Features sind kurs-only (Challenge-Variante hat keine Toll-Felder);
  Guards: buildDamageStrip leer, Hero bei total 0, Ghost-Parken vererbt.
- Deep-Link mitten in die Stage-Gruppe zeigt die Initial-Formation, bis die erste
  Textkarte den Scrollama-Trigger kreuzt (Bestandsverhalten, kein Regressions-Bug).
- Copy-Zahlen laufen ausnahmslos über `resolveRefs` (wirft → Error-Banner).

## Verifikation

`npm run check` grün (23/23), `npm run test:browser` grün (desktop,
compact-desktop, mobile, routes/harness). Browser-Sichtprüfung: Genesis-Panels,
Formation-Morph 6→7→8→9 (42 above / 36 below, Median-Ticks), Damage-Strip
(Dodge, Ledger, Tooltip-Nullsprache), Lab-Toggle 19/3/3 Zeilen + Hero-Reaktivität
(42/78 → 40/78 absolute, 8/10 VUT).
