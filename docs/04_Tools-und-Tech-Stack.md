# Tools & Tech-Stack

> Verbindlich für dieses Projekt: **D3.js** als Haupt-Visualisierungsbibliothek (Kursvorgabe /
> Projektrahmen). Die übrige Liste dient als kuratierte Referenz aus dem Kursmaterial.

## 1. Gesetzter Stack

> **Entscheidung 2026-06-20:** Hybrid-Stack – **D3.js als Kern-Toolkit** (Kursvorgabe, alle
> analytischen 2D-Views) **+ deck.gl** (WebGL) für die performante Geo-/Track-Hauptansicht.
> „3D" aus der Anforderung = **D3.js** (geklärt); keine echte 3D-/Stereo-Darstellung. Die deck.gl-
> Track-Hauptansicht nutzt **dezente 2.5D-Extrusion** (Höhe = Windintensität, leicht gekippte Karte).

| Schicht | Wahl | Begründung |
|---|---|---|
| Kern-Visualisierung | **D3.js** (SVG) | datengetriebene DOM-Manipulation, Skalen, Transitions, Interaktion; Zeitreihen, Bubble/Parallel-Coordinates, Achsen, Legenden |
| Geo-/Track-Rendering | **deck.gl** (WebGL) | skaliert mit großen Track-Daten (76k+247k Punkte), `ArcLayer`/`PathLayer`/`TripsLayer` (Track-Animation), optional Extrusion; nutzt D3-Skalen für Farbe/Größe |
| Kartenbasis | MapLibre GL **oder** World-TopoJSON | Pazifik-zentriert (Antimeridian gelöst) |
| Daten-Wrangling | **Python (pandas)** | IBTrACS + SDMX-CSV → schlanke JSON (siehe Datendoku §6, Dashboard §5) |
| Editor | **VS Code** | gesetzt; Live-Server-Extension für lokales Hosting |
| Hosting/Publikation | GitHub Pages / Observable / Netlify | Challenge verlangt **öffentliche** Dataviz |

> **Hinweis zur 5D-Anforderung:** wird primär in der multivariaten D3-View (5 Kanäle) und der
> deck.gl-Track-Ansicht (Lat, Lon, Zeit, Intensität, Kategorie/Identität) erfüllt.

## 2. Visualisierungs-Toolkits (Kursreferenz)

- **D3** – JavaScript-Lib für datengetriebene DOM-Manipulation, Interaktion, Animation; Utilities für Viz-Techniken & SVG. → *gewählt*
- **Vega** – deklarative Sprache; parst eine Viz-Spezifikation zu JS-Visualisierung (Canvas/SVG).
- **Vega-Lite** – High-Level-Grammatik, kompiliert knappe Specs zu Vega.
- **Observable Plot** – freie JS-Lib zum schnellen Visualisieren tabellarischer Daten.
- **Processing / p5.js** – Java-artige Grafik-/Interaktionssprache (p5.js = JS-Schwester).
- **HTML/JavaScript/XML** – Standard-Webtechnologien (z. B. mit Google Maps API).
- **Leaflet** – populäre Open-Source-Mapping-Bibliothek.
- **VTK** – wissenschaftliche Visualisierung (C++ mit Sprach-Wrappern).

## 3. Weitere Visualisierungs-Tools

- **Tableau for Students** – kostenlose Studierendenlizenz.
- **GGplot2** – Grafiksprache für R.
- **Altair** – Jupyter-freundliche Python-API für Vega-Lite.
- **Seaborn** – Python-Lib mit guten Defaults (auf matplotlib).

## 4. Netzwerk-Analyse-Tools

- **Gephi** – interaktive Graph-Analyse-App.
- **NodeXL** – Graph-Analyse-Plug-in für Excel.
- **GUESS** – kombiniertes Visual-/Scripting-Interface für Graphen.
- **Pajek** – populäres Netzwerk-Analyse-Tool.
- **SNAP** – Graph-Analyse-Bibliothek für C++.

> Für dieses Projekt nicht relevant (keine Graph-/Netzwerkdaten) – nur dokumentiert.

## 5. Farb-Tools

- **ColorBrewer** – farbsichere, perzeptuell sinnvolle Paletten (sequenziell/divergierend/kategorial).
- **Adobe Color** – Farbschemata erstellen/erkunden.
- **Viz Palette** – Paletten auf Lesbarkeit & Farbsehschwächen prüfen.

**Empfehlung Projekt:** divergierende Palette für Anomalien (z. B. ColorBrewer `RdBu`), kategoriale
Palette für Länder (`Set3`/`Tableau10`); Kontrast & Farbsehschwäche mit Viz Palette gegenchecken.

## 6. Web-Development-Tools

- **VS Code** *(gesetzt)*
- **Sublime Text**
- **WebStorm**

## 7. Empfohlene Projektstruktur

```
Projekt/
├─ Data/                      # SDMX-Rohdaten (nicht im Browser laden)
├─ Developer API/             # Vorschau-PNGs der Datensätze
├─ docs/                      # diese Dokumentation
├─ data-prep/                 # Aufbereitungsskripte (Python/Node)
│  └─ build_ocean_dataset.*   # SDMX → ocean.json/.csv
├─ src/ (oder app/)           # D3-Anwendung
│  ├─ index.html
│  ├─ main.js                 # D3-Logik
│  ├─ styles.css
│  └─ data/ocean.json         # schlanke aufbereitete Daten
└─ paper/                     # Short Paper + Abgabeartefakte
```
