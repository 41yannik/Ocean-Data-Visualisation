# From Track to Toll

Interaktive D3-Visualisierung über tropische Wirbelstürme und gemeldete menschliche Auswirkungen in pazifischen Inselstaaten. Die Seite verbindet eine geführte Story mit einem frei filterbaren Evidence Lab und einem öffentlich lesbaren Provenienzbereich.

## Ordnerstruktur der Abgabe

```
.
├── project/      # der gesamte Code (Visualisierung + Datenpipeline + Tests)
│   ├── app/          # Vanilla-JS/Vite/D3-Frontend (deployt als GitHub Pages)
│   ├── scripts/      # Python-Datenpipeline
│   └── tests/        # Unit-, Pipeline- und Playwright-Prüfungen
├── data/         # Rohdaten der Quellen + SOURCES.md (Herkunft/Lizenzen)
├── last weeks presentation/
└── short paper/
```

## Datenbasis und Veröffentlichung

Die Visualisierung nutzt eine einzige, vollständig offene Datenbasis auf Land-Jahr-Auflösung:

- Wirkungsmaß: [PDH SDG 11.5.1 „directly affected persons attributed to disasters"](https://pacificdata.org/data/dataset/sustainable-development-goals-sdg) (SPC/Pacific Data Hub, Jahreswerte 2005–2023, kompiliert aus dem UNDRR Sendai Framework Monitor).
- Sturm-Verknüpfung: je Land und Jahr der stärkste IBTrACS-Sturm, dessen Track innerhalb von 500 km um das Länderzentroid verlief.

Die Rohdaten liegen unter `data/` (Herkunft und Lizenzen: [`data/SOURCES.md`](data/SOURCES.md)). `npm run build:public` prüft den Publikationsstatus vor dem Build. Nur `publication.status=open|permissioned`, `publicBuild=true`, vollständig verifizierte Quellen und erlaubte Downloads passieren dieses Gate; ein Leck-Guard blockiert gesperrte Felder und Quelltexte dauerhaft.

## Quellen

- [IBTrACS v04r01, NOAA/NCEI](https://www.ncei.noaa.gov/products/international-best-track-archive): Tracks, Intensität, Kategorien, R34-Radien und saisonale Trends.
- [SPC/PDH SDG-Indikatoren](https://pacificdata.org/data/dataset/sustainable-development-goals-sdg): jährliche Betroffenenzahlen (`VC_DSR_AFFCT`, SDG 11.5.1).
- [SPC/PDH Climate Change Indicators](https://pacificdata.org/data/dataset/climate-change-indicators-df-climate-change): jährliche SST-Anomalien.
- [UN World Population Prospects 2024](https://population.un.org/wpp/): Bevölkerungsnormalisierung (CC BY 3.0 IGO, Namensnennung erforderlich).
- [Natural Earth über world-atlas](https://github.com/topojson/world-atlas): 110m-Basiskarte, Public Domain.

Genaue Teilmengen, Felder, Abrufdaten und Lizenzlinks stehen im generierten `project/app/public/data/meta.json` und im Seitenabschnitt „Data & methods".

## Lokal ausführen

Voraussetzungen: Node.js 20+, Python 3 mit pandas, NumPy und SciPy. Die erzeugten Artefakte sind eingecheckt, das Frontend läuft ohne Pipeline-Lauf.

```bash
cd project/app
npm ci
npm run dev
```

## Reproduzieren und prüfen

```bash
cd project
python3 scripts/build_track_to_toll.py     # liest ../data, schreibt app/public/data
cd app
npm run check                              # Unit- + Pipeline-Tests + Build
npm run test:browser                       # Playwright-Audit
```

Die Pipeline erzeugt JSON-Artefakte sowie CSV-Exporte für die offenen SST- und Sturmtrendserien. `meta.json` enthält Quellenkatalog, Transformationen, Story-Evidenz, Git-Stand und SHA-256-Prüfsummen.

Der Public-Build:

```bash
cd project/app
npm run build:public
```

## Was die Visualisierung nicht behauptet

Die Visualisierung beweist keine kausale Verwundbarkeit. Die Betroffenenzahlen sind Jahreswerte über alle Katastrophen (nicht sturm-spezifisch), gemeldete Auswirkungen sind unvollständig, Peakwind ist nicht gleich lokaler Wind am Landfall, und fehlende Werte bedeuten nicht null Betroffene.
