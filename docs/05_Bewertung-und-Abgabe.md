# Bewertung & Abgabe

> Bewertungsrahmen des Kurses **Visual Analytics** (HSD). Diese Datei ist die verbindliche
> Checkliste für alle Abgabeartefakte.

## 1. Abgabeartefakte

| Artefakt | Beschreibung | Status |
|---|---|---|
| **Code / Pipeline** | vollständige, lauffähige D3-Anwendung inkl. Datenaufbereitungs-Pipeline | ☐ |
| **Screen Recording** | Bildschirmaufnahme der interaktiven Visualisierung in Aktion | ☐ |
| **Dokumentation** | technische Doku (dieses `docs/`-Verzeichnis + ggf. README) | ☐ (in Arbeit) |
| **Short Paper** | begleitendes Paper, **2–3 Seiten** „was man sich dabei gedacht hat“ | ☐ |

> Hinweis: Aufgabenstellung nennt sowohl „**2–3 Seiten Paperwork**“ (Begleittext) als auch die
> formalen Grenzen des **Short Papers (max. 5 Seiten)**. → Kern auf 2–3 Seiten, hartes Limit 5 Seiten.

## 2. Short Paper – Pflichtinhalte

Format: **max. 5 Seiten, 11pt, doppelter Zeilenabstand, 2,5 cm Ränder.**

1. **Problembeschreibung / Fallstudie**
   - Domänenproblem: Klimawandel-Mehrfachbelastung pazifischer Inselstaaten.
   - Fragestellung, Zielgruppe, Relevanz.
2. **Beschreibung & Begründung der gewählten Visualisierungstechnik**
   - Welche 5D-Technik (siehe [03_Visualisierungskonzept.md](03_Visualisierungskonzept.md)) und **warum**.
   - Dimensions-Mapping, Designentscheidungen (Skalen, Farbe, Interaktion), Kursbezug.
3. **Vorläufige Evaluation**
   - z. B. Heuristiken/Nielsen, Expressiveness/Effectiveness, informelles Nutzerfeedback,
     Stärken/Schwächen, Grenzen der Daten.
4. **Quellen & KI-Nutzung – vollständig und konsistent zitiert**
   - alle Datenquellen (Pacific Data Hub etc.).
   - **Einsatz von KI** transparent: welcher Inhalt/Code wie entstanden ist (Werkzeug, Zweck, Umfang).

## 3. Bewertungskriterien

| Kriterium | Worauf es ankommt | Adressiert in |
|---|---|---|
| Kritische Auseinandersetzung mit dem Domänenproblem | echtes Verständnis des Klima-/Ozeanproblems, nicht nur „schöne Grafik“ | Paper §1, Annotationen |
| Klarheit & Angemessenheit der Methoden | passende Technik, saubere Datenaufbereitung, nachvollziehbar | [02](02_Datendokumentation.md), [03](03_Visualisierungskonzept.md) |
| Qualität & Eignung der Lösung | funktioniert, lesbar, beantwortet die Fragestellung | D3-App, Recording |
| Logische Kohärenz | roter Faden Problem → Methode → Lösung → Evaluation | Paper gesamt |
| Einbezug der Kursinhalte | Prinzipien/Begriffe des Kurses sichtbar angewandt | [03](03_Visualisierungskonzept.md) §4 |
| Einhaltung formaler Vorgaben | Seiten/Schrift/Ränder/Zitation eingehalten | Paper-Setup |

## 4. Zitations- & KI-Transparenz-Regel

> **Alle Quellen sind vollständig und konsistent zu zitieren – einschließlich des Gebrauchs von KI,**
> **damit klar ist, welcher Inhalt/Code wie entstanden ist.**

Praktische Umsetzung:
- Konsistenter Zitierstil (z. B. APA) für alle Daten-/Literaturquellen.
- KI-Nutzung dokumentieren: Werkzeug (z. B. Claude/Claude Code), wofür (Datenaufbereitung, Code,
  Textentwurf), in welchem Umfang, und welche Teile manuell überprüft/angepasst wurden.
- Ein kurzer Abschnitt „Hilfsmittel / KI-Einsatz“ im Paper.

## 5. Pre-Submission-Checkliste

- ☐ Mindestens **ein offizieller Challenge-Datensatz** sichtbar genutzt
- ☐ **5 Dimensionen** klar erkennbar kodiert und im Paper benannt
- ☐ Dataviz **öffentlich** erreichbar (Challenge-Anforderung)
- ☐ Code lauffähig & dokumentiert (README mit Run-Anleitung)
- ☐ Screen Recording erstellt
- ☐ Short Paper: Inhalt vollständig, Format korrekt, Quellen + KI zitiert
- ☐ Alle Datenquellen im Challenge-Einreichungsformular gelistet
