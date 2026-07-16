# From Track to Toll

Interaktive D3-Visualisierung über tropische Wirbelstürme und gemeldete menschliche Auswirkungen in pazifischen Inselstaaten. Die Seite verbindet eine geführte Story mit einem frei filterbaren Evidence Lab und einem öffentlich lesbaren Provenienzbereich.

## Datenvarianten und Veröffentlichung

Die Codebasis unterstützt zwei Varianten:

- `kurs`: ereignisbasierte Auswertung mit EM-DAT-Derivaten. Der aktuelle Metadatensatz ist `restricted`, bis der genaue Umfang der berichteten Anbieterfreigabe schriftlich archiviert und geprüft ist.
- `challenge`: ausschließlich für eine spätere offene Wirkungsquelle vorgesehen. Diese Variante ist derzeit `blocked`, weil das öffentliche Wirkungsmaß noch nicht gewählt wurde.

`npm run build:public` prüft den Status vor dem Build. Nur `publication.status=open|permissioned`, `publicBuild=true`, vollständig verifizierte Quellen und erlaubte Downloads passieren dieses Gate.

## Quellen

- [IBTrACS v04r01, NOAA/NCEI](https://www.ncei.noaa.gov/products/international-best-track-archive): Tracks, Intensität, Kategorien, R34-Radien und saisonale Trends.
- [SPC/PDH Climate Change Indicators](https://pacificdata.org/data/dataset/climate-change-indicators-df-climate-change): jährliche SST-Anomalien.
- [UN World Population Prospects 2024](https://population.un.org/wpp/): Bevölkerungsnormalisierung; verarbeitet aus `WPP2024_GEN_F01_DEMOGRAPHIC_INDICATORS_FULL.xlsx`.
- [Natural Earth über world-atlas](https://github.com/topojson/world-atlas): 110m-Basiskarte, Public Domain.
- EM-DAT, IFRC und WMO werden nur in der Kursvariante verwendet; genaue Teilmengen, Felder, Abrufdaten und Lizenzlinks stehen im generierten `meta.json` und im Seitenabschnitt „Data & methods“.

## Lokal ausführen

Voraussetzungen: Node.js 20+, Python 3 mit pandas, NumPy und SciPy sowie die nicht versionierten Rohdaten unter `Data/`.

```bash
python3 scripts/build_track_to_toll.py --variant kurs
cd app
npm ci
npm run dev
```

Die offene Platzhaltervariante wird mit `--variant challenge` erzeugt und per `VITE_DATA_VARIANT=challenge` geladen. Sie ist noch keine vollständige öffentliche Story.

## Reproduzieren und prüfen

```bash
python3 scripts/build_track_to_toll.py --variant beide
cd app
npm run check
npm run test:browser
```

Die Pipeline erzeugt JSON-Artefakte sowie CSV-Exporte für die offenen SST- und Sturmtrendserien. `meta*.json` enthält Quellenkatalog, Transformationen, Story-Evidenz, Git-Stand und SHA-256-Prüfsummen. Heta-R34 und Pams Windfelder werden direkt aus den IBTrACS-Quadranten berechnet.

Ein Public-Build ist absichtlich strenger:

```bash
cd app
VITE_DATA_VARIANT=challenge npm run build:public
```

Solange die Challenge-Variante `blocked` ist, muss dieser Befehl fehlschlagen.

## Projektstruktur

- `scripts/pipeline/`: Laden, Join, Statistik, Evidenz, Provenienz und Validierung.
- `app/src/story/`: Story-Konfiguration, Kapitelmethoden und Visualisierungen.
- `app/src/ui/`, `app/src/map/`, `app/src/scatter/`: verknüpfte Exploration und D3-Layer.
- `tests/`: Unit-, Pipeline- und Playwright-Prüfungen.

Die Visualisierung beweist keine kausale Verwundbarkeit. Gemeldete Auswirkungen sind unvollständig, mehrere Länderzeilen können zum selben Sturm gehören, Peakwind ist nicht gleich lokaler Wind am Landfall, und fehlende Werte bedeuten nicht null Betroffene.
