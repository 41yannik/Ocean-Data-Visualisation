# Datenquellen und Lizenzen

Dieser Ordner enthält die Rohdaten der Visualisierung „From Track to Toll". Die Pipeline
unter `../project/scripts/` verarbeitet sie zu den offenen Artefakten in
`../project/app/public/data/`. Jede Quelle mit Herkunft und Lizenz:

| Datei | Quelle | Verwendet für | Lizenz |
|---|---|---|---|
| `Number of directly affected persons attributed to disasters.csv` | SPC / Pacific Data Hub, SDG 11.5.1 (`VC_DSR_AFFCT`), kompiliert aus UNDRR Sendai Framework Monitor | Jahres-Betroffenenzahlen je Land (y-Achse) | Other (Open), PDH-Datensatzseite |
| `Mean sea surface temperature anomalies.csv` | SPC / Pacific Data Hub, Climate Change Indicators (`SST_ANOM`) | Warming-Stripes-Intro | Other (Open), PDH |
| `external/ibtracs.SP.list.v04r01.csv`, `external/ibtracs.WP.list.v04r01.csv` | IBTrACS v04r01, NOAA/NCEI | Zugbahnen, Windstärke, Kategorie, R34-Radien, saisonale Trends | Full and open access (US-Behördenwerk) |
| `processed/wpp_pacific_population.csv` | Abgeleitet aus UN World Population Prospects 2024 (UN DESA) | Normalisierung Betroffene/Bevölkerung | CC BY 3.0 IGO — **Namensnennung erforderlich** |

Der Ordner enthält ausschließlich Dateien, die die Pipeline auch wirklich liest. Ein früher
zur Gegenprobe archivierter DesInventar-Export (UNDRR/SPC) wurde entfernt: er ging nie in die
Visualisierung ein und seine Datenlizenz war ungeklärt.

Herkunft, Felder, Abrufdaten und Lizenzlinks jeder Quelle stehen zusätzlich maschinenlesbar im
erzeugten `../project/app/public/data/meta.json` und im Seitenabschnitt „Data & methods".
