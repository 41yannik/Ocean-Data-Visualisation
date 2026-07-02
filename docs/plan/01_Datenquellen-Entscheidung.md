# Paket 01 — Datenquellen-Entscheidung (EM-DAT-Blocker lösen)

**Priorität:** 🔴 **Teil A vor M1 (~1 h)** · **Teil B nach der Kursabgabe 24.07. (2–4 h)** · **Abhängigkeiten:** 00

> **Zeitliche Entkopplung (wegen Kursabgabe 24.07.):** Für die Kursabgabe ist EM-DAT intern zulässig (edukative Nutzung mit Zitat) — die Wahl der offenen Challenge-Quelle blockiert die Kursarbeit also NICHT. Vor M1 muss nur **Teil A** erledigt sein (Architektur-Vorkehrung + Lizenz-Hygiene), damit nichts doppelt gebaut wird. **Teil B** (finale Challenge-Quelle) folgt entspannt zwischen 25.07. und Mitte August.

## Ziel

Eine verbindliche, dokumentierte Entscheidung, welche Schadensdatenquelle die y-Achse in (a) der Kursabgabe und (b) der öffentlichen Challenge-Einreichung trägt — so, dass Lizenzrecht, Challenge-Regelwerk und die Story gleichzeitig funktionieren.

## Warum (Befund)

Das Feinkonzept (§2, C1, C4) macht EM-DAT zur Kern-Schadensquelle. Das kollidiert dreifach mit der Challenge (Regelwerk-PDF geprüft):

1. **§9 Open-Data-Regel:** Zusätzliche (nicht-offizielle) Datensätze sind nur erlaubt, wenn sie open data sind. EM-DAT ist registrierungspflichtig mit Custom-Terms: Weiterverbreitung „or a substantial part" verboten, keine derivativen Datenbanken, nur nicht-kommerziell. Das geplante öffentliche `events.json` (kompletter 99-Event-Extrakt mit disno, Toten, Betroffenen, Schaden) wäre genau das.
2. **§9 Pflicht-Datensatz:** „must use one or more datasets from the list published by the Organiser" — aktuell ist **kein** offizieller PDH/SPC-Datensatz verbindlicher Teil des Kerndesigns (nur „optionaler Kontext").
3. **§13 IP-Klausel:** Teilnehmer müssen dem Organisator eine weltweite Lizenz „for any purpose (including commercial purposes)" einräumen und erklären, uneingeschränkt über die Rechte zu verfügen — an EM-DAT-Derivaten kann man diese Rechte nicht vergeben.

Projektintern war das am 20.06. bereits entschieden („EM-DAT internal-only") — die Entscheidung ist beim Neuaufbau nach dem Datenverlust verloren gegangen.

## Entscheidungsrahmen: Zwei-Varianten-Strategie (Empfehlung)

**Eine Codebasis, austauschbare y-Achsen-Quelle** (die Pipeline bekommt einen Schalter `--variant kurs|challenge`, siehe Paket 03):

| | Variante **Kurs** (intern, nicht-öffentlich) | Variante **Challenge** (öffentlich) |
|---|---|---|
| y-Achse | EM-DAT `total_affected` (Ereignisebene, beste Story) | Offene Quelle (Option A oder B unten) |
| EM-DAT-Nutzung | ✅ zulässig: edukative Nutzung mit Zitat | ❌ komplett raus (auch aus Repo/JSON) |
| Repo/Hosting | Repo darf privat bleiben; keine EM-DAT-Rohdaten committen | Öffentliches Repo + URL, nur offene Daten |

### Option A — PDH-Datensatz `VC_DSR_AFFCT` als Challenge-y-Achse

„Number of directly affected persons attributed to disasters" (liegt lokal vor: `Data/Number of directly affected persons attributed to disasters.csv`, 21 Länder, 2005–2023). **Löst §9 doppelt** (offizieller Datensatz + offen). Aber: **Land-Jahr-Auflösung, nicht Ereignis-Auflösung** — der Scatter wird zu „Stärkster Sturm des Jahres (IBTrACS) × Jahres-Betroffene (PDH)".

### Option B — IBTrACS+WPP-Expositionsmetrik (ereignisbasiert, voll offen)

y = „Bevölkerung im Trackkorridor" (WPP-Bevölkerung der Länder, deren Zentroid innerhalb von X km der Zugbahn liegt), ggf. gewichtet mit Windstärke am nächsten Punkt. Bleibt ereignisbasiert und ist methodisch ein Plus (Exposition explizit statt konfundiert) — aber es misst **Exposition, nicht Schaden**; die Story müsste von „Toll" zu „Exposure" umformuliert werden. Mehraufwand ~4–8 h.

### Option C — Challenge-Verzicht (Fallback)

Nur Kursabgabe mit EM-DAT (intern). Legitim, verschenkt aber die Challenge-Chance; Entscheidung sollte bewusst fallen, nicht durch Liegenlassen.

## Schritte — Teil A (jetzt, vor M1, ~1 h)

- [ ] **A1. Lizenz-Hygiene sofort umsetzen:** `events.json` u. a. Pipeline-Outputs mit EM-DAT-Inhalt kommen in `.gitignore` (siehe Paket 00), solange das Repo öffentlich ist — oder Repo bis zur Teil-B-Entscheidung privat schalten.
- [ ] **A2. Pipeline-Architektur festlegen:** `build_track_to_toll.py` bekommt von Anfang an den `--variant kurs|challenge`-Schalter (Paket 03, Schritt 1/11) — die y-Quelle ist eine austauschbare Funktion, kein hartverdrahteter Spaltenname. So wird für die Challenge später nichts doppelt gebaut.
- [ ] **A3. Offiziellen PDH-Datensatz ins Kerndesign aufnehmen** (gilt für BEIDE Varianten, erfüllt Challenge-§9 und stärkt Kurs-Kriterium 1): naheliegend SST-Anomalien als Klimakontext-Layer im Story-Intro oder `VC_DSR_AFFCT` als Validierungs-Nebenansicht. Entscheidung in Paket 02 mit einarbeiten.
- [ ] **A4. Zwei-Varianten-Strategie als Decision Record festhalten** (kurz, hier oder in KONZEPT §7): Kurs = EM-DAT intern (Abgabe 24.07.), Challenge = offene Quelle (Entscheidung Teil B, nach 24.07.).

## Schritte — Teil B (nach der Kursabgabe, vor der Challenge-Einreichung)

- [ ] **B1. Kompatibilität von Option A prüfen** (~1 h, Python): `VC_DSR_AFFCT` laden und gegen `Data/processed/emdat_pacific_storms_by_country_year.csv` stellen — Korrelation, Abdeckung, Größenordnungen je Land-Jahr. Kernfrage: Bleibt die Botschaft („Intensität erklärt Schaden kaum") auf Land-Jahr-Ebene erzählbar? Dazu Schnell-Regression: max. Jahres-USA_WIND je Land (IBTrACS) × VC_DSR_AFFCT pro Kopf.
- [ ] **B2. Entscheiden:** A, B oder C für die Challenge-Variante — Empfehlung: **A** prüfen und nehmen, wenn B1 ein brauchbares Signal zeigt (sonst B). Die Kurs-Variante bleibt in jedem Fall EM-DAT-ereignisbasiert.
- [ ] **B3. Challenge-Variante bauen:** Pipeline mit `--variant challenge` + angepasste Story-Texte (Zahlen kommen ohnehin aus den Daten, Paket 06); Deployment gemäß Paket 08.
- [ ] **B4. Feinkonzept §2/§5 final nachziehen** (Challenge-Quelle dokumentieren).

## Definition of Done

- **Teil A:** Decision Record existiert; `.gitignore`/Repo-Sichtbarkeit schützt EM-DAT-Derivate; Pipeline-Design sieht den Varianten-Schalter vor; ein offizieller PDH-Datensatz ist fest im Design.
- **Teil B:** Für die Challenge-Variante ist belegt (B1), dass die Story mit offener Quelle erzählbar ist — oder B/C ist bewusst gewählt; kein EM-DAT-Derivat liegt in einem öffentlichen Repo oder unter einer öffentlichen URL.
